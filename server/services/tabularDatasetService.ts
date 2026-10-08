import crypto from 'crypto';
import ExcelJS from 'exceljs';
import type { DataTransformation, DatasetColumn, DatasetColumnType, TabularAnalysisRequest, TabularAnalysisResult, TabularDataset, TabularSheetSummary, TabularTransformPreview, TabularTransformRequest } from '../../shared/contracts/tabular.js';
import { DEFAULT_FILE_LIMITS } from './file-intelligence/fileTypes.js';

export interface ParsedTabularSheet {
  name: string;
  headers: string[];
  originalHeaders: string[];
  rows: Array<Record<string, unknown>>;
}

export interface ParsedTabularWorkbook {
  sheets: ParsedTabularSheet[];
  summaries: TabularSheetSummary[];
  activeSheet: string;
}

const cleanCell = (value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const cell = value as Record<string, unknown>;
    if ('result' in cell) return cleanCell(cell.result);
    if ('text' in cell && typeof cell.text === 'string') return cell.text;
    if (Array.isArray(cell.richText)) return cell.richText.map(part => typeof part === 'object' && part && 'text' in part ? String((part as { text: unknown }).text) : '').join('');
    if ('hyperlink' in cell && 'text' in cell) return String(cell.text ?? cell.hyperlink ?? '');
    if ('error' in cell) return String(cell.error ?? '');
    return JSON.stringify(cell);
  }
  return value;
};

function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      rows.push(row);
      row = [];
      if (rows.length > DEFAULT_FILE_LIMITS.maxCsvRows + 1) throw new Error(`CSV melebihi batas ${DEFAULT_FILE_LIMITS.maxCsvRows} baris.`);
    } else cell += char;
  }
  if (quoted) throw new Error('CSV memiliki kutipan yang tidak ditutup.');
  row.push(cell);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  while (rows.length > 1 && rows[rows.length - 1].every(value => value.trim() === '')) rows.pop();
  if (rows.length > DEFAULT_FILE_LIMITS.maxCsvRows + 1) throw new Error(`CSV melebihi batas ${DEFAULT_FILE_LIMITS.maxCsvRows} baris.`);
  return rows;
}

function detectDelimiter(text: string): string {
  const candidates = [',', ';', '\t'];
  const sample = text.split(/\r?\n/).slice(0, 20).filter(line => line.trim());
  const score = (delimiter: string) => {
    const counts = sample.map(line => {
      let quoted = false; let count = 0;
      for (let i = 0; i < line.length; i += 1) {
        if (line[i] === '"' && line[i + 1] === '"' && quoted) i += 1;
        else if (line[i] === '"') quoted = !quoted;
        else if (line[i] === delimiter && !quoted) count += 1;
      }
      return count;
    });
    const positive = counts.filter(count => count > 0);
    if (!positive.length) return 0;
    const average = positive.reduce((sum, count) => sum + count, 0) / positive.length;
    const consistency = positive.length / Math.max(1, sample.length);
    return average * consistency;
  };
  return candidates.sort((a, b) => score(b) - score(a))[0];
}

function uniqueHeaders(rawHeaders: unknown[]): { headers: string[]; originalHeaders: string[] } {
  const originals = rawHeaders.map(value => String(value ?? '').trim());
  const normalized = originals.map((name, index) => name || `Column_${index + 1}`);
  const used = new Set<string>();
  const headers = normalized.map(name => {
    let candidate = name;
    let suffix = 2;
    while (used.has(candidate)) candidate = `${name}_${suffix++}`;
    used.add(candidate);
    return candidate;
  });
  return { headers, originalHeaders: originals };
}

