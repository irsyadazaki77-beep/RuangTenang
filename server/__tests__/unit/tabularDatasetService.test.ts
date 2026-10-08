import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { createTabularDataset, parseTabularWorkbook, previewTabularTransform, runTabularAnalysis, toSafeCsv, toSafeXlsx } from '../../services/tabularDatasetService.js';

describe('tabular dataset service', () => {
  it('parses quoted CSV, BOM, and decimal-comma delimiter safely', async () => {
    const workbook = await parseTabularWorkbook(Buffer.from('\uFEFFNama;Revenue\r\n"A; B";1.234,50\r\nC;2.000,50\r\n'), 'sales.csv');
    expect(workbook.activeSheet).toBe('Data');
    expect(workbook.sheets[0].rows).toEqual([
      { Nama: 'A; B', Revenue: '1.234,50' },
      { Nama: 'C', Revenue: '2.000,50' }
    ]);
  });

  it('makes duplicate and empty headers unique without overwriting columns', async () => {
    const workbook = await parseTabularWorkbook(Buffer.from('A,A,A_2,,Column_5\n1,2,3,4,5\n'), 'headers.csv');
    expect(workbook.sheets[0].headers).toEqual(['A', 'A_2', 'A_2_2', 'Column_4', 'Column_5']);
    expect(workbook.sheets[0].rows).toEqual([{ A: '1', A_2: '2', A_2_2: '3', Column_4: '4', Column_5: '5' }]);
    expect(createTabularDataset({ attachmentId: 'att-headers', workspaceId: 'chat-1', filename: 'headers.csv', checksum: 'v1', createdAt: new Date(), workbook }).columns[3]).toMatchObject({ name: 'Column_4', originalName: '', inferredName: true });
  });

  it('keeps every XLSX sheet and selects the first populated sheet when the active one is empty', async () => {
    const source = new ExcelJS.Workbook();
    source.addWorksheet('Cover');
    source.addWorksheet('Orders').addRows([['id', 'value'], ['001', 4]]);
    source.views = [{ x: 0, y: 0, width: 16000, height: 9000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];
    const workbook = await parseTabularWorkbook(Buffer.from(await source.xlsx.writeBuffer()), 'orders.xlsx');
    expect(workbook.summaries.map(sheet => sheet.name)).toEqual(['Cover', 'Orders']);
    expect(workbook.activeSheet).toBe('Orders');
    expect(workbook.sheets.find(sheet => sheet.name === 'Orders')?.rows).toEqual([{ id: '001', value: 4 }]);
  });

  it('preserves blank XLSX rows within the used range for non-destructive cleanup preview', async () => {
    const source = new ExcelJS.Workbook();
    const sheet = source.addWorksheet('Data');
    sheet.addRow(['name', 'amount']);
    sheet.addRow(['A', 3]);
    sheet.addRow([]);
    sheet.addRow(['B', 4]);
    const workbook = await parseTabularWorkbook(Buffer.from(await source.xlsx.writeBuffer()), 'gapped.xlsx');
    expect(workbook.sheets[0].rows).toHaveLength(3);
    expect(workbook.sheets[0].rows[1]).toEqual({ name: null, amount: null });
  });

  it('keeps leading-zero identifiers as strings and reports complete profile stats', async () => {
    const workbook = await parseTabularWorkbook(Buffer.from('customer_id,amount\n00123,10\n00124,30\n00123,20\n'), 'customers.csv');
    const dataset = createTabularDataset({ attachmentId: 'att-1', workspaceId: 'chat-1', filename: 'customers.csv', checksum: 'abc', createdAt: new Date('2026-01-01T00:00:00.000Z'), workbook });
    expect(dataset.columns[0]).toMatchObject({ name: 'customer_id', inferredType: 'string', uniqueCount: 2, missingCount: 0 });
    expect(dataset.columns[1]).toMatchObject({ inferredType: 'integer', min: 10, max: 30, mean: 20, median: 20 });
    expect(dataset.profileScope).toBe('complete');
  });

  it('does not guess an ambiguous thousands or decimal separator', async () => {
    const workbook = await parseTabularWorkbook(Buffer.from('amount\n1.234\n2.345\n'), 'ambiguous.csv');
    const dataset = createTabularDataset({ attachmentId: 'att-locale', workspaceId: 'chat-1', filename: 'ambiguous.csv', checksum: 'locale-v1', createdAt: new Date(), workbook });
    expect(dataset.columns[0].inferredType).toBe('unknown');
    expect(() => runTabularAnalysis({
      attachmentId: 'att-locale', filename: 'ambiguous.csv', checksum: 'locale-v1', createdAt: new Date(), workbook,
      plan: { column: 'amount', aggregation: 'mean', filters: [], limit: 20 }
    })).toThrow(/numerik/i);
  });

  it('previews cleaning without mutating source rows and applies explicit locale choices', async () => {
    const workbook = await parseTabularWorkbook(Buffer.from('name;amount;date\nA;1,20;03/04/2026\n\nB;;7 Okt 2026\n'), 'clean.csv');
    expect(workbook.sheets[0].rows).toHaveLength(3);
    const plan = {
      sheetName: 'Data', expectedVersion: 'version-a',
      operations: [
        { type: 'remove_empty_rows' as const },
        { type: 'fill_missing' as const, column: 'amount', strategy: 'custom' as const, customValue: 0 },
        { type: 'normalize_number' as const, column: 'amount', decimalSeparator: 'comma' as const },
        { type: 'normalize_date' as const, column: 'date', dateOrder: 'dmy' as const }
      ]
    };
    const preview = previewTabularTransform({ attachmentId: 'att-3', checksum: 'version-a', workbook, plan });
    expect(preview.result).toMatchObject({ sourceRowCount: 3, resultRowCount: 2, rowsRemoved: 1, cellsChanged: 4 });
    expect(preview.rows).toEqual([
      { name: 'A', amount: 1.2, date: '2026-04-03' },
      { name: 'B', amount: 0, date: '2026-10-07' }
    ]);
    expect(workbook.sheets[0].rows).toHaveLength(3);
    expect(() => previewTabularTransform({ attachmentId: 'att-3', checksum: 'version-b', workbook, plan })).toThrow(/versi sumber berubah/i);
  });

  it('executes a deterministic grouped sum and validates numeric types', async () => {
    const workbook = await parseTabularWorkbook(Buffer.from('category,revenue\nA,10\nB,4\nA,7\n'), 'sales.csv');
    const result = runTabularAnalysis({
      attachmentId: 'att-2', filename: 'sales.csv', checksum: 'version-a', createdAt: new Date(), workbook,
      plan: { groupBy: 'category', column: 'revenue', aggregation: 'sum', filters: [{ column: 'revenue', operation: 'greater_than', value: 5 }], limit: 20 }
    });
    expect(result.rows).toEqual([{ category: 'A', sum_revenue: 17 }]);
    expect(result.matchedRowCount).toBe(2);
    expect(result.provenance).toMatchObject({ sourceFileId: 'att-2', filename: 'sales.csv', checksum: 'version-a', sheetName: 'Data' });
    expect(() => runTabularAnalysis({
      attachmentId: 'att-2', filename: 'sales.csv', checksum: 'version-a', createdAt: new Date(), workbook,
      plan: { column: 'category', aggregation: 'mean', filters: [], limit: 20 }
    })).toThrow(/memerlukan kolom numerik/i);
  });

  it('groups recognized dates into explicit calendar periods', async () => {
    const workbook = await parseTabularWorkbook(Buffer.from('order_date,revenue\n2026-10-01,10\n2026-10-31,7\n2026-11-01,4\n'), 'monthly-sales.csv');
    const result = runTabularAnalysis({
      attachmentId: 'att-monthly', filename: 'monthly-sales.csv', checksum: 'version-date', createdAt: new Date(), workbook,
      plan: { groupBy: 'order_date', dateBucket: 'month', column: 'revenue', aggregation: 'sum', filters: [], limit: 20 }
    });
    expect(result.rows).toEqual([
      { order_date: '2026-10', sum_revenue: 17 },
      { order_date: '2026-11', sum_revenue: 4 }
    ]);
  });

  it('quotes exported values and protects formula-like strings', () => {
    expect(toSafeCsv(['name', 'amount'], [{ name: '=HYPERLINK("x")', amount: -12 }])).toBe('"name","amount"\r\n"\'=HYPERLINK(""x"")","-12"');
  });

  it('exports typed XLSX cells and protects formula-like strings', async () => {
    const buffer = await toSafeXlsx(['name', 'amount'], [{ name: '=1+1', amount: -12 }], 'Sales');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.getWorksheet('Sales')?.getRow(2).getCell(1).value).toBe("'=1+1");
    expect(workbook.getWorksheet('Sales')?.getRow(2).getCell(2).value).toBe(-12);
  });
});
