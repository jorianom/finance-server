// Use Case: Create Budget Item

import { IBudgetRepository, CreateBudgetItemDTO } from '../../domain/ports/repositories/budget.repository.port.js';
import { BudgetItem } from '../../domain/entities/budget-item.entity.js';

export class CreateBudgetItemUseCase {
  constructor(private readonly budgetRepo: IBudgetRepository) {}

  async execute(data: CreateBudgetItemDTO): Promise<BudgetItem> {
    // Validate via entity
    BudgetItem.create({
      userId: data.userId,
      cycleStart: data.cycleStart,
      name: data.name,
      type: data.type,
      amount: data.amount,
      isFixed: data.isFixed,
      categoryId: data.categoryId,
      linkedDescription: data.linkedDescription,
    });

    return this.budgetRepo.create(data);
  }
}