function sheetFromRows(name: string, sourceRows: unknown[][], maxRows = DEFAULT_FILE_LIMITS.maxRowsPerSheet, preserveEmptyRows = false): ParsedTabularSheet {
  const headerIndex = sourceRows.findIndex(row => row.some(value => value !== null && value !== undefined && String(value).trim() !== ''));
  if (headerIndex < 0) return { name, headers: [], originalHeaders: [], rows: [] };
  const lastDataIndex = preserveEmptyRows ? sourceRows.reduce((last, row, index) => index > headerIndex && row.some(value => value !== null && value !== undefined && String(value).trim() !== '') ? index : last, headerIndex) : sourceRows.length - 1;
  const dataRows = sourceRows.slice(headerIndex + 1, lastDataIndex + 1);
  const { headers, originalHeaders } = uniqueHeaders(sourceRows[headerIndex]);
  const rows = dataRows.slice(0, maxRows).map(row => Object.fromEntries(headers.map((header, index) => [header, cleanCell(row[index]) ?? null])));
  return { name, headers, originalHeaders, rows };
}

export async function parseTabularWorkbook(buffer: Buffer, filename: string): Promise<ParsedTabularWorkbook> {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'csv' || extension === 'tsv') {
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    const delimiter = extension === 'tsv' ? '\t' : detectDelimiter(text);
    const sheet = sheetFromRows('Data', parseDelimitedRows(text, delimiter), DEFAULT_FILE_LIMITS.maxCsvRows, true);
    if (!sheet.headers.length) throw new Error('Tidak ditemukan header atau baris data pada berkas tabular.');
    const summaries = [{ name: sheet.name, rowCount: sheet.rows.length, columnCount: sheet.headers.length, empty: sheet.rows.length === 0 }];
    return { sheets: [sheet], summaries, activeSheet: sheet.name };
  }
  if (extension !== 'xlsx') throw new Error('Dataset tabular hanya tersedia untuk CSV, TSV, dan XLSX. Format XLS belum didukung oleh parser yang terpasang.');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  if (workbook.worksheets.length > DEFAULT_FILE_LIMITS.maxXlsxSheets) throw new Error(`Workbook melebihi batas ${DEFAULT_FILE_LIMITS.maxXlsxSheets} sheet.`);
  const sheets: ParsedTabularSheet[] = [];
  for (const worksheet of workbook.worksheets) {
    if ((worksheet.rowCount || 0) > DEFAULT_FILE_LIMITS.maxRowsPerSheet) throw new Error(`Sheet "${worksheet.name}" melebihi batas ${DEFAULT_FILE_LIMITS.maxRowsPerSheet} baris.`);
    const rows: unknown[][] = [];
    for (let rowNumber = 1; rowNumber <= (worksheet.rowCount || 0); rowNumber += 1) {
      const rowValues: unknown[] = [];
      const row = worksheet.getRow(rowNumber);
      for (let column = 1; column <= worksheet.actualColumnCount; column += 1) rowValues.push(cleanCell(row.getCell(column).value));
      rows.push(rowValues);
    }
    sheets.push(sheetFromRows(worksheet.name, rows));
  }
  if (!sheets.length) throw new Error('Workbook tidak memiliki sheet.');
  const summaries = sheets.map(sheet => ({ name: sheet.name, rowCount: sheet.rows.length, columnCount: sheet.headers.length, empty: sheet.rows.length === 0 }));
  const activeTab = workbook.views?.[0]?.activeTab;
  const activeCandidate = typeof activeTab === 'number' ? sheets[activeTab] : undefined;
  const activeSheet = (activeCandidate && activeCandidate.rows.length ? activeCandidate : sheets.find(sheet => sheet.rows.length > 0))?.name || sheets[0].name;
  return { sheets, summaries, activeSheet };
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  let text = value.trim().replace(/[\s\u00a0]/g, '');
  if (!text || /^0\d+$/.test(text)) return null;
  text = text.replace(/^(Rp|IDR|USD|\$|€|£)/i, '').replace(/(Rp|IDR|USD|\$|€|£)$/i, '').replace(/%$/, '');
  if (/^-?\d{1,3}\.\d{3}$/.test(text)) return null;
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(text)) text = text.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(text)) text = text.replace(/,/g, '');
  else if (/^-?\d+,\d+$/.test(text)) text = text.replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, '');
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function inferValueType(value: unknown): DatasetColumnType {
  if (value === null || value === undefined || value === '') return 'unknown';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  if (typeof value !== 'string') return 'string';
  const text = value.trim();
  if (/^(true|false|yes|no|ya|tidak)$/i.test(text)) return 'boolean';
  if (/^(Rp|IDR|USD|\$|€|£)/i.test(text)) return parseNumber(text) === null ? 'unknown' : 'currency';
  if (/%$/.test(text)) return 'percentage';
  if (/^-?\d{1,3}\.\d{3}$/.test(text)) return 'unknown';
  if (parseNumber(text) !== null) return Number.isInteger(parseNumber(text)) ? 'integer' : 'number';
  if (/^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/.test(text) && !Number.isNaN(Date.parse(text))) return 'date';
  if (/^\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}$/.test(text) && parseDateValue(text, 'dmy')) return 'date';
  const numericDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (numericDate && (Number(numericDate[1]) > 12 || Number(numericDate[2]) > 12) && (parseDateValue(text, Number(numericDate[1]) > 12 ? 'dmy' : 'mdy'))) return 'date';
  return 'string';
}

