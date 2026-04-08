// Value Object: RawTransaction
// Immutable output from parsers, before normalization

export interface RawTransaction {
  readonly date: string;
  readonly description: string;
  readonly amount: number;
  readonly type: 'debit' | 'credit';
}
