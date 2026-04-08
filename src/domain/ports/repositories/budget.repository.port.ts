// Port: IBudgetRepository

import { BudgetItem } from '../../entities/budget-item.entity.js';

export interface CreateBudgetItemDTO {
  userId: number;
  cycleStart: string;
  name: string;
  type: 'ingreso' | 'gasto';
  amount: number;
  isFixed: boolean;
  categoryId?: number | null;
  debtId?: number | null;
  linkedDescription?: string | null;
}

export interface UpdateBudgetItemDTO {
  name?: string;
  type?: 'ingreso' | 'gasto';
  amount?: number;
  isFixed?: boolean;
  categoryId?: number | null;
  debtId?: number | null;
  linkedDescription?: string | null;
}

export interface BudgetActual {
  /** Budget item id */
  budgetItemId: number;
  /** Sum of matching transactions */
  actualAmount: number;
}

export interface IBudgetRepository {
  findByCycle(userId: number, cycleStart: string): Promise<BudgetItem[]>;
  findPreviousCycle(userId: number, cycleStart: string, cycleStartDay: number): Promise<BudgetItem[]>;
  create(data: CreateBudgetItemDTO): Promise<BudgetItem>;
  createMany(data: CreateBudgetItemDTO[]): Promise<BudgetItem[]>;
  update(id: number, userId: number, data: UpdateBudgetItemDTO): Promise<BudgetItem>;
  delete(id: number, userId: number): Promise<void>;
  /**
   * For each budget item, find actual spending from transactions in the cycle.
   * Matches by linked_description (ILIKE) or category_id within the cycle date range.
   */
  getActuals(userId: number, cycleStart: string, cycleStartDay: number): Promise<BudgetActual[]>;
}
