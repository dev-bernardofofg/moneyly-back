/**
 * Interface pública do módulo transaction.
 */
export { default as TransactionRouter } from './transaction.router';
export { createTransactionUseCase } from './use-cases/create-transaction.use-case';
export { transactionRepository } from './repositories/transaction.repository';
export type { TransactionWithCategory } from './repositories/transaction.repository';
