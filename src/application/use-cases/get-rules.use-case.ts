// Use Case: Get Rules

import { IRuleRepository } from '../../domain/ports/repositories/rule.repository.port.js';
import { Rule } from '../../domain/entities/rule.entity.js';

export class GetRulesUseCase {
  constructor(private readonly ruleRepo: IRuleRepository) {}

  async execute(userId: number): Promise<Rule[]> {
    return this.ruleRepo.findAll(userId);
  }
}
