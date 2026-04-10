// Infrastructure Adapter: PrismaTransactionRepository
// Implements ITransactionRepository port using Prisma

import { PrismaClient } from '../../../generated/prisma/client.js';
import {
  ITransactionRepository,
  TransactionFilters,
  SummaryFilters,
  SummaryResult,
  CycleInfo,
  TransactionDescription,
  ClassificationUpdate,
} from '../../../domain/ports/repositories/transaction.repository.port.js';
import { Transaction } from '../../../domain/entities/transaction.entity.js';

/**
 * Given a cycle start date (ISO string, e.g. "2025-12-25"), returns the
 * UTC Date objects for the start (inclusive) and end (inclusive) of that cycle.
 * End = start + 1 month - 1 day  →  e.g. 2025-12-25 → 2026-01-24
 */
function cycleToDateRange(cycleStart: string): { from: Date; to: Date } {
  const [year, month, day] = cycleStart.split('-').map(Number);
  const from = new Date(Date.UTC(year, month - 1, day));
  // Add one month then subtract one day for the inclusive end
  const to = new Date(Date.UTC(year, month, day - 1));
  return { from, to };
}

export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(tx: Transaction): Promise<Transaction> {
    const record = await this.prisma.transactions.create({
      data: {
        user_id: BigInt(tx.userId),
        account_id: BigInt(tx.accountId),
        import_id: tx.importId ? BigInt(tx.importId) : null,
        date: tx.date,
        description_raw: tx.descriptionRaw,
        description_clean: tx.descriptionClean,
        amount: tx.amount,
        type: tx.type,
        category_id: tx.categoryId ? BigInt(tx.categoryId) : null,
        merchant: tx.merchant,
        hash: tx.hash,
      },
    });

    // Set auto_classified separately via raw SQL (column added after initial schema generation)
    if (tx.autoClassified) {
      await this.prisma.$executeRaw`
        UPDATE transactions SET auto_classified = ${tx.autoClassified} WHERE id = ${record.id}
      `;
    }

    return Transaction.fromPersistence({
      id: Number(record.id),
      userId: Number(record.user_id),
      accountId: Number(record.account_id),
      importId: record.import_id ? Number(record.import_id) : null,
      date: record.date,
      descriptionRaw: record.description_raw,
      descriptionClean: record.description_clean,
      amount: Number(record.amount),
      type: record.type as 'debit' | 'credit',
      categoryId: record.category_id ? Number(record.category_id) : null,
      merchant: record.merchant,
      hash: record.hash,
      autoClassified: tx.autoClassified,
      createdAt: record.created_at,
    });
  }

  async existsByHash(hash: string): Promise<boolean> {
    const record = await this.prisma.transactions.findUnique({
      where: { hash },
      select: { id: true },
    });
    return record !== null;
  }

  async findAll(filters: TransactionFilters): Promise<{ data: Transaction[]; total: number }> {
    const where: Record<string, unknown> = {
      user_id: BigInt(filters.userId),
    };

    if (filters.categoryId) where['category_id'] = BigInt(filters.categoryId);
    if (filters.accountId) where['account_id'] = BigInt(filters.accountId);
    if (filters.cycle) {
      const { from, to } = cycleToDateRange(filters.cycle);
      where['date'] = { gte: from, lte: to };
    } else if (filters.from || filters.to) {
      const dateFilter: Record<string, Date> = {};
      if (filters.from) dateFilter['gte'] = new Date(filters.from);
      if (filters.to) dateFilter['lte'] = new Date(filters.to);
      where['date'] = dateFilter;
    }

    const [records, total] = await Promise.all([
      this.prisma.transactions.findMany({
        where,
        include: { category: true, account: true },
        orderBy: { date: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.transactions.count({ where }),
    ]);

    const data = records.map(r =>
      Transaction.fromPersistence({
        id: Number(r.id),
        userId: Number(r.user_id),
        accountId: Number(r.account_id),
        importId: r.import_id ? Number(r.import_id) : null,
        date: r.date,
        descriptionRaw: r.description_raw,
        descriptionClean: r.description_clean,
        amount: Number(r.amount),
        type: r.type as 'debit' | 'credit',
        categoryId: r.category_id ? Number(r.category_id) : null,
        categoryName: r.category?.name ?? null,
        merchant: r.merchant,
        hash: r.hash,
        autoClassified: (r as Record<string, unknown>)['auto_classified'] === true,
        accountName: r.account?.bank_name ?? null,
        createdAt: r.created_at,
      }),
    );

    return { data, total };
  }

  async getSummary(filters: SummaryFilters): Promise<SummaryResult> {
    const where: Record<string, unknown> = {
      user_id: BigInt(filters.userId),
    };

    if (filters.accountId) where['account_id'] = BigInt(filters.accountId);
    if (filters.cycle) {
      const { from, to } = cycleToDateRange(filters.cycle);
      where['date'] = { gte: from, lte: to };
    } else if (filters.from || filters.to) {
      const dateFilter: Record<string, Date> = {};
      if (filters.from) dateFilter['gte'] = new Date(filters.from);
      if (filters.to) dateFilter['lte'] = new Date(filters.to);
      where['date'] = dateFilter;
    }

    // Get totals by type
    const [debits, credits] = await Promise.all([
      this.prisma.transactions.aggregate({
        where: { ...where, type: 'debit' },
        _sum: { amount: true },
      }),
      this.prisma.transactions.aggregate({
        where: { ...where, type: 'credit' },
        _sum: { amount: true },
      }),
    ]);

    // Get totals by category
    const byCategory = await this.prisma.transactions.groupBy({
      by: ['category_id'],
      where,
      _sum: { amount: true },
    });

    // Resolve category names
    const categoryIds = byCategory
      .map(c => c.category_id)
      .filter((id): id is bigint => id !== null);

    const categories = categoryIds.length > 0
      ? await this.prisma.categories.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];

    const categoryMap = new Map(categories.map(c => [Number(c.id), c.name]));

    return {
      totalExpense: Number(debits._sum.amount ?? 0),
      totalIncome: Number(credits._sum.amount ?? 0),
      byCategory: byCategory.map(c => ({
        categoryId: c.category_id ? Number(c.category_id) : null,
        categoryName: c.category_id ? (categoryMap.get(Number(c.category_id)) ?? null) : null,
        total: Number(c._sum.amount ?? 0),
      })),
    };
  }

  async findDescriptions(userId: number): Promise<TransactionDescription[]> {
    const records = await this.prisma.transactions.findMany({
      where: { user_id: BigInt(userId) },
      select: { id: true, description_raw: true, description_clean: true, merchant: true, type: true },
    });
    return records.map(r => ({
      id: Number(r.id),
      descriptionRaw: r.description_raw,
      descriptionClean: r.description_clean,
      merchant: r.merchant,
      type: r.type as 'debit' | 'credit',
    }));
  }

  async updateClassifications(updates: ClassificationUpdate[]): Promise<number> {
    if (updates.length === 0) return 0;
    await Promise.all(
      updates.map(u =>
        u.merchant !== null
          ? this.prisma.$executeRaw`
              UPDATE transactions
              SET category_id     = ${BigInt(u.categoryId)},
                  merchant        = ${u.merchant},
                  auto_classified = ${u.autoClassified}
              WHERE id = ${BigInt(u.id)}
            `
          : this.prisma.$executeRaw`
              UPDATE transactions
              SET category_id     = ${BigInt(u.categoryId)},
                  auto_classified = ${u.autoClassified}
              WHERE id = ${BigInt(u.id)}
            `,
      ),
    );
    return updates.length;
  }

  async getAvailableCycles(userId: number, cycleStartDay: number): Promise<CycleInfo[]> {
    const result = await this.prisma.$queryRaw<{ cycle_start: Date }[]>`
      SELECT cycle_start FROM (
        SELECT DISTINCT get_cycle_start(date::date, ${cycleStartDay}) AS cycle_start
        FROM transactions
        WHERE user_id = ${BigInt(userId)}
        UNION
        SELECT DISTINCT cycle_start::date
        FROM budget_items
        WHERE user_id = ${BigInt(userId)}
      ) combined
      ORDER BY cycle_start DESC
    `;
    return result.map(r => {
      const start = r.cycle_start;
      // end = start + 1 month - 1 day
      const endDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate() - 1));
      return {
        start: start.toISOString().slice(0, 10),
        end: endDate.toISOString().slice(0, 10),
      };
    });
  }

  async countByAccountAndPeriods(accountId: number, yearMonths: string[]): Promise<number> {
    if (yearMonths.length === 0) return 0;
    const where = {
      account_id: BigInt(accountId),
      OR: yearMonths.map(month => {
        const start = new Date(`${month}-01T00:00:00.000Z`);
        const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        return { date: { gte: start, lte: end } };
      }),
    };
    return this.prisma.transactions.count({ where });
  }

  async deleteByAccountAndPeriods(accountId: number, yearMonths: string[]): Promise<number> {
    if (yearMonths.length === 0) return 0;
    const where = {
      account_id: BigInt(accountId),
      OR: yearMonths.map(month => {
        const start = new Date(`${month}-01T00:00:00.000Z`);
        const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        return { date: { gte: start, lte: end } };
      }),
    };
    const { count } = await this.prisma.transactions.deleteMany({ where });
    return count;
  }

  async findByMatchCriteria(accountId: number, date: Date, amount: number, type: 'debit' | 'credit'): Promise<Transaction[]> {
    const records = await this.prisma.transactions.findMany({
      where: {
        account_id: BigInt(accountId),
        date,
        amount,
        type,
      },
      include: { category: true, account: true },
    });

    return records.map(r =>
      Transaction.fromPersistence({
        id: Number(r.id),
        userId: Number(r.user_id),
        accountId: Number(r.account_id),
        importId: r.import_id ? Number(r.import_id) : null,
        date: r.date,
        descriptionRaw: r.description_raw,
        descriptionClean: r.description_clean,
        amount: Number(r.amount),
        type: r.type as 'debit' | 'credit',
        categoryId: r.category_id ? Number(r.category_id) : null,
        categoryName: r.category?.name ?? null,
        merchant: r.merchant,
        hash: r.hash,
        autoClassified: (r as Record<string, unknown>)['auto_classified'] === true,
        accountName: r.account?.bank_name ?? null,
        createdAt: r.created_at,
      }),
    );
  }

  async updateMerchantAndCategory(id: number, merchant: string, categoryId: number | null, autoClassified: boolean): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE transactions
      SET merchant        = ${merchant},
          category_id     = ${categoryId ? BigInt(categoryId) : null},
          auto_classified = ${autoClassified}
      WHERE id = ${BigInt(id)}
    `;
  }
}
