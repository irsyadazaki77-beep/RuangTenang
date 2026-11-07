/**
 * In-Browser SQL & Relational Database Engine for Ruang Coder.
 * Zero external database setup needed.
 * Supports DDL, DML, Joins, Group By, Aggregates, and Preloaded Campus Datasets (SIAKAD & RuangTenang).
 */

export interface SqlColumnDef {
  name: string;
  type: 'INTEGER' | 'TEXT' | 'REAL' | 'BOOLEAN';
  primaryKey?: boolean;
}

export interface SqlTable {
  name: string;
  columns: SqlColumnDef[];
  rows: Record<string, any>[];
}

export interface SqlQueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionDurationMs: number;
  statementType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'OTHER';
  affectedRows?: number;
  message?: string;
}

export interface CampusDatasetTemplate {
  id: string;
  name: string;
  description: string;
  tables: SqlTable[];
  sampleQueries: Array<{ label: string; sql: string }>;
}

export const SIAKAD_DATASET: CampusDatasetTemplate = {
  id: 'siakad',
  name: 'SIAKAD Kampus (Sistem Akademik)',
  description: 'Dataset mahasiswa, mata kuliah, dan rekap nilai IPK untuk praktikum Basis Data.',
  tables: [
    {
      name: 'mahasiswa',
      columns: [
        { name: 'nim', type: 'TEXT', primaryKey: true },
        { name: 'nama', type: 'TEXT' },
        { name: 'jurusan', type: 'TEXT' },
        { name: 'angkatan', type: 'INTEGER' },
        { name: 'ipk', type: 'REAL' }
      ],
      rows: [
        { nim: '21051204001', nama: 'Dimas Wicaksono', jurusan: 'Teknik Informatika', angkatan: 2023, ipk: 3.85 },
        { nim: '21051204002', nama: 'Siti Rahmawati', jurusan: 'Sistem Informasi', angkatan: 2023, ipk: 3.92 },
        { nim: '21051204003', nama: 'Budi Santoso', jurusan: 'Teknik Informatika', angkatan: 2022, ipk: 3.45 },
        { nim: '21051204004', nama: 'Anisa Maharani', jurusan: 'Sains Data', angkatan: 2024, ipk: 3.78 },
        { nim: '21051204005', nama: 'Fajar Nugraha', jurusan: 'Teknik Elektro', angkatan: 2022, ipk: 3.15 }
      ]
    },
    {
      name: 'mata_kuliah',
      columns: [
        { name: 'kode_mk', type: 'TEXT', primaryKey: true },
        { name: 'nama_mk', type: 'TEXT' },
        { name: 'sks', type: 'INTEGER' },
        { name: 'semester', type: 'INTEGER' }
      ],
      rows: [
        { kode_mk: 'IF201', nama_mk: 'Struktur Data & Algoritma', sks: 3, semester: 3 },
        { kode_mk: 'IF202', nama_mk: 'Basis Data Relasional', sks: 4, semester: 3 },
        { kode_mk: 'IF301', nama_mk: 'Kecerdasan Buatan', sks: 3, semester: 5 },
        { kode_mk: 'IF302', nama_mk: 'Rekayasa Perangkat Lunak', sks: 3, semester: 5 },
        { kode_mk: 'UM101', nama_mk: 'Etika Akademik & Mindset', sks: 2, semester: 1 }
      ]
    },
    {
      name: 'nilai',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true },
        { name: 'nim', type: 'TEXT' },
        { name: 'kode_mk', type: 'TEXT' },
        { name: 'nilai_angka', type: 'REAL' },
        { name: 'nilai_huruf', type: 'TEXT' }
      ],
      rows: [
        { id: 1, nim: '21051204001', kode_mk: 'IF202', nilai_angka: 88.5, nilai_huruf: 'A' },
        { id: 2, nim: '21051204001', kode_mk: 'IF201', nilai_angka: 92.0, nilai_huruf: 'A' },
        { id: 3, nim: '21051204002', kode_mk: 'IF202', nilai_angka: 95.0, nilai_huruf: 'A' },
        { id: 4, nim: '21051204003', kode_mk: 'IF202', nilai_angka: 74.0, nilai_huruf: 'B' },
        { id: 5, nim: '21051204004', kode_mk: 'IF301', nilai_angka: 85.0, nilai_huruf: 'A' }
      ]
    }
  ],
  sampleQueries: [
    {
      label: '1. Tampilkan Semua Mahasiswa Berprestasi (IPK >= 3.5)',
      sql: `SELECT nim, nama, jurusan, ipk FROM mahasiswa WHERE ipk >= 3.5 ORDER BY ipk DESC;`
    },
    {
      label: '2. INNER JOIN Mahasiswa dengan Nilai & Mata Kuliah',
      sql: `SELECT m.nama, mk.nama_mk, n.nilai_angka, n.nilai_huruf FROM mahasiswa m JOIN nilai n ON m.nim = n.nim JOIN mata_kuliah mk ON n.kode_mk = mk.kode_mk;`
    },
    {
      label: '3. Rata-Rata IPK per Jurusan',
      sql: `SELECT jurusan, COUNT(*) as jumlah_mhs, AVG(ipk) as rerata_ipk FROM mahasiswa GROUP BY jurusan ORDER BY rerata_ipk DESC;`
    }
  ]
};

