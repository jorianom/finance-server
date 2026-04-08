// Use Case: Record Debt Payment
// Records a payment, calculates derived fields, and updates the debt's current_balance

import { IDebtRepository } from '../../domain/ports/repositories/debt.repository.port.js';
import { IDebtPaymentRepository, CreateDebtPaymentDTO } from '../../domain/ports/repositories/debt-payment.repository.port.js';
import { DebtPayment } from '../../domain/entities/debt-payment.entity.js';

export interface RecordPaymentInput {
  debtId: number;
  userId: number;
  cycleStart: string;
  actualAmount: number;
}

export class RecordDebtPaymentUseCase {
  constructor(
    private readonly debtRepo: IDebtRepository,
    private readonly paymentRepo: IDebtPaymentRepository,
  ) {}

  async execute(input: RecordPaymentInput): Promise<DebtPayment> {
    const debt = await this.debtRepo.findById(input.debtId, input.userId);
    if (!debt) {
      throw new Error('Debt not found');
    }

    // Calculate scheduled amount (interest + minimum principal)
    const interest = debt.currentBalance * debt.monthlyRate;
    const scheduledAmount = debt.minPayment;

    // Calculate derived fields
    const extraPayment = Math.max(input.actualAmount - scheduledAmount, 0);
    const principalPaid = input.actualAmount - interest;
    const balanceAfter = Math.max(debt.currentBalance - principalPaid, 0);

    const dto: CreateDebtPaymentDTO = {
      debtId: input.debtId,
      cycleStart: input.cycleStart,
      scheduledAmount: Math.round(scheduledAmount),
      actualAmount: Math.round(input.actualAmount),
      extraPayment: Math.round(extraPayment),
      balanceAfter: Math.round(balanceAfter),
    };

    const payment = await this.paymentRepo.create(dto);

    // Update the debt's current balance
    await this.debtRepo.updateCurrentBalance(input.debtId, Math.round(balanceAfter));

    return payment;
  }
}
