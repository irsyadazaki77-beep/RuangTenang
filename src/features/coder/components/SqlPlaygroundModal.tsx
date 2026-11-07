import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Database,
  Table as TableIcon,
  Copy,
  Check,
  Sparkles,
  Clock,
  AlertTriangle
} from 'lucide-react';
import {
  InMemorySqlEngine,
  SIAKAD_DATASET,
  SqlQueryResult,
  SqlTable
} from '../services/sqliteRunner';

interface SqlPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const SqlPlaygroundModal: React.FC<SqlPlaygroundModalProps> = ({
  isOpen,
  onClose,
  isDark = true
}) => {
  const [engine] = useState(() => new InMemorySqlEngine());
  const [queryInput, setQueryInput] = useState<string>(
    SIAKAD_DATASET.sampleQueries[0].sql
  );
  const [lastResult, setLastResult] = useState<SqlQueryResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tables, setTables] = useState<SqlTable[]>([]);
  const [selectedTableForPreview, setSelectedTableForPreview] = useState<string | null>('mahasiswa');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTables(engine.getTableList());
      handleRunQuery(queryInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunQuery = (sqlToRun?: string) => {
    const target = (sqlToRun ?? queryInput).trim();
    if (!target) return;

    setErrorMsg(null);
    try {
      const res = engine.execute(target);
      setLastResult(res);
      setTables(engine.getTableList());
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
      setLastResult(null);
    }
  };

  const handleResetDataset = () => {
    engine.loadDataset(SIAKAD_DATASET);
    setTables(engine.getTableList());
    setQueryInput(SIAKAD_DATASET.sampleQueries[0].sql);
    handleRunQuery(SIAKAD_DATASET.sampleQueries[0].sql);
  };

  const handleCopyMarkdownTable = () => {
    if (!lastResult || lastResult.columns.length === 0) return;
    let md = `| ${lastResult.columns.join(' | ')} |\n`;
    md += `| ${lastResult.columns.map(() => '---').join(' | ')} |\n`;
    lastResult.rows.forEach(r => {
      md += `| ${r.map(cell => (cell === null ? 'NULL' : String(cell))).join(' | ')} |\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">SQL Database Canvas & SIAKAD Sandbox</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  SQLite In-Browser
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Praktikum Basis Data: Relasi tabel mahasiswa, mata kuliah, dan rekap nilai tanpa instalasi server SQL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDataset}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data SIAKAD</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Sample Queries */}
        <div className={`px-6 py-2.5 border-b flex items-center gap-2 overflow-x-auto text-xs ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50/60'}`}>
          <span className="text-slate-400 font-semibold shrink-0">Contoh Query:</span>
          {SIAKAD_DATASET.sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQueryInput(sample.sql);
                handleRunQuery(sample.sql);
              }}
              className={`px-2.5 py-1 rounded-md shrink-0 transition-colors cursor-pointer text-xs ${
                queryInput === sample.sql
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-medium'
                  : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              {sample.label}
            </button>
          ))}
        </div>

        {/* Main Grid: Left Editor & Schema, Right Results */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-[420px]">
          {/* Query Editor & Schema Explorer (5 cols) */}
          <div className={`md:col-span-5 border-r flex flex-col ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/30'}`}>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Editor Kueri SQL:</span>
                <span className="text-[10px] text-slate-500 font-mono">Tekan Ctrl+Enter untuk run</span>
              </div>
              <textarea
                value={queryInput}
                onChange={e => setQueryInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRunQuery();
                  }
                }}
                placeholder="Tulis SELECT, INSERT, CREATE TABLE..."
                className={`w-full flex-1 p-3 rounded-xl font-mono text-xs resize-none border outline-none focus:ring-2 focus:ring-sky-500 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-sky-200' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleRunQuery()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-md cursor-pointer transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Jalankan Query (Run)</span>
                </button>
              </div>
            </div>

            {/* Schema Explorer */}
            <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100/40'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <TableIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Skema Database SIAKAD ({tables.length} Tabel):</span>
                </div>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {tables.map(t => (
                  <div
                    key={t.name}
                    className={`p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      selectedTableForPreview === t.name
                        ? 'border-sky-500/50 bg-sky-500/10 text-sky-200'
                        : isDark ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700' : 'border-slate-200 bg-white text-slate-700'
                    }`}
                    onClick={() => {
                      setSelectedTableForPreview(t.name);
                      const q = `SELECT * FROM ${t.name};`;
                      setQueryInput(q);
                      handleRunQuery(q);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">{t.name}</span>
                      <span className="text-[10px] text-slate-400">{t.rows.length} baris</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {t.columns.map(c => `${c.name} (${c.type})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results Grid (7 cols) */}
          <div className="md:col-span-7 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Hasil Kueri:</span>
                {lastResult && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {lastResult.rowCount} baris
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {lastResult.executionDurationMs} ms
                    </span>
                  </div>
                )}
              </div>

              {lastResult && lastResult.rows.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyMarkdownTable}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Tabel (.md)'}</span>
                </button>
              )}
            </div>

            {errorMsg ? (
              <div className="p-4 rounded-xl border border-rose-800 bg-rose-950/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Error Eksekusi SQL:</div>
                  <div className="mt-1 font-mono text-[11px]">{errorMsg}</div>
                </div>
              </div>
            ) : lastResult && lastResult.columns.length > 0 ? (
              <div className="flex-1 border rounded-xl overflow-hidden flex flex-col border-slate-800">
                <div className="overflow-x-auto flex-1 max-h-[380px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`sticky top-0 z-10 font-bold border-b ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-slate-500 text-[10px]">#</th>
                        {lastResult.columns.map((col, idx) => (
                          <th key={idx} className="py-2.5 px-3 font-mono text-sky-400">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {lastResult.rows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={`transition-colors ${
                            isDark ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <td className="py-2 px-3 text-[10px] text-slate-500">{rowIdx + 1}</td>
                          {row.map((cell, colIdx) => (
                            <td key={colIdx} className="py-2 px-3 whitespace-nowrap">
                              {cell === null ? (
                                <span className="text-slate-500 italic">NULL</span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                <TableIcon className="w-8 h-8 opacity-40 mb-2" />
                <p>Belum ada data kueri. Klik "Jalankan Query" untuk memulai.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs text-slate-400 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Hasil kueri SQL dapat disalin dan langsung disematkan ke Laporan Praktikum (.md)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
