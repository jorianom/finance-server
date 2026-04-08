// Use Case: Create Rule

import { IRuleRepository, CreateRuleDTO } from '../../domain/ports/repositories/rule.repository.port.js';
import { Rule } from '../../domain/entities/rule.entity.js';

export class CreateRuleUseCase {
  constructor(private readonly ruleRepo: IRuleRepository) {}

  async execute(data: CreateRuleDTO): Promise<Rule> {
    return this.ruleRepo.create(data);
  }
}
