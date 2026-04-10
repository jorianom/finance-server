// Use Case: Ingest Transaction
// Receives transaction data from external email parsers (e.g. RappiPay Google Apps Script)
// and creates a new transaction — or enriches an existing one if previously imported.
//
// Three outcomes:
//   'created'  — new transaction saved (email-sourced)
//   'duplicate' — hash match found; transaction already ingested, skip
//   'enriched'  — criteria match found from an earlier CSV/PDF import; merchant + category updated

import { ITransactionRepository } from '../../domain/ports/repositories/transaction.repository.port.js';
import { IRuleRepository } from '../../domain/ports/repositories/rule.repository.port.js';
import { ICategoryRepository } from '../../domain/ports/repositories/category.repository.port.js';
import { Transaction } from '../../domain/entities/transaction.entity.js';
import { normalizeDescription } from '../../domain/services/text-normalizer.service.js';
import { hashTransaction } from '../../domain/services/transaction-hasher.service.js';
import { classify } from '../../domain/services/transaction-classifier.service.js';

export interface IngestTransactionInput {
  bankName: string;
  date: string;              // ISO date, e.g. "2026-03-09"
  amount: number;
  merchant: string;
  type?: 'debit' | 'credit'; // defaults to 'debit'
  reference?: string;
  emailId?: string;
  destinationKey?: string;   // transfer: "Llave destino" (phone/alias)
  destinationBank?: string;  // transfer: destination bank name
}

export type IngestTransactionResult =
  | { status: 'created';   transactionId: number; categoryId: number | null; merchant: string }
  | { status: 'duplicate'; transactionId?: number }
  | { status: 'enriched';  transactionId: number; categoryId: number | null; merchant: string }
  | { status: 'not_found' };  // bankName could not be resolved to an account

export class IngestTransactionUseCase {
  constructor(
    private readonly txRepo: ITransactionRepository,
    private readonly ruleRepo: IRuleRepository,
    private readonly categoryRepo: ICategoryRepository,
    private readonly resolveAccountId: (bankName: string) => Promise<number | null>,
  ) {}

  async execute(userId: number, input: IngestTransactionInput): Promise<IngestTransactionResult> {
    // Resolve account ID from bank name
    const accountId = await this.resolveAccountId(input.bankName);
    if (!accountId) {
      return { status: 'not_found' };
    }

    const txType = input.type ?? 'debit';

    // Normalize merchant text to use as the hash description component.
    // Email-sourced transactions don't have a raw bank description, so the merchant
    // name is the best stable identifier available.
    const merchantNormalized = normalizeDescription(input.merchant);

    // Build hash from email data — used for deduplication of email-sourced transactions
    const hash = hashTransaction({
      date: input.date,
      description: merchantNormalized,
      amount: input.amount,
      type: txType,
    });

    // Check if already ingested via this same email path
    const alreadyExists = await this.txRepo.existsByHash(hash);
    if (alreadyExists) {
      return { status: 'duplicate' };
    }

    // Check for a match from a prior CSV/PDF import (cross-source dedup).
    // Credit transactions (incoming transfers) post on the same day — exact match only.
    // Debit transactions (purchases) may take up to 1 day to post.
    const date = new Date(input.date + 'T00:00:00.000Z');
    let matches = await this.txRepo.findByMatchCriteria(accountId, date, input.amount, txType);

    if (matches.length === 0 && txType === 'debit') {
      const retryDate = new Date(date);
      retryDate.setUTCDate(retryDate.getUTCDate() + 1);
      matches = await this.txRepo.findByMatchCriteria(accountId, retryDate, input.amount, txType);
    }

    const [rules, fallback] = await Promise.all([
      this.ruleRepo.findByUserId(userId),
      this.categoryRepo.findDefaultCategoryIds(userId),
    ]);

    const merchantLabel = this.buildMerchantLabel(input);

    // Classify by merchant text
    let classification = classify(merchantNormalized, rules);
    let categoryId = classification.categoryId;
    if (categoryId === null) {
      categoryId = txType === 'credit' ? fallback.incomeCategoryId : fallback.expenseCategoryId;
    }
    const autoClassified = classification.categoryId === null && categoryId !== null;

    if (matches.length === 1) {
      // Exactly one match from a prior import — enrich it instead of creating a duplicate
      const tx = matches[0];
      await this.txRepo.updateMerchantAndCategory(tx.id!, merchantLabel, categoryId, autoClassified);
      return {
        status: 'enriched',
        transactionId: tx.id!,
        categoryId,
        merchant: merchantLabel,
      };
    }

    // No prior match — create a new transaction sourced from the email parser
    const transaction = Transaction.create({
      userId,
      accountId,
      importId: null,
      date,
      descriptionRaw: input.merchant,
      descriptionClean: merchantNormalized,
      amount: input.amount,
      type: txType,
      categoryId,
      merchant: merchantLabel,
      hash,
      autoClassified,
    });

    const saved = await this.txRepo.save(transaction);

    return {
      status: 'created',
      transactionId: saved.id!,
      categoryId,
      merchant: merchantLabel,
    };
  }

  private buildMerchantLabel(input: IngestTransactionInput): string {
    if (input.destinationKey) {
      return `Transferencia → ${input.destinationKey}${input.destinationBank ? ` (${input.destinationBank})` : ''}`;
    }
    return input.merchant;
  }
}
