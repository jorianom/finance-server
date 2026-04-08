// Port: IUserRepository
// Contract for user preference persistence

export interface IUserRepository {
  getCycleStartDay(userId: number): Promise<number>;
  updateCycleStartDay(userId: number, day: number): Promise<void>;
}
