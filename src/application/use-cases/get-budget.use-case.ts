// Use Case: Get Budget
// Returns budget items for a cycle with actual spending comparison

import { IBudgetRepository } from '../../domain/ports/repositories/budget.repository.port.js';
import { IUserRepository } from '../../domain/ports/repositories/user.repository.port.js';
import { buildBudgetComparison, BudgetSummary } from '../../domain/services/budget-comparison.service.js';

export class GetBudgetUseCase {
  constructor(
    private readonly budgetRepo: IBudgetRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: number, cycleStart: string): Promise<BudgetSummary> {
    const cycleStartDay = await this.userRepo.getCycleStartDay(userId);
    const items = await this.budgetRepo.findByCycle(userId, cycleStart);
    const actuals = await this.budgetRepo.getActuals(userId, cycleStart, cycleStartDay);
    return buildBudgetComparison(items, actuals);
  }
}
