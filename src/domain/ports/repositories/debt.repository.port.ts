// Port: IDebtRepository

import { Debt } from '../../entities/debt.entity.js';

export interface CreateDebtDTO {
  userId: number;
  name: string;
  entity: string;
  initialBalance: number;
  currentBalance: number;
  monthlyRate: number;
  minPayment: number;
  monthlyInsurance: number;
  startDate: string;
  linkedDescription?: string;
  status?: 'active' | 'paid_off' | 'pending';
}

export interface UpdateDebtDTO {
  name?: string;
  entity?: string;
  currentBalance?: number;
  monthlyRate?: number;
  minPayment?: number;
  monthlyInsurance?: number;
  linkedDescription?: string | null;
  status?: 'active' | 'paid_off' | 'pending';
}

export interface IDebtRepository {
  findByUserId(userId: number): Promise<Debt[]>;
  findById(id: number, userId: number): Promise<Debt | null>;
  create(data: CreateDebtDTO): Promise<Debt>;
  update(id: number, userId: number, data: UpdateDebtDTO): Promise<Debt>;
  delete(id: number, userId: number): Promise<void>;
  updateCurrentBalance(id: number, balance: number): Promise<void>;
}
