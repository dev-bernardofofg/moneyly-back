/**
 * Integration tests for importing a checking account statement in PDF (text extraction mocked)
 */

import { eq } from 'drizzle-orm';
import request from 'supertest';
import { db } from '../../src/infra/db';
import { accounts } from '../../src/infra/db/schema';
import { app } from '../../src/server';

// pdfjs carrega o worker como ESM, o que o Jest (CJS) não executa; o parser tem teste próprio.
jest.mock('../../src/modules/transaction/helpers/pdf-text', () => ({
  ...jest.requireActual('../../src/modules/transaction/helpers/pdf-text'),
  extractPdfText: jest
    .fn()
    .mockResolvedValue(
      [
        'Banco Inter, Conta: 7654321-0',
        'Período: 01/10/2026 a 31/10/2026',
        '5 de Outubro de 2026 Saldo do dia: R$ 10,00',
        'Pix recebido: "Cp :00000000-Fulano Cliente"  \tR$ 200,00  \tR$ 210,00',
        'Pagamento efetuado: "Pagamento fatura Cartão Inter"  \t-R$ 150,00  \tR$ 60,00',
      ].join('\n')
    ),
}));

type PreviewItem = { type: 'income' | 'expense'; amount: number; title: string; status: string };

describe('Checking statement PDF import', () => {
  let token: string;
  let accountId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const file = Buffer.from('%PDF-1.7 extrato', 'latin1').toString('base64url');

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({ name: 'Pdf', email: `stmt-pdf${Date.now()}@test.com`, password: 'password123' });
    token = res.body.data.accessToken;
    accountId = (
      await request(app)
        .post('/accounts')
        .set(auth())
        .send({ type: 'checking', name: 'Inter' })
        .expect(201)
    ).body.data.id;
  });

  it('previews a statement without bill data and flags the card bill payment', async () => {
    const preview = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file, accountId })
      .expect(200);

    expect(preview.body.data.bill).toBeNull();
    expect(preview.body.data.accountKey).toBe('inter:conta:7654321-0');
    const items = preview.body.data.items as PreviewItem[];
    expect(items.map((item) => [item.type, item.amount, item.status])).toEqual([
      ['income', 20000, 'new'],
      ['expense', 15000, 'bill_payment'],
    ]);
  });

  it('routes an Inter statement that mentions Nubank to the Inter parser', async () => {
    const { extractPdfText } = jest.requireMock('../../src/modules/transaction/helpers/pdf-text');
    (extractPdfText as jest.Mock).mockResolvedValueOnce(
      [
        'Banco Inter, Conta: 7654321-0',
        'Período: 01/10/2026 a 31/10/2026',
        '5 de Outubro de 2026 Saldo do dia: R$ 10,00',
        'Pix enviado: "Cp :00000000-Nubank Pagamentos"  \t-R$ 30,00  \tR$ 10,00',
      ].join('\n')
    );

    const preview = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file, accountId })
      .expect(200);
    expect(preview.body.data.accountKey).toBe('inter:conta:7654321-0');
    expect(preview.body.data.items).toHaveLength(1);
  });

  describe('on a credit card', () => {
    let cardId: string;

    beforeAll(async () => {
      cardId = (
        await request(app)
          .post('/accounts')
          .set(auth())
          .send({ type: 'credit_card', name: 'Cartão Inter', closingDay: 30, dueDay: 7 })
          .expect(201)
      ).body.data.id;
    });

    it('refuses the statement in the preview and in the confirmation', async () => {
      const preview = await request(app)
        .post('/transactions/import/preview')
        .set(auth())
        .send({ file, accountId: cardId })
        .expect(400);
      expect(JSON.stringify(preview.body)).toContain('Extrato de conta só entra em conta corrente');

      const confirm = await request(app)
        .post('/transactions/import')
        .set(auth())
        .send({
          accountId: cardId,
          accountKey: 'inter:conta:7654321-0',
          through: '2026-10-31T00:00:00.000Z',
          items: [],
        })
        .expect(400);
      expect(JSON.stringify(confirm.body)).toContain('Extrato de conta só entra em conta corrente');
    });

    it('asks for an account when a past import tied the key to a card', async () => {
      await db
        .update(accounts)
        .set({ statementKey: 'inter:conta:7654321-0' })
        .where(eq(accounts.id, cardId));

      const preview = await request(app)
        .post('/transactions/import/preview')
        .set(auth())
        .send({ file })
        .expect(200);
      expect(preview.body.data).toMatchObject({
        accountId: null,
        needsAccount: true,
        requiredAccountType: 'checking',
      });
    });
  });

  it('tells which PDFs are supported when none is recognized', async () => {
    const { extractPdfText } = jest.requireMock('../../src/modules/transaction/helpers/pdf-text');
    (extractPdfText as jest.Mock).mockResolvedValueOnce('Outro documento qualquer');

    const res = await request(app)
      .post('/transactions/import/preview')
      .set(auth())
      .send({ file, accountId })
      .expect(400);
    expect(JSON.stringify(res.body)).toContain(
      'PDF não reconhecido. Por enquanto só faturas e extratos de Inter e Nubank.'
    );
  });
});
