// Use Case: Delete Debt

import { IDebtRepository } from '../../domain/ports/repositories/debt.repository.port.js';

export class DeleteDebtUseCase {
  constructor(private readonly debtRepo: IDebtRepository) {}

  async execute(id: number, userId: number): Promise<void> {
    return this.debtRepo.delete(id, userId);
  }
}
