// Use Case: Update Rule

import { IRuleRepository, UpdateRuleDTO } from '../../domain/ports/repositories/rule.repository.port.js';
import { Rule } from '../../domain/entities/rule.entity.js';

export class UpdateRuleUseCase {
  constructor(private readonly ruleRepo: IRuleRepository) {}

  async execute(id: number, userId: number, data: UpdateRuleDTO): Promise<Rule> {
    return this.ruleRepo.update(id, userId, data);
  }
}
