import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, ArrowUpDown, BookOpen, ChevronLeft, ChevronRight,
  Clock, Download, FileSpreadsheet, Image as ImageIcon, Loader2,
  Play, Plus, Search, Sparkles, Trash2, X
} from 'lucide-react';
import { THEMES, type PresentationTheme } from '../utils/exportPptxThemes';
import { exportToXlsx } from '../utils/exportXlsx';
import { generateAiImage } from '../../../services/imageService';

type CellType = 'text' | 'number' | 'date';
interface EditableTable { type: 'table'; title: string; columns: string[]; rows: Array<Record<string, unknown>>; columnTypes: Record<string, CellType>; sourceVersion?: string; sourceFileId?: string; filename?: string; sheetName?: string; transformations?: unknown[] }
export interface EditableSlide {
  id: string;
  title: string;
  body: string;
  notes: string;
  layout?: 'title' | 'content' | 'comparison' | 'cards' | 'highlight' | 'table' | 'chart' | 'references' | 'image_content';
  imageUrl?: string;
  imageCaption?: string;
  table?: { headers: string[]; rows: string[][] };
  cards?: Array<{ title: string; bullets: string[]; subtitle?: string }>;
}
export interface EditablePresentation {
  format: 'ruangtenang-presentation-v1';
  theme: PresentationTheme;
  logoUrl?: string;
  campusName?: string;
  slides: EditableSlide[];
}

export function evaluateFormula(val: string, allRows: Array<Record<string, unknown>>, column: string): string {
  const trimmed = val.trim();
  if (!trimmed.startsWith('=')) return val;
  const upper = trimmed.slice(1).trim().toUpperCase();
  if (upper.startsWith('SUM')) {
    const nums = allRows.map(r => Number(String(r[column] ?? '').replace(',', '.'))).filter(n => Number.isFinite(n));
    const sum = nums.reduce((a, b) => a + b, 0);
    return String(Math.round(sum * 100) / 100);
  }
  if (upper.startsWith('AVERAGE') || upper.startsWith('AVG')) {
    const nums = allRows.map(r => Number(String(r[column] ?? '').replace(',', '.'))).filter(n => Number.isFinite(n));
    if (!nums.length) return '0';
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return String(Math.round(avg * 100) / 100);
  }
  if (upper.startsWith('COUNT')) {
    const count = allRows.filter(r => r[column] !== '' && r[column] !== null && r[column] !== undefined).length;
    return String(count);
  }
  if (upper.startsWith('MAX')) {
    const nums = allRows.map(r => Number(String(r[column] ?? '').replace(',', '.'))).filter(n => Number.isFinite(n));
    return nums.length ? String(Math.max(...nums)) : '0';
  }
  if (upper.startsWith('MIN')) {
    const nums = allRows.map(r => Number(String(r[column] ?? '').replace(',', '.'))).filter(n => Number.isFinite(n));
    return nums.length ? String(Math.min(...nums)) : '0';
  }
  try {
    const sanitized = upper.replace(/[^0-9+\-*/().]/g, '');
    if (sanitized && !/[A-Z]/i.test(sanitized)) {
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && Number.isFinite(result)) {
        return String(Math.round(result * 100) / 100);
      }
    }
  } catch {
    /* fallback to original */
  }
  return val;
}

function parseTable(content: string): EditableTable | null {
  try {
    const value = JSON.parse(content) as Partial<EditableTable>;
    if (value.type !== 'table' || !Array.isArray(value.columns) || !Array.isArray(value.rows)) return null;
    return { type: 'table', title: value.title || 'Tabel', columns: value.columns.map(String), rows: value.rows.map(row => ({ ...(row as Record<string, unknown>) })), columnTypes: value.columnTypes || {}, sourceVersion: value.sourceVersion, sourceFileId: value.sourceFileId, filename: value.filename, sheetName: value.sheetName, transformations: value.transformations || [] };
  } catch { return null; }
}

