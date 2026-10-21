export const isPdf = (bytes: Uint8Array) =>
  bytes.length > 4 && Buffer.from(bytes.subarray(0, 5)).toString('latin1') === '%PDF-';

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Carregar só aqui: pdf-parse exige DOMMatrix ao ser importado e derrubaria a função inteira
  // no boot onde não houver canvas/polyfill.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse') as typeof import('pdf-parse');
  const parser = new PDFParse({ data: bytes });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}
