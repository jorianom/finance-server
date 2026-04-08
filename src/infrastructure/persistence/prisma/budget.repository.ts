// Infrastructure Adapter: PrismaBudgetRepository
// Implements IBudgetRepository port using Prisma

import { PrismaClient } from '../../../generated/prisma/client.js';
import {
  IBudgetRepository,
  CreateBudgetItemDTO,
  UpdateBudgetItemDTO,
  BudgetActual,
} from '../../../domain/ports/repositories/budget.repository.port.js';
import { BudgetItem } from '../../../domain/entities/budget-item.entity.js';

/**
 * Given a cycle start ISO date, return the UTC Date range (from inclusive, to inclusive).
 * Same logic as cycleToDateRange in transaction.repository.ts.
 */
function cycleToDateRange(cycleStart: string): { from: Date; to: Date } {
  const [year, month, day] = cycleStart.split('-').map(Number);
  const from = new Date(Date.UTC(year, month - 1, day));
  const to = new Date(Date.UTC(year, month, day - 1));
  return { from, to };
}

/**
 * Calculate the previous cycle start date.
 * E.g. if cycleStart is 2026-04-25 and cycleStartDay is 25 → previous is 2026-03-25
 */
function previousCycleStart(cycleStart: string, cycleStartDay: number): string {
  const [year, month] = cycleStart.split('-').map(Number);
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const mm = String(prevMonth).padStart(2, '0');
  const dd = String(cycleStartDay).padStart(2, '0');
  return `${prevYear}-${mm}-${dd}`;
}

function toDomain(r: {
  id: bigint;
  user_id: bigint | null;
  cycle_start: Date;
  name: string;
  type: string;
  amount: { toNumber(): number } | number;
  is_fixed: boolean;
  category_id: bigint | null;
  debt_id?: bigint | null;
  linked_description: string | null;
  created_at: Date;
}): BudgetItem {
  const toNum = (v: { toNumber(): number } | number) =>
    typeof v === 'number' ? v : v.toNumber();

  return BudgetItem.fromPersistence({
    id: Number(r.id),
    userId: Number(r.user_id),
    cycleStart: r.cycle_start.toISOString().slice(0, 10),
    name: r.name,
    type: r.type as 'ingreso' | 'gasto',
    amount: toNum(r.amount),
    isFixed: r.is_fixed,
    categoryId: r.category_id ? Number(r.category_id) : null,
    debtId: r.debt_id ? Number(r.debt_id) : null,
    linkedDescription: r.linked_description,
    createdAt: r.created_at.toISOString(),
  });
}

export class PrismaBudgetRepository implements IBudgetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCycle(userId: number, cycleStart: string): Promise<BudgetItem[]> {
    const records = await this.prisma.budget_items.findMany({
      where: {
        user_id: BigInt(userId),
        cycle_start: new Date(cycleStart + 'T00:00:00Z'),
      },
      orderBy: [{ type: 'asc' }, { is_fixed: 'desc' }, { name: 'asc' }],
    });
    return records.map(toDomain);
  }

  async findPreviousCycle(userId: number, cycleStart: string, cycleStartDay: number): Promise<BudgetItem[]> {
    const prevCycle = previousCycleStart(cycleStart, cycleStartDay);
    return this.findByCycle(userId, prevCycle);
  }

  async create(data: CreateBudgetItemDTO): Promise<BudgetItem> {
    const record = await this.prisma.budget_items.create({
      data: {
        user_id: BigInt(data.userId),
        cycle_start: new Date(data.cycleStart + 'T00:00:00Z'),
        name: data.name,
        type: data.type,
        amount: data.amount,
        is_fixed: data.isFixed,
        category_id: data.categoryId ? BigInt(data.categoryId) : null,
        debt_id: data.debtId ? BigInt(data.debtId) : null,
        linked_description: data.linkedDescription ?? null,
      },
    });
    return toDomain(record);
  }

  async createMany(data: CreateBudgetItemDTO[]): Promise<BudgetItem[]> {
    const results: BudgetItem[] = [];
    for (const d of data) {
      results.push(await this.create(d));
    }
    return results;
  }

  async update(id: number, userId: number, data: UpdateBudgetItemDTO): Promise<BudgetItem> {
    const record = await this.prisma.budget_items.update({
      where: { id: BigInt(id), user_id: BigInt(userId) },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.isFixed !== undefined && { is_fixed: data.isFixed }),
        ...(data.categoryId !== undefined && { category_id: data.categoryId ? BigInt(data.categoryId) : null }),
        ...(data.debtId !== undefined && { debt_id: data.debtId ? BigInt(data.debtId) : null }),
        ...(data.linkedDescription !== undefined && { linked_description: data.linkedDescription }),
      },
    });
    return toDomain(record);
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.prisma.budget_items.delete({
      where: { id: BigInt(id), user_id: BigInt(userId) },
    });
  }

  async getActuals(userId: number, cycleStart: string, cycleStartDay: number): Promise<BudgetActual[]> {
    const items = await this.findByCycle(userId, cycleStart);
    if (items.length === 0) return [];

    const { from, to } = cycleToDateRange(cycleStart);
    const results: BudgetActual[] = [];

    // Items with keyword: match by description — always exact, no sharing
    const keywordItems = items.filter(i => i.linkedDescription);
    for (const item of keywordItems) {
      const matched = await this.prisma.$queryRawUnsafe<{ total: string }[]>(
        `SELECT COALESCE(SUM(amount), 0)::text AS total
         FROM transactions
         WHERE user_id = $1
           AND date >= $2 AND date <= $3
           AND (LOWER(description_clean) LIKE $4 OR LOWER(description_raw) LIKE $4)`,
        BigInt(userId), from, to,
        `%${item.linkedDescription!.toLowerCase()}%`,
      );
      results.push({ budgetItemId: item.id!, actualAmount: Number(matched[0]?.total ?? 0) });
    }

    // Items with only category_id: return full category total to every item sharing it
    const categoryOnlyItems = items.filter(i => !i.linkedDescription && i.categoryId);
    if (categoryOnlyItems.length > 0) {
      const categoryIds = [...new Set(categoryOnlyItems.map(i => BigInt(i.categoryId!)))];
      const rows = await this.prisma.$queryRaw<{ category_id: bigint; total: string }[]>`
        SELECT category_id, COALESCE(SUM(amount), 0)::text AS total
        FROM transactions
        WHERE user_id = ${BigInt(userId)}
          AND date >= ${from} AND date <= ${to}
          AND category_id = ANY(${categoryIds})
        GROUP BY category_id
      `;
      const categoryTotalsMap = new Map(rows.map(r => [Number(r.category_id), Number(r.total)]));
      for (const item of categoryOnlyItems) {
        results.push({ budgetItemId: item.id!, actualAmount: categoryTotalsMap.get(item.categoryId!) ?? 0 });
      }
    }

    // Items with no link
    for (const item of items.filter(i => !i.linkedDescription && !i.categoryId)) {
      results.push({ budgetItemId: item.id!, actualAmount: 0 });
    }

    return results;
  }
}
