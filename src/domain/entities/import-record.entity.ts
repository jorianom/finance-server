// Domain Entity: ImportRecord
// Encapsulates valid state transitions for an import

export type ImportStatus = 'pending' | 'processed' | 'error';

export interface ImportRecordProps {
  id?: number;
  userId: number;
  accountId: number;
  fileName: string;
  fileType: 'csv' | 'pdf';
  status: ImportStatus;
  createdAt?: Date;
}

export class ImportRecord {
  readonly id?: number;
  readonly userId: number;
  readonly accountId: number;
  readonly fileName: string;
  readonly fileType: 'csv' | 'pdf';
  private _status: ImportStatus;
  readonly createdAt?: Date;

  private constructor(props: ImportRecordProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.accountId = props.accountId;
    this.fileName = props.fileName;
    this.fileType = props.fileType;
    this._status = props.status;
    this.createdAt = props.createdAt;
  }

  get status(): ImportStatus {
    return this._status;
  }

  static create(props: Omit<ImportRecordProps, 'status'>): ImportRecord {
    return new ImportRecord({ ...props, status: 'pending' });
  }

  static fromPersistence(props: ImportRecordProps): ImportRecord {
    return new ImportRecord(props);
  }

  markProcessed(): void {
    if (this._status !== 'pending') {
      throw new Error(`Cannot mark as processed from status: ${this._status}`);
    }
    this._status = 'processed';
  }

  markError(): void {
    this._status = 'error';
  }
}
