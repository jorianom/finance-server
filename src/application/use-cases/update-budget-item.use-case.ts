// Use Case: Update Budget Item

import { IBudgetRepository, UpdateBudgetItemDTO } from '../../domain/ports/repositories/budget.repository.port.js';
import { BudgetItem } from '../../domain/entities/budget-item.entity.js';

export class UpdateBudgetItemUseCase {
  constructor(private readonly budgetRepo: IBudgetRepository) {}

  async execute(id: number, userId: number, data: UpdateBudgetItemDTO): Promise<BudgetItem> {
    return this.budgetRepo.update(id, userId, data);
  }
}
