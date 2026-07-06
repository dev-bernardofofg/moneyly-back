/**
 * Barrel de interfaces de Repositories.
 * Fonte única = cada arquivo IXRepository.ts (usado nos `satisfies`).
 * Nada de definição inline aqui — só re-export, pra evitar drift.
 */

export * from './IBudgetRepository';
export * from './ICategoryRepository';
export * from './ICompanyRepository';
export * from './IFinancialPeriodRepository';
export * from './IGoalRepository';
export * from './INotificationRepository';
export * from './IOvertimeRepository';
export * from './IRecurringTransactionRepository';
export * from './IRefreshTokenRepository';
export * from './ITransactionRepository';
export * from './IUserCategoryPreferencesRepository';
export * from './IUserRepository';
