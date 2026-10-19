import * as XLSX from "xlsx";
import type { DocumentSegment } from "./types";

export interface ParsedSpreadsheetResult {
  text: string;
  sheetCount: number;
  segments: DocumentSegment[];
}

export async function parseSpreadsheetBuffer(
  buffer: Buffer,
  format: "xlsx" | "csv"
): Promise<ParsedSpreadsheetResult> {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const segments: DocumentSegment[] = [];
  const fullTextParts: string[] = [];
  let currentOffset = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert to 2D array of rows
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
    if (!rows || rows.length === 0) continue;

    const formattedRows: string[] = [];
    const headers = rows[0] || [];

    formattedRows.push(`--- Sheet: ${sheetName} ---`);
    if (headers.length > 0) {
      formattedRows.push(`Columns: ${headers.filter(Boolean).join(" | ")}`);
    }

    // Convert top data rows (up to 500 rows to prevent blowing context limits)
    for (let r = 1; r < Math.min(rows.length, 500); r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const rowData = row
        .map((cell, idx) => (cell !== undefined && cell !== null && cell !== "" ? `${headers[idx] || `Col ${idx + 1}`}: ${cell}` : ""))
        .filter(Boolean)
        .join("; ");
      if (rowData) {
        formattedRows.push(`Row ${r}: ${rowData}`);
      }
    }

    const sheetText = formattedRows.join("\n");
    fullTextParts.push(sheetText);

    segments.push({
      segmentId: `sheet-${sheetName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      type: "table",
      text: sheetText,
      location: {
        sheet: sheetName,
        startOffset: currentOffset,
        endOffset: currentOffset + sheetText.length,
      },
      metadata: {
        sheetName,
        rowCount: rows.length,
      },
    });

    currentOffset += sheetText.length + 2;
  }

  const text = fullTextParts.join("\n\n").trim();
  if (!text) {
    throw new Error(`The uploaded spreadsheet (${format.toUpperCase()}) contains no readable data.`);
  }

  return {
    text,
    sheetCount: workbook.SheetNames.length,
    segments,
  };
}
