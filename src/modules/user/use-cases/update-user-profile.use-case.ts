import { userRepository } from '../repositories/user.repository';

export const updateUserProfileUseCase = async (
  user: {
    id: string;
    name: string;
    email: string;
    monthlyIncome: string | null;
    financialDayStart: number | null;
    financialDayEnd: number | null;
    firstAccess: boolean | null;
  },
  data: {
    monthlyIncome?: number;
    financialDayStart?: number;
    financialDayEnd?: number;
  }
) => {
  let updatedUser = user;

  if (data.monthlyIncome !== undefined) {
    const updated = await userRepository.updateMonthlyIncome(user.id, data.monthlyIncome);
    if (updated) updatedUser = updated;
  }

  if (data.financialDayStart !== undefined && data.financialDayEnd !== undefined) {
    const updated = await userRepository.updateFinancialPeriod(
      user.id,
      data.financialDayStart,
      data.financialDayEnd
    );
    if (updated) updatedUser = updated;
  }

  return {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    monthlyIncome: updatedUser.monthlyIncome,
    financialDayStart: updatedUser.financialDayStart,
    financialDayEnd: updatedUser.financialDayEnd,
    firstAccess: updatedUser.firstAccess,
  };
};
