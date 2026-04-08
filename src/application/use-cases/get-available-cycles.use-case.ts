// Use Case: Get Available Cycles
// Returns the list of budget cycles for which the user has transactions

import { ITransactionRepository, CycleInfo } from '../../domain/ports/repositories/transaction.repository.port.js';

export class GetAvailableCyclesUseCase {
  constructor(private readonly transactionRepo: ITransactionRepository) {}

  async execute(userId: number, cycleStartDay: number): Promise<CycleInfo[]> {
    return this.transactionRepo.getAvailableCycles(userId, cycleStartDay);
  }
}
