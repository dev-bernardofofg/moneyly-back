export const sumAmounts = <T extends { amount: string | number }>(items: T[]): number =>
  items.reduce((sum, item) => sum + Number(item.amount), 0);
