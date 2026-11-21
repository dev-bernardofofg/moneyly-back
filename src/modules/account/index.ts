/**
 * Interface pública do módulo account (F12 — contas e cartões). Interno, sem router: as rotas
 * ficam em account-management. Não importa módulo de negócio.
 */
export { accountRepository } from './repositories/account.repository';
export { resolveAccountId } from './use-cases/account.use-cases';
