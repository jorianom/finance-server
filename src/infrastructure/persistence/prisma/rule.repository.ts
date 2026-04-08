// Infrastructure Adapter: PrismaRuleRepository
// Implements IRuleRepository port using Prisma

import { PrismaClient } from '../../../generated/prisma/client.js';
import {
  IRuleRepository,
  CreateRuleDTO,
  UpdateRuleDTO,
} from '../../../domain/ports/repositories/rule.repository.port.js';
import { Rule } from '../../../domain/entities/rule.entity.js';

export class PrismaRuleRepository implements IRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: number): Promise<Rule[]> {
    const records = await this.prisma.rules.findMany({
      where: { user_id: BigInt(userId) },
      orderBy: { priority: 'asc' },
    });

    return records.map(r =>
      Rule.fromPersistence({
        id: Number(r.id),
        userId: Number(r.user_id),
        keyword: r.keyword,
        categoryId: Number(r.category_id),
        merchantName: r.merchant_name,
        priority: r.priority,
      }),
    );
  }

  async create(data: CreateRuleDTO): Promise<Rule> {
    const record = await this.prisma.rules.create({
      data: {
        user_id: BigInt(data.userId),
        keyword: data.keyword,
        category_id: BigInt(data.categoryId),
        merchant_name: data.merchantName ?? null,
        priority: data.priority,
      },
    });

    return Rule.fromPersistence({
      id: Number(record.id),
      userId: Number(record.user_id),
      keyword: record.keyword,
      categoryId: Number(record.category_id),
      merchantName: record.merchant_name,
      priority: record.priority,
    });
  }

  async findAll(userId: number): Promise<Rule[]> {
    return this.findByUserId(userId);
  }

  async update(id: number, userId: number, data: UpdateRuleDTO): Promise<Rule> {
    const record = await this.prisma.rules.update({
      where: { id: BigInt(id), user_id: BigInt(userId) },
      data: {
        ...(data.keyword !== undefined && { keyword: data.keyword }),
        ...(data.categoryId !== undefined && { category_id: BigInt(data.categoryId) }),
        ...(data.merchantName !== undefined && { merchant_name: data.merchantName }),
        ...(data.priority !== undefined && { priority: data.priority }),
      },
    });

    return Rule.fromPersistence({
      id: Number(record.id),
      userId: Number(record.user_id),
      keyword: record.keyword,
      categoryId: Number(record.category_id),
      merchantName: record.merchant_name,
      priority: record.priority,
    });
  }
}
