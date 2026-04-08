// Port: ITransactionParser
// Contract for bank-specific CSV parsers

import { RawTransaction } from '../../value-objects/raw-transaction.js';

export interface ITransactionParser {
  readonly bankName: string;
  /** When true, duplicate checking is skipped for this bank's transactions */
  readonly allowDuplicates?: boolean;
  detect(headers: string[]): boolean;
  parse(content: string): RawTransaction[];
}
