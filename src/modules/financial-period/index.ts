/**
 * Interface pública do módulo financial-period (interno, sem router).
 * Períodos financeiros pessoais (financialDayStart..End, timezone São Paulo).
 */
export { financialPeriodService } from './financial-period.service';
export { ensurePeriodExists } from './middlewares/ensure-period-exists';
export * from './helpers/financial-period';
