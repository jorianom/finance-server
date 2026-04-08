// Infrastructure Adapter: PrismaImportRepository
// Implements IImportRepository port using Prisma

import { PrismaClient } from '../../../generated/prisma/client.js';
import {
  IImportRepository,
  CreateImportDTO,
} from '../../../domain/ports/repositories/import.repository.port.js';
import { ImportRecord } from '../../../domain/entities/import-record.entity.js';

export class PrismaImportRepository implements IImportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateImportDTO): Promise<ImportRecord> {
    const record = await this.prisma.imports.create({
      data: {
        user_id: BigInt(data.userId),
        account_id: BigInt(data.accountId),
        file_name: data.fileName,
        file_type: data.fileType,
        status: 'pending',
      },
    });

    return ImportRecord.fromPersistence({
      id: Number(record.id),
      userId: Number(record.user_id),
      accountId: Number(record.account_id),
      fileName: record.file_name,
      fileType: record.file_type as 'csv' | 'pdf',
      status: record.status as 'pending' | 'processed' | 'error',
      createdAt: record.created_at,
    });
  }

  async updateStatus(id: number, status: 'pending' | 'processed' | 'error'): Promise<void> {
    await this.prisma.imports.update({
      where: { id: BigInt(id) },
      data: { status },
    });
  }
}
