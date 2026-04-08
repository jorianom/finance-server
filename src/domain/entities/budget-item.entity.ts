// Domain Entity: BudgetItem
// A single line item in a cycle's budget (income or expense, fixed or variable)

export interface BudgetItemProps {
  id?: number;
  userId: number;
  cycleStart: string; // ISO date, e.g. "2026-03-25"
  name: string;
  type: 'ingreso' | 'gasto';
  amount: number;
  isFixed: boolean;
  categoryId?: number | null;
  debtId?: number | null;
  linkedDescription?: string | null;
  createdAt?: string;
}

export class BudgetItem {
  readonly id?: number;
  readonly userId: number;
  readonly cycleStart: string;
  readonly name: string;
  readonly type: 'ingreso' | 'gasto';
  readonly amount: number;
  readonly isFixed: boolean;
  readonly categoryId: number | null;
  readonly debtId: number | null;
  readonly linkedDescription: string | null;
  readonly createdAt?: string;

  private constructor(props: BudgetItemProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.cycleStart = props.cycleStart;
    this.name = props.name;
    this.type = props.type;
    this.amount = props.amount;
    this.isFixed = props.isFixed;
    this.categoryId = props.categoryId ?? null;
    this.debtId = props.debtId ?? null;
    this.linkedDescription = props.linkedDescription ?? null;
    this.createdAt = props.createdAt;
  }

  static create(props: BudgetItemProps): BudgetItem {
    if (!props.name.trim()) {
      throw new Error('Budget item name cannot be empty');
    }
    if (props.amount < 0) {
      throw new Error('Budget item amount cannot be negative');
    }
    return new BudgetItem(props);
  }

  static fromPersistence(props: BudgetItemProps): BudgetItem {
    return new BudgetItem(props);
  }
}
