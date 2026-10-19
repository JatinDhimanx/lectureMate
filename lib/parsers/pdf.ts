export async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  // Dynamic import to avoid edge runtime issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  
  const text = (data.text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();

  return {
    text,
    numPages: data.numpages || 1,
  };
}
