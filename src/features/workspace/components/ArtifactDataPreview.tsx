import React, { useState, useMemo } from 'react';
import { Table, BarChart2, TrendingUp, PieChart, Search, ArrowUpDown, Sparkles } from 'lucide-react';

export interface SavedChartSpec {
  type: 'bar';
  title: string;
  xColumn: string;
  yColumn: string;
  aggregation: string;
  groupBy: string;
  datasetVersion: string;
  provenance: { filename: string; sheetName: string; sourceFileId: string };
  rows: Array<Record<string, unknown>>;
}

export interface SavedTableSpec {
  type: 'table';
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  sourceVersion?: string;
  sourceFileId?: string;
  filename?: string;
  sheetName?: string;
  transformations?: unknown[];
}

export const ChartArtifactPreview: React.FC<{ chart: SavedChartSpec }> = ({ chart }) => {
  const points = chart.rows.map(row => ({
    label: String(row[chart.xColumn] ?? '(kosong)'),
    value: Number(row[chart.yColumn]) || 0
  }));
  const maxValue = Math.max(1, ...points.map(point => Math.abs(point.value)));

  return (
    <section className="mx-auto my-4 max-w-4xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-label={chart.title}>
      <header>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{chart.title}</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Bar chart · {chart.aggregation} · X: {chart.xColumn} · Y: {chart.yColumn}
        </p>
        {chart.provenance?.filename && (
          <p className="text-[10px] text-slate-400">
            {chart.provenance.filename} · {chart.provenance.sheetName} · versi {chart.datasetVersion?.slice(0, 12)}
          </p>
        )}
      </header>
      <div role="img" aria-label={`Grafik batang ${chart.title}`} className="space-y-2 rounded-xl border border-slate-100 p-4 dark:border-slate-800">
        {points.map((point, index) => (
          <div key={`${point.label}-${index}`} className="grid grid-cols-[minmax(5rem,10rem)_1fr_auto] items-center gap-3 text-xs">
            <span className="truncate text-slate-600 dark:text-slate-300 font-medium">{point.label}</span>
            <span className="h-4 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
              <span className="block h-full rounded bg-emerald-600 transition-all duration-300" style={{ width: `${Math.min(100, Math.abs(point.value) / maxValue * 100)}%` }} />
            </span>
            <span className="tabular-nums font-mono text-slate-600 dark:text-slate-300">{point.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th scope="col" className="px-3 py-2">{chart.xColumn}</th>
              <th scope="col" className="px-3 py-2">{chart.yColumn}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, index) => (
              <tr key={`${point.label}-${index}`} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2">{point.label}</td>
                <td className="px-3 py-2 tabular-nums">{point.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export const TableArtifactPreview: React.FC<{ table: SavedTableSpec }> = ({ table }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Deteksi kolom teks (kategori) dan numerik (nilai)
  const { categoricalColumns, numericColumns } = useMemo(() => {
    const cats: string[] = [];
    const nums: string[] = [];

    table.columns.forEach(col => {
      const nonEmpties = table.rows.map(r => r[col]).filter(v => v !== undefined && v !== null && v !== '');
      const numCount = nonEmpties.filter(v => !Number.isNaN(Number(String(v).replace(',', '.')))).length;
      if (nonEmpties.length > 0 && numCount / nonEmpties.length >= 0.7) {
        nums.push(col);
      } else {
        cats.push(col);
      }
    });

    return {
      categoricalColumns: cats.length > 0 ? cats : table.columns,
      numericColumns: nums.length > 0 ? nums : table.columns
    };
  }, [table.columns, table.rows]);

  const [xCol, setXCol] = useState<string>(() => categoricalColumns[0] || table.columns[0] || '');
  const [yCol, setYCol] = useState<string>(() => numericColumns[0] || table.columns[1] || table.columns[0] || '');

  // Filter & Sort Baris
  const displayRows = useMemo(() => {
    let rows = [...table.rows];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => table.columns.some(col => String(r[col] ?? '').toLowerCase().includes(q)));
    }
    if (sortCol) {
      rows.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        const numA = Number(String(valA ?? '').replace(',', '.'));
        const numB = Number(String(valB ?? '').replace(',', '.'));
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
          return sortAsc ? numA - numB : numB - numA;
        }
        return sortAsc
          ? String(valA ?? '').localeCompare(String(valB ?? ''))
          : String(valB ?? '').localeCompare(String(valA ?? ''));
      });
    }
    return rows;
  }, [table.rows, table.columns, searchQuery, sortCol, sortAsc]);

  // Ekstraksi data untuk grafik
  const chartData = useMemo(() => {
    return displayRows.slice(0, 30).map(r => ({
      label: String(r[xCol] ?? '(kosong)'),
      value: Number(String(r[yCol] ?? '0').replace(',', '.')) || 0
    }));
  }, [displayRows, xCol, yCol]);

  const chartStats = useMemo(() => {
    const values = chartData.map(d => d.value);
    if (!values.length) return { sum: 0, avg: 0, max: 0, min: 0 };
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return {
      sum: Math.round(sum * 100) / 100,
      avg: Math.round((sum / values.length) * 100) / 100,
      max: Math.max(...values),
      min: Math.min(...values)
    };
  }, [chartData]);

  const maxVal = Math.max(1, chartStats.max);

  // Palet warna estetik visualizer
  const barColors = [
    '#10b981', '#06b6d4', '#6366f1', '#8b5cf6', '#ec4899',
    '#f59e0b', '#3b82f6', '#14b8a6', '#f43f5e', '#84cc16'
  ];

  return (
    <section className="mx-auto my-4 max-w-5xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm" aria-label={table.title}>
      {/* Header & Controls */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{table.title}</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {table.rows.length} Baris · {table.columns.length} Kolom
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {table.filename ? `Sumber: ${table.filename}${table.sheetName ? ` (${table.sheetName})` : ''}` : 'Dataset Tabel Interaktif'}
          </p>
        </div>

        {/* View Mode Toggle Button */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="flex p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Data</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'chart'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Grafik Visual</span>
            </button>
          </div>
        </div>
      </header>

      {/* 1. VIEW MODE: TABEL GRID */}
      {viewMode === 'table' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari baris data..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-400">
              Menampilkan {displayRows.length} dari {table.rows.length} baris
            </span>
          </div>

          {/* Table Container */}
          <div className="max-h-[55vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 select-none z-10 shadow-2xs">
                <tr>
                  {table.columns.map(column => (
                    <th
                      key={column}
                      scope="col"
                      onClick={() => {
                        if (sortCol === column) setSortAsc(!sortAsc);
                        else { setSortCol(column); setSortAsc(true); }
                      }}
                      className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{column}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayRows.slice(0, 250).map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {table.columns.map(column => (
                      <td key={column} className="max-w-72 truncate px-3 py-2 text-slate-700 dark:text-slate-300">
                        {String(row[column] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. VIEW MODE: GRAFIK VISUAL INTERAKTIF (F3.7 VISUAL STUDIO) */}
      {viewMode === 'chart' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Controls Bar for Chart */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Chart Type Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Bentuk:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      chartType === 'bar' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Grafik Batang (Bar)"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('line')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      chartType === 'line' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Grafik Garis (Line)"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('pie')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      chartType === 'pie' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Diagram Lingkaran (Pie / Proporsi)"
                  >
                    <PieChart className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sumbu X (Labels) */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Label (X):</span>
                <select
                  value={xCol}
                  onChange={e => setXCol(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium"
                >
                  {table.columns.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sumbu Y (Values) */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Nilai (Y):</span>
                <select
                  value={yCol}
                  onChange={e => setYCol(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium"
                >
                  {table.columns.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <span>Avg: <strong>{chartStats.avg}</strong></span>
              <span>•</span>
              <span>Max: <strong>{chartStats.max}</strong></span>
            </div>
          </div>

          {/* Chart Rendering Canvas */}
          {chartType === 'bar' && (
            <div className="space-y-2.5 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              {chartData.map((d, idx) => {
                const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
                const color = barColors[idx % barColors.length];
                return (
                  <div key={`${d.label}-${idx}`} className="grid grid-cols-[minmax(6rem,12rem)_1fr_auto] items-center gap-3 text-xs">
                    <span className="truncate text-slate-700 dark:text-slate-300 font-medium" title={d.label}>
                      {d.label}
                    </span>
                    <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden p-0.5">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{ width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="tabular-nums font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {d.value.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {chartType === 'line' && (
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              {/* SVG Line Chart */}
              <div className="w-full h-48 relative flex items-end justify-between gap-1 pt-6 pb-4">
                {chartData.map((d, idx) => {
                  const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
                  return (
                    <div key={`${d.label}-${idx}`} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="relative w-full flex flex-col items-center">
                        <span className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-500 font-bold transition-colors">
                          {d.value}
                        </span>
                        <div
                          className="w-2.5 rounded-t bg-emerald-500 group-hover:bg-emerald-400 transition-all duration-300"
                          style={{ height: `${Math.max(4, pct * 1.2)}px` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 truncate max-w-16 mt-1" title={d.label}>
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {chartType === 'pie' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Proporsi Data: {yCol} per {xCol}
                </span>
                <div className="space-y-1.5 max-h-60 overflow-auto pr-2">
                  {chartData.map((d, idx) => {
                    const pct = chartStats.sum > 0 ? ((d.value / chartStats.sum) * 100).toFixed(1) : '0';
                    const color = barColors[idx % barColors.length];
                    return (
                      <div key={`${d.label}-${idx}`} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate text-slate-700 dark:text-slate-300">{d.label}</span>
                        </div>
                        <span className="tabular-nums font-mono text-slate-500 text-[11px]">
                          {d.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="flex flex-col justify-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Statistik Ringkas Penelitian</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">Total Keseluruhan</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{chartStats.sum.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">Rata-rata (Mean)</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{chartStats.avg.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">Nilai Tertinggi (Max)</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{chartStats.max.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">Nilai Terendah (Min)</span>
                    <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{chartStats.min.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
