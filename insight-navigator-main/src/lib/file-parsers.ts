import * as XLSX from "xlsx";

export interface ParsedData {
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export function parseCSV(text: string): ParsedData {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { columns: [], rows: [], totalRows: 0 };
  const columns = lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    columns.forEach((col, i) => (row[col] = vals[i] || ""));
    return row;
  });
  return { columns, rows, totalRows: rows.length };
}

export function parseJSON(text: string): ParsedData {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.data || [data];
  if (arr.length === 0) return { columns: [], rows: [], totalRows: 0 };
  const columns = Object.keys(arr[0]);
  const rows = arr.map((item: any) => {
    const row: Record<string, string> = {};
    columns.forEach((col) => (row[col] = String(item[col] ?? "")));
    return row;
  });
  return { columns, rows, totalRows: rows.length };
}

export async function parseExcel(buffer: ArrayBuffer): Promise<ParsedData> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
  if (jsonData.length === 0) return { columns: [], rows: [], totalRows: 0 };
  const columns = Object.keys(jsonData[0]);
  const rows = jsonData.map((item) => {
    const row: Record<string, string> = {};
    columns.forEach((col) => (row[col] = String(item[col] ?? "")));
    return row;
  });
  return { columns, rows, totalRows: rows.length };
}
