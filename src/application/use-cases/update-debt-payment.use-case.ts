// Use Case: Update Debt Payment
// Updates a payment and recalculates the debt's current_balance from all payments

import { IDebtRepository } from '../../domain/ports/repositories/debt.repository.port.js';
import { IDebtPaymentRepository, UpdateDebtPaymentDTO } from '../../domain/ports/repositories/debt-payment.repository.port.js';
import { DebtPayment } from '../../domain/entities/debt-payment.entity.js';

export interface UpdatePaymentInput {
  paymentId: number;
  debtId: number;
  userId: number;
  actualAmount: number;
}

export class UpdateDebtPaymentUseCase {
  constructor(
    private readonly debtRepo: IDebtRepository,
    private readonly paymentRepo: IDebtPaymentRepository,
  ) {}

  async execute(input: UpdatePaymentInput): Promise<DebtPayment> {
    const debt = await this.debtRepo.findById(input.debtId, input.userId);
    if (!debt) {
      throw new Error('Debt not found');
    }

    const existingPayment = await this.paymentRepo.findById(input.paymentId);
    if (!existingPayment || existingPayment.debtId !== input.debtId) {
      throw new Error('Payment not found');
    }

    // Recalculate derived fields based on the existing scheduled amount
    const extraPayment = Math.max(input.actualAmount - existingPayment.scheduledAmount, 0);

    // Recalculate balance: we need to replay from the debt's initial state
    // Get all payments for this debt in order
    const allPayments = await this.paymentRepo.findByDebtId(input.debtId);
    let balance = debt.initialBalance;

    for (const p of allPayments) {
      const amount = p.id === input.paymentId ? input.actualAmount : p.actualAmount;
      const interest = balance * debt.monthlyRate;
      const principalPaid = amount - interest;
      balance = Math.max(balance - principalPaid, 0);
    }

    const balanceAfter = Math.round(balance);

    // Find the balance_after for this specific payment by replaying up to it
    let paymentBalance = debt.initialBalance;
    let thisPaymentBalanceAfter = 0;
    for (const p of allPayments) {
      const amount = p.id === input.paymentId ? input.actualAmount : p.actualAmount;
      const interest = paymentBalance * debt.monthlyRate;
      const principalPaid = amount - interest;
      paymentBalance = Math.max(paymentBalance - principalPaid, 0);
      if (p.id === input.paymentId) {
        thisPaymentBalanceAfter = Math.round(paymentBalance);
      }
    }

    const dto: UpdateDebtPaymentDTO = {
      actualAmount: Math.round(input.actualAmount),
      extraPayment: Math.round(extraPayment),
      balanceAfter: thisPaymentBalanceAfter,
    };

    const payment = await this.paymentRepo.update(input.paymentId, dto);

    // Update debt's current balance to reflect all payments
    await this.debtRepo.updateCurrentBalance(input.debtId, balanceAfter);

    return payment;
  }
}
