export const computeSpendingStats = (
  totalExpense: number,
  monthlyIncome: number,
  alertMsg: string
) => {
  const percentUsed =
    monthlyIncome > 0 ? Number(((totalExpense / monthlyIncome) * 100).toFixed(2)) : null;
  const alert = percentUsed !== null && percentUsed >= 80 ? alertMsg : null;
  return { percentUsed, alert };
};
