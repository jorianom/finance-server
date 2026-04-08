// Domain Service: Budget Comparison
// Pure function: takes budget items + actuals → returns comparison rows + summary

import { BudgetItem } from '../entities/budget-item.entity.js';
import { BudgetActual } from '../ports/repositories/budget.repository.port.js';

export interface BudgetComparisonRow {
  id: number;
  name: string;
  type: 'ingreso' | 'gasto';
  isFixed: boolean;
  budgeted: number;
  actual: number;
  difference: number; // budgeted - actual (positive = under budget)
  categoryId: number | null;
  debtId: number | null;
  linkedDescription: string | null;
}

export interface BudgetSummary {
  totalBudgetedIncome: number;
  totalActualIncome: number;
  totalBudgetedFixedExpenses: number;
  totalActualFixedExpenses: number;
  totalBudgetedVariableExpenses: number;
  totalActualVariableExpenses: number;
  projectedBalance: number; // income - fixed - variable (all budgeted)
  actualBalance: number;    // actual income - actual fixed - actual variable
  rows: BudgetComparisonRow[];
}

/**
 * Sum actual amounts deduplicating shared categories.
 * Rows with the same categoryId show the same real total (full category total);
 * only count it once. Keyword-based rows (no categoryId) are always counted individually.
 */
function deduplicatedActual(rows: BudgetComparisonRow[]): number {
  const seenCategories = new Set<number>();
  let total = 0;
  for (const row of rows) {
    if (row.categoryId !== null) {
      if (!seenCategories.has(row.categoryId)) {
        seenCategories.add(row.categoryId);
        total += row.actual;
      }
    } else {
      total += row.actual;
    }
  }
  return total;
}

export function buildBudgetComparison(
  items: BudgetItem[],
  actuals: BudgetActual[],
): BudgetSummary {
  const actualMap = new Map(actuals.map(a => [a.budgetItemId, a.actualAmount]));

  const rows: BudgetComparisonRow[] = items.map(item => {
    const actual = actualMap.get(item.id!) ?? 0;
    return {
      id: item.id!,
      name: item.name,
      type: item.type,
      isFixed: item.isFixed,
      budgeted: item.amount,
      actual,
      difference: item.amount - actual,
      categoryId: item.categoryId,
      debtId: item.debtId,
      linkedDescription: item.linkedDescription,
    };
  });

  const incomeRows = rows.filter(r => r.type === 'ingreso');
  const fixedExpenseRows = rows.filter(r => r.type === 'gasto' && r.isFixed);
  const variableExpenseRows = rows.filter(r => r.type === 'gasto' && !r.isFixed);

  const totalBudgetedIncome = incomeRows.reduce((s, r) => s + r.budgeted, 0);
  const totalActualIncome = deduplicatedActual(incomeRows);
  const totalBudgetedFixedExpenses = fixedExpenseRows.reduce((s, r) => s + r.budgeted, 0);
  const totalActualFixedExpenses = deduplicatedActual(fixedExpenseRows);
  const totalBudgetedVariableExpenses = variableExpenseRows.reduce((s, r) => s + r.budgeted, 0);
  const totalActualVariableExpenses = deduplicatedActual(variableExpenseRows);

  return {
    totalBudgetedIncome,
    totalActualIncome,
    totalBudgetedFixedExpenses,
    totalActualFixedExpenses,
    totalBudgetedVariableExpenses,
    totalActualVariableExpenses,
    projectedBalance: totalBudgetedIncome - totalBudgetedFixedExpenses - totalBudgetedVariableExpenses,
    actualBalance: totalActualIncome - totalActualFixedExpenses - totalActualVariableExpenses,
    rows,
  };
}
