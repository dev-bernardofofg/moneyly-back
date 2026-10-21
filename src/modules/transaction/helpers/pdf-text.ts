import { PDFParse } from 'pdf-parse';

export const isPdf = (bytes: Uint8Array) =>
  bytes.length > 4 && Buffer.from(bytes.subarray(0, 5)).toString('latin1') === '%PDF-';

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}
