import { spMidnight } from '@core/helpers/dates';
import { decodeOfxFile, parseOfx } from '@modules/transaction/helpers/ofx-parser';

const SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM>
<BANKID>0260
<ACCTID>12345-6
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261005000000[-3:BRT]
<TRNAMT>-45.90
<FITID>abc-1
<MEMO>Padaria Pão &amp; Cia
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261006
<TRNAMT>1.234,56
<FITID>abc-2
<NAME>Salário
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261007
<TRNAMT>-10.00
<MEMO>Sem FITID
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

const XML = `<?xml version="1.0"?>
<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS>
<CCACCTFROM><ACCTID>9999</ACCTID></CCACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261010120000</DTPOSTED><TRNAMT>-99.00</TRNAMT><FITID>cc-1</FITID><MEMO>Streaming</MEMO></STMTTRN>
</BANKTRANLIST>
</CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;

describe('decodeOfxFile', () => {
  it('decodes UTF-8 files', () => {
    expect(decodeOfxFile(Buffer.from('Pão', 'utf8'))).toBe('Pão');
  });

  it('falls back to windows-1252 when bytes are not valid UTF-8', () => {
    expect(decodeOfxFile(Buffer.from([0x50, 0xe3, 0x6f]))).toBe('Pão');
  });
});

describe('parseOfx', () => {
  it('parses SGML bank statements without closing tags', () => {
    const { accountKey, transactions } = parseOfx(SGML);

    expect(accountKey).toBe('0260:12345-6');
    expect(transactions).toEqual([
      {
        externalId: '0260:12345-6:abc-1',
        type: 'expense',
        amount: 4590,
        date: spMidnight('2026-10-05'),
        title: 'Padaria Pão & Cia',
      },
      {
        externalId: '0260:12345-6:abc-2',
        type: 'income',
        amount: 123456,
        date: spMidnight('2026-10-06'),
        title: 'Salário',
      },
    ]);
  });

  it('parses XML credit card statements without a bank id', () => {
    const { transactions } = parseOfx(XML);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      externalId: 'card:9999:cc-1',
      type: 'expense',
      amount: 9900,
      title: 'Streaming',
    });
  });

  it('rejects content that is not OFX', () => {
    expect(() => parseOfx('data;valor\n2026-10-01;10')).toThrow();
  });
});
