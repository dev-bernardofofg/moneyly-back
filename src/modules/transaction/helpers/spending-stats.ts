/** Percentual das entradas já gasto; sem entradas não há percentual. */
export const computeSpendingStats = (
  totalExpense: number,
  totalIncome: number,
  alertMsg: string
) => {
  const percentUsed =
    totalIncome > 0 ? Number(((totalExpense / totalIncome) * 100).toFixed(2)) : null;
  const alert = percentUsed !== null && percentUsed >= 80 ? alertMsg : null;
  return { percentUsed, alert };
};
