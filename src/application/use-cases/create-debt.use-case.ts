// Use Case: Create Debt

import { IDebtRepository, CreateDebtDTO } from '../../domain/ports/repositories/debt.repository.port.js';
import { Debt } from '../../domain/entities/debt.entity.js';

export class CreateDebtUseCase {
  constructor(private readonly debtRepo: IDebtRepository) {}

  async execute(data: CreateDebtDTO): Promise<Debt> {
    // Validate via entity
    Debt.create({
      userId: data.userId,
      name: data.name,
      entity: data.entity,
      initialBalance: data.initialBalance,
      currentBalance: data.currentBalance,
      monthlyRate: data.monthlyRate,
      minPayment: data.minPayment,
      startDate: data.startDate,
      linkedDescription: data.linkedDescription,
      status: data.status ?? 'active',
    });

    return this.debtRepo.create(data);
  }
}