function inferColumnType(name: string, values: unknown[]): DatasetColumnType {
  if (/(^|_)(id|uuid|code|zip|postal|phone|account|sku)(_|$)/i.test(name) || /(^|\s)(id|identifier|kode|nomor|no\.?)(\s|$)/i.test(name)) return 'string';
  const nonEmpty = values.filter(value => value !== null && value !== undefined && value !== '');
  if (!nonEmpty.length) return 'unknown';
  if (nonEmpty.some(value => typeof value === 'string' && /^0\d+$/.test(value.trim()))) return 'string';
  const types = nonEmpty.map(inferValueType);
  const counts = new Map<DatasetColumnType, number>();
  for (const type of types) counts.set(type, (counts.get(type) || 0) + 1);
  const [winner, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return count / nonEmpty.length >= 0.95 ? winner : 'unknown';
}

function profileColumns(sheet: ParsedTabularSheet): DatasetColumn[] {
  return sheet.headers.map((name, columnIndex) => {
    const values = sheet.rows.map(row => row[name]);
    const nonMissing = values.filter(value => value !== null && value !== undefined && value !== '');
    const type = inferColumnType(name, values);
    const unique = new Set(nonMissing.map(value => typeof value === 'object' ? JSON.stringify(value) : String(value)));
    const column: DatasetColumn = {
      name, originalName: sheet.originalHeaders[columnIndex], inferredType: type,
      nullable: nonMissing.length < values.length, uniqueCount: unique.size,
      missingCount: values.length - nonMissing.length, sampleValues: [...new Map(nonMissing.map(value => [String(value), value])).values()].slice(0, 5),
      inferredName: !sheet.originalHeaders[columnIndex]
    };
    if (['number', 'integer', 'currency', 'percentage'].includes(type)) {
      const numeric = nonMissing.map(parseNumber).filter((value): value is number => value !== null).sort((a, b) => a - b);
      if (numeric.length) {
        column.min = numeric[0]; column.max = numeric[numeric.length - 1];
        column.mean = numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
        column.median = numeric.length % 2 ? numeric[Math.floor(numeric.length / 2)] : (numeric[numeric.length / 2 - 1] + numeric[numeric.length / 2]) / 2;
        const q1 = numeric[Math.floor((numeric.length - 1) * 0.25)];
        const q3 = numeric[Math.floor((numeric.length - 1) * 0.75)];
        const range = q3 - q1;
        column.potentialOutlierCount = numeric.filter(value => value < q1 - 1.5 * range || value > q3 + 1.5 * range).length;
      }
    }
    if (type === 'date') {
      const dates = nonMissing.map(value => parseDateValue(value, 'dmy')).filter((value): value is string => value !== null).sort();
      if (dates.length) { column.earliest = dates[0]; column.latest = dates[dates.length - 1]; }
    }
    if (type === 'string' || type === 'boolean') {
      const counts = new Map<string, number>();
      nonMissing.forEach(value => counts.set(String(value), (counts.get(String(value)) || 0) + 1));
      column.topValues = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([value, count]) => ({ value, count }));
    }
    if (/(^|_)(id|uuid|code|sku)(_|$)/i.test(name) || /(^|\s)(id|identifier|kode|nomor)(\s|$)/i.test(name)) column.semantic = { value: 'identifier', confidence: 'inferred' };
    else if (/(revenue|sales|price|cost|amount|balance|pendapatan|harga|biaya|omzet)/i.test(name)) column.semantic = { value: 'monetary metric', confidence: 'inferred' };
    else if (/(date|time|tanggal|waktu|month|bulan)/i.test(name) || type === 'date') column.semantic = { value: 'date or time', confidence: 'inferred' };
    else if (/(percent|percentage|ratio|rate|persen)/i.test(name) || type === 'percentage') column.semantic = { value: 'percentage or rate', confidence: 'inferred' };
    return column;
  });
}

