// Infrastructure Utility: PDF Text Extractor
// Wraps pdf-parse v2.x to extract plain text from PDF buffers

import { PDFParse } from 'pdf-parse';

export async function extractPdfText(
  buffer: Buffer,
  password?: string,
): Promise<string> {
  const options: { data: Uint8Array; password?: string; verbosity?: number } = {
    data: new Uint8Array(buffer),
    verbosity: 0,
  };

  if (password) {
    options.password = password;
  }

  const pdf = new PDFParse(options);

  try {
    const result = await pdf.getText();
    return result.text;
  } finally {
    await pdf.destroy();
  }
}
