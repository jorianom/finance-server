// Use Case: Get Debt Detail
// Returns a single debt with its payments and calculated amortization schedule

import { IDebtRepository } from '../../domain/ports/repositories/debt.repository.port.js';
import { IDebtPaymentRepository } from '../../domain/ports/repositories/debt-payment.repository.port.js';
import { Debt, AmortizationRow } from '../../domain/entities/debt.entity.js';
import { DebtPayment } from '../../domain/entities/debt-payment.entity.js';

export interface DebtDetailResult {
  debt: Debt;
  payments: DebtPayment[];
  schedule: AmortizationRow[];
  fullSchedule: AmortizationRow[];
  totalInterestRemaining: number;
  monthsRemaining: number;
}

export class GetDebtDetailUseCase {
  constructor(
    private readonly debtRepo: IDebtRepository,
    private readonly paymentRepo: IDebtPaymentRepository,
  ) {}

  async execute(debtId: number, userId: number): Promise<DebtDetailResult | null> {
    const debt = await this.debtRepo.findById(debtId, userId);
    if (!debt) return null;

    const payments = await this.paymentRepo.findByDebtId(debtId);

    // Single source of truth: compute everything from initialBalance using the bank-accurate formula.
    // The Restante schedule is simply the tail of the full schedule after the paid months.
    const fullSchedule = debt.calculateAmortizationSchedule(debt.initialBalance);
    const schedule = fullSchedule.slice(payments.length);
    const totalInterestRemaining = schedule.reduce((sum, r) => sum + r.interest, 0);

    return {
      debt,
      payments,
      schedule,
      fullSchedule,
      totalInterestRemaining,
      monthsRemaining: schedule.length,
    };
  }
}
