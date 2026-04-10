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
  monthlyInsurance: number;
  startDate: string; // ISO date
  linkedDescription?: string | null;
  status: 'active' | 'paid_off' | 'pending';
  createdAt?: string;
}

export interface AmortizationRow {
  month: number;
  label: string; // e.g. "Abr 26"
  startBalance: number;
  payment: number;
  interest: number;
  insurance: number;
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
  readonly monthlyInsurance: number;
  readonly startDate: string;
  readonly linkedDescription: string | null;
  readonly status: 'active' | 'paid_off' | 'pending';
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
    this.monthlyInsurance = props.monthlyInsurance ?? 0;
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
    if (props.minPayment < 0) {
      throw new Error('Minimum payment cannot be negative');
    }
    return new Debt(props);
  }

  static fromPersistence(props: DebtProps): Debt {
    return new Debt(props);
  }

  /**
   * Calculate the amortization schedule from the current balance.
   * Uses French amortization: fixed payment, decreasing interest, increasing principal.
   * Interest = balance * monthlyRate (matches bank amortization tables).
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
    const payment = this.minPayment;
    const insurance = this.monthlyInsurance;

    // No payment defined — nothing to amortize
    if (payment <= 0) return rows;

    // If a labelFrom date is provided use it directly, otherwise fall back to startDate+1 month
    const labelBase = labelFrom ?? (() => {
      const s = new Date(this.startDate + 'T00:00:00');
      s.setMonth(s.getMonth() + 1);
      return s;
    })();
    const baseMonth = labelBase.getMonth();
    const baseYear = labelBase.getFullYear();

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    let monthIndex = 0;
    while (balance > 0.01 && monthIndex < maxMonths) {
      const labelMonth = (baseMonth + monthIndex) % 12;
      const labelYear = baseYear + Math.floor((baseMonth + monthIndex) / 12);
      const label = `${monthNames[labelMonth]} ${String(labelYear).slice(-2)}`;

      // Apply monthly rate directly — matches bank amortization tables
      const interest = Math.round(balance * this.monthlyRate);
      // Clamp to [0, balance]: prevents negative principal when payment < interest + insurance
      const principal = Math.min(Math.max(Math.round(payment - interest - insurance), 0), Math.round(balance));
      const endBalance = Math.max(Math.round(balance) - principal, 0);
      // Show the fixed scheduled payment on all rows; only the settlement (last) row differs
      const scheduledPayment = endBalance === 0 ? interest + insurance + principal : Math.round(payment);

      rows.push({
        month: monthIndex + 1,
        label,
        startBalance: Math.round(balance),
        payment: scheduledPayment,
        interest,
        insurance,
        principal,
        endBalance,
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
