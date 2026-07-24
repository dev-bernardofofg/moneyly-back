/**
 * Interface pública do módulo subscription (detector F3 + conversão F10).
 * Sem router próprio: as rotas montam nos routers de transaction e
 * recurring-transaction.
 */
export { detectSubscriptionsUseCase } from './use-cases/detect-subscriptions.use-case';
export {
  convertSubscriptionToRecurringUseCase,
  type ConvertSubscriptionInput,
} from './use-cases/convert-subscription-to-recurring.use-case';
export * from './helpers/subscription-detector';
