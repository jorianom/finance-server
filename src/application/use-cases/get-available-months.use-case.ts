// Use Case: Get Available Months — DEPRECATED
// Superseded by GetAvailableCyclesUseCase.
// Retained for file continuity; no longer registered in the container.

import { ITransactionRepository } from '../../domain/ports/repositories/transaction.repository.port.js';

export class GetAvailableMonthsUseCase {
  constructor(private readonly transactionRepo: ITransactionRepository) {}

  /** @deprecated Use GetAvailableCyclesUseCase instead. */
  async execute(_userId: number): Promise<string[]> {
    return [];
  }
}
