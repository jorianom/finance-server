// Port: IRuleRepository

import { Rule } from '../../entities/rule.entity.js';

export interface CreateRuleDTO {
  userId: number;
  keyword: string;
  categoryId: number;
  merchantName?: string;
  priority: number;
}

export interface UpdateRuleDTO {
  keyword?: string;
  categoryId?: number;
  merchantName?: string | null;
  priority?: number;
}

export interface IRuleRepository {
  findByUserId(userId: number): Promise<Rule[]>;
  create(data: CreateRuleDTO): Promise<Rule>;
  findAll(userId: number): Promise<Rule[]>;
  update(id: number, userId: number, data: UpdateRuleDTO): Promise<Rule>;
}