export function createTabularDataset(input: { attachmentId: string; workspaceId: string; filename: string; checksum: string; createdAt: Date; workbook: ParsedTabularWorkbook; sheetName?: string }): TabularDataset {
  const sheet = input.workbook.sheets.find(candidate => candidate.name === input.sheetName) || input.workbook.sheets.find(candidate => candidate.name === input.workbook.activeSheet) || input.workbook.sheets[0];
  if (!sheet) throw new Error('Sheet tidak ditemukan.');
  const columns = profileColumns(sheet);
  const missingCellCount = columns.reduce((sum, column) => sum + column.missingCount, 0);
  const totalCells = sheet.rows.length * sheet.headers.length;
  const seenRows = new Set<string>();
  let duplicateRowCount = 0;
  let repeatedHeaderRows = 0;
  for (const row of sheet.rows) {
    if (sheet.headers.every(header => String(row[header] ?? '').trim().toLocaleLowerCase() === header.trim().toLocaleLowerCase())) repeatedHeaderRows += 1;
    const key = JSON.stringify(sheet.headers.map(header => row[header] ?? null));
    if (seenRows.has(key)) duplicateRowCount += 1;
    else seenRows.add(key);
  }
  return {
    id: `${input.attachmentId}:${Buffer.from(sheet.name).toString('base64url')}`,
    workspaceId: input.workspaceId, sourceFileId: input.attachmentId, name: input.filename,
    sheetName: sheet.name, version: input.checksum, rowCount: sheet.rows.length,
    columnCount: sheet.headers.length, columns, sheets: input.workbook.summaries,
    activeSheet: input.workbook.activeSheet, profileScope: 'complete',
    quality: {
      missingCellCount, missingCellPercent: totalCells ? missingCellCount / totalCells * 100 : 0,
      duplicateRowCount, emptyColumnCount: columns.filter(column => column.missingCount === sheet.rows.length).length,
      inconsistentColumns: columns.filter(column => column.inferredType === 'unknown' && column.missingCount < sheet.rows.length).map(column => column.name),
      repeatedHeaderRows, potentialOutlierCells: columns.reduce((sum, column) => sum + (column.potentialOutlierCount || 0), 0)
    },
    createdAt: input.createdAt.toISOString()
  };
}

const compare = (actual: unknown, expected: unknown): number => {
  const a = parseNumber(actual); const b = parseNumber(expected);
  if (a !== null && b !== null) return a - b;
  return String(actual ?? '').localeCompare(String(expected ?? ''), undefined, { sensitivity: 'base' });
};

