// Use Case: Enrich Transaction
// Receives merchant data from external sources (e.g. RappiPay email parser)
// and updates matching transactions with the enriched merchant + re-classifies.

import { ITransactionRepository } from '../../domain/ports/repositories/transaction.repository.port.js';
import { IRuleRepository } from '../../domain/ports/repositories/rule.repository.port.js';
import { ICategoryRepository } from '../../domain/ports/repositories/category.repository.port.js';
import { classify } from '../../domain/services/transaction-classifier.service.js';

export interface EnrichTransactionInput {
  accountId?: number;
  bankName?: string;
  date: string;       // ISO date, e.g. "2026-03-09"
  amount: number;
  merchant: string;
  reference?: string;
  emailId?: string;
  destinationKey?: string;   // transfer: "Llave destino" (phone/alias)
  destinationBank?: string;  // transfer: destination bank name
  type?: 'debit' | 'credit'; // defaults to 'debit'
}

export type EnrichTransactionResult =
  | { status: 'not_found' }
  | { status: 'enriched'; transactionId: number; categoryId: number | null; merchant: string }
  | { status: 'ambiguous'; count: number; transactionIds: number[] };

export class EnrichTransactionUseCase {
  constructor(
    private readonly txRepo: ITransactionRepository,
    private readonly ruleRepo: IRuleRepository,
    private readonly categoryRepo: ICategoryRepository,
    private readonly resolveAccountId: (bankName: string) => Promise<number | null>,
  ) {}

  async execute(userId: number, input: EnrichTransactionInput): Promise<EnrichTransactionResult> {
    // Resolve account ID
    let accountId = input.accountId ?? null;
    if (!accountId && input.bankName) {
      accountId = await this.resolveAccountId(input.bankName);
    }
    if (!accountId) {
      return { status: 'not_found' };
    }

    // Build date at midnight UTC
    const date = new Date(input.date + 'T00:00:00.000Z');

    // Find matching transactions
    const txType = input.type ?? 'debit';
    const matches = await this.txRepo.findByMatchCriteria(accountId, date, input.amount, txType);

    if (matches.length === 0) {
      return { status: 'not_found' };
    }

    if (matches.length > 1) {
      return {
        status: 'ambiguous',
        count: matches.length,
        transactionIds: matches.map(t => t.id!),
      };
    }

    // Exactly one match — enrich it
    const tx = matches[0];
    const rules = await this.ruleRepo.findByUserId(userId);

    // Try classifying with the new merchant first, then fall back to description
    let result = classify(input.merchant, rules);
    if (result.categoryId === null) {
      const desc = tx.descriptionClean ?? tx.descriptionRaw;
      result = classify(desc, rules);
    }

    // If still no category from rules, use fallback defaults
    let categoryId = result.categoryId;
    if (categoryId === null) {
      const fallback = await this.categoryRepo.findDefaultCategoryIds(userId);
      categoryId = fallback.expenseCategoryId;
    }

    const autoClassified = result.categoryId === null && categoryId !== null;

    // Build the merchant label — for transfers include the destination key
    const merchant = input.destinationKey
      ? `Transferencia → ${input.destinationKey}${input.destinationBank ? ` (${input.destinationBank})` : ''}`
      : input.merchant;

    await this.txRepo.updateMerchantAndCategory(tx.id!, merchant, categoryId, autoClassified);

    return {
      status: 'enriched',
      transactionId: tx.id!,
      categoryId,
      merchant,
    };
  }
}
