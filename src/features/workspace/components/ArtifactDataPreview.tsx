import React from 'react';

export interface SavedChartSpec {
  type: 'bar'; title: string; xColumn: string; yColumn: string; aggregation: string; groupBy: string;
  datasetVersion: string; provenance: { filename: string; sheetName: string; sourceFileId: string };
  rows: Array<Record<string, unknown>>;
}

export interface SavedTableSpec {
  type: 'table'; title: string; columns: string[]; rows: Array<Record<string, unknown>>;
  sourceVersion: string; sourceFileId: string; filename: string; sheetName: string; transformations: unknown[];
}

export const ChartArtifactPreview: React.FC<{ chart: SavedChartSpec }> = ({ chart }) => {
  const points = chart.rows.map(row => ({ label: String(row[chart.xColumn] ?? '(kosong)'), value: Number(row[chart.yColumn]) || 0 }));
  const maxValue = Math.max(1, ...points.map(point => Math.abs(point.value)));
  return <section className="mx-auto my-4 max-w-4xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-label={chart.title}>
    <header><h2 className="text-base font-semibold text-slate-900 dark:text-white">{chart.title}</h2><p className="mt-1 text-[11px] text-slate-500">Bar chart · {chart.aggregation} · X: {chart.xColumn} · Y: {chart.yColumn}</p><p className="text-[10px] text-slate-400">{chart.provenance.filename} · {chart.provenance.sheetName} · versi {chart.datasetVersion.slice(0, 12)}</p></header>
    <div role="img" aria-label={`Grafik batang ${chart.title}. Tabel data di bawah`} className="space-y-2 rounded-xl border border-slate-100 p-4 dark:border-slate-800">{points.map((point, index) => <div key={`${point.label}-${index}`} className="grid grid-cols-[minmax(5rem,10rem)_1fr_auto] items-center gap-3 text-xs"><span className="truncate text-slate-600 dark:text-slate-300">{point.label}</span><span className="h-4 overflow-hidden rounded bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded bg-emerald-600" style={{ width: `${Math.min(100, Math.abs(point.value) / maxValue * 100)}%` }} /></span><span className="tabular-nums text-slate-600 dark:text-slate-300">{point.value.toLocaleString()}</span></div>)}</div>
    <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="min-w-full text-left text-xs"><caption className="sr-only">Tabel data grafik {chart.title}</caption><thead className="bg-slate-100 dark:bg-slate-800"><tr><th scope="col" className="px-3 py-2">{chart.xColumn}</th><th scope="col" className="px-3 py-2">{chart.yColumn}</th></tr></thead><tbody>{points.map((point, index) => <tr key={`${point.label}-${index}`} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-2">{point.label}</td><td className="px-3 py-2 tabular-nums">{point.value}</td></tr>)}</tbody></table></div>
  </section>;
};

export const TableArtifactPreview: React.FC<{ table: SavedTableSpec }> = ({ table }) => <section className="mx-auto my-4 max-w-5xl space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-label={table.title}>
  <header><h2 className="text-base font-semibold text-slate-900 dark:text-white">{table.title}</h2><p className="mt-1 text-[11px] text-slate-500">Dataset turunan · {table.rows.length.toLocaleString()} baris · {table.columns.length} kolom</p><p className="text-[10px] text-slate-400">Sumber: {table.filename} · {table.sheetName} · versi {table.sourceVersion.slice(0, 12)}</p></header>
  <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="min-w-full text-left text-xs"><caption className="sr-only">Preview dataset turunan</caption><thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr>{table.columns.map(column => <th key={column} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">{column}</th>)}</tr></thead><tbody>{table.rows.slice(0, 200).map((row, index) => <tr key={index} className="border-t border-slate-100 dark:border-slate-800">{table.columns.map(column => <td key={column} className="max-w-64 truncate px-3 py-2">{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table></div>
  {table.rows.length > 200 && <p className="text-[10px] text-slate-500">Menampilkan 200 baris pertama. Unduh JSON untuk seluruh dataset.</p>}
</section>;



