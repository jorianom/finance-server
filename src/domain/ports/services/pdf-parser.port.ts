// Port: IPdfTransactionParser
// Contract for bank-specific PDF parsers (separate from CSV ITransactionParser)

import { RawTransaction } from '../../value-objects/raw-transaction.js';

export interface IPdfTransactionParser {
  readonly bankName: string;
  /** When true, duplicate checking is skipped for this bank's transactions */
  readonly allowDuplicates?: boolean;
  detect(text: string): boolean;
  parse(text: string): RawTransaction[];
}
