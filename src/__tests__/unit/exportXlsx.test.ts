/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { createXlsxBuffer } from '../../features/workspace/utils/exportXlsx';

describe('editable XLSX export', () => {
  it('creates an openable workbook with source table values and safe formula-like text', async () => {
    const bytes = await createXlsxBuffer({
      title: 'Ringkasan Data',
      content: '# Hasil Penelitian\n\n| Kategori | Jumlah |\n| --- | ---: |\n| Kontrol | 24 |\n| =1+1 | 26 |\n'
    });
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as Buffer);

    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.getWorksheet('Hasil Penelitian')?.getRow(1).values).toEqual([undefined, 'Kategori', 'Jumlah']);
    expect(workbook.getWorksheet('Hasil Penelitian')?.getCell('A2').value).toBe('Kontrol');
    expect(workbook.getWorksheet('Hasil Penelitian')?.getCell('B2').value).toBe(24);
    expect(workbook.getWorksheet('Hasil Penelitian')?.getCell('A3').value).toBe("'=1+1");
  }, 20000);

  it('keeps editable grid rows and neutralizes formula-like input from structured table artifacts', async () => {
    const bytes = await createXlsxBuffer({ title: 'Grid', content: JSON.stringify({
      type: 'table', title: 'Edited grid', columns: ['Label', 'Amount'], rows: [{ Label: '@SUM(A1:A2)', Amount: 12.5 }], sourceVersion: 'local'
    }) });
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as Buffer);
    const sheet = workbook.getWorksheet('Edited grid')!;
    expect(sheet.getCell('A2').value).toBe("'@SUM(A1:A2)");
    expect(sheet.getCell('B2').value).toBe(12.5);
  }, 20000);

  it('writes validated number and date columns as typed spreadsheet cells and rejects invalid typed values', async () => {
    const content = JSON.stringify({ type: 'table', title: 'Typed', columns: ['Amount', 'Date'], columnTypes: { Amount: 'number', Date: 'date' }, rows: [{ Amount: '12.5', Date: '2026-10-14' }] });
    const bytes = await createXlsxBuffer({ title: 'Typed', content });
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as Buffer);
    expect(workbook.getWorksheet('Typed')?.getCell('A2').value).toBe(12.5);
    expect(workbook.getWorksheet('Typed')?.getCell('B2').value).toBeInstanceOf(Date);
    await expect(createXlsxBuffer({ title: 'Invalid', content: JSON.stringify({ type: 'table', columns: ['Amount'], columnTypes: { Amount: 'number' }, rows: [{ Amount: '=1+1' }] }) })).rejects.toThrow(/bukan angka yang valid/);
  }, 20000);
});
