import {
  buildImportCategorySuggester,
  isCardBillPayment,
  significantTokens,
} from '@modules/transaction/helpers/import-category-suggester';

const CATEGORIES = [
  { id: 'outros', name: 'Outros' },
  { id: 'alimentacao', name: 'Alimentação' },
  { id: 'transporte', name: 'Transporte' },
  { id: 'compras', name: 'Compras' },
  { id: 'salario', name: 'Salário' },
  { id: 'contas', name: 'Contas' },
  { id: 'pessoal', name: 'Café da firma' },
];

describe('significantTokens', () => {
  it('drops bank noise, numbers and dates', () => {
    expect(significantTokens('COMPRA CARTAO DEB MC 12/10 PADARIA SÃO JOÃO')).toEqual([
      'padaria',
      'sao',
      'joao',
    ]);
  });
});

describe('buildImportCategorySuggester', () => {
  it('categorizes by keyword when there is no history', () => {
    const suggester = buildImportCategorySuggester([], CATEGORIES);

    expect(suggester.suggest('COMPRA CARTAO DEB MC 12/10 PADARIA SAO JOAO', 'expense')).toBe(
      'alimentacao'
    );
    expect(suggester.suggest('UBER *TRIP HELP.UBER.COM', 'expense')).toBe('transporte');
    expect(suggester.suggest('PIX RECEBIDO SALARIO EMPRESA X', 'income')).toBe('salario');
    expect(suggester.suggest('PAGAMENTO CONTA ENERGIA NEOENERGIA', 'expense')).toBe('contas');
  });

  it('prefers the more specific phrase over a single word', () => {
    const suggester = buildImportCategorySuggester([], CATEGORIES);

    expect(suggester.suggest('MERCADO LIVRE *PEDIDO 123', 'expense')).toBe('compras');
    expect(suggester.suggest('SUPERMERCADO BOM PRECO', 'expense')).toBe('alimentacao');
  });

  it('only applies rules of the same transaction type', () => {
    const suggester = buildImportCategorySuggester([], CATEGORIES);

    expect(suggester.suggest('ESTORNO SALARIO', 'expense')).toBe('outros');
  });

  it('reuses the category the user chose for the same description', () => {
    const suggester = buildImportCategorySuggester(
      [{ title: 'COMPRA CARTAO 05/10 PADARIA SAO JOAO', categoryId: 'pessoal' }],
      CATEGORIES
    );

    expect(suggester.suggest('COMPRA CARTAO DEB 12/10 PADARIA SAO JOAO', 'expense')).toBe(
      'pessoal'
    );
  });

  it('ignores history entries saved as the fallback category', () => {
    const suggester = buildImportCategorySuggester(
      [{ title: 'PADARIA SAO JOAO', categoryId: 'outros' }],
      CATEGORIES
    );

    expect(suggester.suggest('PADARIA SAO JOAO', 'expense')).toBe('alimentacao');
  });

  it('falls back to a shared word in history, then to Outros', () => {
    const suggester = buildImportCategorySuggester(
      [{ title: 'Academia Corpo Livre', categoryId: 'pessoal' }],
      CATEGORIES
    );

    expect(suggester.suggest('PIX ENVIADO CORPO LIVRE FITNESS', 'expense')).toBe('pessoal');
    expect(suggester.suggest('PIX ENVIADO FULANO DE TAL', 'expense')).toBe('outros');
  });
});

describe('credit card statement descriptions', () => {
  const suggester = buildImportCategorySuggester([], CATEGORIES);

  it.each([
    ['DL*UberRides', 'transporte'],
    ['Uber UBER *TRIP HELP.U', 'transporte'],
    ['VersadoCafes', 'alimentacao'],
    ['99Food *12345678 Fulano', 'alimentacao'],
    ['CRIS BURGUER', 'alimentacao'],
    ['ABREU E LIMA PIZZA', 'alimentacao'],
    ['KdinhomeMercado', 'alimentacao'],
    ['MLP *KaBuM-KaBuM (Parcela 03 de 04)', 'compras'],
    ['IOF INTERNACIONAL', 'contas'],
    ['JUROS PIX CREDITO', 'contas'],
  ])('categorizes "%s"', (title, expected) => {
    expect(suggester.suggest(title, 'expense')).toBe(expected);
  });
});

describe('isCardBillPayment', () => {
  it('flags the previous bill payment credited on a card statement', () => {
    expect(isCardBillPayment('PAGAMENTO ON LINE', 'income')).toBe(true);
    expect(isCardBillPayment('PAGTO FATURA CARTAO', 'income')).toBe(true);
  });

  it('does not flag regular income or expenses', () => {
    expect(isCardBillPayment('PIX RECEBIDO FULANO', 'income')).toBe(false);
    expect(isCardBillPayment('PAGAMENTO ON LINE', 'expense')).toBe(false);
  });
});