function matches(row: Record<string, unknown>, filter: TabularAnalysisRequest['filters'][number]): boolean {
  const value = row[filter.column];
  const empty = value === null || value === undefined || value === '';
  switch (filter.operation) {
    case 'is_empty': return empty;
    case 'is_not_empty': return !empty;
    case 'equals': return compare(value, filter.value) === 0;
    case 'not_equals': return compare(value, filter.value) !== 0;
    case 'greater_than': return compare(value, filter.value) > 0;
    case 'less_than': return compare(value, filter.value) < 0;
    case 'between': return compare(value, filter.value) >= 0 && compare(value, filter.valueTo) <= 0;
    case 'contains': return String(value ?? '').toLocaleLowerCase().includes(String(filter.value ?? '').toLocaleLowerCase());
  }
}

export function runTabularAnalysis(input: { attachmentId: string; filename: string; checksum: string; createdAt: Date; workbook: ParsedTabularWorkbook; plan: TabularAnalysisRequest }): TabularAnalysisResult {
  const sheet = input.workbook.sheets.find(candidate => candidate.name === input.plan.sheetName) || input.workbook.sheets.find(candidate => candidate.name === input.workbook.activeSheet) || input.workbook.sheets[0];
  if (!sheet) throw new Error('Sheet tidak ditemukan.');
  const columnSet = new Set(sheet.headers);
  const selectedColumn = input.plan.column;
  if (input.plan.groupBy && !columnSet.has(input.plan.groupBy)) throw new Error('Kolom pengelompokan tidak ditemukan pada sheet ini.');
  if (input.plan.dateBucket) {
    if (!input.plan.groupBy) throw new Error('Pilih kolom tanggal untuk membuat grup waktu.');
    const groupType = inferColumnType(input.plan.groupBy, sheet.rows.map(row => row[input.plan.groupBy!]));
    if (groupType !== 'date') throw new Error('Pengelompokan waktu hanya dapat digunakan pada kolom tanggal yang dikenali.');
  }
  if (selectedColumn && !columnSet.has(selectedColumn)) throw new Error('Kolom perhitungan tidak ditemukan pada sheet ini.');
  for (const filter of input.plan.filters) if (!columnSet.has(filter.column)) throw new Error(`Kolom filter "${filter.column}" tidak ditemukan pada sheet ini.`);
  const numericOps = ['sum', 'mean', 'median'];
  const columnType = selectedColumn ? inferColumnType(selectedColumn, sheet.rows.map(row => row[selectedColumn])) : 'unknown';
  if (numericOps.includes(input.plan.aggregation) && !['number', 'integer', 'currency', 'percentage'].includes(columnType)) throw new Error(`${input.plan.aggregation} memerlukan kolom numerik. Kolom "${selectedColumn}" terdeteksi sebagai ${columnType}.`);
  if (input.plan.aggregation !== 'count' && !selectedColumn) throw new Error('Pilih kolom untuk agregasi ini.');
  for (const filter of input.plan.filters) {
    if (['greater_than', 'less_than', 'between'].includes(filter.operation)) {
      const filterType = inferColumnType(filter.column, sheet.rows.map(row => row[filter.column]));
      if (!['number', 'integer', 'currency', 'percentage', 'date'].includes(filterType)) throw new Error(`Filter ${filter.operation} memerlukan kolom numerik atau tanggal. Kolom "${filter.column}" terdeteksi sebagai ${filterType}.`);
    }
  }

  const rows = sheet.rows.filter(row => input.plan.filters.every(filter => matches(row, filter)));
  const groups = new Map<string, { key: unknown; rows: Array<Record<string, unknown>> }>();
  for (const row of rows) {
    let key: unknown = input.plan.groupBy ? row[input.plan.groupBy] ?? '(kosong)' : 'Total';
    if (input.plan.groupBy && input.plan.dateBucket && !missing(key)) {
      const date = parseDateValue(key, 'dmy');
      if (!date) key = '(tanggal tidak valid)';
      else if (input.plan.dateBucket === 'year') key = date.slice(0, 4);
      else if (input.plan.dateBucket === 'month') key = date.slice(0, 7);
      else if (input.plan.dateBucket === 'quarter') key = `${date.slice(0, 4)}-Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`;
      else key = date;
    }
    const id = JSON.stringify(key);
    const group = groups.get(id) || { key, rows: [] };
    group.rows.push(row); groups.set(id, group);
  }
  const resultRows = [...groups.values()].map(group => {
    const values = selectedColumn ? group.rows.map(row => row[selectedColumn]).filter(value => value !== null && value !== undefined && value !== '') : [];
    const numeric = values.map(parseNumber).filter((value): value is number => value !== null).sort((a, b) => a - b);
    if (['sum', 'mean', 'median'].includes(input.plan.aggregation) && numeric.length !== values.length) throw new Error('Kolom "' + selectedColumn + '" memiliki nilai angka yang ambigu atau tidak valid. Normalisasikan locale angka terlebih dahulu.');
    let value: unknown;
    switch (input.plan.aggregation) {
      case 'count': value = group.rows.length; break;
      case 'sum': value = numeric.reduce((sum, item) => sum + item, 0); break;
      case 'mean': value = numeric.length ? numeric.reduce((sum, item) => sum + item, 0) / numeric.length : null; break;
      case 'median': value = numeric.length ? (numeric.length % 2 ? numeric[Math.floor(numeric.length / 2)] : (numeric[numeric.length / 2 - 1] + numeric[numeric.length / 2]) / 2) : null; break;
      case 'min': value = values.length ? values.reduce((best, current) => compare(current, best) < 0 ? current : best) : null; break;
      case 'max': value = values.length ? values.reduce((best, current) => compare(current, best) > 0 ? current : best) : null; break;
      case 'distinct_count': value = new Set(values.map(item => String(item))).size; break;
    }
    return { ...(input.plan.groupBy ? { [input.plan.groupBy]: group.key } : {}), [`${input.plan.aggregation}_${input.plan.aggregation === 'count' ? 'rows' : selectedColumn}`]: value };
  }).sort((a, b) => input.plan.groupBy ? compare(a[input.plan.groupBy], b[input.plan.groupBy]) : 0);
  const boundedRows = resultRows.slice(0, input.plan.limit);
  const datasetId = `${input.attachmentId}:${Buffer.from(sheet.name).toString('base64url')}`;
  return {
    datasetId, datasetVersion: input.checksum, sheetName: sheet.name, operations: input.plan,
    columns: [...(input.plan.groupBy ? [input.plan.groupBy] : []), `${input.plan.aggregation}_${selectedColumn || 'rows'}`],
    rows: boundedRows, matchedRowCount: rows.length, truncated: resultRows.length > boundedRows.length,
    provenance: { sourceFileId: input.attachmentId, filename: input.filename, checksum: input.checksum, sheetName: sheet.name, computedAt: new Date().toISOString() }
  };
}

