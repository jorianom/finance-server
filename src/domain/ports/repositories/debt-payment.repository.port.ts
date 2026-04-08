// Port: IDebtPaymentRepository

import { DebtPayment } from '../../entities/debt-payment.entity.js';

export interface CreateDebtPaymentDTO {
  debtId: number;
  cycleStart: string;
  scheduledAmount: number;
  actualAmount: number;
  extraPayment: number;
  balanceAfter: number;
}

export interface UpdateDebtPaymentDTO {
  actualAmount?: number;
  extraPayment?: number;
  balanceAfter?: number;
}

export interface IDebtPaymentRepository {
  findByDebtId(debtId: number): Promise<DebtPayment[]>;
  findById(id: number): Promise<DebtPayment | null>;
  create(data: CreateDebtPaymentDTO): Promise<DebtPayment>;
  update(id: number, data: UpdateDebtPaymentDTO): Promise<DebtPayment>;
  delete(id: number): Promise<void>;
}
