// Use Case: Get Debts

import { IDebtRepository } from '../../domain/ports/repositories/debt.repository.port.js';
import { Debt } from '../../domain/entities/debt.entity.js';

export class GetDebtsUseCase {
  constructor(private readonly debtRepo: IDebtRepository) {}

  async execute(userId: number): Promise<Debt[]> {
    return this.debtRepo.findByUserId(userId);
  }
}