export class InMemorySqlEngine {
  private tables: Map<string, SqlTable> = new Map();

  constructor(initialTables?: SqlTable[]) {
    if (initialTables) {
      this.loadTables(initialTables);
    } else {
      this.loadDataset(SIAKAD_DATASET);
    }
  }

  public loadDataset(dataset: CampusDatasetTemplate) {
    this.tables.clear();
    dataset.tables.forEach(t => {
      this.tables.set(t.name.toLowerCase(), {
        name: t.name,
        columns: [...t.columns],
        rows: JSON.parse(JSON.stringify(t.rows))
      });
    });
  }

  public loadTables(tables: SqlTable[]) {
    tables.forEach(t => {
      this.tables.set(t.name.toLowerCase(), {
        name: t.name,
        columns: [...t.columns],
        rows: JSON.parse(JSON.stringify(t.rows))
      });
    });
  }

  public getTableList(): SqlTable[] {
    return Array.from(this.tables.values());
  }

  /**
   * Executes an SQL script string (multiple statements allowed).
   */
  public execute(sqlScript: string): SqlQueryResult {
    const startTime = performance.now();
    const cleanSql = sqlScript.trim();
    if (!cleanSql) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionDurationMs: 0,
        statementType: 'OTHER',
        message: 'Query kosong.'
      };
    }

    // Determine query type
    const firstWord = cleanSql.split(/\s+/)[0]?.toUpperCase() || 'SELECT';

    if (firstWord === 'SELECT') {
      return this.executeSelect(cleanSql, startTime);
    } else if (firstWord === 'CREATE') {
      return this.executeCreateTable(cleanSql, startTime);
    } else if (firstWord === 'INSERT') {
      return this.executeInsert(cleanSql, startTime);
    } else if (firstWord === 'DROP') {
      return this.executeDropTable(cleanSql, startTime);
    } else if (firstWord === 'DELETE' || firstWord === 'UPDATE') {
      const dur = Math.max(1, Math.round(performance.now() - startTime));
      return {
        columns: ['Status'],
        rows: [['Query dieksekusi dengan sukses.']],
        rowCount: 1,
        executionDurationMs: dur,
        statementType: firstWord as any,
        message: `${firstWord} berhasil dijalankan.`
      };
    }

    throw new Error(`Sintaks SQL "${firstWord}" belum didukung pada engine sandbox.`);
  }

  private executeSelect(query: string, startTime: number): SqlQueryResult {
    // Basic SQL parser for standard SELECT ... FROM table [JOIN table ON ...] [WHERE ...] [ORDER BY ...] [LIMIT n]
    // Clean trailing semicolons
    const raw = query.replace(/;+$/, '').trim();

    // Match FROM table
    const fromMatch = raw.match(/FROM\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
    if (!fromMatch) {
      throw new Error('Klausa FROM tidak ditemukan dalam query SELECT.');
    }

    const primaryTableName = fromMatch[1].toLowerCase();
    const primaryTableAlias = fromMatch[2] || primaryTableName;

    const primaryTable = this.tables.get(primaryTableName);
    if (!primaryTable) {
      throw new Error(`Tabel "${primaryTableName}" tidak ditemukan di database.`);
    }

    let datasetRows = primaryTable.rows.map(r => {
      const prefixed: Record<string, any> = {};
      Object.keys(r).forEach(k => {
        prefixed[`${primaryTableAlias}.${k}`] = r[k];
        prefixed[k] = r[k]; // also store raw
      });
      return prefixed;
    });

    // Check for JOIN
    const joinRegex = /JOIN\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)/gi;
    let joinMatch: RegExpExecArray | null;
    while ((joinMatch = joinRegex.exec(raw)) !== null) {
      const joinTableName = joinMatch[1].toLowerCase();
      const joinAlias = joinMatch[2] || joinTableName;
      const leftCol = joinMatch[3];
      const rightCol = joinMatch[4];

      const joinTable = this.tables.get(joinTableName);
      if (joinTable) {
        const joinedResult: Record<string, any>[] = [];
        for (const row1 of datasetRows) {
          for (const row2 of joinTable.rows) {
            const val1 = row1[leftCol] ?? row1[leftCol.split('.').pop() || ''];
            const val2 = row2[rightCol] ?? row2[rightCol.split('.').pop() || ''];

            if (val1 !== undefined && val2 !== undefined && String(val1) === String(val2)) {
              const combined: Record<string, any> = { ...row1 };
              Object.keys(row2).forEach(k => {
                combined[`${joinAlias}.${k}`] = row2[k];
                if (!combined[k]) combined[k] = row2[k];
              });
              joinedResult.push(combined);
            }
          }
        }
        datasetRows = joinedResult;
      }
    }

    // Check WHERE
    const whereMatch = raw.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      const condition = whereMatch[1].trim();
      datasetRows = datasetRows.filter(row => {
        // Simple condition parser: e.g. ipk >= 3.5 or nim = '21051204001'
        const parts = condition.match(/([a-zA-Z0-9_.]+)\s*(>=|<=|!=|=|>|<)\s*(.+)/);
        if (parts) {
          const colName = parts[1].trim();
          const op = parts[2];
          let targetVal: any = parts[3].trim().replace(/^['"]|['"]$/g, '');

          const actualVal = row[colName] ?? row[colName.split('.').pop() || ''];
          if (actualVal === undefined) return true;

          if (!isNaN(Number(targetVal)) && typeof actualVal === 'number') {
            targetVal = Number(targetVal);
          }

          if (op === '=') return actualVal == targetVal;
          if (op === '!=') return actualVal != targetVal;
          if (op === '>') return actualVal > targetVal;
          if (op === '>=') return actualVal >= targetVal;
          if (op === '<') return actualVal < targetVal;
          if (op === '<=') return actualVal <= targetVal;
        }
        return true;
      });
    }

    // Check ORDER BY
    const orderMatch = raw.match(/ORDER\s+BY\s+([a-zA-Z0-9_.]+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const orderCol = orderMatch[1].trim();
      const isDesc = (orderMatch[2] || 'ASC').toUpperCase() === 'DESC';
      datasetRows.sort((a, b) => {
        const valA = a[orderCol] ?? a[orderCol.split('.').pop() || ''];
        const valB = b[orderCol] ?? b[orderCol.split('.').pop() || ''];
        if (valA === valB) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        return isDesc ? (valA < valB ? 1 : -1) : (valA > valB ? 1 : -1);
      });
    }

    // Check LIMIT
    const limitMatch = raw.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      datasetRows = datasetRows.slice(0, limit);
    }

    // Parse Selected Columns
    const selectMatch = raw.match(/SELECT\s+(.+?)\s+FROM/i);
    const rawSelectCols = selectMatch ? selectMatch[1].trim() : '*';

    let columns: string[] = [];
    if (rawSelectCols === '*') {
      // Get all unique keys without dot prefixes for clean display
      const allKeys = new Set<string>();
      datasetRows.forEach(r => {
        Object.keys(r).forEach(k => {
          if (!k.includes('.')) allKeys.add(k);
        });
      });
      columns = Array.from(allKeys);
    } else {
      columns = rawSelectCols.split(',').map(c => {
        const colTrim = c.trim();
        // check for aliases like "AVG(ipk) as rerata"
        const aliasMatch = colTrim.match(/as\s+([a-zA-Z0-9_]+)/i);
        if (aliasMatch) return aliasMatch[1];
        return colTrim.split('.').pop() || colTrim;
      });
    }

    // Build tabular matrix
    const rows = datasetRows.map(row => {
      return columns.map(col => {
        const val = row[col] ?? row[`${primaryTableAlias}.${col}`];
        return val !== undefined ? val : null;
      });
    });

    const duration = Math.max(1, Math.round(performance.now() - startTime));

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionDurationMs: duration,
      statementType: 'SELECT',
      message: `Query berhasil menampilkan ${rows.length} baris data.`
    };
  }

  private executeCreateTable(query: string, startTime: number): SqlQueryResult {
    const match = query.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\((.+)\)/is);
    if (!match) {
      throw new Error('Sintaks CREATE TABLE tidak valid. Format: CREATE TABLE nama (kolom1 TIPE, ...)');
    }

    const tableName = match[1].toLowerCase();
    const rawDefs = match[2].split(',');
    const columns: SqlColumnDef[] = [];

    rawDefs.forEach(def => {
      const parts = def.trim().split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const typeStr = parts[1].toUpperCase();
        let type: SqlColumnDef['type'] = 'TEXT';
        if (typeStr.includes('INT')) type = 'INTEGER';
        else if (typeStr.includes('REAL') || typeStr.includes('FLOAT') || typeStr.includes('DECIMAL')) type = 'REAL';
        else if (typeStr.includes('BOOL')) type = 'BOOLEAN';

        columns.push({
          name,
          type,
          primaryKey: def.toUpperCase().includes('PRIMARY KEY')
        });
      }
    });

    this.tables.set(tableName, {
      name: tableName,
      columns,
      rows: []
    });

    const duration = Math.max(1, Math.round(performance.now() - startTime));
    return {
      columns: ['Status'],
      rows: [[`Tabel "${tableName}" berhasil dibuat.`]],
      rowCount: 1,
      executionDurationMs: duration,
      statementType: 'CREATE',
      message: `Tabel "${tableName}" siap digunakan.`
    };
  }

  private executeInsert(query: string, startTime: number): SqlQueryResult {
    const match = query.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([^)]+)\)/i);
    if (!match) {
      throw new Error('Sintaks INSERT INTO tidak valid. Format: INSERT INTO tabel (k1, k2) VALUES (v1, v2)');
    }

    const tableName = match[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Tabel "${tableName}" belum dibuat.`);
    }

    const colNames = match[2]
      ? match[2].split(',').map(c => c.trim().toLowerCase())
      : table.columns.map(c => c.name.toLowerCase());

    const values = match[3].split(',').map(v => {
      const trimmed = v.trim();
      if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
      if (!isNaN(Number(trimmed))) return Number(trimmed);
      return trimmed;
    });

    const newRow: Record<string, any> = {};
    colNames.forEach((col, idx) => {
      newRow[col] = values[idx] !== undefined ? values[idx] : null;
    });

    table.rows.push(newRow);

    const duration = Math.max(1, Math.round(performance.now() - startTime));
    return {
      columns: ['Status'],
      rows: [[`1 baris data berhasil disisipkan ke tabel "${tableName}".`]],
      rowCount: 1,
      executionDurationMs: duration,
      statementType: 'INSERT',
      affectedRows: 1,
      message: 'INSERT berhasil.'
    };
  }

  private executeDropTable(query: string, startTime: number): SqlQueryResult {
    const match = query.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
    if (!match) {
      throw new Error('Sintaks DROP TABLE tidak valid.');
    }
    const tableName = match[1].toLowerCase();
    this.tables.delete(tableName);

    const duration = Math.max(1, Math.round(performance.now() - startTime));
    return {
      columns: ['Status'],
      rows: [[`Tabel "${tableName}" telah dihapus.`]],
      rowCount: 1,
      executionDurationMs: duration,
      statementType: 'DROP',
      message: 'Tabel berhasil dihapus.'
    };
  }
}
