// Use Case: Get Summary (income/expense totals by category)

import {
  ITransactionRepository,
  SummaryFilters,
  SummaryResult,
} from '../../domain/ports/repositories/transaction.repository.port.js';

export class GetSummaryUseCase {
  constructor(private readonly transactionRepo: ITransactionRepository) {}

  async execute(filters: SummaryFilters): Promise<SummaryResult> {
    return this.transactionRepo.getSummary(filters);
  }
}
