// Domain Error: PeriodConflictError
// Thrown when re-importing a bank (allowDuplicates) that already has data for the same period

export class PeriodConflictError extends Error {
  constructor(
    public readonly period: string,      // e.g. "2026-01"
    public readonly existingCount: number,
  ) {
    super(`Ya existen ${existingCount} transacciones para el período ${period}`);
    this.name = 'PeriodConflictError';
  }
}
