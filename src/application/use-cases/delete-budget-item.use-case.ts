// Use Case: Delete Budget Item

import { IBudgetRepository } from '../../domain/ports/repositories/budget.repository.port.js';

export class DeleteBudgetItemUseCase {
  constructor(private readonly budgetRepo: IBudgetRepository) {}

  async execute(id: number, userId: number): Promise<void> {
    return this.budgetRepo.delete(id, userId);
  }
}
