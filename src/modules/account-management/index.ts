/**
 * Interface pública do módulo account-management (F12 — rotas e casos de uso de contas e cartões).
 * Fica acima de account: saldo, reatribuição de fatura e remoção leem transaction, transfer e
 * recurring-transaction, que por sua vez dependem de account.
 */
export { AccountRouter } from './account-management.router';
