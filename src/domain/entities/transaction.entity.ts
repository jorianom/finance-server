// Domain Entity: Transaction
// Pure domain object — no framework dependencies

export interface TransactionProps {
  id?: number;
  userId: number;
  accountId: number;
  importId?: number | null;
  date: Date;
  descriptionRaw: string;
  descriptionClean?: string | null;
  amount: number;
  type: 'debit' | 'credit';
  categoryId?: number | null;
  categoryName?: string | null;
  merchant?: string | null;
  hash?: string | null;
  autoClassified?: boolean;
  accountName?: string | null;
  createdAt?: Date;
}

export class Transaction {
  readonly id?: number;
  readonly userId: number;
  readonly accountId: number;
  readonly importId: number | null;
  readonly date: Date;
  readonly descriptionRaw: string;
  readonly descriptionClean: string | null;
  readonly amount: number;
  readonly type: 'debit' | 'credit';
  readonly categoryId: number | null;
  readonly categoryName: string | null;
  readonly merchant: string | null;
  readonly hash: string | null;
  readonly autoClassified: boolean;
  readonly accountName: string | null;
  readonly createdAt?: Date;

  private constructor(props: TransactionProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.accountId = props.accountId;
    this.importId = props.importId ?? null;
    this.date = props.date;
    this.descriptionRaw = props.descriptionRaw;
    this.descriptionClean = props.descriptionClean ?? null;
    this.amount = props.amount;
    this.type = props.type;
    this.categoryId = props.categoryId ?? null;
    this.categoryName = props.categoryName ?? null;
    this.merchant = props.merchant ?? null;
    this.hash = props.hash ?? null;
    this.autoClassified = props.autoClassified ?? false;
    this.accountName = props.accountName ?? null;
    this.createdAt = props.createdAt;
  }

  static create(props: TransactionProps): Transaction {
    if (props.amount <= 0) {
      throw new Error('Transaction amount must be greater than 0');
    }
    if (!['debit', 'credit'].includes(props.type)) {
      throw new Error('Transaction type must be debit or credit');
    }
    return new Transaction(props);
  }

  static fromPersistence(props: TransactionProps): Transaction {
    return new Transaction(props);
  }
}
