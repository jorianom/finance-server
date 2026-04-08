// Use Case: Copy Budget from Previous Cycle
// Finds previous cycle's items:
// - is_fixed=true items are auto-copied
// - is_fixed=false items are returned as suggestions for user confirmation

import { IBudgetRepository, CreateBudgetItemDTO } from '../../domain/ports/repositories/budget.repository.port.js';
import { IUserRepository } from '../../domain/ports/repositories/user.repository.port.js';
import { BudgetItem } from '../../domain/entities/budget-item.entity.js';

export interface CopyBudgetResult {
  /** Items that were automatically copied (is_fixed=true) */
  copied: BudgetItem[];
  /** Previous variable items suggested for the user to confirm */
  suggestions: BudgetItem[];
}

export class CopyBudgetFromPreviousUseCase {
  constructor(
    private readonly budgetRepo: IBudgetRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: number, targetCycleStart: string): Promise<CopyBudgetResult> {
    const cycleStartDay = await this.userRepo.getCycleStartDay(userId);
    const previousItems = await this.budgetRepo.findPreviousCycle(userId, targetCycleStart, cycleStartDay);

    if (previousItems.length === 0) {
      return { copied: [], suggestions: [] };
    }

    // Check what already exists in the target cycle to avoid duplicates
    const existingItems = await this.budgetRepo.findByCycle(userId, targetCycleStart);
    const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));

    const fixedItems = previousItems.filter(i => i.isFixed && !existingNames.has(i.name.toLowerCase()));
    const variableItems = previousItems.filter(i => !i.isFixed && !existingNames.has(i.name.toLowerCase()));

    // Auto-copy fixed items
    const fixedDTOs: CreateBudgetItemDTO[] = fixedItems.map(item => ({
      userId,
      cycleStart: targetCycleStart,
      name: item.name,
      type: item.type,
      amount: item.amount,
      isFixed: true,
      categoryId: item.categoryId,
      linkedDescription: item.linkedDescription,
    }));

    let copied: BudgetItem[] = [];
    if (fixedDTOs.length > 0) {
      copied = await this.budgetRepo.createMany(fixedDTOs);
    }

    return {
      copied,
      suggestions: variableItems,
    };
  }
}
