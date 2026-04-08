// Port: ITransactionRepository
// Contract that persistence adapters must fulfill

import { Transaction } from '../../entities/transaction.entity.js';

export interface TransactionFilters {
  userId: number;
  page: number;
  limit: number;
  categoryId?: number;
  accountId?: number;
  from?: string;
  to?: string;
  cycle?: string; // ISO date string marking the start of a budget cycle, e.g. "2025-12-25"
}

export interface SummaryFilters {
  userId: number;
  accountId?: number;
  from?: string;
  to?: string;
  cycle?: string; // ISO date string marking the start of a budget cycle
}

export interface CycleInfo {
  start: string; // ISO date, e.g. "2025-12-25"
  end: string;   // ISO date, e.g. "2026-01-24"
}

export interface CategorySummary {
  categoryId: number | null;
  categoryName: string | null;
  total: number;
}

export interface SummaryResult {
  totalIncome: number;
  totalExpense: number;
  byCategory: CategorySummary[];
}

export interface TransactionDescription {
  id: number;
  descriptionRaw: string;
  descriptionClean: string | null;
  type: 'debit' | 'credit';
}

export interface ClassificationUpdate {
  id: number;
  categoryId: number;
  merchant: string | null;
  autoClassified: boolean;
}

export interface ITransactionRepository {
  save(tx: Transaction): Promise<Transaction>;
  existsByHash(hash: string): Promise<boolean>;
  findAll(filters: TransactionFilters): Promise<{ data: Transaction[]; total: number }>;
  getSummary(filters: SummaryFilters): Promise<SummaryResult>;
  findDescriptions(userId: number): Promise<TransactionDescription[]>;
  updateClassifications(updates: ClassificationUpdate[]): Promise<number>;
  getAvailableCycles(userId: number, cycleStartDay: number): Promise<CycleInfo[]>;
  countByAccountAndPeriods(accountId: number, yearMonths: string[]): Promise<number>;
  deleteByAccountAndPeriods(accountId: number, yearMonths: string[]): Promise<number>;
  findByMatchCriteria(accountId: number, date: Date, amount: number, type: 'debit' | 'credit'): Promise<Transaction[]>;
  updateMerchantAndCategory(id: number, merchant: string, categoryId: number | null, autoClassified: boolean): Promise<void>;
}
