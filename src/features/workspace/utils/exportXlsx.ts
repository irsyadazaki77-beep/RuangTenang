export interface ExportXlsxOptions {
  title: string;
  content: string;
  artifactType?: string;
}

export interface XlsxTable { name: string; headers: string[]; rows: Array<Array<string | number | null>> }

const MAX_SHEETS = 20;
const MAX_ROWS = 50_000;

function safeCell(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value);
  // Neutralise spreadsheet formula injection.
  return /^\s*[=+\-@]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
}

function coerce(raw: string): string | number | null {
  const text = raw.trim();
  if (!text) return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return safeCell(text);
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(cell => cell.replace(/\\\|/g, '|').trim());
}

/** Extracts GitHub-style markdown tables, naming each after the nearest preceding heading. */
export function extractMarkdownTables(content: string): XlsxTable[] {
  const lines = content.split(/\r?\n/);
  const tables: XlsxTable[] = [];
  let heading = '';
  for (let i = 0; i < lines.length; i += 1) {
    const headingMatch = /^#{1,6}\s+(.+)$/.exec(lines[i]);
    if (headingMatch) heading = headingMatch[1].trim();
    if (!lines[i].includes('|') || !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1] || '')) continue;
    const headers = splitRow(lines[i]);
    const rows: XlsxTable['rows'] = [];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|') && lines[j].trim()) {
      const cells = splitRow(lines[j]);
      rows.push(headers.map((_, index) => coerce(cells[index] ?? '')));
      j += 1;
    }
    tables.push({ name: heading || `Tabel ${tables.length + 1}`, headers, rows });
    i = j;
  }
  return tables;
}

interface ChartPayload { rows: Array<Record<string, unknown>>; xColumn?: string; yColumn?: string; title?: string; datasetVersion?: string; aggregation?: string; provenance?: Record<string, unknown> }

function parseChartPayload(content: string): ChartPayload | null {
  try {
    const parsed = JSON.parse(content) as ChartPayload;
    return parsed && Array.isArray(parsed.rows) && parsed.rows.length ? parsed : null;
  } catch { return null; }
}

function sheetName(raw: string, used: Set<string>): string {
  const base = raw.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || 'Sheet';
  let name = base; let n = 2;
  while (used.has(name.toLowerCase())) name = `${base.slice(0, 26)} ${n++}`;
  used.add(name.toLowerCase());
  return name;
}

export async function createXlsxBuffer(input: ExportXlsxOptions): Promise<Uint8Array> {
  const chart = parseChartPayload(input.content);
  const tables: XlsxTable[] = [];
  if (chart) {
    const headers = [...new Set(chart.rows.flatMap(row => Object.keys(row)))];
    tables.push({ name: chart.title || 'Data grafik', headers, rows: chart.rows.map(row => headers.map(header => safeCell(row[header]))) });
  } else {
    tables.push(...extractMarkdownTables(input.content));
  }
  if (!tables.length) throw new Error('Artifact tidak berisi tabel atau data terstruktur yang dapat diekspor ke Excel.');
  if (tables.length > MAX_SHEETS) throw new Error(`Terlalu banyak tabel (${tables.length}); maksimum ${MAX_SHEETS}.`);
  if (tables.some(table => table.rows.length > MAX_ROWS)) throw new Error(`Tabel melebihi ${MAX_ROWS} baris.`);

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ruang Tenang';
  workbook.title = input.title.slice(0, 200);
  const used = new Set<string>();
  for (const table of tables) {
    const sheet = workbook.addWorksheet(sheetName(table.name, used));
    sheet.addRow(table.headers);
    sheet.getRow(1).font = { bold: true };
    table.rows.forEach(row => sheet.addRow(row));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    table.headers.forEach((header, index) => {
      const widest = Math.max(header.length, ...table.rows.slice(0, 200).map(row => String(row[index] ?? '').length));
      sheet.getColumn(index + 1).width = Math.min(60, Math.max(10, widest + 2));
    });
  }
  if (chart?.provenance || chart?.datasetVersion) {
    const info = workbook.addWorksheet(sheetName('Sumber data', used));
    info.addRow(['Properti', 'Nilai']).font = { bold: true };
    const entries: Array<[string, unknown]> = [
      ['Agregasi', chart.aggregation], ['Kolom X', chart.xColumn], ['Kolom Y', chart.yColumn], ['Versi dataset', chart.datasetVersion],
      ...Object.entries(chart.provenance || {})
    ];
    entries.filter(([, value]) => value !== undefined && value !== null).forEach(([key, value]) => info.addRow([key, safeCell(value)]));
    info.getColumn(1).width = 22; info.getColumn(2).width = 60;
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function exportToXlsx(input: ExportXlsxOptions): Promise<void> {
  const bytes = await createXlsxBuffer(input);
  const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(input.title || 'data_ruangkerja').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'data_ruangkerja'}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
