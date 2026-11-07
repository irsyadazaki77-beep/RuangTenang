import React, { useState } from 'react';
import { GitFork, Copy, Check, X, Brain } from 'lucide-react';
import { generateCodeFlowchart } from '../services/flowchartGenerator';
import { MermaidRenderer } from '../../workspace/components/MermaidRenderer';

export interface CodeFlowchartModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  filename: string;
  onAskKiHadjar?: (prompt: string) => void;
  isDark?: boolean;
}

export const CodeFlowchartModal: React.FC<CodeFlowchartModalProps> = ({
  isOpen,
  onClose,
  code,
  filename,
  onAskKiHadjar,
  isDark = true
}) => {
  const [copied, setCopied] = useState(false);
  const chartCode = React.useMemo(() => generateCodeFlowchart(code, filename), [code, filename]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(chartCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskDefenseQuestions = () => {
    const prompt = `Ki Hadjar, tolong bertindak sebagai Dosen Penguji Sidang Responsi Praktikum. Berdasarkan diagram alur dan kode pada berkas "${filename}", berikan 3 pertanyaan kritis seputar logika algoritma, alur percabangan, dan potensi edge cases untuk menguji pemahaman saya!`;
    onAskKiHadjar?.(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-3xl rounded-xl border shadow-2xl flex flex-col overflow-hidden max-h-[90vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Visualisasi Diagram Alur Logika (Flowchart)</h3>
              <p className="text-[11px] text-slate-400">Berkas: <span className="font-mono text-sky-400">{filename}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Mermaid'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagram Area */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center min-h-[350px] bg-slate-950/30">
          <div className="w-full h-full flex items-center justify-center">
            <MermaidRenderer chart={chartCode} title={`Flowchart - ${filename}`} />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`px-4 py-2.5 border-t flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={handleAskDefenseQuestions}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Simulasi Pertanyaan Sidang (Ki Hadjar)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
