type TransactionType = 'income' | 'expense';

interface CategoryRef {
  id: string;
  name: string;
}

interface HistoryEntry {
  title: string;
  categoryId: string;
}

// Ruído de descrição bancária: não diz nada sobre o que foi comprado.
const NOISE = new Set([
  'compra',
  'compras',
  'cartao',
  'debito',
  'credito',
  'deb',
  'cred',
  'pix',
  'enviado',
  'enviada',
  'recebido',
  'recebida',
  'pagamento',
  'pagto',
  'pag',
  'transferencia',
  'transf',
  'ted',
  'doc',
  'tef',
  'mc',
  'visa',
  'elo',
  'master',
  'mastercard',
  'nacional',
  'internacional',
  'parcela',
  'parc',
  'em',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'para',
  'por',
  'com',
  'ltda',
  'me',
  'eireli',
  'sa',
  'br',
  'brasil',
  'loja',
  'online',
  'app',
  'conta',
  'cc',
  'ag',
  'boleto',
  'qr',
  'code',
]);

// Palavra-chave (ou frase) → nome da categoria global (seed). Primeira regra que casa vence,
// por isso Compras ("mercado livre") vem antes de Alimentação ("mercado").
const RULES: Array<{ type: TransactionType; category: string; keywords: string[] }> = [
  {
    type: 'income',
    category: 'Salário',
    keywords: ['salario', 'folha', 'proventos', 'vencimentos', 'remuneracao'],
  },
  {
    type: 'income',
    category: 'Investimentos',
    keywords: [
      'rendimento',
      'rendimentos',
      'juros',
      'dividendo',
      'dividendos',
      'cdb',
      'tesouro',
      'resgate',
    ],
  },
  {
    type: 'expense',
    category: 'Compras',
    keywords: [
      'mercado livre',
      'mercadolivre',
      'amazon',
      'magalu',
      'magazine luiza',
      'shopee',
      'americanas',
      'aliexpress',
      'shein',
      'kabum',
    ],
  },
  {
    type: 'expense',
    category: 'Alimentação',
    keywords: [
      'ifood',
      'restaurante',
      'padaria',
      'panificadora',
      'mercado',
      'supermercado',
      'atacadao',
      'assai',
      'carrefour',
      'lanchonete',
      'pizzaria',
      'burger',
      'mcdonalds',
      'acougue',
      'hortifruti',
      'cafe',
      'cafeteria',
      'rappi',
      'sorveteria',
      'food',
      'pizza',
      'burguer',
      'hamburgueria',
      'cafes',
      'acai',
    ],
  },
  {
    type: 'expense',
    category: 'Transporte',
    keywords: [
      'uber',
      'cabify',
      'posto',
      'combustivel',
      'gasolina',
      'shell',
      'ipiranga',
      'petrobras',
      'estacionamento',
      'pedagio',
      'metro',
      'onibus',
      'sem parar',
      'veloe',
    ],
  },
  {
    type: 'expense',
    category: 'Moradia',
    keywords: ['aluguel', 'condominio', 'iptu', 'imobiliaria'],
  },
  {
    type: 'expense',
    category: 'Saúde',
    keywords: [
      'farmacia',
      'drogaria',
      'drogasil',
      'droga raia',
      'pague menos',
      'hospital',
      'clinica',
      'laboratorio',
      'odonto',
      'dentista',
      'unimed',
      'hapvida',
      'amil',
      'academia',
      'smartfit',
    ],
  },
  {
    type: 'expense',
    category: 'Educação',
    keywords: [
      'escola',
      'colegio',
      'faculdade',
      'universidade',
      'curso',
      'cursos',
      'udemy',
      'alura',
      'livraria',
    ],
  },
  {
    type: 'expense',
    category: 'Lazer',
    keywords: [
      'netflix',
      'spotify',
      'cinema',
      'cinemark',
      'steam',
      'playstation',
      'xbox',
      'disney',
      'hbo max',
      'prime video',
      'youtube',
      'ingresso',
      'ingressos',
      'sympla',
      'deezer',
      'globoplay',
    ],
  },
  {
    type: 'expense',
    category: 'Vestuário',
    keywords: [
      'renner',
      'riachuelo',
      'cea',
      'zara',
      'hering',
      'centauro',
      'netshoes',
      'calcados',
      'roupas',
    ],
  },
  {
    type: 'expense',
    category: 'Contas',
    keywords: [
      'luz',
      'energia',
      'enel',
      'celpe',
      'neoenergia',
      'cemig',
      'copel',
      'agua',
      'compesa',
      'sabesp',
      'saneamento',
      'internet',
      'vivo',
      'claro',
      'tim',
      'telefone',
      'telefonia',
      'gas',
      'fatura',
      'iof',
      'juros',
      'tarifa',
      'anuidade',
      'multa',
      'encargos',
    ],
  },
];

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ');

