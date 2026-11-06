// Chave sem número de conta/cartão (ACCTID ausente, cartão do PDF não lido) serve a qualquer
// arquivo do mesmo banco: não identifica conta nenhuma.
export const isWeakStatementKey = (key: string) => key.endsWith(':pdf') || key.endsWith(':unknown');
