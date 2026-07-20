import { NotFoundError } from '@core/errors';
import { financialPeriodRepository } from '@modules/financial-period/repositories/financial-period.repository';
import { userRepository } from '../repositories/user.repository';

export const updateIncomeAndPeriodUseCase = async (
  userId: string,
  monthlyIncome: number,
  financialDayStart: number,
  financialDayEnd: number
) => {
  const user = await userRepository.updateIncomeAndPeriod(
    userId,
    monthlyIncome,
    financialDayStart,
    financialDayEnd
  );
  if (!user) throw new NotFoundError('Usuário não encontrado');
  await financialPeriodRepository.deactivatePeriods(userId);
  return user;
};
