// Use Case: Update User Settings
// Persists user-level configuration changes

import { IUserRepository } from '../../domain/ports/repositories/user.repository.port.js';

export class UpdateUserSettingsUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: number, cycleStartDay: number): Promise<{ cycleStartDay: number }> {
    await this.userRepo.updateCycleStartDay(userId, cycleStartDay);
    return { cycleStartDay };
  }
}
