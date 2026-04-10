// Use Case: Create Transaction (manual entry)
// Creates a new transaction directly, auto-classifying if no category is provided.

import { ITransactionRepository } from '../../domain/ports/repositories/transaction.repository.port.js';
import { IRuleRepository } from '../../domain/ports/repositories/rule.repository.port.js';
import { Transaction } from '../../domain/entities/transaction.entity.js';
import { classify } from '../../domain/services/transaction-classifier.service.js';

export interface CreateTransactionInput {
  accountId: number;
  date: string; // ISO date "YYYY-MM-DD"
  descriptionRaw: string;
  descriptionClean?: string;
  amount: number;
  type: 'debit' | 'credit';
  categoryId?: number | null;
  merchant?: string;
}

export class CreateTransactionUseCase {
  constructor(
    private readonly txRepo: ITransactionRepository,
    private readonly ruleRepo: IRuleRepository,
  ) {}

  async execute(userId: number, input: CreateTransactionInput): Promise<Transaction> {
    const date = new Date(input.date + 'T00:00:00.000Z');

    let categoryId = input.categoryId ?? null;
    let merchant = input.merchant ?? null;
    let autoClassified = false;

    if (!categoryId) {
      const rules = await this.ruleRepo.findAll(userId);
      const result = classify(input.descriptionRaw, rules);
      categoryId = result.categoryId;
      merchant = result.merchant ?? merchant;
      autoClassified = !!categoryId;
    }

    const tx = Transaction.create({
      userId,
      accountId: input.accountId,
      date,
      descriptionRaw: input.descriptionRaw,
      descriptionClean: input.descriptionClean ?? input.descriptionRaw,
      amount: input.amount,
      type: input.type,
      categoryId,
      merchant,
      autoClassified,
    });

    return this.txRepo.save(tx);
  }
}
