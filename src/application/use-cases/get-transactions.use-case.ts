// Use Case: Get Transactions (paginated, filtered)

import {
  ITransactionRepository,
  TransactionFilters,
} from '../../domain/ports/repositories/transaction.repository.port.js';
import { Transaction } from '../../domain/entities/transaction.entity.js';

export class GetTransactionsUseCase {
  constructor(private readonly transactionRepo: ITransactionRepository) {}

  async execute(filters: TransactionFilters): Promise<{ data: Transaction[]; total: number }> {
    return this.transactionRepo.findAll(filters);
  }
}
