/**
 * Interface pública do módulo subscription (detector F3 + conversão F10).
 * Router fica fora daqui: overview importa só os helpers e não deve carregar a cadeia de rotas.
 */
export { detectSubscriptionsUseCase } from './use-cases/detect-subscriptions.use-case';
export {
  convertSubscriptionToRecurringUseCase,
  type ConvertSubscriptionInput,
} from './use-cases/convert-subscription-to-recurring.use-case';
export * from './helpers/subscription-detector';
