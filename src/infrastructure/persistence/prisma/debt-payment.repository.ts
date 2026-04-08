// Infrastructure Adapter: PrismaDebtPaymentRepository
// Implements IDebtPaymentRepository port using Prisma

import { PrismaClient } from '../../../generated/prisma/client.js';
import {
  IDebtPaymentRepository,
  CreateDebtPaymentDTO,
  UpdateDebtPaymentDTO,
} from '../../../domain/ports/repositories/debt-payment.repository.port.js';
import { DebtPayment } from '../../../domain/entities/debt-payment.entity.js';

function toDomain(r: {
  id: bigint;
  debt_id: bigint;
  cycle_start: Date;
  scheduled_amount: { toNumber(): number } | number;
  actual_amount: { toNumber(): number } | number;
  extra_payment: { toNumber(): number } | number;
  balance_after: { toNumber(): number } | number;
  created_at: Date;
}): DebtPayment {
  const toNum = (v: { toNumber(): number } | number) =>
    typeof v === 'number' ? v : v.toNumber();

  return DebtPayment.fromPersistence({
    id: Number(r.id),
    debtId: Number(r.debt_id),
    cycleStart: r.cycle_start.toISOString().slice(0, 10),
    scheduledAmount: toNum(r.scheduled_amount),
    actualAmount: toNum(r.actual_amount),
    extraPayment: toNum(r.extra_payment),
    balanceAfter: toNum(r.balance_after),
    createdAt: r.created_at.toISOString(),
  });
}

export class PrismaDebtPaymentRepository implements IDebtPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByDebtId(debtId: number): Promise<DebtPayment[]> {
    const records = await this.prisma.debt_payments.findMany({
      where: { debt_id: BigInt(debtId) },
      orderBy: { cycle_start: 'asc' },
    });
    return records.map(toDomain);
  }

  async findById(id: number): Promise<DebtPayment | null> {
    const record = await this.prisma.debt_payments.findUnique({
      where: { id: BigInt(id) },
    });
    return record ? toDomain(record) : null;
  }

  async create(data: CreateDebtPaymentDTO): Promise<DebtPayment> {
    const record = await this.prisma.debt_payments.create({
      data: {
        debt_id: BigInt(data.debtId),
        cycle_start: new Date(data.cycleStart + 'T00:00:00'),
        scheduled_amount: data.scheduledAmount,
        actual_amount: data.actualAmount,
        extra_payment: data.extraPayment,
        balance_after: data.balanceAfter,
      },
    });
    return toDomain(record);
  }

  async update(id: number, data: UpdateDebtPaymentDTO): Promise<DebtPayment> {
    const record = await this.prisma.debt_payments.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.actualAmount !== undefined && { actual_amount: data.actualAmount }),
        ...(data.extraPayment !== undefined && { extra_payment: data.extraPayment }),
        ...(data.balanceAfter !== undefined && { balance_after: data.balanceAfter }),
      },
    });
    return toDomain(record);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.debt_payments.delete({
      where: { id: BigInt(id) },
    });
  }
}
