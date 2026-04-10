// Infrastructure Adapter: PrismaDebtRepository
// Implements IDebtRepository port using Prisma

import { PrismaClient } from '../../../generated/prisma/client.js';
import {
  IDebtRepository,
  CreateDebtDTO,
  UpdateDebtDTO,
} from '../../../domain/ports/repositories/debt.repository.port.js';
import { Debt } from '../../../domain/entities/debt.entity.js';

function toDomain(r: {
  id: bigint;
  user_id: bigint | null;
  name: string;
  entity: string;
  initial_balance: { toNumber(): number } | number;
  current_balance: { toNumber(): number } | number;
  monthly_rate: { toNumber(): number } | number;
  min_payment: { toNumber(): number } | number;
  monthly_insurance: { toNumber(): number } | number | null | undefined;
  start_date: Date;
  linked_description: string | null;
  status: string;
  created_at: Date;
}): Debt {
  const toNum = (v: { toNumber(): number } | number) =>
    typeof v === 'number' ? v : v.toNumber();
  const toNumOrZero = (v: { toNumber(): number } | number | null | undefined) =>
    v == null ? 0 : typeof v === 'number' ? v : v.toNumber();

  // Auto-derive 'pending': first payment is startDate + 1 month.
  // If today is still before that date and the stored status is 'active', expose it as 'pending'.
  const firstPayment = new Date(r.start_date);
  firstPayment.setMonth(firstPayment.getMonth() + 1);
  firstPayment.setHours(0, 0, 0, 0);
  const computedStatus: 'active' | 'paid_off' | 'pending' =
    r.status === 'active' && new Date() < firstPayment
      ? 'pending'
      : (r.status as 'active' | 'paid_off' | 'pending');

  return Debt.fromPersistence({
    id: Number(r.id),
    userId: Number(r.user_id),
    name: r.name,
    entity: r.entity,
    initialBalance: toNum(r.initial_balance),
    currentBalance: toNum(r.current_balance),
    monthlyRate: toNum(r.monthly_rate),
    minPayment: toNum(r.min_payment),
    monthlyInsurance: toNumOrZero(r.monthly_insurance),
    startDate: r.start_date.toISOString().slice(0, 10),
    linkedDescription: r.linked_description,
    status: computedStatus,
    createdAt: r.created_at.toISOString(),
  });
}

export class PrismaDebtRepository implements IDebtRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: number): Promise<Debt[]> {
    const records = await this.prisma.debts.findMany({
      where: { user_id: BigInt(userId) },
      orderBy: { created_at: 'desc' },
    });
    return records.map(toDomain);
  }

  async findById(id: number, userId: number): Promise<Debt | null> {
    const record = await this.prisma.debts.findFirst({
      where: { id: BigInt(id), user_id: BigInt(userId) },
    });
    return record ? toDomain(record) : null;
  }

  async create(data: CreateDebtDTO): Promise<Debt> {
    const record = await this.prisma.debts.create({
      data: {
        user_id: BigInt(data.userId),
        name: data.name,
        entity: data.entity,
        initial_balance: data.initialBalance,
        current_balance: data.currentBalance,
        monthly_rate: data.monthlyRate,
        min_payment: data.minPayment,
        monthly_insurance: data.monthlyInsurance ?? 0,
        start_date: new Date(data.startDate + 'T00:00:00'),
        linked_description: data.linkedDescription ?? null,
        status: data.status ?? 'active',
      },
    });
    return toDomain(record);
  }

  async update(id: number, userId: number, data: UpdateDebtDTO): Promise<Debt> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.entity !== undefined && { entity: data.entity }),
      ...(data.currentBalance !== undefined && { current_balance: data.currentBalance }),
      ...(data.monthlyRate !== undefined && { monthly_rate: data.monthlyRate }),
      ...(data.minPayment !== undefined && { min_payment: data.minPayment }),
      ...(data.monthlyInsurance !== undefined && { monthly_insurance: data.monthlyInsurance }),
      ...(data.linkedDescription !== undefined && { linked_description: data.linkedDescription }),
      ...(data.status !== undefined && { status: data.status }),
    };
    const record = await this.prisma.debts.update({
      where: { id: BigInt(id), user_id: BigInt(userId) },
      data: updateData,
    });
    return toDomain(record);
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.prisma.debts.delete({
      where: { id: BigInt(id), user_id: BigInt(userId) },
    });
  }

  async updateCurrentBalance(id: number, balance: number): Promise<void> {
    await this.prisma.debts.update({
      where: { id: BigInt(id) },
      data: { current_balance: balance },
    });
  }
}
