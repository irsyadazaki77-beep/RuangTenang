import React, { useState, useMemo } from 'react';
import {
  X,
  BarChart2,
  Download,
  Copy,
  Check,
  Sparkles,
  FileText,
  Table as TableIcon,
  Plus,
  ArrowRight
} from 'lucide-react';
import {
  parseDataToDataset,
  generateSvgChart,
  generateStatisticalNarrative,
  compileChartToCanvasArtifact,
  ChartConfig,
  ChartType,
  AcademicColorPalette,
  PALETTES,
  ParsedDataset
} from '../utils/dataStudioChartEngine';

export interface DataStudioChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInjectChart: (markdown: string) => void;
  isDark?: boolean;
}

const DEFAULT_SAMPLE_DATA = `Kategori, Nilai_Performa, Waktu_Komputasi_ms
Sampel A, 78.5, 120
Sampel B, 84.2, 115
Sampel C, 89.0, 110
Sampel D, 92.4, 98
Sampel E, 95.8, 92
Sampel F, 96.1, 90`;

export const DataStudioChartModal: React.FC<DataStudioChartModalProps> = ({
  isOpen,
  onClose,
  onInjectChart,
  isDark = true
}) => {
  const [rawInput, setRawInput] = useState<string>(DEFAULT_SAMPLE_DATA);
  const [activeTab, setActiveTab] = useState<'chart' | 'narrative' | 'table'>('chart');
  const [copied, setCopied] = useState<boolean>(false);
  const [isInserted, setIsInserted] = useState<boolean>(false);

  // Configuration state
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [palette, setPalette] = useState<AcademicColorPalette>('emerald');
  const [figureNumber, setFigureNumber] = useState<string>('Gambar 4.1');
  const [title, setTitle] = useState<string>('Evaluasi Kinerja Model Berdasarkan Variasi Sampel Data');
  const [unit, setUnit] = useState<string>('%');
  const [researchContext, setResearchContext] = useState<string>('');

  const dataset: ParsedDataset = useMemo(() => {
    return parseDataToDataset(rawInput);
  }, [rawInput]);

  const [xColumn, setXColumn] = useState<string>('');
  const [yColumn, setYColumn] = useState<string>('');

  // Auto-select columns on dataset change
  React.useEffect(() => {
    if (dataset.columns.length > 0) {
      if (!xColumn || !dataset.columns.includes(xColumn)) {
        setXColumn(dataset.categoricalColumns[0] || dataset.columns[0]);
      }
      if (!yColumn || !dataset.columns.includes(yColumn)) {
        setYColumn(dataset.numericColumns[0] || dataset.columns[1] || dataset.columns[0]);
      }
    }
  }, [dataset, xColumn, yColumn]);

  const chartConfig: ChartConfig = useMemo(() => {
    return {
      title,
      figureNumber,
      chartType,
      xColumn: xColumn || (dataset.columns[0] ?? ''),
      yColumn: yColumn || (dataset.columns[1] ?? dataset.columns[0] ?? ''),
      palette,
      xLabel: xColumn || 'Kategori Uji',
      yLabel: yColumn || 'Nilai Pengukuran',
      unit,
      researchContext: researchContext.trim() || undefined
    };
  }, [title, figureNumber, chartType, xColumn, yColumn, palette, unit, researchContext, dataset.columns]);

  const svgContent = useMemo(() => {
    return generateSvgChart(dataset, chartConfig);
  }, [dataset, chartConfig]);

  const narrativeText = useMemo(() => {
    return generateStatisticalNarrative(dataset, chartConfig);
  }, [dataset, chartConfig]);

  if (!isOpen) return null;

  const handleCopyNarrative = () => {
    navigator.clipboard.writeText(narrativeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${figureNumber.replace(/\s+/g, '_')}_Grafik.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInsert = () => {
    const fullMarkdown = compileChartToCanvasArtifact(dataset, chartConfig, svgContent);
    onInjectChart(fullMarkdown);
    setIsInserted(true);
    setTimeout(() => {
      onClose();
      setIsInserted(false);
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Data Studio & Visualisasi Grafik Skripsi (Bab 4)</h2>
                <span className="px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Statistical Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ubah data tabel/CSV menjadi grafik visual vektor ilmiah dan narasi pembahasan statistik siap kutip.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInsert}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
            >
              {isInserted ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Disisipkan!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Sisipkan ke Dokumen Skripsi</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Unduh Grafik Vektor (SVG)"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Body: 2 Columns */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Kolom Kiri: Input Data & Konfigurasi Parameter (Lebar ~360px) */}
          <div
            className={`w-full md:w-[380px] p-5 border-r overflow-y-auto space-y-4 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            {/* Input Data Mentah */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Data Mentah (CSV / Markdown):</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {dataset.rows.length} baris terdeteksi
                </span>
              </label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={5}
                placeholder="Tempel CSV atau Markdown Table di sini..."
                className={`w-full font-mono text-[11px] p-2.5 rounded-lg border focus:outline-hidden ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 focus:border-emerald-500 text-slate-200'
                    : 'bg-white border-slate-300 focus:border-emerald-500 text-slate-800'
                }`}
              />
            </div>

            {/* Pemilihan Kolom Sumbu */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Sumbu X (Kategori):</label>
                <select
                  value={xColumn}
                  onChange={(e) => setXColumn(e.target.value)}
                  className={`w-full text-xs p-1.5 rounded-md border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {dataset.columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Sumbu Y (Nilai):</label>
                <select
                  value={yColumn}
                  onChange={(e) => setYColumn(e.target.value)}
                  className={`w-full text-xs p-1.5 rounded-md border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {dataset.columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipe Grafik */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400">Model Visualisasi:</label>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: 'bar', label: 'Bar' },
                  { id: 'line', label: 'Line' },
                  { id: 'area', label: 'Area' },
                  { id: 'scatter', label: 'Titik' },
                  { id: 'pie', label: 'Pie' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChartType(item.id as ChartType)}
                    className={`py-1.5 rounded-md text-[11px] font-medium border text-center cursor-pointer transition-colors ${
                      chartType === item.id
                        ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Palet Warna Akademik */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400">Palet Warna Akademik:</label>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(PALETTES) as AcademicColorPalette[]).map((key) => {
                  const p = PALETTES[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPalette(key)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        palette === key
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{p.name}</span>
                      <div className="flex gap-1">
                        {p.fills.slice(0, 4).map((c, i) => (
                          <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nomor & Judul Gambar */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10.5px] font-semibold text-slate-400">No. Gambar:</label>
                  <input
                    type="text"
                    value={figureNumber}
                    onChange={(e) => setFigureNumber(e.target.value)}
                    className={`w-full text-xs px-2 py-1 rounded-md border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10.5px] font-semibold text-slate-400">Satuan Nilai (Unit):</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="%, ms, unit..."
                    className={`w-full text-xs px-2 py-1 rounded-md border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-semibold text-slate-400">Judul Gambar / Grafik:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full text-xs px-2 py-1 rounded-md border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-semibold text-slate-400">Konteks Penelitian (Opsional):</label>
                <input
                  type="text"
                  value={researchContext}
                  onChange={(e) => setResearchContext(e.target.value)}
                  placeholder="Contoh: Klasifikasi Sentimen Opini Publik..."
                  className={`w-full text-xs px-2 py-1 rounded-md border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Pratinjau Grafik, Narasi Statistik & Tabel */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Tab Navigation */}
            <div
              className={`px-6 py-2.5 border-b flex items-center justify-between shrink-0 ${
                isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1 bg-slate-800/40 dark:bg-slate-950/60 p-0.5 rounded-lg border border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setActiveTab('chart')}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeTab === 'chart'
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Grafik Visual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('narrative')}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeTab === 'narrative'
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pembahasan Bab IV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeTab === 'table'
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Tabel Data</span>
                </button>
              </div>

              {activeTab === 'narrative' && (
                <button
                  type="button"
                  onClick={handleCopyNarrative}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Tersalin' : 'Salin Narasi'}</span>
                </button>
              )}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'chart' && (
                <div className="space-y-4 flex flex-col items-center justify-center min-h-full">
                  <div
                    className="p-4 bg-white rounded-xl shadow-lg border border-slate-200 max-w-full overflow-x-auto flex flex-col items-center"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                  />
                  <p className="text-xs text-slate-400 italic text-center">
                    {figureNumber}: {title} (Format Vektor SVG Siap Cetak Resolusi Tinggi)
                  </p>
                </div>
              )}

              {activeTab === 'narrative' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div className="p-5 rounded-xl border bg-slate-950/60 border-slate-800 text-slate-200 text-xs leading-relaxed font-serif whitespace-pre-wrap select-text">
                    {narrativeText}
                  </div>
                </div>
              )}

              {activeTab === 'table' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-300 border-b border-slate-800 font-semibold">
                        <tr>
                          {dataset.columns.map((c) => (
                            <th key={c} className="px-3.5 py-2">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {dataset.rows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            {dataset.columns.map((c) => (
                              <td key={c} className="px-3.5 py-2 font-mono text-slate-300">
                                {String(r[c] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Format tabel dan penomoran gambar diselaraskan dengan Pedoman Skripsi.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInsert}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Sisipkan ke Dokumen Skripsi</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
