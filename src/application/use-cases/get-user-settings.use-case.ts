// Use Case: Get User Settings
// Returns user-level configuration like the budget cycle start day

import { IUserRepository } from '../../domain/ports/repositories/user.repository.port.js';

export class GetUserSettingsUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: number): Promise<{ cycleStartDay: number }> {
    const cycleStartDay = await this.userRepo.getCycleStartDay(userId);
    return { cycleStartDay };
  }
}
