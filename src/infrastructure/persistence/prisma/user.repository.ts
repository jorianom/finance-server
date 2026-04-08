// Infrastructure Adapter: PrismaUserRepository
// Implements IUserRepository port using Prisma

import { PrismaClient } from '../../../generated/prisma/client.js';
import { IUserRepository } from '../../../domain/ports/repositories/user.repository.port.js';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getCycleStartDay(userId: number): Promise<number> {
    const user = await this.prisma.users.findFirst({
      where: { id: BigInt(userId) },
      select: { cycle_start_day: true },
    });
    return user?.cycle_start_day ?? 25;
  }

  async updateCycleStartDay(userId: number, day: number): Promise<void> {
    await this.prisma.users.update({
      where: { id: BigInt(userId) },
      data: { cycle_start_day: day },
    });
  }
}
