import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
  FileCode,
  GitBranch,
  Clock,
  HardDrive,
  Download,
  Send,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  analyzeCodeForMethodology,
  CodeMethodologyAnalysis
} from '../services/codeMethodologyExplainer';
import { MermaidRenderer } from '../../workspace/components/MermaidRenderer';

export interface CodeMethodologyExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  filename: string;
  isDark?: boolean;
  onSendToRuangKerja?: (payload: { title: string; content: string; type: string }) => void;
}

export type MethodologyTab = 'summary' | 'bab3' | 'bab4' | 'full';

export const CodeMethodologyExplainerModal: React.FC<CodeMethodologyExplainerModalProps> = ({
  isOpen,
  onClose,
  code,
  filename,
  isDark = true,
  onSendToRuangKerja
}) => {
  const navigate = useNavigate();
  const [thesisContext, setThesisContext] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MethodologyTab>('summary');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSent, setIsSent] = useState<boolean>(false);

  const analysis: CodeMethodologyAnalysis = useMemo(() => {
    return analyzeCodeForMethodology({
      code,
      filename,
      thesisContext: thesisContext.trim() || undefined
    });
  }, [code, filename, thesisContext]);

  if (!isOpen) return null;

  const currentTabContent = () => {
    switch (activeTab) {
      case 'bab3':
        return analysis.bab3Narrative;
      case 'bab4':
        return analysis.bab4Narrative;
      case 'full':
        return analysis.fullThesisArtifact;
      default:
        return analysis.fullThesisArtifact;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTabContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([analysis.fullThesisArtifact], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bab3_Bab4_${filename.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendToRuangKerja = () => {
    const payload = {
      title: `Draf Bab 3 & 4: ${filename}`,
      content: analysis.fullThesisArtifact,
      type: 'DOCUMENT'
    };

    try {
      sessionStorage.setItem('coder_to_ruangkerja_bridge', JSON.stringify(payload));
    } catch (e) {
      console.warn('Gagal menyimpan payload bridge ke sessionStorage:', e);
    }

    if (onSendToRuangKerja) {
      onSendToRuangKerja(payload);
    }

    setIsSent(true);
    setTimeout(() => {
      onClose();
      navigate('/workspace');
    }, 400);
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
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Bedah Metodologi Skripsi (Bab 3 & 4)</h2>
                <span className="px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Code-to-Thesis AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transformasi kode <span className="font-mono text-sky-400">{filename}</span> menjadi naskah akademik Bab 3 (Desain & Algoritma) dan Bab 4 (Pembahasan & Efisiensi).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendToRuangKerja}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-md shadow-sky-600/20 cursor-pointer transition-all"
              title="Kirim draf ini langsung ke naskah skripsi di RuangKerja Canvas"
            >
              {isSent ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Terkirim!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim ke Skripsi di RuangKerja</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Tab'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Unduh Berkas Markdown"
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

        {/* Sub-bar: Konteks Skripsi & Navigation Tabs */}
        <div
          className={`px-6 py-2.5 border-b flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          {/* Konteks Judul/Topik Penelitian */}
          <div className="w-full md:w-auto flex-1 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Topik Skripsi:</span>
            <input
              type="text"
              value={thesisContext}
              onChange={(e) => setThesisContext(e.target.value)}
              placeholder="Contoh: Sistem Klasifikasi Sentimen Teks Menggunakan Naive Bayes..."
              className={`w-full text-xs px-2.5 py-1 rounded-md border focus:outline-hidden transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-700 focus:border-sky-500 text-slate-200'
                  : 'bg-white border-slate-300 focus:border-sky-500 text-slate-800'
              }`}
            />
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-800/40 dark:bg-slate-950/60 p-0.5 rounded-lg border border-slate-700/50 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'summary'
                  ? 'bg-sky-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Ringkasan & Big-O</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bab3')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'bab3'
                  ? 'bg-sky-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitBranch className="w-3 h-3" />
              <span>Bab 3: Metodologi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bab4')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'bab4'
                  ? 'bg-sky-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Bab 4: Pembahasan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('full')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === 'full'
                  ? 'bg-sky-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3 h-3" />
              <span>Naskah Lengkap</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'summary' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Kompleksitas Waktu</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {analysis.complexity.timeComplexity}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Estimasi Big-O asimtotik</p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span>Kompleksitas Ruang</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {analysis.complexity.spaceComplexity}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Penggunaan alokasi memori</p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <GitBranch className="w-4 h-4 text-sky-400" />
                    <span>Kedalaman Loop</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-sky-400">
                    {analysis.complexity.maxLoopDepth} Tingkat
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {analysis.complexity.hasRecursion ? 'Mengandung rekursi aktif' : 'Struktur iteratif murni'}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span>Bahasa Sumber</span>
                  </div>
                  <div className="text-xl font-bold capitalize text-indigo-400">
                    {analysis.language}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {analysis.libraries.length > 0 ? `${analysis.libraries.length} modul/pustaka` : 'Standard library'}
                  </p>
                </div>
              </div>

              {/* Justifikasi Kompleksitas */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Justifikasi Ilmiah Kompleksitas Algoritma
                </h4>
                <p className="text-sm leading-relaxed text-slate-300">
                  {analysis.complexity.justification}
                </p>
              </div>

              {/* Dependensi Pustaka & Komponen */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Daftar Pustaka & Paket Komputasi Pendukung
                </h4>
                {analysis.libraries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.libraries.map((lib, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono font-medium"
                      >
                        {lib}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Modul ini tidak mengimpor dependensi eksternal, seluruh logika dibangun berbasis pustaka inti (built-in primitives).
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bab3' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-sky-400">
                    Bab III: Metodologi Penelitian & Perancangan Algoritma
                  </h3>
                  <p className="text-xs text-slate-400">
                    Draf perancangan sistem, diagram alur data, dan pseudocode formal siap dikutip pada naskah skripsi.
                  </p>
                </div>

                {/* Flowchart Visualizer */}
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    Gambar 3.1: Diagram Alur Logika Algoritma (Flowchart)
                  </h4>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-center overflow-auto min-h-[220px]">
                    <MermaidRenderer chart={analysis.flowchart} title="Flowchart Bab 3" />
                  </div>
                </div>

                {/* Pseudocode IEEE Format */}
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-sky-400" />
                      Algoritma 3.1: Pseudocode Standar IEEE
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(analysis.pseudocode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Salin Pseudocode</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-slate-950 text-sky-200 font-mono text-xs overflow-x-auto border border-slate-800 whitespace-pre leading-relaxed">
                    {analysis.pseudocode}
                  </pre>
                </div>

                {/* Narasi Lengkap Bab 3 */}
                <div className={`p-5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                  <h4 className="text-xs font-bold text-slate-300">Draf Teks Narasi Bab 3 (Untuk disalin ke Skripsi):</h4>
                  <div className="text-xs text-slate-300 font-serif leading-relaxed whitespace-pre-wrap select-text bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    {analysis.bab3Narrative}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bab4' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-sky-400">
                    Bab IV: Hasil Penelitian, Efisiensi Komputasi & Pembahasan
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pembahasan analisis kompleksitas asimtotik, justifikasi kinerja algoritma, dan matriks pengujian empiris.
                  </p>
                </div>

                {/* Narasi Lengkap Bab 4 */}
                <div className={`p-5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                  <h4 className="text-xs font-bold text-slate-300">Draf Teks Narasi Bab 4 (Untuk disalin ke Skripsi):</h4>
                  <div className="text-xs text-slate-300 font-serif leading-relaxed whitespace-pre-wrap select-text bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    {analysis.bab4Narrative}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'full' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-sky-400">
                  Pratinjau Lengkap Dokumen Skripsi (Canvas Ready)
                </h3>
                <p className="text-xs text-slate-400">
                  Seluruh naskah Bab 3 & Bab 4 yang akan disuntikkan secara otomatis ke RuangKerja Canvas.
                </p>
              </div>

              <div className="p-5 rounded-xl border bg-slate-950 border-slate-800">
                <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-text">
                  {analysis.fullThesisArtifact}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Format naskah disesuaikan dengan Pedoman Penulisan Skripsi & Standar IEEE.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendToRuangKerja}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-md shadow-sky-600/20 cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim & Buka di RuangKerja Canvas</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
