// Use Case: Delete Debt Payment
// Deletes a payment and recalculates the debt's current_balance

import { IDebtRepository } from '../../domain/ports/repositories/debt.repository.port.js';
import { IDebtPaymentRepository } from '../../domain/ports/repositories/debt-payment.repository.port.js';

export class DeleteDebtPaymentUseCase {
  constructor(
    private readonly debtRepo: IDebtRepository,
    private readonly paymentRepo: IDebtPaymentRepository,
  ) {}

  async execute(paymentId: number, debtId: number, userId: number): Promise<void> {
    const debt = await this.debtRepo.findById(debtId, userId);
    if (!debt) {
      throw new Error('Debt not found');
    }

    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment || payment.debtId !== debtId) {
      throw new Error('Payment not found');
    }

    await this.paymentRepo.delete(paymentId);

    // Recalculate current balance from remaining payments
    const remainingPayments = await this.paymentRepo.findByDebtId(debtId);
    let balance = debt.initialBalance;

    for (const p of remainingPayments) {
      const interest = balance * debt.monthlyRate;
      const principalPaid = p.actualAmount - interest;
      balance = Math.max(balance - principalPaid, 0);
    }

    await this.debtRepo.updateCurrentBalance(debtId, Math.round(balance));
  }
}
