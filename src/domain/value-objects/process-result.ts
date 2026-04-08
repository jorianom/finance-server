// Value Object: ProcessResult
// Summarizes the outcome of a transaction import pipeline

export interface ProcessResult {
  readonly total: number;
  readonly created: number;
  readonly duplicates: number;
  readonly errors: number;
  readonly replaced?: number;
}
