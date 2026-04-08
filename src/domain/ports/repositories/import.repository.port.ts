// Port: IImportRepository

import { ImportRecord } from '../../entities/import-record.entity.js';

export interface CreateImportDTO {
  userId: number;
  accountId: number;
  fileName: string;
  fileType: 'csv' | 'pdf';
}

export interface IImportRepository {
  create(data: CreateImportDTO): Promise<ImportRecord>;
  updateStatus(id: number, status: 'pending' | 'processed' | 'error'): Promise<void>;
}