export function toSafeCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
  const cell = (value: unknown) => {
    let text = value === null || value === undefined ? '' : String(value);
    if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [columns, ...rows.map(row => columns.map(column => row[column]))].map(row => row.map(cell).join(',')).join('\r\n');
}

export async function toSafeXlsx(columns: string[], rows: Array<Record<string, unknown>>, sheetName = 'Data'): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ruang Tenang';
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31) || 'Data');
  sheet.addRow(columns);
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.eachCell(cell => { cell.alignment = { vertical: 'middle' }; });
  for (const row of rows) {
    sheet.addRow(columns.map(column => {
      const value = row[column];
      if (typeof value === 'string' && ['=', '+', '-', '@'].includes(value.trimStart()[0] || '')) return "'" + value;
      return value === undefined ? null : value as ExcelJS.CellValue;
    }));
  }
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(columns.length, 1) } };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function missing(value: unknown): boolean { return value === null || value === undefined || value === ''; }

function parseLocaleNumber(value: unknown, decimalSeparator: 'comma' | 'dot'): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  let text = value.trim().replace(/[\s\u00a0]/g, '');
  if (!text) return null;
  const grouping = decimalSeparator === 'comma' ? '.' : ',';
  const decimal = decimalSeparator === 'comma' ? ',' : '.';
  text = text.replace(/^(Rp|IDR|USD|\$|€|£)/i, '').replace(/(Rp|IDR|USD|\$|€|£)$/i, '').replace(/%$/, '');
  text = text.split(grouping).join('');
  const decimalIndex = text.lastIndexOf(decimal);
  if (decimalIndex >= 0) text = `${text.slice(0, decimalIndex).split(decimal).join('')}.${text.slice(decimalIndex + 1)}`;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function parseDateValue(value: unknown, order: 'dmy' | 'mdy' | 'ymd'): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
  }
  const monthNames: Record<string, number> = { jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agustus: 8, aug: 8, sep: 9, september: 9, okt: 10, oktober: 10, oct: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12 };
  const named = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  let day: number; let month: number; let year: number;
  if (named) { day = Number(named[1]); month = monthNames[named[2].toLowerCase()]; year = Number(named[3]); }
  else {
    const match = text.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/);
    if (!match) return null;
    const parts = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (order === 'ymd') [year, month, day] = parts;
    else if (order === 'mdy') [month, day, year] = parts;
    else [day, month, year] = parts;
  }
  if (!Number.isInteger(day!) || !Number.isInteger(month!) || !Number.isInteger(year!) || year! < 1000 || year! > 9999 || month! < 1 || month! > 12 || day! < 1 || day! > 31) return null;
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const check = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(check.getTime()) || check.toISOString().slice(0, 10) !== iso ? null : iso;
}

