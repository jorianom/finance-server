// Use Case: Reclassify Transactions
// Applies current rules to ALL transactions for a user, overwriting existing categories.
// Uses description_clean (already normalized) — identical pipeline to the import flow.

import { ITransactionRepository } from '../../domain/ports/repositories/transaction.repository.port.js';
import { IRuleRepository } from '../../domain/ports/repositories/rule.repository.port.js';
import { ICategoryRepository } from '../../domain/ports/repositories/category.repository.port.js';
import { classify } from '../../domain/services/transaction-classifier.service.js';

export class ReclassifyTransactionsUseCase {
  constructor(
    private readonly txRepo: ITransactionRepository,
    private readonly ruleRepo: IRuleRepository,
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(userId: number): Promise<number> {
    const [rules, fallback, transactions] = await Promise.all([
      this.ruleRepo.findAll(userId),
      this.categoryRepo.findDefaultCategoryIds(userId),
      this.txRepo.findDescriptions(userId),
    ]);

    const updates = transactions
      .map(tx => {
        const text = tx.descriptionClean ?? tx.descriptionRaw;
        const result = classify(text, rules);
        const categoryId = result.categoryId
          ?? (tx.type === 'credit' ? fallback.incomeCategoryId : fallback.expenseCategoryId);
        if (categoryId === null) return null;
        return {
          id: tx.id,
          categoryId,
          merchant: result.merchant,
          autoClassified: result.autoClassified,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    return this.txRepo.updateClassifications(updates);
  }
}
