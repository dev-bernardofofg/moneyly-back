export const getBudgetStatus = (percentage: number): string => {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 90) return 'warning';
  if (percentage >= 75) return 'attention';
  return 'safe';
};
