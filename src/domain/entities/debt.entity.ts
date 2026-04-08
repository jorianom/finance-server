// Domain Entity: Debt
// Represents a user's debt with amortization calculation capability

export interface DebtProps {
  id?: number;
  userId: number;
  name: string;
  entity: string;
  initialBalance: number;
  currentBalance: number;
  monthlyRate: number;
  minPayment: number;
  startDate: string; // ISO date
  linkedDescription?: string | null;
  status: 'active' | 'paid_off';
  createdAt?: string;
}

export interface AmortizationRow {
  month: number;
  label: string; // e.g. "Abr 26"
  startBalance: number;
  payment: number;
  interest: number;
  principal: number;
  endBalance: number;
}

export class Debt {
  readonly id?: number;
  readonly userId: number;
  readonly name: string;
  readonly entity: string;
  readonly initialBalance: number;
  readonly currentBalance: number;
  readonly monthlyRate: number;
  readonly minPayment: number;
  readonly startDate: string;
  readonly linkedDescription: string | null;
  readonly status: 'active' | 'paid_off';
  readonly createdAt?: string;

  private constructor(props: DebtProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.name = props.name;
    this.entity = props.entity;
    this.initialBalance = props.initialBalance;
    this.currentBalance = props.currentBalance;
    this.monthlyRate = props.monthlyRate;
    this.minPayment = props.minPayment;
    this.startDate = props.startDate;
    this.linkedDescription = props.linkedDescription ?? null;
    this.status = props.status;
    this.createdAt = props.createdAt;
  }

  static create(props: DebtProps): Debt {
    if (!props.name.trim()) {
      throw new Error('Debt name cannot be empty');
    }
    if (props.initialBalance <= 0) {
      throw new Error('Initial balance must be greater than zero');
    }
    if (props.monthlyRate < 0) {
      throw new Error('Monthly rate cannot be negative');
    }
    if (props.minPayment <= 0) {
      throw new Error('Minimum payment must be greater than zero');
    }
    return new Debt(props);
  }

  static fromPersistence(props: DebtProps): Debt {
    return new Debt(props);
  }

  /**
   * Calculate the amortization schedule from the current balance.
   * Uses French amortization: fixed payment, decreasing interest, increasing principal.
   * @param fromBalance - starting balance (defaults to currentBalance)
   * @param maxMonths - safety limit to prevent infinite loops (default 600 = 50 years)
   * @param labelFrom - date to use for the first row label (defaults to startDate+1 month)
   */
  calculateAmortizationSchedule(
    fromBalance?: number,
    maxMonths = 600,
    labelFrom?: Date,
  ): AmortizationRow[] {
    const rows: AmortizationRow[] = [];
    let balance = fromBalance ?? this.currentBalance;
    const rate = this.monthlyRate;
    const payment = this.minPayment;

    // If a labelFrom date is provided use it directly, otherwise fall back to startDate+1 month
    const labelBase = labelFrom ?? (() => {
      const s = new Date(this.startDate + 'T00:00:00');
      s.setMonth(s.getMonth() + 1);
      return s;
    })();
    let currentMonth = labelBase.getMonth();
    let currentYear = labelBase.getFullYear();

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    let monthIndex = 0;
    while (balance > 0.01 && monthIndex < maxMonths) {
      const interest = Math.round(balance * rate);
      const principal = Math.min(payment - interest, balance);
      const actualPayment = interest + principal;
      const endBalance = Math.max(balance - principal, 0);

      const labelMonth = (currentMonth + monthIndex) % 12;
      const labelYear = currentYear + Math.floor((currentMonth + monthIndex) / 12);
      const label = `${monthNames[labelMonth]} ${String(labelYear).slice(-2)}`;

      rows.push({
        month: monthIndex + 1,
        label,
        startBalance: Math.round(balance),
        payment: Math.round(actualPayment),
        interest,
        principal: Math.round(principal),
        endBalance: Math.round(endBalance),
      });

      balance = endBalance;
      monthIndex++;
    }

    return rows;
  }

  /**
   * Calculate total interest for the remaining schedule.
   */
  getTotalInterest(fromBalance?: number): number {
    const schedule = this.calculateAmortizationSchedule(fromBalance);
    return schedule.reduce((sum, row) => sum + row.interest, 0);
  }
}
