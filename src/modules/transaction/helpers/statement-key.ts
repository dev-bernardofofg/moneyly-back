// Chave sem número de conta/cartão (ACCTID ausente, cartão do PDF não lido) serve a qualquer
// arquivo do mesmo banco: não identifica conta nenhuma.
export const isWeakStatementKey = (key: string) => key.endsWith(':pdf') || key.endsWith(':unknown');

// Fatura e extrato em PDF dizem o que são; OFX não, e vale em qualquer conta.
export const requiredAccountType = (accountKey: string, isBill: boolean) => {
  if (isBill) return 'credit_card';
  return /^(inter|nubank):conta:/.test(accountKey) ? 'checking' : null;
};
