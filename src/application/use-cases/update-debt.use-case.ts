// Use Case: Update Debt

import { IDebtRepository, UpdateDebtDTO } from '../../domain/ports/repositories/debt.repository.port.js';
import { Debt } from '../../domain/entities/debt.entity.js';

export class UpdateDebtUseCase {
  constructor(private readonly debtRepo: IDebtRepository) {}

  async execute(id: number, userId: number, data: UpdateDebtDTO): Promise<Debt> {
    return this.debtRepo.update(id, userId, data);
  }
}
