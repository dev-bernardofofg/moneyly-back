import { getPeriodProjectionUseCase } from '../use-cases/get-period-projection.use-case';

/**
 * Renda do período para percentuais (alerta de gasto, insights): o que já entrou mais
 * as entradas recorrentes previstas (salário cadastrado como recorrência conta antes de cair).
 * Substitui o antigo "rendimento mensal" fixo do perfil.
 */
export const expectedIncomeForPeriod = async (userId: string, periodId?: string) => {
  const projection = await getPeriodProjectionUseCase(userId, periodId);
  return {
    periodId: projection.period.id,
    income: projection.realized.income + projection.projected.recurringIncome,
  };
};
