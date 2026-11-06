import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Workflow,
  BarChart3,
  LineChart as LineChartIcon,
  Activity,
  Layout,
  Radio,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RefreshCw,
  Send,
  FileText,
  Download,
  BookMarked,
  Loader2,
  Sparkles,
  Plus,
  Presentation
} from 'lucide-react';
import { MermaidRenderer } from './MermaidRenderer';
import { apiClient } from '../../../lib/apiClient';
import { speechPlayer, type SpeechPlaybackStatus } from '../../../lib/speechPlayer';
import { useToast } from '../../../components/Toast';
import { exportToAcademicDocx } from '../utils/exportDocx';
import { exportToAcademicPdf } from '../utils/exportAcademicPdf';
import { downloadBibTeXFile } from '../utils/citationExport';
import { exportEditablePptx } from '../utils/exportPptx';
import { buildThesisDefensePresentationDeck } from './ThesisMasteryStudio';

export interface ParsedNumericTable {
  title: string;
  headers: string[];
  labelKey: string;
  numericKeys: string[];
  rows: Array<Record<string, string | number>>;
}

/**
 * Extracts Mermaid code blocks or raw Mermaid syntax from artifact content
 */
export function extractMermaidBlocks(content: string): string[] {
  if (!content) return [];
  const blocks: string[] = [];
  const regex = /```mermaid\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]?.trim()) {
      blocks.push(match[1].trim());
    }
  }
  if (blocks.length > 0) return blocks;

  const trimmed = content.trim();
  if (
    trimmed.startsWith('flowchart ') ||
    trimmed.startsWith('graph ') ||
    trimmed.startsWith('sequenceDiagram') ||
    trimmed.startsWith('mindmap') ||
    trimmed.startsWith('stateDiagram')
  ) {
    return [trimmed];
  }
  return [];
}

/**
 * Extracts numeric Markdown tables or JSON row arrays from content for Recharts rendering
 */
export function extractNumericTablesFromMarkdown(content: string): ParsedNumericTable[] {
  if (!content) return [];
  const results: ParsedNumericTable[] = [];

  // Try JSON chart/table payload first
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
      const sample = parsed.rows[0] as Record<string, unknown>;
      const keys = Object.keys(sample);
      const numericKeys = keys.filter(k => parsed.rows.some((r: any) => Number.isFinite(Number(r[k]))));
      const labelKey = keys.find(k => !numericKeys.includes(k)) || keys[0] || 'Label';
      if (numericKeys.length > 0) {
        results.push({
          title: String(parsed.title || 'Visualisasi Dataset'),
          headers: keys,
          labelKey,
          numericKeys,
          rows: parsed.rows.map((r: any, idx: number) => {
            const rowObj: Record<string, string | number> = {
              [labelKey]: String(r[labelKey] ?? `Item ${idx + 1}`)
            };
            numericKeys.forEach(nk => {
              const numVal = Number(String(r[nk] ?? '0').replace(/[^0-9.-]/g, ''));
              rowObj[nk] = Number.isFinite(numVal) ? numVal : 0;
            });
            return rowObj;
          })
        });
      }
    }
  } catch {
    // Not raw JSON, parse Markdown tables
  }

  const lines = content.split(/\r?\n/);
  let currentTableLines: string[] = [];
  let lastHeading = 'Visualisasi Tabel Data Penelitian';

  const flushMarkdownTable = (tableLines: string[], heading: string) => {
    if (tableLines.length < 3) return;
    const headerCells = tableLines[0]
      .slice(1, -1)
      .split('|')
      .map(c => c.replace(/[*`]/g, '').trim())
      .filter(Boolean);
    if (headerCells.length < 2) return;

    const dataLines = tableLines.slice(1).filter(l => !l.includes('---'));
    if (dataLines.length === 0) return;

    const parsedRows: Array<Record<string, string | number>> = [];
    const numericColCounts: Record<string, number> = {};

    for (const dLine of dataLines) {
      const rawCells = dLine
        .slice(1, -1)
        .split('|')
        .map(c => c.replace(/[*`]/g, '').trim());
      if (rawCells.length < 2) continue;
      const rowObj: Record<string, string | number> = {};
      headerCells.forEach((colName, idx) => {
        const cellVal = rawCells[idx] ?? '';
        const cleanedNum = cellVal.replace(/[%$,]/g, '').trim();
        const num = Number(cleanedNum);
        if (cleanedNum !== '' && !Number.isNaN(num) && /^-?\d+(?:\.\d+)?$/.test(cleanedNum)) {
          rowObj[colName] = num;
          numericColCounts[colName] = (numericColCounts[colName] || 0) + 1;
        } else {
          rowObj[colName] = cellVal || `-`;
        }
      });
      parsedRows.push(rowObj);
    }

    const numericKeys = headerCells.filter(h => (numericColCounts[h] || 0) >= Math.ceil(parsedRows.length * 0.5));
    if (numericKeys.length === 0 || parsedRows.length === 0) return;

    const labelKey = headerCells.find(h => !numericKeys.includes(h)) || headerCells[0];
    results.push({
      title: heading,
      headers: headerCells,
      labelKey,
      numericKeys,
      rows: parsedRows
    });
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (/^#{1,4}\s+/.test(trimmed)) {
      if (currentTableLines.length > 0) {
        flushMarkdownTable(currentTableLines, lastHeading);
        currentTableLines = [];
      }
      lastHeading = trimmed.replace(/^#{1,4}\s+/, '').trim();
      continue;
    }
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      currentTableLines.push(trimmed);
    } else if (currentTableLines.length > 0) {
      flushMarkdownTable(currentTableLines, lastHeading);
      currentTableLines = [];
    }
  }
  if (currentTableLines.length > 0) {
    flushMarkdownTable(currentTableLines, lastHeading);
  }

  return results;
}

export function extractHtmlPreviewBlock(content: string): string | null {
  if (!content) return null;
  const htmlBlock = content.match(/```html\s*\n([\s\S]*?)```/i);
  if (htmlBlock && htmlBlock[1]?.trim()) return htmlBlock[1].trim();
  if (/^\s*<!DOCTYPE html>|^\s*<html|^\s*<div|^\s*<form|^\s*<section/i.test(content.trim())) {
    return content.trim();
  }
  return null;
}

export const THESIS_MERMAID_TEMPLATES: Array<{ label: string; desc: string; code: string }> = [
  {
    label: 'Diagram Alir PRISMA 2020 (Seleksi Jurnal)',
    desc: 'Bagan standar seleksi literatur sistematis Bab II / Bab III',
    code: `flowchart TD
    A[Identifikasi Artikel dari Database: Scopus, Scholar, Garuda n = 248] --> B[Hapus Duplikasi Artikel n = 54]
    B --> C[Skrining Judul dan Abstrak n = 194]
    C --> D[Artikel Dieksklusi karena Tidak Relevan n = 142]
    C --> E[Uji Kelayakan Teks Penuh / Full-Text n = 52]
    E --> F[Dieksklusi: Metodologi Tidak Lengkap n = 34]
    E --> G[Jurnal Inklusi dalam Sintesis Akhir Skripsi n = 18]`
  },
  {
    label: 'Kerangka Berpikir Variabel (X → M → Y)',
    desc: 'Model hubungan variabel independen, mediasi, dan dependen',
    code: `flowchart LR
    X1[Literasi AI & Regulasi Diri X1] -->|H1: Pengaruh Langsung| Y[Produktivitas Riset Skripsi Y]
    X2[Dukungan Pembimbing Akademik X2] -->|H2: Pengaruh Langsung| Y
    X1 -->|H3a| M[Efikasi Diri Akademik M]
    X2 -->|H3b| M
    M -->|H4: Peran Mediasi| Y`
  },
  {
    label: 'Prosedur Penelitian Kuantitatif / R&D',
    desc: 'Tahapan operasional penelitian dari instrumen hingga uji hipotesis',
    code: `flowchart TD
    T1[1. Perumusan Masalah & Studi Pendahuluan] --> T2[2. Penyusunan Kisi-Kisi & Instrumen Kuesioner]
    T2 --> T3[3. Uji Validitas & Reliabilitas Cronbach Alpha]
    T3 --> T4[4. Pengumpulan Data Sampel Mahasiswa]
    T4 --> T5[5. Uji Asumsi Klasik / Evaluasi Outer & Inner Model]
    T5 --> T6[6. Pengujian Hipotesis & Interpretasi Bab IV]`
  }
];

interface VisualCanvasStudioProps {
  title: string;
  content: string;
  onAppendContent?: (snippet: string) => void;
}

export const VisualCanvasStudio: React.FC<VisualCanvasStudioProps> = ({
  title,
  content,
  onAppendContent
}) => {
  const { showToast } = useToast();
  const mermaidBlocks = useMemo(() => extractMermaidBlocks(content), [content]);
  const numericTables = useMemo(() => extractNumericTablesFromMarkdown(content), [content]);
  const htmlBlock = useMemo(() => extractHtmlPreviewBlock(content), [content]);

  const [activeVisualTab, setActiveVisualTab] = useState<'diagram' | 'chart' | 'ui'>(() => {
    if (mermaidBlocks.length > 0) return 'diagram';
    if (numericTables.length > 0) return 'chart';
    if (htmlBlock) return 'ui';
    return 'diagram';
  });

  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>('');

  const activeTable = numericTables[selectedTableIndex] || numericTables[0] || null;
  const activeMetric =
    activeTable && activeTable.numericKeys.includes(selectedMetricKey)
      ? selectedMetricKey
      : activeTable?.numericKeys[0] || '';

  const stats = useMemo(() => {
    if (!activeTable || !activeMetric) return null;
    const nums = activeTable.rows
      .map(r => Number(r[activeMetric]))
      .filter(n => Number.isFinite(n));
    if (nums.length === 0) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return { sum, avg, min, max, count: nums.length };
  }, [activeTable, activeMetric]);

  const handleInsertSampleTable = () => {
    if (!onAppendContent) return;
    const sampleMd = `\n\n## Distribusi Data Responden & Skor Efektivitas\n\n| Kelompok Sampel | Jumlah Responden | Skor Pre-Test | Skor Post-Test | Peningkatan (%) |\n| --- | --- | --- | --- | --- |\n| Kelompok Eksperimen A | 45 | 64.2 | 86.5 | 34.7 |\n| Kelompok Eksperimen B | 42 | 65.8 | 84.1 | 27.8 |\n| Kelompok Kontrol | 40 | 63.9 | 70.4 | 10.2 |\n| Rata-rata Total | 127 | 64.6 | 80.3 | 24.2 |\n`;
    onAppendContent(sampleMd);
    setActiveVisualTab('chart');
    showToast('Tabel data kuantitatif berhasil ditambahkan ke dokumen dan dirender menjadi grafik.', 'success');
  };

  const handleInsertQuestionnaireHtml = () => {
    if (!onAppendContent) return;
    const sampleHtml = `\n\n\`\`\`html\n<div style="font-family: system-ui, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; color: #0f172a;">\n  <h3 style="margin: 0 0 6px; font-size: 16px;">Instrumen Kuesioner Penelitian Skripsi (Skala Likert 1–5)</h3>\n  <p style="margin: 0 0 16px; font-size: 12px; color: #475569;">Petunjuk: Pilih angka 1 (Sangat Tidak Setuju) hingga 5 (Sangat Setuju) sesuai pengalaman akademik Anda.</p>\n  <div style="display: grid; gap: 12px; font-size: 13px;">\n    <div style="padding: 12px; background: #f8fafc; border-radius: 10px;">\n      <div style="font-weight: 600; margin-bottom: 8px;">1. Penggunaan fitur sintesis literatur membantu saya memetakan research gap lebih cepat.</div>\n      <div style="display: flex; gap: 14px; font-family: monospace;">\n        <label><input type="radio" name="q1" /> 1 (STS)</label>\n        <label><input type="radio" name="q1" /> 2 (TS)</label>\n        <label><input type="radio" name="q1" /> 3 (N)</label>\n        <label><input type="radio" name="q1" checked /> 4 (S)</label>\n        <label><input type="radio" name="q1" /> 5 (SS)</label>\n      </div>\n    </div>\n    <div style="padding: 12px; background: #f8fafc; border-radius: 10px;">\n      <div style="font-weight: 600; margin-bottom: 8px;">2. Pembagian target skripsi berbasis ritme belajar menurunkan kelelahan mental (burnout).</div>\n      <div style="display: flex; gap: 14px; font-family: monospace;">\n        <label><input type="radio" name="q2" /> 1 (STS)</label>\n        <label><input type="radio" name="q2" /> 2 (TS)</label>\n        <label><input type="radio" name="q2" /> 3 (N)</label>\n        <label><input type="radio" name="q2" /> 4 (S)</label>\n        <label><input type="radio" name="q2" checked /> 5 (SS)</label>\n      </div>\n    </div>\n  </div>\n</div>\n\`\`\`\n`;
    onAppendContent(sampleHtml);
    setActiveVisualTab('ui');
    showToast('Pratinjau instrumen kuesioner Likert berhasil disisipkan.', 'success');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Mode Switcher Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Mode Visual Canvas">
          <button
            type="button"
            role="tab"
            aria-selected={activeVisualTab === 'diagram'}
            onClick={() => setActiveVisualTab('diagram')}
            className={`inline-flex h-8.5 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer ${
              activeVisualTab === 'diagram'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Diagram Metodologi ({mermaidBlocks.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeVisualTab === 'chart'}
            onClick={() => setActiveVisualTab('chart')}
            className={`inline-flex h-8.5 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer ${
              activeVisualTab === 'chart'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Grafik Data ({numericTables.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeVisualTab === 'ui'}
            onClick={() => setActiveVisualTab('ui')}
            className={`inline-flex h-8.5 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer ${
              activeVisualTab === 'ui'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Pratinjau Kuesioner / UI</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Visual Canvas · {title}
        </span>
      </div>

      {/* TAB 1: MERMAID DIAGRAMS */}
      {activeVisualTab === 'diagram' && (
        <div className="space-y-4">
          {mermaidBlocks.length > 0 ? (
            mermaidBlocks.map((code, idx) => (
              <MermaidRenderer
                key={idx}
                chart={code}
                title={`${title} · Bagan ${idx + 1}`}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Sisipkan Bagan Metodologi atau Kerangka Berpikir Skripsi (Mermaid Live)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih salah satu templat bagan ilmiah di bawah ini untuk langsung dirender secara visual dan disematkan ke draf Canvas Anda.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {THESIS_MERMAID_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (onAppendContent) {
                        onAppendContent(`\n\n### ${tpl.label}\n\`\`\`mermaid\n${tpl.code}\n\`\`\`\n`);
                        showToast(`Bagan "${tpl.label}" disematkan ke Canvas.`, 'success');
                      }
                    }}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 text-left hover:border-indigo-400 transition cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {tpl.label}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {tpl.desc}
                      </p>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Sisipkan & Render</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECHARTS INTERACTIVE DATA VISUALIZATION */}
      {activeVisualTab === 'chart' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          {activeTable ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {activeTable.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Sumbu X: {activeTable.labelKey} · Metrik Y: {activeMetric} ({activeTable.rows.length} baris data)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {numericTables.length > 1 && (
                    <select
                      aria-label="Pilih tabel data"
                      value={selectedTableIndex}
                      onChange={e => setSelectedTableIndex(Number(e.target.value))}
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs"
                    >
                      {numericTables.map((t, idx) => (
                        <option key={idx} value={idx}>
                          Tabel {idx + 1}: {t.title.slice(0, 28)}
                        </option>
                      ))}
                    </select>
                  )}

                  {activeTable.numericKeys.length > 1 && (
                    <select
                      aria-label="Pilih kolom metrik"
                      value={activeMetric}
                      onChange={e => setSelectedMetricKey(e.target.value)}
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs"
                    >
                      {activeTable.numericKeys.map(k => (
                        <option key={k} value={k}>
                          Metrik: {k}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setChartType('bar')}
                      className={`px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1 cursor-pointer ${
                        chartType === 'bar' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Batang</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType('line')}
                      className={`px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1 cursor-pointer ${
                        chartType === 'line' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <LineChartIcon className="w-3.5 h-3.5" />
                      <span>Garis</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType('area')}
                      className={`px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1 cursor-pointer ${
                        chartType === 'area' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Area</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Descriptive Stats Strip */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums">
                  <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-2.5">
                    <span className="text-[10.5px] text-slate-400 block">RATA-RATA (MEAN)</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {stats.avg.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-2.5">
                    <span className="text-[10.5px] text-slate-400 block">NILAI TERTINGGI (MAX)</span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {stats.max.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-2.5">
                    <span className="text-[10.5px] text-slate-400 block">NILAI TERENDAH (MIN)</span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      {stats.min.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-2.5">
                    <span className="text-[10.5px] text-slate-400 block">TOTAL AKUMULASI</span>
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                      {stats.sum.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Recharts Canvas */}
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={activeTable.rows} margin={{ top: 10, right: 18, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                      <XAxis dataKey={activeTable.labelKey} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey={activeMetric} fill="#4F46E5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={activeTable.rows} margin={{ top: 10, right: 18, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                      <XAxis dataKey={activeTable.labelKey} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey={activeMetric} stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <AreaChart data={activeTable.rows} margin={{ top: 10, right: 18, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                      <XAxis dataKey={activeTable.labelKey} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey={activeMetric} stroke="#0D9488" fill="#0D9488" fillOpacity={0.2} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Dokumen ini belum memiliki tabel Markdown numerik. Setiap tabel dengan kolom angka di dalam naskah akan otomatis divisualisasikan menjadi grafik Batang, Garis, atau Area.
              </p>
              {onAppendContent && (
                <button
                  type="button"
                  onClick={handleInsertSampleTable}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sisipkan Contoh Tabel Kuantitatif Bab IV</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SANDBOXED HTML / QUESTIONNAIRE UI PREVIEW */}
      {activeVisualTab === 'ui' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          {htmlBlock ? (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Pratinjau Antarmuka / Instrumen Kuesioner Interaktif
                </span>
                <span className="font-mono text-[11px]">Sandboxed HTML Preview</span>
              </div>
              <iframe
                title={`Pratinjau UI ${title}`}
                sandbox="allow-scripts"
                srcDoc={htmlBlock}
                className="w-full h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
              />
            </>
          ) : (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Belum ada blok kode <code className="font-mono">```html</code> pada artefak ini. Anda dapat menyisipkan pratinjau instrumen kuesioner Skala Likert atau prototipe UI penelitian.
              </p>
              {onAppendContent && (
                <button
                  type="button"
                  onClick={handleInsertQuestionnaireHtml}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Pratinjau Kuesioner Skala Likert</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface PodcastSegmentItem {
  id: string;
  speaker: 'Dr. Rina' | 'Raka';
  roleLabel: string;
  voiceName: 'Kore' | 'Puck';
  timestampLabel: string;
  text: string;
  keyTakeaway: string;
}

export interface PodcastStudioData {
  title: string;
  updatedAt: string;
  keyInsights: string[];
  suggestedQuestions: string[];
  segments: PodcastSegmentItem[];
}

interface NotebookLmPodcastStudioProps {
  artifactId: string;
  artifactTitle: string;
  sourceContent: string;
  onAppendTranscriptToCanvas?: (transcriptMarkdown: string) => void;
}

export const NotebookLmPodcastStudio: React.FC<NotebookLmPodcastStudioProps> = ({
  artifactId,
  artifactTitle,
  sourceContent,
  onAppendTranscriptToCanvas
}) => {
  const { showToast } = useToast();
  const [podcast, setPodcast] = useState<PodcastStudioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [focusAngle, setFocusAngle] = useState<'executive_overview' | 'methodology' | 'literature_gap' | 'defense_prep'>('executive_overview');
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<SpeechPlaybackStatus>('idle');
  const [questionInput, setQuestionInput] = useState('');
  const [isAskingHost, setIsAskingHost] = useState(false);
  const playingAllRef = useRef(false);
  playingAllRef.current = isPlayingAll;

  const generatePodcast = useCallback(async (angle = focusAngle) => {
    setIsLoading(true);
    speechPlayer.stop();
    setIsPlayingAll(false);
    try {
      const res = await apiClient.fetchJson<{
        success: boolean;
        data: PodcastStudioData;
      }>('/api/v1/ai/podcast-studio', {
        method: 'POST',
        body: JSON.stringify({
          title: artifactTitle || 'Draf Naskah Skripsi',
          sourceText: sourceContent.slice(0, 14000) || artifactTitle || 'Kajian Ilmiah Skripsi',
          focusAngle: angle
        })
      });
      if (res?.success && res.data) {
        setPodcast(res.data);
        setActiveSegmentIndex(0);
      }
    } catch {
      showToast('Gagal memuat Studio Audio Podcast.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [artifactTitle, sourceContent, focusAngle, showToast]);

  useEffect(() => {
    void generatePodcast(focusAngle);
    return () => {
      speechPlayer.stop();
    };
  }, [artifactId]); // eslint-disable-line react-hooks/exhaustive-deps

  const playSegmentAtIndex = useCallback((idx: number, autoAdvance = true) => {
    if (!podcast || !podcast.segments[idx]) {
      setIsPlayingAll(false);
      return;
    }
    const seg = podcast.segments[idx];
    setActiveSegmentIndex(idx);
    setIsPlayingAll(autoAdvance);
    void speechPlayer.speak({
      id: `podcast-${artifactId}-${seg.id}`,
      text: seg.text,
      voiceName: seg.voiceName,
      mode: 'study_overview'
    });
  }, [podcast, artifactId]);

  // Listen to speechPlayer completion to auto-advance to next segment
  useEffect(() => {
    return speechPlayer.subscribe(state => {
      setSpeechStatus(state.status);
      if (state.status === 'idle' && playingAllRef.current && podcast) {
        setActiveSegmentIndex(prev => {
          const next = prev + 1;
          if (next < podcast.segments.length) {
            const nextSeg = podcast.segments[next];
            window.setTimeout(() => {
              if (!playingAllRef.current) return;
              void speechPlayer.speak({
                id: `podcast-${artifactId}-${nextSeg.id}`,
                text: nextSeg.text,
                voiceName: nextSeg.voiceName,
                mode: 'study_overview'
              });
            }, 220);
            return next;
          }
          setIsPlayingAll(false);
          return prev;
        });
      }
    });
  }, [podcast, artifactId]);

  const handleTogglePlayPause = () => {
    if (!podcast || podcast.segments.length === 0) return;
    if (speechStatus === 'playing' || speechStatus === 'loading') {
      setIsPlayingAll(false);
      speechPlayer.stop();
    } else {
      playSegmentAtIndex(activeSegmentIndex, true);
    }
  };

  const handleAskHostQuestion = async (qText?: string) => {
    const question = (qText ?? questionInput).trim();
    if (!question || !podcast) return;
    setIsAskingHost(true);
    setQuestionInput('');
    speechPlayer.stop();
    setIsPlayingAll(false);
    try {
      const res = await apiClient.fetchJson<{
        success: boolean;
        data: PodcastStudioData;
      }>('/api/v1/ai/podcast-studio', {
        method: 'POST',
        body: JSON.stringify({
          title: artifactTitle || 'Draf Naskah Skripsi',
          sourceText: sourceContent.slice(0, 12000) || artifactTitle,
          userQuestion: question,
          focusAngle
        })
      });
      if (res?.success && res.data?.segments?.length) {
        const startIdx = podcast.segments.length;
        const updatedSegments = [...podcast.segments, ...res.data.segments];
        setPodcast({
          ...podcast,
          segments: updatedSegments
        });
        showToast('Dr. Rina & Raka menanggapi pertanyaan Anda!', 'success');
        window.setTimeout(() => {
          playSegmentAtIndex(startIdx, true);
        }, 120);
      }
    } catch {
      showToast('Gagal mengirim pertanyaan ke host podcast.', 'error');
    } finally {
      setIsAskingHost(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
        <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Menyiapkan Studio Audio 2 Host (Dr. Rina & Raka)…
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Menyusun dialog bedah naskah, metodologi, dan celah riset ala NotebookLM Audio Overview.
        </p>
      </div>
    );
  }

  if (!podcast) return null;

  const currentSeg = podcast.segments[activeSegmentIndex] || podcast.segments[0];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Studio Player Card */}
      <div className="rounded-2xl border border-slate-200 bg-[#FAF8F5] p-5 dark:border-slate-800 dark:bg-[#141822] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3.5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Radio className="w-4 h-4" />
              <span>Studio Audio Overview · Diskusi 2 Narasumber</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {podcast.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {([
              ['executive_overview', 'Ringkasan Utuh'],
              ['methodology', 'Bedah Metodologi'],
              ['literature_gap', 'Celah Riset'],
              ['defense_prep', 'Simulasi Sidang']
            ] as const).map(([angle, label]) => (
              <button
                key={angle}
                type="button"
                onClick={() => {
                  setFocusAngle(angle);
                  void generatePodcast(angle);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  focusAngle === angle
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Speaker Banner & Playback Controls */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
              <span
                className={`w-2 h-2 rounded-full ${
                  speechStatus === 'playing' ? 'bg-emerald-500 animate-ping' : 'bg-indigo-500'
                }`}
              />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {currentSeg?.speaker}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-slate-400">{currentSeg?.roleLabel}</span>
              <span className="text-slate-400">·</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                Segmen {activeSegmentIndex + 1}/{podcast.segments.length} ({currentSeg?.timestampLabel})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-serif leading-relaxed">
              &ldquo;{currentSeg?.text}&rdquo;
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => playSegmentAtIndex(Math.max(0, activeSegmentIndex - 1), true)}
              disabled={activeSegmentIndex === 0}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              aria-label="Segmen sebelumnya"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlayPause}
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {speechStatus === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : speechStatus === 'playing' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>
                {speechStatus === 'playing' ? 'Jeda Podcast' : 'Putar Diskusi'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                playSegmentAtIndex(Math.min(podcast.segments.length - 1, activeSegmentIndex + 1), true)
              }
              disabled={activeSegmentIndex >= podcast.segments.length - 1}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              aria-label="Segmen berikutnya"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => void generatePodcast(focusAngle)}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Susun ulang dialog podcast"
              aria-label="Susun ulang dialog podcast"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Question Interrupt Bar ("Tanya Host") */}
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleAskHostQuestion();
          }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={questionInput}
              onChange={e => setQuestionInput(e.target.value)}
              placeholder="Interupsi & tanya ke Dr. Rina / Raka tentang bagian naskah ini..."
              className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isAskingHost || !questionInput.trim()}
              className="h-9 px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isAskingHost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Tanya Host</span>
            </button>
          </div>

          {podcast.suggestedQuestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] text-slate-400">Saran interupsi:</span>
              {podcast.suggestedQuestions.map((sq, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => void handleAskHostQuestion(sq)}
                  className="text-[11px] text-left px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:border-indigo-400 transition cursor-pointer"
                >
                  {sq}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Clickable Interactive Dialogue Transcript */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Transkrip Interaktif (Klik segmen untuk memutar suara)
          </span>
          {onAppendTranscriptToCanvas && (
            <button
              type="button"
              onClick={() => {
                const md = `\n\n## Catatan Bedah Audio Overview (${podcast.title})\n\n${podcast.segments
                  .map(s => `- **${s.speaker} (${s.roleLabel} · ${s.timestampLabel})**: ${s.text}`)
                  .join('\n')}\n`;
                onAppendTranscriptToCanvas(md);
                showToast('Transkrip diskusi disematkan ke draf Canvas.', 'success');
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sematkan Transkrip ke Dokumen</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {podcast.segments.map((seg, idx) => {
            const isCurrent = idx === activeSegmentIndex;
            const isRina = seg.speaker === 'Dr. Rina';
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => playSegmentAtIndex(idx, true)}
                className={`w-full text-left rounded-xl border p-3.5 transition cursor-pointer flex items-start gap-3 ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30'
                    : 'border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  className={`px-2 py-1 rounded-md font-mono text-[11px] tabular-nums font-semibold shrink-0 ${
                    isRina
                      ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800'
                      : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800'
                  }`}
                >
                  {seg.timestampLabel}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {seg.speaker}{' '}
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        · {seg.roleLabel}
                      </span>
                    </span>
                    <span className="text-[10.5px] font-mono text-slate-400 truncate max-w-[200px]">
                      {seg.keyTakeaway}
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm font-serif text-slate-700 dark:text-slate-200 leading-relaxed">
                    {seg.text}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface AcademicQuickExportBarProps {
  title: string;
  content: string;
}

export const AcademicQuickExportBar: React.FC<AcademicQuickExportBarProps> = ({
  title,
  content
}) => {
  const { showToast } = useToast();
  const [exportingType, setExportingType] = useState<'docx' | 'pdf' | 'bib' | 'pptx' | null>(null);

  const handleExportDocx = async () => {
    setExportingType('docx');
    try {
      showToast('Menyusun dokumen Word Skripsi A4 (.docx)...', 'info');
      await exportToAcademicDocx({
        title: title || 'Naskah Akademik Skripsi',
        content,
        templateType: 'skripsi'
      });
      showToast('Berkas Word Skripsi (.docx) berhasil diunduh.', 'success');
    } catch {
      showToast('Gagal mengekspor berkas .docx.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPdf = async () => {
    setExportingType('pdf');
    try {
      showToast('Menyusun dokumen PDF Akademik A4 (.pdf)...', 'info');
      const ok = await exportToAcademicPdf({
        title: title || 'Naskah Akademik Skripsi',
        content
      });
      if (ok) {
        showToast('Berkas PDF Akademik (.pdf) berhasil diunduh.', 'success');
      }
    } catch {
      showToast('Gagal mengekspor berkas .pdf.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportBibtex = () => {
    setExportingType('bib');
    try {
      downloadBibTeXFile(content, title || 'daftar-pustaka');
      showToast('Berkas Sitasi BibTeX (.bib) berhasil diunduh.', 'success');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPptx = () => {
    setExportingType('pptx');
    try {
      const deck = buildThesisDefensePresentationDeck(title || 'Sidang Skripsi', content);
      exportEditablePptx({
        title: `Slide_Sidang_${title || 'Skripsi'}`,
        content: JSON.stringify(deck),
      });
      showToast('Slide Presentasi Sidang (.pptx + Speaker Notes) berhasil diunduh.', 'success');
    } catch {
      showToast('Gagal mengekspor slide .pptx.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1">
      <button
        type="button"
        disabled={exportingType !== null}
        onClick={handleExportPptx}
        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-400 transition cursor-pointer disabled:opacity-50"
        title="Ekspor Slide Presentasi Sidang Skripsi Siap Edit (.pptx) + Speaker Notes"
      >
        {exportingType === 'pptx' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Presentation className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
        <span>.PPTX Sidang</span>
      </button>

      <button
        type="button"
        disabled={exportingType !== null}
        onClick={() => void handleExportDocx()}
        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition cursor-pointer disabled:opacity-50"
        title="Ekspor ke Microsoft Word Standar Skripsi A4 4-4-3-3 (.docx)"
      >
        {exportingType === 'docx' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
        <span>.DOCX</span>
      </button>

      <button
        type="button"
        disabled={exportingType !== null}
        onClick={() => void handleExportPdf()}
        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-400 transition cursor-pointer disabled:opacity-50"
        title="Ekspor Naskah Akademik Siap Cetak A4 (.pdf)"
      >
        {exportingType === 'pdf' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-teal-600 dark:text-teal-400" />}
        <span>.PDF</span>
      </button>

      <button
        type="button"
        disabled={exportingType !== null}
        onClick={handleExportBibtex}
        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 hover:border-amber-400 transition cursor-pointer disabled:opacity-50"
        title="Ekspor Referensi ke BibTeX untuk Mendeley, Zotero, atau LaTeX (.bib)"
      >
        <BookMarked className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        <span>.BibTeX</span>
      </button>
    </div>
  );
};

