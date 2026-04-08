// Use Case: Import Transactions
// Orchestrates: upload → parse → normalize → classify → save

import { IImportRepository } from '../../domain/ports/repositories/import.repository.port.js';
import { ITransactionRepository } from '../../domain/ports/repositories/transaction.repository.port.js';
import { IRuleRepository } from '../../domain/ports/repositories/rule.repository.port.js';
import { ICategoryRepository } from '../../domain/ports/repositories/category.repository.port.js';
import { IFileStorage } from '../../domain/ports/services/file-storage.port.js';
import { ITransactionParser } from '../../domain/ports/services/parser.port.js';
import { IPdfTransactionParser } from '../../domain/ports/services/pdf-parser.port.js';
import { extractPdfText } from '../../infrastructure/parsers/pdf-text-extractor.js';
import { ProcessResult } from '../../domain/value-objects/process-result.js';
import { Transaction } from '../../domain/entities/transaction.entity.js';
import { normalizeDescription } from '../../domain/services/text-normalizer.service.js';
import { extractMerchant } from '../../domain/services/merchant-extractor.service.js';
import { hashTransaction } from '../../domain/services/transaction-hasher.service.js';
import { classify } from '../../domain/services/transaction-classifier.service.js';
import { PeriodConflictError } from '../../domain/errors/period-conflict.error.js';

export interface ImportTransactionsInput {
  userId: number;
  accountId: number;
  fileName: string;
  fileBuffer: Buffer;
  fileType: 'csv' | 'pdf';
  password?: string;
  replaceExisting?: boolean;
}

export class ImportTransactionsUseCase {
  constructor(
    private readonly importRepo: IImportRepository,
    private readonly transactionRepo: ITransactionRepository,
    private readonly ruleRepo: IRuleRepository,
    private readonly categoryRepo: ICategoryRepository,
    private readonly fileStorage: IFileStorage,
    private readonly parsers: ITransactionParser[],
    private readonly pdfParsers: IPdfTransactionParser[] = [],
  ) {}

  async execute(input: ImportTransactionsInput): Promise<{ importId: number; result: ProcessResult }> {
    // 1. Upload file to storage
    const contentType = input.fileType === 'pdf' ? 'application/pdf' : 'text/csv';
    const storagePath = `${input.userId}/${Date.now()}_${input.fileName}`;
    await this.fileStorage.upload(storagePath, input.fileBuffer, contentType);

    // 2. Create import record (status = pending)
    const importRecord = await this.importRepo.create({
      userId: input.userId,
      accountId: input.accountId,
      fileName: input.fileName,
      fileType: input.fileType,
    });
    const importId = importRecord.id!;

    let created = 0;
    let duplicates = 0;
    let errors = 0;

    try {
      let rawTransactions;
      let skipDuplicates = false;

      if (input.fileType === 'pdf') {
        // 3-4. PDF: extract text and detect parser
        const pdfText = await extractPdfText(input.fileBuffer, input.password);
        const pdfParser = this.pdfParsers.find(p => p.detect(pdfText));

        if (!pdfParser) {
          throw new Error('Banco no reconocido en el PDF. Formatos soportados: Nequi, Davivienda, RappiPay');
        }

        skipDuplicates = pdfParser.allowDuplicates === true;
        rawTransactions = pdfParser.parse(pdfText);
      } else {
        // 3. Detect CSV parser by inspecting headers
        const csvContent = input.fileBuffer.toString('utf-8');
        const firstLine = csvContent.split('\n')[0] ?? '';
        const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
        const parser = this.parsers.find(p => p.detect(headers));

        if (!parser) {
          throw new Error(`Banco no reconocido. Headers: ${headers.join(', ')}`);
        }

        skipDuplicates = parser.allowDuplicates === true;
        // 4. Parse CSV into RawTransactions
        rawTransactions = parser.parse(csvContent);
      }

      // 5. If bank allows duplicates (e.g. Nequi), handle period conflict / replacement
      let replaced = 0;
      if (skipDuplicates) {
        const yearMonths = [...new Set(rawTransactions.map(r => r.date.slice(0, 7)))];
        const existing = await this.transactionRepo.countByAccountAndPeriods(input.accountId, yearMonths);
        if (existing > 0) {
          if (!input.replaceExisting) {
            throw new PeriodConflictError(yearMonths[0] ?? '', existing);
          }
          replaced = await this.transactionRepo.deleteByAccountAndPeriods(input.accountId, yearMonths);
        }
      }

      // 6. Load user rules and fallback category ids for classification
      const [rules, fallback] = await Promise.all([
        this.ruleRepo.findByUserId(input.userId),
        this.categoryRepo.findDefaultCategoryIds(input.userId),
      ]);

      // 6. Process each transaction
      for (const [idx, raw] of rawTransactions.entries()) {
        try {
          const descClean = normalizeDescription(raw.description);
          const merchantFromDesc = extractMerchant(descClean);
          const hash = hashTransaction(raw, skipDuplicates ? idx : undefined);
          const classification = classify(descClean, rules);

          // Apply fallback category when no rule matched
          const categoryId = classification.categoryId
            ?? (raw.type === 'credit' ? fallback.incomeCategoryId : fallback.expenseCategoryId);
          const autoClassified = classification.autoClassified && categoryId !== null
            ? true
            : classification.autoClassified;

          // Check for duplicates (skipped for banks like Nequi that repeat identical rows)
          if (!skipDuplicates) {
            const exists = await this.transactionRepo.existsByHash(hash);
            if (exists) {
              duplicates++;
              continue;
            }
          }

          const transaction = Transaction.create({
            userId: input.userId,
            accountId: input.accountId,
            importId,
            date: new Date(raw.date),
            descriptionRaw: raw.description,
            descriptionClean: descClean,
            amount: raw.amount,
            type: raw.type,
            categoryId,
            merchant: classification.merchant ?? merchantFromDesc,
            hash,
            autoClassified,
          });

          await this.transactionRepo.save(transaction);
          created++;
        } catch {
          errors++;
        }
      }

      // 7. Update import status
      await this.importRepo.updateStatus(importId, 'processed');

      return {
        importId,
        result: { total: rawTransactions.length, created, duplicates, errors, replaced: replaced || undefined },
      };
    } catch (err) {
      await this.importRepo.updateStatus(importId, 'error');
      throw err;
    }
  }
}
