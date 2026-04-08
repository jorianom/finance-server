// Domain Entity: DebtPayment
// Represents a single payment recorded against a debt

export interface DebtPaymentProps {
  id?: number;
  debtId: number;
  cycleStart: string; // ISO date
  scheduledAmount: number;
  actualAmount: number;
  extraPayment: number;
  balanceAfter: number;
  createdAt?: string;
}

export class DebtPayment {
  readonly id?: number;
  readonly debtId: number;
  readonly cycleStart: string;
  readonly scheduledAmount: number;
  readonly actualAmount: number;
  readonly extraPayment: number;
  readonly balanceAfter: number;
  readonly createdAt?: string;

  private constructor(props: DebtPaymentProps) {
    this.id = props.id;
    this.debtId = props.debtId;
    this.cycleStart = props.cycleStart;
    this.scheduledAmount = props.scheduledAmount;
    this.actualAmount = props.actualAmount;
    this.extraPayment = props.extraPayment;
    this.balanceAfter = props.balanceAfter;
    this.createdAt = props.createdAt;
  }

  static create(props: DebtPaymentProps): DebtPayment {
    if (props.actualAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    return new DebtPayment(props);
  }

  static fromPersistence(props: DebtPaymentProps): DebtPayment {
    return new DebtPayment(props);
  }
}
