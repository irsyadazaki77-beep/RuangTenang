import { describe, it, expect } from 'vitest';
import { InMemorySqlEngine, SIAKAD_DATASET } from '../../features/coder/services/sqliteRunner';

describe('sqliteRunner & InMemorySqlEngine', () => {
  it('loads SIAKAD dataset tables correctly', () => {
    const engine = new InMemorySqlEngine();
    const tables = engine.getTableList();
    expect(tables.length).toBe(3);
    const tableNames = tables.map(t => t.name.toLowerCase());
    expect(tableNames).toContain('mahasiswa');
    expect(tableNames).toContain('mata_kuliah');
    expect(tableNames).toContain('nilai');
  });

  it('executes SELECT query with WHERE and ORDER BY', () => {
    const engine = new InMemorySqlEngine();
    const result = engine.execute(`SELECT nim, nama, ipk FROM mahasiswa WHERE ipk >= 3.5 ORDER BY ipk DESC;`);
    expect(result.statementType).toBe('SELECT');
    expect(result.rowCount).toBeGreaterThanOrEqual(3);
    expect(result.columns).toEqual(['nim', 'nama', 'ipk']);
    // Check descending order of first row
    const firstIpk = result.rows[0][2];
    expect(firstIpk).toBeGreaterThanOrEqual(3.8);
  });

  it('executes INNER JOIN between mahasiswa and nilai', () => {
    const engine = new InMemorySqlEngine();
    const result = engine.execute(`SELECT m.nama, n.nilai_angka, n.nilai_huruf FROM mahasiswa m JOIN nilai n ON m.nim = n.nim;`);
    expect(result.statementType).toBe('SELECT');
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.columns).toContain('nama');
    expect(result.columns).toContain('nilai_angka');
  });

  it('supports CREATE TABLE and INSERT INTO queries', () => {
    const engine = new InMemorySqlEngine();
    const createRes = engine.execute(`CREATE TABLE dosen (id INTEGER, nama TEXT, nidn TEXT);`);
    expect(createRes.statementType).toBe('CREATE');

    const insertRes = engine.execute(`INSERT INTO dosen (id, nama, nidn) VALUES (1, 'Dr. Ir. Habibie', '0025061936');`);
    expect(insertRes.statementType).toBe('INSERT');

    const selectRes = engine.execute(`SELECT * FROM dosen;`);
    expect(selectRes.rowCount).toBe(1);
    expect(selectRes.rows[0][1]).toBe('Dr. Ir. Habibie');
  });
});
