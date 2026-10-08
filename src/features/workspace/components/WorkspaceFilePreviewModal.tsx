import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, ChevronLeft, ChevronRight, Download, FileText, LoaderCircle, Table2, WandSparkles, X } from 'lucide-react';
import { WorkspaceApiService, type TabularPreviewDto, type WorkspaceAttachmentPreviewDto } from '../services/workspaceApiService';
import type { TabularAnalysisRequest, TabularAnalysisResult, TabularDataset, TabularTransformPreview, TabularTransformRequest, DataTransformation } from '../../../../shared/contracts/tabular';
import type { WorkspaceArtifact } from '../types';

interface Props { attachmentId: string; onClose: () => void; onArtifactCreated?: (artifact: WorkspaceArtifact) => void }
type Panel = 'data' | 'profile' | 'analysis' | 'transform';

const valueText = (value: unknown) => value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);

export const WorkspaceFilePreviewModal: React.FC<Props> = ({ attachmentId, onClose, onArtifactCreated }) => {
  const [preview, setPreview] = useState<WorkspaceAttachmentPreviewDto | null>(null);
  const [dataset, setDataset] = useState<TabularDataset | null>(null);
  const [table, setTable] = useState<TabularPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('data');
  const [showQuality, setShowQuality] = useState(false);
  const [offset, setOffset] = useState(0);
  const [groupBy, setGroupBy] = useState('');
  const [dateBucket, setDateBucket] = useState<TabularAnalysisRequest['dateBucket']>('month');
  const [column, setColumn] = useState('');
  const [aggregation, setAggregation] = useState<TabularAnalysisRequest['aggregation']>('sum');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOperation, setFilterOperation] = useState<TabularAnalysisRequest['filters'][number]['operation']>('equals');
  const [filterValue, setFilterValue] = useState('');
  const [filterValueTo, setFilterValueTo] = useState('');
  const [analysis, setAnalysis] = useState<TabularAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [savedAnalysis, setSavedAnalysis] = useState(false);
  const [removeEmptyRows, setRemoveEmptyRows] = useState(false);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [fillColumn, setFillColumn] = useState('');
  const [fillStrategy, setFillStrategy] = useState<'mean' | 'median' | 'mode' | 'custom'>('mode');
  const [customFillValue, setCustomFillValue] = useState('');
  const [dateColumn, setDateColumn] = useState('');
  const [dateOrder, setDateOrder] = useState<'dmy' | 'mdy' | 'ymd'>('dmy');
  const [numberColumn, setNumberColumn] = useState('');
  const [decimalSeparator, setDecimalSeparator] = useState<'comma' | 'dot'>('comma');
  const [transformPreview, setTransformPreview] = useState<TabularTransformPreview | null>(null);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [transforming, setTransforming] = useState(false);
  const [derivedArtifact, setDerivedArtifact] = useState<WorkspaceArtifact | null>(null);
  const tabular = preview?.fileKind === 'csv' || preview?.fileKind === 'xlsx';
  const numericColumns = useMemo(() => dataset?.columns.filter(item => ['number', 'integer', 'currency', 'percentage'].includes(item.inferredType)) || [], [dataset]);

  useEffect(() => {
    const controller = new AbortController();
    setPreview(null); setDataset(null); setTable(null); setError(null); setAnalysis(null);
    void WorkspaceApiService.fetchAttachmentPreview(attachmentId, controller.signal).then(async value => {
      if (controller.signal.aborted) return;
      setPreview(value);
      if (value.fileKind === 'csv' || value.fileKind === 'xlsx') {
        const profile = await WorkspaceApiService.fetchTabularDataset(attachmentId, undefined, controller.signal);
        if (controller.signal.aborted) return;
        setDataset(profile);
        const defaultNumber = profile.columns.find(item => ['number', 'integer', 'currency', 'percentage'].includes(item.inferredType));
        setColumn(defaultNumber?.name || '');
        const firstCategory = profile.columns.find(item => item.name !== defaultNumber?.name && ['string', 'boolean', 'date'].includes(item.inferredType));
        setGroupBy(firstCategory?.name || '');
        const firstSheet = profile.sheetName || profile.activeSheet;
        const rows = await WorkspaceApiService.fetchTabularPreview(attachmentId, firstSheet, 0, controller.signal);
        if (!controller.signal.aborted) setTable(rows);
      }
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Preview tidak tersedia.');
    });
    return () => controller.abort();
  }, [attachmentId]);

  const selectSheet = async (sheetName: string) => {
    setOffset(0); setTable(null); setAnalysis(null);
    try {
      const [profile, rows] = await Promise.all([
        WorkspaceApiService.fetchTabularDataset(attachmentId, sheetName),
        WorkspaceApiService.fetchTabularPreview(attachmentId, sheetName, 0)
      ]);
      setDataset(profile); setTable(rows); setTransformPreview(null); setDerivedArtifact(null); setShowQuality(false);
      const numeric = profile.columns.find(item => ['number', 'integer', 'currency', 'percentage'].includes(item.inferredType));
      setColumn(numeric?.name || '');
      setGroupBy(profile.columns.find(item => item.name !== numeric?.name && ['string', 'boolean', 'date'].includes(item.inferredType))?.name || '');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sheet gagal dimuat.'); }
  };

  const movePage = async (nextOffset: number) => {
    if (!dataset) return;
    const bounded = Math.max(0, Math.min(Math.max(0, dataset.rowCount - 1), nextOffset));
    setOffset(bounded); setTable(null);
    try { setTable(await WorkspaceApiService.fetchTabularPreview(attachmentId, dataset.sheetName || dataset.activeSheet, bounded)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Halaman data gagal dimuat.'); }
  };

  const runAnalysis = async () => {
    if (!dataset) return;
    const valueRequired = filterColumn && !['is_empty', 'is_not_empty'].includes(filterOperation);
    if (valueRequired && !filterValue.trim()) { setAnalysisError('Isi nilai filter sebelum menjalankan analisis.'); return; }
    if (filterOperation === 'between' && !filterValueTo.trim()) { setAnalysisError('Isi batas atas filter rentang.'); return; }
    setAnalyzing(true); setAnalysisError(null); setAnalysis(null); setSavedAnalysis(false);
    try {
      const filters: TabularAnalysisRequest['filters'] = filterColumn ? [{ column: filterColumn, operation: filterOperation, ...(!['is_empty', 'is_not_empty'].includes(filterOperation) ? { value: filterValue } : {}), ...(filterOperation === 'between' ? { valueTo: filterValueTo } : {}) }] : [];
      const groupedDate = Boolean(groupBy && dataset.columns.find(item => item.name === groupBy)?.inferredType === 'date');
      const plan: TabularAnalysisRequest = { sheetName: dataset.sheetName, ...(groupBy ? { groupBy } : {}), ...(groupedDate && dateBucket ? { dateBucket } : {}), ...(aggregation !== 'count' && column ? { column } : {}), aggregation, filters, limit: 100 };
      setAnalysis(await WorkspaceApiService.analyzeTabularDataset(attachmentId, plan));
    } catch (reason) { setAnalysisError(reason instanceof Error ? reason.message : 'Analisis gagal dijalankan.'); }
    finally { setAnalyzing(false); }
  };

  const saveAnalysisArtifact = async (asChart = false) => {
    if (!analysis || !dataset) return;
    const title = asChart ? `${dataset.name} · Grafik ${analysis.operations.groupBy || 'ringkasan'}` : `${dataset.name} · Analisis ${analysis.operations.aggregation}`;
    const header = [`# ${title}`, '', `Sumber: ${analysis.provenance.filename} · Sheet ${analysis.provenance.sheetName}`, `Versi data: ${analysis.datasetVersion}`, `Operasi: ${analysis.operations.aggregation}${analysis.operations.column ? `(${analysis.operations.column})` : '(baris)'}${analysis.operations.groupBy ? ` · group by ${analysis.operations.groupBy}` : ''}`, `Baris sumber terfilter: ${analysis.matchedRowCount}`, ''];
    const tableMarkdown = [`| ${analysis.columns.join(' | ')} |`, `| ${analysis.columns.map(() => '---').join(' | ')} |`, ...analysis.rows.map(row => `| ${analysis.columns.map(name => valueText(row[name]).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ')).join(' | ')} |`)];
    try {
      const content = asChart ? JSON.stringify({ type: 'bar', title, xColumn: analysis.columns[0], yColumn: analysis.columns[1], aggregation: analysis.operations.aggregation, groupBy: analysis.operations.groupBy || '', datasetVersion: analysis.datasetVersion, provenance: { filename: analysis.provenance.filename, sheetName: analysis.provenance.sheetName, sourceFileId: analysis.provenance.sourceFileId }, rows: analysis.rows }) : [...header, ...tableMarkdown].join('\n');
      const artifact = await WorkspaceApiService.createArtifact({ chatId: dataset.workspaceId, title: title.slice(0, 200), type: asChart ? 'CHART' : 'DOCUMENT', language: asChart ? 'json' : 'markdown', content });
      if (!artifact) throw new Error('Artefak tidak tersimpan.');
      onArtifactCreated?.(artifact); setSavedAnalysis(true);
    } catch (reason) { setAnalysisError(reason instanceof Error ? reason.message : 'Artefak analisis gagal disimpan.'); }
  };

  const buildTransformPlan = (): TabularTransformRequest | null => {
    if (!dataset) return null;
    const operations: DataTransformation[] = [];
    if (removeEmptyRows) operations.push({ type: 'remove_empty_rows' });
    if (removeDuplicates) operations.push({ type: 'remove_duplicates' });
    if (fillColumn) operations.push({ type: 'fill_missing', column: fillColumn, strategy: fillStrategy, ...(fillStrategy === 'custom' ? { customValue: customFillValue } : {}) });
    if (dateColumn) operations.push({ type: 'normalize_date', column: dateColumn, dateOrder });
    if (numberColumn) operations.push({ type: 'normalize_number', column: numberColumn, decimalSeparator });
    if (!operations.length) { setTransformError('Pilih setidaknya satu perubahan untuk dipreview.'); return null; }
    if (fillStrategy === 'custom' && fillColumn && !customFillValue) { setTransformError('Isi nilai pengganti sebelum membuat preview.'); return null; }
    return { sheetName: dataset.sheetName, operations, expectedVersion: dataset.version };
  };

  const previewTransform = async () => {
    const plan = buildTransformPlan(); if (!plan) return;
    setTransforming(true); setTransformError(null); setTransformPreview(null); setDerivedArtifact(null);
    try { setTransformPreview(await WorkspaceApiService.previewTabularTransform(attachmentId, plan)); }
    catch (reason) { setTransformError(reason instanceof Error ? reason.message : 'Preview transformasi gagal.'); }
    finally { setTransforming(false); }
  };

  const confirmTransform = async () => {
    const plan = buildTransformPlan(); if (!plan || !transformPreview) return;
    setTransforming(true); setTransformError(null);
    try {
      const result = await WorkspaceApiService.confirmTabularTransform(attachmentId, plan);
      setDerivedArtifact(result.artifact); onArtifactCreated?.(result.artifact);
    } catch (reason) { setTransformError(reason instanceof Error ? reason.message : 'Dataset turunan gagal dibuat.'); }
    finally { setTransforming(false); }
  };

  const exportHref = dataset ? `/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/export?sheet=${encodeURIComponent(dataset.sheetName || dataset.activeSheet)}` : '#';
  const exportXlsxHref = dataset ? `${exportHref}&format=xlsx` : '#';
  const resultColumns = analysis?.columns || [];

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="workspace-file-preview-title" className="flex max-h-[92dvh] min-h-[68dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h2 id="workspace-file-preview-title" className="truncate text-sm font-semibold text-slate-900 dark:text-white">{preview?.filename || 'Preview file'}</h2><p className="text-[11px] text-slate-500">{dataset ? `${dataset.sheets.length} sheet · ${dataset.rowCount.toLocaleString()} baris · ${dataset.columnCount} kolom · Profile lengkap` : preview ? `${preview.fileKind || preview.mimeType} · ${Math.ceil(preview.size / 1024)} KB · ${preview.chunkCount || 0} bagian` : 'Memuat struktur berkas'}</p></div>
        {dataset && <><a href={exportHref} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" />CSV</a><a href={exportXlsxHref} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" />XLSX</a></>}
        {preview && !dataset && <a href={`/api/v1/chat/attachments/${encodeURIComponent(preview.id)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" />Buka file</a>}
        <button type="button" onClick={onClose} aria-label="Tutup preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
      </header>
      {dataset && <div className="flex gap-1 border-b border-slate-200 px-4 pt-2 dark:border-slate-700">
        {(['data', 'profile', 'analysis', 'transform'] as Panel[]).map(item => <button key={item} type="button" onClick={() => setPanel(item)} aria-pressed={panel === item} className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${panel === item ? 'border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          {item === 'data' ? <><Table2 className="mr-1.5 inline h-3.5 w-3.5" />Data</> : item === 'profile' ? 'Profile' : item === 'analysis' ? <><BarChart3 className="mr-1.5 inline h-3.5 w-3.5" />Analisis</> : <><WandSparkles className="mr-1.5 inline h-3.5 w-3.5" />Transformasi</>}
        </button>)}
        {dataset.sheets.length > 1 && <label className="ml-auto flex items-center gap-2 pb-2 text-[11px] text-slate-500">Sheet<select aria-label="Pilih sheet" value={dataset.sheetName || dataset.activeSheet} onChange={event => void selectSheet(event.target.value)} className="max-w-48 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">{dataset.sheets.map(sheet => <option key={sheet.name} value={sheet.name}>{sheet.name}{sheet.empty ? ' (kosong)' : ''}</option>)}</select></label>}
      </div>}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!preview && !error && <div className="flex min-h-40 items-center justify-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Memuat preview…</div>}
        {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{error}</p>}
        {tabular && dataset && panel === 'data' && <>
          <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="min-w-full border-collapse text-left text-xs"><thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr>{(table?.columns || dataset.columns.map(item => item.name)).map((columnName, index) => <th key={`${columnName}-${index}`} scope="col" className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold dark:border-slate-700">{columnName}</th>)}</tr></thead><tbody>{table?.rows.map((row, rowIndex) => <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/70 dark:odd:bg-slate-900 dark:even:bg-slate-800/50">{table.columns.map((columnName, columnIndex) => <td key={`${columnName}-${columnIndex}`} className="max-w-72 border-b border-r border-slate-100 px-3 py-2 align-top text-slate-700 dark:border-slate-800 dark:text-slate-200"><span className="line-clamp-2 break-words">{valueText(row[columnName]) || <span className="text-slate-300">—</span>}</span></td>)}</tr>)}</tbody></table>{!table && <div className="p-6 text-center text-xs text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Memuat data…</div>}</div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Baris {(offset + (table?.rows.length ? 1 : 0)).toLocaleString()}–{Math.min(offset + (table?.rows.length || 0), dataset.rowCount).toLocaleString()} dari {dataset.rowCount.toLocaleString()}</span><div className="flex gap-1"><button type="button" aria-label="Halaman sebelumnya" disabled={offset === 0} onClick={() => void movePage(offset - 25)} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronLeft className="h-4 w-4" /></button><button type="button" aria-label="Halaman berikutnya" disabled={offset + 25 >= dataset.rowCount} onClick={() => void movePage(offset + 25)} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronRight className="h-4 w-4" /></button></div></div>
        </>}
        {tabular && dataset && panel === 'profile' && <div><div className="mb-3 flex items-start justify-between gap-3"><p className="text-xs text-slate-500">Profile dihitung dari seluruh {dataset.rowCount.toLocaleString()} baris pada sheet ini. Tipe kolom dan semantik merupakan inferensi dari nilai dan nama kolom.</p><button type="button" onClick={() => setShowQuality(current => !current)} className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{showQuality ? 'Tutup kualitas' : 'Check data quality'}</button></div>{showQuality && <section aria-label="Ringkasan kualitas data" className="mb-3 grid gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-slate-700 sm:grid-cols-3 dark:border-amber-900 dark:bg-amber-950/20 dark:text-slate-200"><span>Sel kosong: {dataset.quality.missingCellCount} ({dataset.quality.missingCellPercent.toFixed(1)}%)</span><span>Baris duplikat: {dataset.quality.duplicateRowCount}</span><span>Kolom kosong: {dataset.quality.emptyColumnCount}</span><span>Baris header berulang: {dataset.quality.repeatedHeaderRows}</span><span>Kolom tipe campuran: {dataset.quality.inconsistentColumns.join(', ') || 'Tidak terdeteksi'}</span><span>Potential outlier: {dataset.quality.potentialOutlierCells}</span><p className="sm:col-span-3">Outlier adalah nilai yang perlu ditinjau, bukan otomatis kesalahan.</p></section>}<div className="grid gap-2 sm:grid-cols-2">{dataset.columns.map(item => <article key={item.name} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-start justify-between gap-2"><h3 className="break-all text-xs font-semibold text-slate-800 dark:text-slate-100">{item.name}{item.inferredName && <span className="ml-1 text-[10px] font-normal text-amber-700">header diinferensikan</span>}</h3><span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.inferredType}</span></div>{item.semantic && <p className="mt-1 text-[10px] text-slate-400">{item.semantic.value} · Inferred</p>}<p className="mt-2 text-[11px] text-slate-500">Kosong {item.missingCount} · Unik {item.uniqueCount}</p>{item.min !== undefined && <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Min {valueText(item.min)} · Median {valueText(item.median)} · Rata-rata {item.mean?.toLocaleString(undefined, { maximumFractionDigits: 3 })} · Maks {valueText(item.max)}</p>}{item.earliest && <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Terawal {item.earliest} · Terakhir {item.latest}</p>}{(item.potentialOutlierCount || 0) > 0 && <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">Potential outlier: {item.potentialOutlierCount}</p>}{item.topValues?.length ? <p className="mt-1 truncate text-[11px] text-slate-500">Teratas: {item.topValues.map(value => `${value.value} (${value.count})`).join(', ')}</p> : null}<p className="mt-1 truncate text-[10px] text-slate-400">Contoh: {item.sampleValues.map(valueText).join(', ') || '—'}</p></article>)}</div></div>}
        {tabular && dataset && panel === 'analysis' && <div className="mx-auto max-w-3xl"><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Agregasi deterministik</h3><p className="mt-1 text-xs text-slate-500">Hasil dihitung dari semua baris sheet ini oleh server. Rencana dan sumber disimpan pada hasil.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Kelompokkan<select value={groupBy} onChange={event => setGroupBy(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="">Tanpa grup</option>{dataset.columns.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Operasi<select value={aggregation} onChange={event => setAggregation(event.target.value as TabularAnalysisRequest['aggregation'])} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800">{['count', 'sum', 'mean', 'median', 'min', 'max', 'distinct_count'].map(item => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Kolom hitung<select value={column} disabled={aggregation === 'count' && numericColumns.length === 0} onChange={event => setColumn(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"><option value="">Jumlah baris</option>{dataset.columns.map(item => <option key={item.name} value={item.name}>{item.name} · {item.inferredType}</option>)}</select></label>{groupBy && dataset.columns.find(item => item.name === groupBy)?.inferredType === 'date' && <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Kelompok waktu<select value={dateBucket} onChange={event => setDateBucket(event.target.value as TabularAnalysisRequest['dateBucket'])} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="day">Per hari</option><option value="month">Per bulan</option><option value="quarter">Per kuartal</option><option value="year">Per tahun</option></select></label>}</div><div className="mt-3 grid gap-2 sm:grid-cols-4"><label className="text-[11px] text-slate-600 dark:text-slate-300">Filter kolom<select value={filterColumn} onChange={event => setFilterColumn(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="">Tanpa filter</option>{dataset.columns.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><label className="text-[11px] text-slate-600 dark:text-slate-300">Kondisi<select value={filterOperation} onChange={event => setFilterOperation(event.target.value as typeof filterOperation)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800">{['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains', 'is_empty', 'is_not_empty'].map(item => <option key={item} value={item}>{item}</option>)}</select></label>{filterColumn && !['is_empty', 'is_not_empty'].includes(filterOperation) && <label className="text-[11px] text-slate-600 dark:text-slate-300">Nilai filter<input value={filterValue} onChange={event => setFilterValue(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800" /></label>}{filterColumn && filterOperation === 'between' && <label className="text-[11px] text-slate-600 dark:text-slate-300">Sampai dengan<input value={filterValueTo} onChange={event => setFilterValueTo(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800" /></label>}</div><button type="button" disabled={analyzing || (aggregation !== 'count' && !column)} onClick={() => void runAnalysis()} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{analyzing ? 'Menghitung…' : 'Jalankan analisis'}</button>
          {analysisError && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{analysisError}</p>}
          {analysis && <div className="mt-4"><div className="mb-2 rounded-md bg-slate-50 p-2 text-[10px] text-slate-500 dark:bg-slate-800">{analysis.operations.aggregation}{analysis.operations.column ? `(${analysis.operations.column})` : '(baris)'}{analysis.operations.groupBy ? ` · dikelompokkan ${analysis.operations.groupBy}` : ''} · {analysis.matchedRowCount.toLocaleString()} baris sumber · {analysis.provenance.filename} / {analysis.provenance.sheetName} · versi {analysis.datasetVersion.slice(0, 12)}</div>{analysis.operations.groupBy && resultColumns.length > 1 && analysis.rows.length > 0 && <div className="mb-3 space-y-1.5 rounded-lg border border-slate-200 p-3 dark:border-slate-700" role="img" aria-label="Grafik batang hasil agregasi; tabel data tersedia di bawah"><p className="mb-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">Grafik batang · nilai agregat</p>{analysis.rows.slice(0, 12).map((row, index) => { const value = Number(row[resultColumns[1]]); const maxValue = Math.max(1, ...analysis.rows.map(item => Math.abs(Number(item[resultColumns[1]]) || 0))); return <div key={index} className="grid grid-cols-[minmax(4rem,8rem)_1fr_auto] items-center gap-2 text-[10px]"><span className="truncate text-slate-600 dark:text-slate-300">{valueText(row[resultColumns[0]])}</span><span className="h-3 overflow-hidden rounded bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded bg-emerald-600" style={{ width: `${Math.min(100, Math.abs(value || 0) / maxValue * 100)}%` }} /></span><span className="tabular-nums text-slate-500">{valueText(row[resultColumns[1]])}</span></div>; })}</div>}<div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="min-w-full text-left text-xs"><thead className="bg-slate-100 dark:bg-slate-800"><tr>{resultColumns.map(name => <th key={name} className="px-3 py-2 font-semibold">{name}</th>)}</tr></thead><tbody>{analysis.rows.map((row, index) => <tr key={index} className="border-t border-slate-100 dark:border-slate-800">{resultColumns.map(name => <td key={name} className="px-3 py-2">{valueText(row[name])}</td>)}</tr>)}</tbody></table></div><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => void saveAnalysisArtifact()} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">{savedAnalysis ? <><Check className="mr-1 inline h-3.5 w-3.5" />Tersimpan di Canvas</> : 'Simpan analisis di Canvas'}</button>{analysis.operations.groupBy && <button type="button" onClick={() => void saveAnalysisArtifact(true)} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">Simpan grafik dan tabel di Canvas</button>}</div>{analysis.truncated && <p className="mt-2 text-[10px] text-amber-700">Hasil dibatasi 100 grup.</p>}</div>}
        </div>}
        {tabular && dataset && panel === 'transform' && <div className="mx-auto max-w-3xl"><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bersihkan sebagai dataset turunan</h3><p className="mt-1 text-xs text-slate-500">Perubahan dihitung sebagai preview. File sumber tetap utuh; dataset baru hanya dibuat setelah konfirmasi.</p>
          <div className="mt-4 space-y-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-700 dark:text-slate-200"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={removeEmptyRows} onChange={event => setRemoveEmptyRows(event.target.checked)} />Hapus baris kosong</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={removeDuplicates} onChange={event => setRemoveDuplicates(event.target.checked)} />Hapus baris duplikat</label></div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr]"><label className="text-[11px] text-slate-600 dark:text-slate-300">Isi nilai kosong (opsional)<select value={fillColumn} onChange={event => setFillColumn(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="">Jangan isi</option>{dataset.columns.map(item => <option key={item.name} value={item.name}>{item.name} · {item.inferredType}</option>)}</select></label><label className="text-[11px] text-slate-600 dark:text-slate-300">Strategi<select value={fillStrategy} onChange={event => setFillStrategy(event.target.value as typeof fillStrategy)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="mode">Mode</option><option value="mean">Rata-rata</option><option value="median">Median</option><option value="custom">Nilai kustom</option></select></label>{fillStrategy === 'custom' && <label className="text-[11px] text-slate-600 dark:text-slate-300">Nilai pengganti<input value={customFillValue} onChange={event => setCustomFillValue(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800" /></label>}</div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr]"><label className="text-[11px] text-slate-600 dark:text-slate-300">Normalisasi tanggal (opsional)<select value={dateColumn} onChange={event => setDateColumn(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="">Jangan ubah</option>{dataset.columns.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><label className="text-[11px] text-slate-600 dark:text-slate-300">Urutan tanggal<select value={dateOrder} onChange={event => setDateOrder(event.target.value as typeof dateOrder)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="dmy">Hari / bulan / tahun</option><option value="mdy">Bulan / hari / tahun</option><option value="ymd">Tahun / bulan / hari</option></select></label></div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr]"><label className="text-[11px] text-slate-600 dark:text-slate-300">Normalisasi angka (opsional)<select value={numberColumn} onChange={event => setNumberColumn(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="">Jangan ubah</option>{dataset.columns.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><label className="text-[11px] text-slate-600 dark:text-slate-300">Pemisah desimal<select value={decimalSeparator} onChange={event => setDecimalSeparator(event.target.value as typeof decimalSeparator)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="comma">Koma · 1.234,56</option><option value="dot">Titik · 1,234.56</option></select></label></div>
          </div>
          <button type="button" disabled={transforming} onClick={() => void previewTransform()} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{transforming ? 'Menghitung preview…' : 'Preview perubahan'}</button>
          {transformError && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{transformError}</p>}
          {transformPreview && <div className="mt-4 rounded-lg border border-emerald-200 p-3 dark:border-emerald-900"><div className="flex flex-wrap gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-300"><span>{transformPreview.sourceRowCount.toLocaleString()} → {transformPreview.resultRowCount.toLocaleString()} baris</span><span>{transformPreview.rowsRemoved} baris dihapus</span><span>{transformPreview.cellsChanged} sel berubah</span></div><ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-slate-600 dark:text-slate-300">{transformPreview.summary.map((item, index) => <li key={index}>{item.message}</li>)}</ul>{transformPreview.previewRows.length > 0 && <div className="mt-3 overflow-auto rounded border border-slate-200 dark:border-slate-700"><table className="min-w-full text-left text-[10px]"><thead className="bg-slate-100 dark:bg-slate-800"><tr>{Object.keys(transformPreview.previewRows[0]).map(name => <th key={name} className="whitespace-nowrap px-2 py-1.5">{name}</th>)}</tr></thead><tbody>{transformPreview.previewRows.slice(0, 5).map((row, index) => <tr key={index} className="border-t border-slate-100 dark:border-slate-800">{Object.keys(transformPreview.previewRows[0]).map(name => <td key={name} className="max-w-48 truncate px-2 py-1.5">{valueText(row[name])}</td>)}</tr>)}</tbody></table></div>}
            {derivedArtifact ? <p className="mt-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">Dataset turunan tersimpan di Canvas: {derivedArtifact.title}</p> : <button type="button" disabled={transforming} onClick={() => void confirmTransform()} className="mt-3 rounded-lg border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40">{transforming ? 'Membuat dataset…' : 'Konfirmasi dan buat dataset turunan'}</button>}
          </div>}
        </div>}
        {preview && !tabular && <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-6 text-slate-700 dark:text-slate-200">{preview.previewText || 'Tidak ada teks yang dapat ditampilkan untuk file ini.'}{preview.previewText.length >= 20_000 ? '\n\n— Preview dibatasi hingga 20.000 karakter —' : ''}</pre>}
      </div>
    </section>
  </div>;
};
