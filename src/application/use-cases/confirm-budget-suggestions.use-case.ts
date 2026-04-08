// Use Case: Confirm Budget Suggestions
// Creates budget items from the user-confirmed suggestions (variable items from previous cycle)

import { IBudgetRepository, CreateBudgetItemDTO } from '../../domain/ports/repositories/budget.repository.port.js';
import { BudgetItem } from '../../domain/entities/budget-item.entity.js';

export interface ConfirmSuggestionInput {
  name: string;
  type: 'ingreso' | 'gasto';
  amount: number;
  isFixed: boolean;
  categoryId?: number | null;
  debtId?: number | null;
  linkedDescription?: string | null;
}

export class ConfirmBudgetSuggestionsUseCase {
  constructor(private readonly budgetRepo: IBudgetRepository) {}

  async execute(
    userId: number,
    cycleStart: string,
    items: ConfirmSuggestionInput[],
  ): Promise<BudgetItem[]> {
    const dtos: CreateBudgetItemDTO[] = items.map(item => ({
      userId,
      cycleStart,
      name: item.name,
      type: item.type,
      amount: item.amount,
      isFixed: item.isFixed,
      categoryId: item.categoryId,
      debtId: item.debtId,
      linkedDescription: item.linkedDescription,
    }));

    return this.budgetRepo.createMany(dtos);
  }
}
