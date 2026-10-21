export const sumAmounts = <T extends { amount: number }>(items: T[]): number =>
  items.reduce((sum, item) => sum + Number(item.amount), 0);

// Centavos → texto em reais para mensagem e CSV ("1050" → "10,50").
export const formatCents = (cents: number | null | undefined): string =>
  ((cents ?? 0) / 100).toFixed(2).replace('.', ',');