function applyTransformations(sheet: ParsedTabularSheet, operations: DataTransformation[]) {
  let rows = sheet.rows.map(row => ({ ...row }));
  let cellsChanged = 0;
  const summary: TabularTransformPreview['summary'] = [];
  for (const operation of operations) {
    if (operation.type === 'remove_empty_rows') {
      const before = rows.length;
      rows = rows.filter(row => Object.values(row).some(value => !missing(value)));
      const affected = before - rows.length;
      summary.push({ operation: operation.type, affected, message: `${affected} baris kosong dihapus.` });
      continue;
    }
    if (operation.type === 'remove_duplicates') {
      const columns = operation.columns?.length ? operation.columns : sheet.headers;
      const unknown = columns.find(columnName => !sheet.headers.includes(columnName));
      if (unknown) throw new Error(`Kolom duplikasi "${unknown}" tidak ditemukan.`);
      const seen = new Set<string>();
      const before = rows.length;
      rows = rows.filter(row => {
        const key = JSON.stringify(columns.map(columnName => row[columnName] ?? null));
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
      const affected = before - rows.length;
      summary.push({ operation: operation.type, affected, message: `${affected} baris duplikat dihapus.` });
      continue;
    }
    if (!sheet.headers.includes(operation.column)) throw new Error(`Kolom "${operation.column}" tidak ditemukan pada sheet ini.`);
    const values = rows.map(row => row[operation.column]).filter(value => !missing(value));
    let replacement: unknown;
    if (operation.type === 'fill_missing') {
      if (operation.strategy === 'custom') {
        if (operation.customValue === undefined || operation.customValue === null) throw new Error('Nilai pengganti kustom harus diisi.');
        replacement = operation.customValue;
      } else if (operation.strategy === 'mode') {
        const frequencies = new Map<string, { value: unknown; count: number }>();
        values.forEach(value => { const key = String(value); const entry = frequencies.get(key) || { value, count: 0 }; entry.count += 1; frequencies.set(key, entry); });
        replacement = [...frequencies.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))[0]?.[1].value;
        if (replacement === undefined) throw new Error('Mode tidak dapat dihitung karena kolom kosong.');
      } else {
        const type = inferColumnType(operation.column, values);
        if (!['number', 'integer', 'currency', 'percentage'].includes(type)) throw new Error(`${operation.strategy} hanya berlaku untuk kolom numerik.`);
        const numbers = values.map(parseNumber).filter((value): value is number => value !== null).sort((a, b) => a - b);
        if (!numbers.length) throw new Error('Tidak ada nilai numerik untuk menghitung pengganti.');
        replacement = operation.strategy === 'mean' ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : (numbers.length % 2 ? numbers[Math.floor(numbers.length / 2)] : (numbers[numbers.length / 2 - 1] + numbers[numbers.length / 2]) / 2);
      }
      let affected = 0;
      rows = rows.map(row => {
        if (!missing(row[operation.column])) return row;
        affected += 1; cellsChanged += 1; return { ...row, [operation.column]: replacement };
      });
      summary.push({ operation: operation.type, affected, message: `${affected} nilai kosong pada ${operation.column} diisi dengan ${operation.strategy}.` });
      continue;
    }
    let affected = 0; let malformed = 0;
    rows = rows.map(row => {
      const value = row[operation.column];
      if (missing(value)) return row;
      const normalized = operation.type === 'normalize_date' ? parseDateValue(value, operation.dateOrder) : parseLocaleNumber(value, operation.decimalSeparator);
      if (normalized === null) { malformed += 1; return row; }
      if (typeof normalized === typeof value && String(normalized) === String(value)) return row;
      affected += 1; cellsChanged += 1; return { ...row, [operation.column]: normalized };
    });
    summary.push({ operation: operation.type, affected, message: `${affected} nilai pada ${operation.column} dinormalisasi${malformed ? `; ${malformed} nilai tidak cocok dan dibiarkan` : ''}.` });
  }
  return { rows, cellsChanged, summary };
}

export function previewTabularTransform(input: { attachmentId: string; checksum: string; workbook: ParsedTabularWorkbook; plan: TabularTransformRequest }): { result: TabularTransformPreview; rows: Array<Record<string, unknown>> } {
  if (input.plan.expectedVersion !== input.checksum) throw new Error('Versi sumber berubah. Muat ulang dataset sebelum membuat preview baru.');
  const sheet = input.workbook.sheets.find(candidate => candidate.name === input.plan.sheetName) || input.workbook.sheets.find(candidate => candidate.name === input.workbook.activeSheet) || input.workbook.sheets[0];
  if (!sheet) throw new Error('Sheet tidak ditemukan.');
  const transformed = applyTransformations(sheet, input.plan.operations);
  const result: TabularTransformPreview = {
    sourceFileId: input.attachmentId, sourceVersion: input.checksum, sheetName: sheet.name,
    operations: input.plan.operations, sourceRowCount: sheet.rows.length, resultRowCount: transformed.rows.length,
    rowsRemoved: sheet.rows.length - transformed.rows.length, cellsChanged: transformed.cellsChanged,
    previewRows: transformed.rows.slice(0, 20), summary: transformed.summary
  };
  return { result, rows: transformed.rows };
}

export function renderDerivedTableMarkdown(input: { title: string; filename: string; sheetName: string; sourceVersion: string; operations: DataTransformation[]; headers: string[]; rows: Array<Record<string, unknown>> }): string {
  const escape = (value: unknown) => String(value ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  const tableRows = input.rows.map(row => `| ${input.headers.map(header => escape(row[header])).join(' | ')} |`);
  return [`# ${input.title}`, '', `Derived from ${input.filename} · Sheet ${input.sheetName}`, `Source version: ${input.sourceVersion}`, `Operations: ${input.operations.map(operation => operation.type).join(', ')}`, '', `| ${input.headers.map(escape).join(' | ')} |`, `| ${input.headers.map(() => '---').join(' | ')} |`, ...tableRows].join('\n');
}

export function getDatasetId(attachmentId: string, sheetName: string): string {
  const digest = crypto.createHash('sha256').update(sheetName).digest('hex').slice(0, 12);
  return `${attachmentId}:${digest}`;
}
