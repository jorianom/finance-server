// Port: ICategoryRepository

export interface DefaultCategoryIds {
  incomeCategoryId: number | null;
  expenseCategoryId: number | null;
}

export interface ICategoryRepository {
  findDefaultCategoryIds(userId: number): Promise<DefaultCategoryIds>;
}
