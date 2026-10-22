import { getForecastUseCase } from '../use-cases/get-forecast.use-case';

/**
 * Renda do período para percentuais (alerta de gasto, planner, insights): o que já entrou mais
 * as entradas recorrentes previstas (salário cadastrado como recorrência conta antes de cair).
 * Substitui o antigo "rendimento mensal" fixo do perfil.
 */
export const expectedIncomeForPeriod = async (userId: string, periodId?: string) => {
  const forecast = await getForecastUseCase(userId, periodId);
  return {
    periodId: forecast.period.id,
    income: forecast.realized.income + forecast.projected.recurringIncome,
  };
};
