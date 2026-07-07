// Data parsing utilities for CSV, JSON, Excel
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { DataRow } from "../types";

export interface ParseResult {
  rows: DataRow[];
  columns: string[];
  sheetNames?: string[];
}

export function parseCSV(text: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const columns = result.meta.fields || [];
  const rows = (result.data as DataRow[]).filter((r) =>
    columns.some((c) => r[c] !== null && r[c] !== "" && r[c] !== undefined),
  );
  return { rows, columns };
}

export function parseJSON(text: string): ParseResult {
  const data = JSON.parse(text);
  let rows: DataRow[] = [];
  if (Array.isArray(data)) {
    rows = data as DataRow[];
  } else if (typeof data === "object" && data !== null) {
    // look for an array property
    const arrKey = Object.keys(data).find((k) => Array.isArray(data[k]));
    if (arrKey) rows = data[arrKey] as DataRow[];
    else rows = [data];
  }
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, columns };
}

export function parseExcel(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetNames = wb.SheetNames;
  const sheet = wb.Sheets[sheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  const rows = json as unknown as DataRow[];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, columns, sheetNames };
}

export function parseExcelSheet(
  buffer: ArrayBuffer,
  sheetName: string,
): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { rows: [], columns: [] };
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  const rows = json as unknown as DataRow[];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, columns };
}

export function detectFileType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext || "unknown";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