// Tokens significativos: sem números, datas, ruído bancário e palavras de 1-2 letras.
export const significantTokens = (title: string): string[] =>
  normalize(title)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !NOISE.has(token));

// Cartão gruda palavras ("DL*UberRides", "VersadoCafes"): separar o camelCase expõe a
// palavra-chave. Só para as regras; a chave do histórico segue a descrição original.
const ruleText = (title: string) =>
  [title, title.replace(/([a-z])([A-Z])/g, '$1 $2')]
    .map((text) => significantTokens(text).join(' '))
    .join(' ');

// Crédito na fatura do cartão que é o pagamento da fatura anterior, não renda.
const BILL_PAYMENT = /\b(pagamento|pagto|pgto)\b.*\b(on ?line|fatura|efetuado|recebido)\b/;

export const isCardBillPayment = (title: string, type: TransactionType): boolean =>
  type === 'income' && BILL_PAYMENT.test(normalize(title));

// "fallback" = nada identificou a compra; o front avisa para o usuário escolher.
export type SuggestionSource = 'history' | 'rule' | 'fallback';

export interface CategorySuggestion {
  categoryId: string | null;
  source: SuggestionSource;
}

export interface ImportCategorySuggester {
  suggest(title: string, type: TransactionType): CategorySuggestion;
}

/**
 * Ordem: (1) mesma descrição no histórico do usuário, (2) regra por palavra-chave,
 * (3) histórico com palavra em comum, (4) "Outros". A descrição idêntica vem antes porque
 * reflete a escolha do próprio usuário, inclusive em importações anteriores que ele corrigiu;
 * palavra solta em comum é mais fraca que uma regra explícita.
 */
export function buildImportCategorySuggester(
  history: HistoryEntry[],
  categories: CategoryRef[],
  fallbackName = 'Outros'
): ImportCategorySuggester {
  const idByName = new Map<string, string>();
  for (const category of categories) {
    const name = normalize(category.name).trim();
    if (!idByName.has(name)) idByName.set(name, category.id);
  }
  const categoryId = (name: string) => idByName.get(normalize(name).trim()) ?? null;
  const fallback = categoryId(fallbackName);

  const byKey = new Map<string, string>();
  const byToken = new Map<string, string>();
  // Histórico vem do mais recente: a primeira categoria vista vence.
  for (const { title, categoryId } of history) {
    // "Outros" não ensina nada: são justamente as linhas que ficaram sem identificação.
    if (categoryId === fallback) continue;
    const tokens = significantTokens(title);
    const key = tokens.join(' ');
    if (key && !byKey.has(key)) byKey.set(key, categoryId);
    for (const token of tokens) if (!byToken.has(token)) byToken.set(token, categoryId);
  }

  return {
    suggest(title, type) {
      const tokens = significantTokens(title);
      const key = tokens.join(' ');
      const exact = byKey.get(key);
      if (exact) return { categoryId: exact, source: 'history' };

      const text = ruleText(title);
      for (const rule of RULES) {
        if (rule.type !== type) continue;
        if (rule.keywords.some((keyword) => ` ${text} `.includes(` ${keyword} `))) {
          const id = categoryId(rule.category);
          if (id) return { categoryId: id, source: 'rule' };
        }
      }

      for (const token of tokens) {
        const fromHistory = byToken.get(token);
        if (fromHistory) return { categoryId: fromHistory, source: 'history' };
      }

      return { categoryId: fallback, source: 'fallback' };
    },
  };
}