function validCell(value: string, type: CellType): boolean {
  if (!value.trim()) return true;
  if (type === 'number') return /^-?\d+(?:[.,]\d+)?$/.test(value.trim());
  if (type === 'date') { const raw = value.trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false; const date = new Date(`${raw}T00:00:00.000Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === raw; }
  return true;
}

export const ArtifactTableEditor: React.FC<{ content: string; onChange: (content: string) => void; onBlur: () => void }> = ({ content, onChange, onBlur }) => {
  const table = useMemo(() => parseTable(content), [content]);
  const [validation, setValidation] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isExporting, setIsExporting] = useState(false);

  const update = (next: EditableTable) => onChange(JSON.stringify(next, null, 2));

  const addColumn = () => {
    if (!table) return;
    const name = `Kolom ${table.columns.length + 1}`;
    update({ ...table, columns: [...table.columns, name], columnTypes: { ...table.columnTypes, [name]: 'text' }, rows: table.rows.map(row => ({ ...row, [name]: '' })) });
  };

  const setCell = (rowIndex: number, column: string, value: string) => {
    if (!table) return;
    update({ ...table, rows: table.rows.map((row, index) => index === rowIndex ? { ...row, [column]: value } : row) });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else { setSortColumn(null); setSortDirection('asc'); }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    if (!table) return [];
    let rowsWithIndex = table.rows.map((row, originalIndex) => ({ row, originalIndex }));
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      rowsWithIndex = rowsWithIndex.filter(({ row }) =>
        table.columns.some(col => String(row[col] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortColumn) {
      const type = table.columnTypes[sortColumn] || 'text';
      rowsWithIndex.sort((a, b) => {
        const valA = a.row[sortColumn];
        const valB = b.row[sortColumn];
        if (type === 'number') {
          const numA = Number(String(valA ?? '').replace(',', '.')) || 0;
          const numB = Number(String(valB ?? '').replace(',', '.')) || 0;
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }
    return rowsWithIndex;
  }, [table, filterQuery, sortColumn, sortDirection]);

  const columnStats = useMemo(() => {
    if (!table) return {};
    const stats: Record<string, { sum?: number; avg?: number; count: number }> = {};
    table.columns.forEach(col => {
      const type = table.columnTypes[col] || 'text';
      const nonEmpties = table.rows.filter(r => r[col] !== '' && r[col] !== null && r[col] !== undefined);
      if (type === 'number') {
        const nums = nonEmpties.map(r => Number(String(r[col] ?? '').replace(',', '.'))).filter(n => Number.isFinite(n));
        const sum = nums.reduce((acc, curr) => acc + curr, 0);
        stats[col] = {
          sum: Math.round(sum * 100) / 100,
          avg: nums.length ? Math.round((sum / nums.length) * 100) / 100 : 0,
          count: nums.length
        };
      } else {
        stats[col] = { count: nonEmpties.length };
      }
    });
    return stats;
  }, [table]);

  if (!table) return <div className="mx-auto max-w-4xl rounded-xl border border-amber-200 bg-white p-5 text-sm dark:border-amber-900 dark:bg-slate-900"><p className="font-semibold">Data tabel belum memiliki struktur yang dapat diedit.</p><p className="mt-1 text-xs text-slate-500">Gunakan Raw Markdown untuk mengubah sumber, atau buat grid baru tanpa metadata sumber eksternal.</p><button type="button" onClick={() => update({ type: 'table', title: 'Tabel Baru', columns: ['Kolom 1', 'Kolom 2'], rows: [{ 'Kolom 1': '', 'Kolom 2': '' }], columnTypes: { 'Kolom 1': 'text', 'Kolom 2': 'text' }, transformations: [] })} className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Buat grid</button></div>;

  const handleExportXlsx = async () => {
    try {
      setIsExporting(true);
      await exportToXlsx({ title: table.title || 'Data_Spreadsheet', content });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    const csvRows = [
      table.columns.map(c => `"${c.replace(/"/g, '""')}"`).join(','),
      ...table.rows.map(row => table.columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(table.title || 'data_spreadsheet').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return <section className="mx-auto flex min-h-145 max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Spreadsheet Studio">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-semibold">Spreadsheet Studio</h2>
        </div>
        <input aria-label="Judul spreadsheet" value={table.title} onChange={event => update({ ...table, title: event.target.value })} className="mt-0.5 max-w-56 rounded border border-transparent bg-transparent px-1 text-[11px] text-slate-500 outline-none focus:border-emerald-500 dark:text-slate-400" />
        <p className="text-[11px] text-slate-500">{table.rows.length} baris · {table.columns.length} kolom · mendukung formula dasar (=SUM, =AVG, =COUNT)</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari baris..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            className="h-7 w-28 rounded-lg border border-slate-200 bg-slate-50 pl-6 pr-2 text-[11px] transition-all focus:w-40 focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <button type="button" onClick={() => { const row = Object.fromEntries(table.columns.map(column => [column, ''])); update({ ...table, rows: [...table.rows, row] }); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Plus className="h-3 w-3" />Baris</button>
        <button type="button" onClick={addColumn} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Plus className="h-3 w-3" />Kolom</button>
        <button type="button" onClick={handleExportXlsx} disabled={isExporting} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer"><Download className="h-3 w-3" />Excel</button>
        <button type="button" onClick={handleExportCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer">CSV</button>
        <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400"><input type="checkbox" checked={validation} onChange={event => setValidation(event.target.checked)} />Validasi</label>
      </div>
    </div>
    <div className="min-h-0 flex-1 overflow-auto" onBlur={onBlur}>
      <table className="min-w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
          <tr>
            {table.columns.map((column, index) => <th key={`${column}-${index}`} className="border-b border-r border-slate-200 p-2 text-left dark:border-slate-700">
              <div className="flex items-center justify-between gap-1">
                <input aria-label={`Nama kolom ${index + 1}`} value={column} onChange={event => { const name = event.target.value; const columns = [...table.columns]; columns[index] = name; const rows = table.rows.map(row => { const next = { ...row, [name]: row[column] ?? '' }; if (name !== column) delete next[column]; return next; }); const columnTypes = { ...table.columnTypes, [name]: table.columnTypes[column] || 'text' } as Record<string, CellType>; if (name !== column) delete columnTypes[column]; update({ ...table, columns, rows, columnTypes }); }} className="w-full min-w-28 rounded border border-transparent bg-transparent px-1 py-1 font-semibold focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900" />
                <button type="button" title="Urutkan" onClick={() => handleSort(column)} className={`rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700 ${sortColumn === column ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  {sortColumn === column ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <select aria-label={`Tipe ${column}`} value={table.columnTypes[column] || 'text'} onChange={event => update({ ...table, columnTypes: { ...table.columnTypes, [column]: event.target.value as CellType } })} className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-900"><option value="text">Teks</option><option value="number">Angka</option><option value="date">Tanggal</option></select>
                <button type="button" aria-label={`Hapus kolom ${column}`} onClick={() => update({ ...table, columns: table.columns.filter((_, current) => current !== index), rows: table.rows.map(row => { const next = { ...row }; delete next[column]; return next; }) })} className="rounded p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-3 w-3" /></button>
              </div>
            </th>)}
            <th className="w-10 border-b border-slate-200 dark:border-slate-700" />
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedRows.map(({ row, originalIndex }) => <tr key={originalIndex} className="group border-b border-slate-100 dark:border-slate-800">
            {table.columns.map(column => {
              const value = String(row[column] ?? '');
              const type = table.columnTypes[column] || 'text';
              const valid = !validation || validCell(value, type);
              return <td key={column} className="border-r border-slate-100 p-1 dark:border-slate-800">
                <input aria-label={`${column}, baris ${originalIndex + 1}`} aria-invalid={!valid} value={value} onChange={event => setCell(originalIndex, column, event.target.value)} className={`w-full min-w-28 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 ${valid ? 'focus:ring-emerald-500' : 'bg-rose-50 ring-1 ring-rose-400 dark:bg-rose-950/30'}`} />
              </td>;
            })}
            <td className="px-1 text-center">
              <button type="button" aria-label={`Hapus baris ${originalIndex + 1}`} onClick={() => update({ ...table, rows: table.rows.filter((_, index) => index !== originalIndex) })} className="rounded p-1 text-slate-400 opacity-60 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </td>
          </tr>)}
        </tbody>
        <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 font-medium backdrop-blur-xs dark:bg-slate-800/95">
          <tr className="border-t border-slate-300 dark:border-slate-700">
            {table.columns.map(column => {
              const stat = columnStats[column];
              const type = table.columnTypes[column] || 'text';
              return (
                <td key={column} className="border-r border-slate-200 px-2 py-1.5 text-[10px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  {type === 'number' && stat ? (
                    <div>
                      <span>Σ {stat.sum?.toLocaleString()}</span>
                      <span className="ml-1.5 text-slate-400">x̄ {stat.avg}</span>
                    </div>
                  ) : (
                    <span>n = {stat?.count ?? 0}</span>
                  )}
                </td>
              );
            })}
            <td className="px-1 text-[10px] text-slate-400 text-center font-bold">Total</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">
      <span>Perubahan tersimpan otomatis sebagai JSON tabel. Masukkan =SUM, =AVG untuk formula instan.</span>
      <span>{table.filename ? `Sumber: ${table.filename} · ${table.sheetName || ''}` : 'Grid lokal'}</span>
    </div>
  </section>;
};

export function createPresentationFromMarkdown(content: string, title: string): EditablePresentation {
  try {
    const value = JSON.parse(content) as EditablePresentation;
    if (value.format === 'ruangtenang-presentation-v1' && Array.isArray(value.slides)) return value;
  } catch {
    /* Initialize from Markdown below. */
  }

  // Split by horizontal rules (---, ***, ___) or by top-level markdown headings (#, ##)
  const rawSections = content
    .split(/(?:^|\r?\n)\s*[-*_]{3,}\s*(?:\r?\n|$)|(?=^#{1,2}\s+)/m)
    .map(section => section.trim())
    .filter(Boolean);

  const sections = rawSections.length ? rawSections : [content.trim()];

  const slides: EditableSlide[] = sections.map((section, index) => {
    const lines = section.split(/\r?\n/).filter(line => !/^\s*[-*_]{3,}\s*$/.test(line.trim()));
    if (!lines.length) {
      return { id: `slide-${index + 1}`, title: `Slide ${index + 1}`, body: '', notes: '' };
    }

    let slideTitle: string;
    let bodyStartIndex = 0;

    const heading = lines[0].match(/^#{1,6}\s+(.*)$/);
    const boldHeading = lines[0].match(/^\s*(?:\*\*(.+?)\*\*|__(.+?)__)\s*:?\s*$/);

    if (heading) {
      slideTitle = heading[1].replace(/#+$/, '').trim();
      bodyStartIndex = 1;
    } else if (boldHeading) {
      slideTitle = (boldHeading[1] || boldHeading[2]).trim();
      bodyStartIndex = 1;
    } else if (index === 0) {
      slideTitle = title || 'Slide 1';
    } else {
      slideTitle = `Slide ${index + 1}`;
    }

    const bodyLines = lines.slice(bodyStartIndex).filter(line => !/^\s*[-*_]{3,}\s*$/.test(line.trim()));
    const body = bodyLines.join('\n').trim();

    return {
      id: `slide-${index + 1}`,
      title: slideTitle,
      body,
      notes: ''
    };
  });

  return {
    format: 'ruangtenang-presentation-v1',
    theme: 'academic_minimal',
    slides: slides.length ? slides : [{ id: 'slide-1', title: title || 'Slide 1', body: '', notes: '' }]
  };
}

export const ArtifactPresentationEditor: React.FC<{ content: string; title: string; onChange: (content: string) => void; onBlur: () => void }> = ({ content, title, onChange, onBlur }) => {
  const deck = useMemo(() => createPresentationFromMarkdown(content, title), [content, title]);
  const [active, setActive] = useState(0);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Live Presentation Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(true);

  // AI Image Generation state
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [showLogoConfig, setShowLogoConfig] = useState(false);

  const slide = deck.slides[Math.min(active, deck.slides.length - 1)];
  const activeTheme = THEMES[deck.theme] || THEMES.academic_minimal;

  const update = (next: EditablePresentation) => onChange(JSON.stringify(next, null, 2));
  const patchSlide = (patch: Partial<EditableSlide>) => update({ ...deck, slides: deck.slides.map((item, index) => index === active ? { ...item, ...patch } : item) });
  const move = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= deck.slides.length) return; const slides = [...deck.slides]; [slides[index], slides[target]] = [slides[target], slides[index]]; update({ ...deck, slides }); setActive(target); };

  // Timer effect for presenter rehearsal
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isPlaying && isTimerActive) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying, isTimerActive]);

  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (!isPlaying) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setPlayerIndex(prev => Math.min(prev + 1, deck.slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault();
        setPlayerIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setIsPlaying(false);
      } else if (e.key.toLowerCase() === 'n') {
        setShowNotes(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, deck.slides.length]);

  const handleStartPresentation = () => {
    setPlayerIndex(active);
    setTimerSeconds(0);
    setIsTimerActive(true);
    setIsPlaying(true);
  };

  const handleGenerateSlideIllustration = async () => {
    if (!slide) return;
    setIsGeneratingImg(true);
    try {
      const prompt = `Academic vector diagram or infographic illustration for presentation slide titled "${slide.title}". Slide topics: ${slide.body.slice(0, 160) || slide.title}. Clean, minimalist, high quality, professional education graphic on clean background.`;
      const res = await generateAiImage({ prompt, style: 'academic_illustration' });
      if (res.imageUrl) {
        patchSlide({
          imageUrl: res.imageUrl,
          imageCaption: slide.title,
          layout: 'image_content'
        });
      }
    } catch (e) {
      console.error('Failed to generate image', e);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIdx === null || draggedIdx === dropIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const slides = [...deck.slides];
    const [removed] = slides.splice(draggedIdx, 1);
    slides.splice(dropIndex, 0, removed);
    update({ ...deck, slides });
    setActive(dropIndex);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return <section className="relative mx-auto flex min-h-145 max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="PowerPoint Studio">
    {/* Header bar */}
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          PowerPoint Studio
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            {deck.slides.length} slide
          </span>
        </h2>
        <p className="text-[11px] text-slate-500">Susun urutan, tambahkan ilustrasi AI, dan tinjau live sebelum ekspor</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* Play Presentation Mode button */}
        <button
          type="button"
          onClick={handleStartPresentation}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          title="Mulai Mode Presentasi Fullscreen (F5)"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Mode Presentasi</span>
        </button>

        {/* Campus Logo Settings */}
        <button
          type="button"
          onClick={() => setShowLogoConfig(v => !v)}
          className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
            showLogoConfig || deck.logoUrl
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
          title="Konfigurasi Logo Kampus & Institusi"
        >
          🎓 Logo Kampus
        </button>

        {/* Theme selector */}
        <select
          aria-label="Tema presentasi"
          value={deck.theme}
          onChange={event => update({ ...deck, theme: event.target.value as PresentationTheme })}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <optgroup label="Tema Profesional & Akademik">
            <option value="academic_minimal">Academic Minimal (Teal)</option>
            <option value="professional">Professional (Royal Blue)</option>
            <option value="clean_corporate">Clean Corporate (Emerald)</option>
            <option value="technology">Cyber Dark (Technology)</option>
            <option value="vibrant_creative">Vibrant Creative (Purple)</option>
          </optgroup>
          <optgroup label="Tema Kampus Indonesia">
            <option value="kampus_ui">Universitas Indonesia (Kuning Makara)</option>
            <option value="kampus_itb">ITB (Ganesha Cyan)</option>
            <option value="kampus_ugm">UGM (Biru Tua & Emas)</option>
            <option value="kampus_unair">UNAIR (Ksatria Airlangga)</option>
          </optgroup>
        </select>
      </div>
    </div>

    {/* Campus Logo Config Dropdown Drawer */}
    {showLogoConfig && (
      <div className="border-b border-indigo-100 bg-indigo-50/70 p-3 text-xs dark:border-slate-800 dark:bg-indigo-950/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            Kustomisasi Identitas Kampus & Logo
          </div>
          <button type="button" onClick={() => setShowLogoConfig(false)} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={deck.campusName || ''}
            onChange={e => update({ ...deck, campusName: e.target.value })}
            placeholder="Nama Kampus / Institusi (misal: Universitas Indonesia)"
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            value={deck.logoUrl || ''}
            onChange={e => update({ ...deck, logoUrl: e.target.value })}
            placeholder="URL Logo Kampus (https://... atau /api/ai/images/...)"
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
          <span>Preset Logo Cepat:</span>
          <button type="button" onClick={() => update({ ...deck, campusName: 'Universitas Indonesia', theme: 'kampus_ui', logoUrl: 'https://upload.wikimedia.org/wikipedia/id/thumb/8/8a/Makara_UI.svg/200px-Makara_UI.svg.png' })} className="rounded bg-white px-1.5 py-0.5 border shadow-2xs hover:bg-slate-50 dark:bg-slate-800">UI</button>
          <button type="button" onClick={() => update({ ...deck, campusName: 'Institut Teknologi Bandung', theme: 'kampus_itb', logoUrl: 'https://upload.wikimedia.org/wikipedia/id/thumb/9/95/Logo_Institut_Teknologi_Bandung.png/200px-Logo_Institut_Teknologi_Bandung.png' })} className="rounded bg-white px-1.5 py-0.5 border shadow-2xs hover:bg-slate-50 dark:bg-slate-800">ITB</button>
          <button type="button" onClick={() => update({ ...deck, campusName: 'Universitas Gadjah Mada', theme: 'kampus_ugm', logoUrl: 'https://upload.wikimedia.org/wikipedia/id/thumb/8/8b/Logo_Universitas_Gadjah_Mada.svg/200px-Logo_Universitas_Gadjah_Mada.svg.png' })} className="rounded bg-white px-1.5 py-0.5 border shadow-2xs hover:bg-slate-50 dark:bg-slate-800">UGM</button>
          <button type="button" onClick={() => update({ ...deck, campusName: 'Universitas Airlangga', theme: 'kampus_unair', logoUrl: 'https://upload.wikimedia.org/wikipedia/id/thumb/b/b5/Logo_Unair.svg/200px-Logo_Unair.svg.png' })} className="rounded bg-white px-1.5 py-0.5 border shadow-2xs hover:bg-slate-50 dark:bg-slate-800">UNAIR</button>
          {deck.logoUrl && (
            <button type="button" onClick={() => update({ ...deck, logoUrl: undefined, campusName: undefined })} className="text-rose-500 hover:underline ml-2">Hapus Logo</button>
          )}
        </div>
      </div>
    )}

    {/* Main Editor Grid */}
    <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[12rem_minmax(0,1fr)]">
      <aside className="flex gap-2 overflow-auto border-b border-slate-200 p-2 md:flex-col md:border-b-0 md:border-r dark:border-slate-800" aria-label="Slide thumbnails">
        {deck.slides.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => {
              setDraggedIdx(index);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverIdx !== index) setDragOverIdx(index);
            }}
            onDragLeave={() => {
              if (dragOverIdx === index) setDragOverIdx(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(index);
            }}
            onDragEnd={() => {
              setDraggedIdx(null);
              setDragOverIdx(null);
            }}
            className={`min-w-32 cursor-grab active:cursor-grabbing rounded-lg border p-2 transition-all md:min-w-0 ${
              dragOverIdx === index ? 'ring-2 ring-emerald-500 scale-[1.02]' : ''
            } ${draggedIdx === index ? 'opacity-40 border-dashed border-emerald-400' : ''} ${
              index === active ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <button type="button" onClick={() => setActive(index)} aria-current={index === active ? 'true' : undefined} className="block w-full text-left">
              <div className="mb-2 flex aspect-video items-center justify-center rounded bg-slate-100 p-2 text-center text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="Thumbnail" className="max-h-full max-w-full object-contain" />
                ) : (
                  item.title || `Slide ${index + 1}`
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="line-clamp-1 text-[10px] font-medium">{index + 1}. {item.title || 'Tanpa judul'}</span>
                {item.layout && item.layout !== 'content' && (
                  <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[8px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {item.layout}
                  </span>
                )}
              </div>
            </button>
            <div className="mt-1 flex justify-end gap-1">
              <button type="button" aria-label={`Pindah slide ${index + 1} ke atas`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-1 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowUp className="h-3 w-3" /></button>
              <button type="button" aria-label={`Pindah slide ${index + 1} ke bawah`} disabled={index === deck.slides.length - 1} onClick={() => move(index, 1)} className="rounded p-1 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowDown className="h-3 w-3" /></button>
              <button type="button" aria-label={`Hapus slide ${index + 1}`} disabled={deck.slides.length <= 1} onClick={() => { update({ ...deck, slides: deck.slides.filter((_, i) => i !== index) }); setActive(Math.max(0, index - 1)); }} className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => { const slides = [...deck.slides, { id: `slide-${Date.now()}`, title: `Slide ${deck.slides.length + 1}`, body: '', notes: '' }]; update({ ...deck, slides }); setActive(slides.length - 1); }} className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300"><Plus className="h-3.5 w-3.5" />Tambah slide</button>
      </aside>

      <div className="min-w-0 space-y-3 overflow-auto p-3 sm:p-5" onBlur={onBlur}>
        <div className="mx-auto aspect-video w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-[5%] shadow-sm dark:border-slate-700 dark:bg-slate-950 flex flex-col justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              <input aria-label="Judul slide" value={slide?.title || ''} onChange={event => patchSlide({ title: event.target.value })} className="min-w-40 flex-1 bg-transparent text-lg font-bold outline-none sm:text-2xl" placeholder="Judul slide" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Tata Letak:</span>
                <select
                  aria-label="Tata letak slide"
                  value={slide?.layout || (active === 0 ? 'title' : 'content')}
                  onChange={event => patchSlide({ layout: event.target.value as any })}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="content">Daftar Poin (Standar)</option>
                  <option value="cards">Kartu Sorotan (Grid)</option>
                  <option value="comparison">2 Kolom (Komparasi)</option>
                  <option value="highlight">Sorotan Utama (Banner)</option>
                  <option value="image_content">Konten + Gambar/Diagram</option>
                  <option value="table">Tabel Data (Native)</option>
                  <option value="title">Slide Judul (Cover)</option>
                  <option value="references">Daftar Referensi</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_200px] gap-3">
              <textarea
                aria-label="Konten slide"
                value={slide?.body || ''}
                onChange={event => patchSlide({ body: event.target.value })}
                className="min-h-36 w-full resize-none bg-transparent text-xs leading-6 outline-none sm:text-sm font-sans"
                placeholder="Konten slide, satu poin per baris. Awali dengan Kata Kunci: untuk penekanan bold."
              />

              {/* Slide image & AI generation panel */}
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-900">
                {slide?.imageUrl ? (
                  <div className="relative group overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-700">
                    <img src={slide.imageUrl} alt="Slide Preview" className="h-28 w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => patchSlide({ imageUrl: undefined, imageCaption: undefined })}
                      className="absolute top-1 right-1 rounded bg-rose-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Hapus gambar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-28 flex-col items-center justify-center rounded border border-dashed border-slate-300 p-2 text-slate-400 dark:border-slate-700">
                    <ImageIcon className="h-6 w-6 stroke-1 mb-1" />
                    <span className="text-[10px]">Belum ada gambar slide</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isGeneratingImg || !slide?.title}
                  onClick={handleGenerateSlideIllustration}
                  className="inline-flex items-center justify-center gap-1 rounded bg-indigo-600 px-2 py-1.5 text-[11px] font-medium text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {isGeneratingImg ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Membuat...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      <span>Buat Ilustrasi AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <input
              aria-label="URL Gambar Slide"
              value={slide?.imageUrl || ''}
              onChange={event => patchSlide({ imageUrl: event.target.value })}
              className="flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              placeholder="Atau masukkan URL Gambar/Diagram manual (http...)"
            />
          </div>
        </div>

        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
          Speaker notes
          <textarea
            aria-label="Speaker notes"
            value={slide?.notes || ''}
            onChange={event => patchSlide({ notes: event.target.value })}
            className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-normal outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Catatan untuk presenter (akan tampil saat mode presentasi aktif)"
          />
        </label>
      </div>
    </div>

    <footer className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">
      <span>Preview mencerminkan urutan slide. Konten diekspor sebagai elemen PowerPoint native yang dapat diedit.</span>
      <span className="font-medium text-slate-700 dark:text-slate-300">Tema Aktif: {activeTheme.name}</span>
    </footer>

    {/* Fullscreen Interactive Presentation Mode Player */}
    {isPlaying && (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm tracking-wide text-emerald-400">
              RuangTenang Presenter
            </span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              Slide {playerIndex + 1} / {deck.slides.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-mono text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTimer(timerSeconds)}</span>
              <button
                type="button"
                onClick={() => setIsTimerActive(v => !v)}
                className="ml-1 text-[10px] text-slate-400 hover:text-white"
              >
                {isTimerActive ? 'Jeda' : 'Lanjut'}
              </button>
            </div>

            {/* Notes toggle */}
            <button
              type="button"
              onClick={() => setShowNotes(v => !v)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                showNotes ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BookOpen className="mr-1 inline h-3.5 w-3.5" />
              Notes (N)
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => setIsPlaying(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Tutup Mode Presentasi (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Presentation Canvas Center */}
        <div className="flex flex-1 items-center justify-center p-4 md:p-8 overflow-hidden">
          <div
            className="aspect-video w-full max-w-5xl rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col justify-between transition-all"
            style={{
              backgroundColor: deck.slides[playerIndex]?.layout === 'title' ? '#0F172A' : `#${activeTheme.background}`,
              color: deck.slides[playerIndex]?.layout === 'title' ? '#F8FAFC' : `#${activeTheme.foreground}`,
              borderColor: `#${activeTheme.cardBorder}`
            }}
          >
            {/* Slide Title & Header */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wider"
                  style={{
                    backgroundColor: `#${activeTheme.tagBg}`,
                    color: `#${activeTheme.tagColor}`
                  }}
                >
                  {deck.campusName || 'RUANGTENANG WORKSPACE'}
                </span>
                {deck.logoUrl && (
                  <img src={deck.logoUrl} alt="Logo" className="h-7 object-contain" />
                )}
              </div>

              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2"
                style={{ color: deck.slides[playerIndex]?.layout === 'title' ? '#F8FAFC' : `#${activeTheme.title}` }}
              >
                {deck.slides[playerIndex]?.title || 'Judul Slide'}
              </h1>
              <div
                className="h-1 w-20 rounded mb-6"
                style={{ backgroundColor: `#${activeTheme.accent}` }}
              />
            </div>

            {/* Slide Body Content */}
            <div className="flex-1 overflow-auto">
              {deck.slides[playerIndex]?.imageUrl ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-full">
                  <div className="space-y-3">
                    {deck.slides[playerIndex].body.split(/\r?\n/).filter(Boolean).map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-sm md:text-base leading-relaxed">
                        <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: `#${activeTheme.accent}` }} />
                        <span>{line.replace(/^[-*+]\s+/, '')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 max-h-72">
                    <img src={deck.slides[playerIndex].imageUrl} alt="Slide Graphic" className="max-h-64 object-contain rounded-lg shadow-sm" />
                  </div>
                </div>
              ) : deck.slides[playerIndex]?.layout === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full items-center">
                  {deck.slides[playerIndex].body.split(/\r?\n\r?\n|\n---+\n/).filter(Boolean).slice(0, 3).map((block, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border p-4 shadow-xs"
                      style={{ backgroundColor: `#${activeTheme.cardBg}`, borderColor: `#${activeTheme.cardBorder}` }}
                    >
                      <div className="text-xs font-bold mb-2" style={{ color: `#${activeTheme.accent}` }}>
                        POIN 0{idx + 1}
                      </div>
                      <p className="text-sm font-medium">{block}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3.5 max-w-3xl">
                  {deck.slides[playerIndex]?.body.split(/\r?\n/).filter(Boolean).map((line, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-base md:text-lg leading-relaxed">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: `#${activeTheme.accent}` }} />
                      <span>{line.replace(/^[-*+]\s+/, '')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Slide Footer */}
            <div className="flex items-center justify-between border-t pt-4 text-xs opacity-60" style={{ borderColor: `#${activeTheme.cardBorder}` }}>
              <span>{title} · {deck.campusName || 'RuangTenang'}</span>
              <span>Slide {playerIndex + 1} dari {deck.slides.length}</span>
            </div>
          </div>
        </div>

        {/* Speaker Notes Drawer */}
        {showNotes && (
          <div className="border-t border-slate-800 bg-slate-900 p-4 text-xs text-slate-300 max-h-36 overflow-auto">
            <span className="font-semibold text-amber-400 block mb-1">Speaker Notes:</span>
            {deck.slides[playerIndex]?.notes ? (
              <p className="whitespace-pre-line leading-relaxed">{deck.slides[playerIndex].notes}</p>
            ) : (
              <p className="italic text-slate-500">Tidak ada catatan speaker untuk slide ini.</p>
            )}
          </div>
        )}

        {/* Bottom Navigation Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-6 py-3">
          <div className="text-xs text-slate-400">
            Gunakan <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">Space</kbd> atau <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">→</kbd> untuk lanjut
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={playerIndex === 0}
              onClick={() => setPlayerIndex(p => Math.max(p - 1, 0))}
              className="rounded-lg bg-slate-800 p-2 text-slate-200 hover:bg-slate-700 disabled:opacity-30"
              title="Slide Sebelumnya"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-xs font-medium px-2">
              {playerIndex + 1} / {deck.slides.length}
            </span>
            <button
              type="button"
              disabled={playerIndex === deck.slides.length - 1}
              onClick={() => setPlayerIndex(p => Math.min(p + 1, deck.slides.length - 1))}
              className="rounded-lg bg-slate-800 p-2 text-slate-200 hover:bg-slate-700 disabled:opacity-30"
              title="Slide Berikutnya"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )}
  </section>;
};

