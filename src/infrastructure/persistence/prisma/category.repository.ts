// Infrastructure Adapter: PrismaCategoryRepository

import { PrismaClient } from '../../../generated/prisma/client.js';
import {
  ICategoryRepository,
  DefaultCategoryIds,
} from '../../../domain/ports/repositories/category.repository.port.js';

export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findDefaultCategoryIds(userId: number): Promise<DefaultCategoryIds> {
    const categories = await this.prisma.categories.findMany({
      where: { user_id: BigInt(userId) },
      select: { id: true, name: true, type: true },
      orderBy: { id: 'asc' },
    });

    // Prefer dedicated fallback categories by name; otherwise use first of each type
    const income =
      categories.find(c => c.name === 'Ingresos General') ??
      categories.find(c => c.type === 'ingreso' || c.type === 'income');
    const expense =
      categories.find(c => c.name === 'Gastos General') ??
      categories.find(c => c.type === 'gasto' || c.type === 'expense');

    return {
      incomeCategoryId: income ? Number(income.id) : null,
      expenseCategoryId: expense ? Number(expense.id) : null,
    };
  }
}
