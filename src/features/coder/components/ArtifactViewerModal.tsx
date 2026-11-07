import React from 'react';
import { Sparkles, Layers, Download, X } from 'lucide-react';

export interface ArtifactData {
  id: string;
  title: string;
  type: 'architecture' | 'code_review' | 'test_report' | 'blueprint';
  content: string;
  createdAt: string;
  authorPersona?: string;
  recommendedAction?: string;
}

interface ArtifactViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: ArtifactData | null;
  onApplyAction?: (actionPrompt: string) => void;
}

export const ArtifactViewerModal: React.FC<ArtifactViewerModalProps> = ({
  isOpen,
  onClose,
  artifact,
  onApplyAction
}) => {
  if (!isOpen || !artifact) return null;

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{artifact.title}</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Antigravity Artifact
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Disusun oleh {artifact.authorPersona || 'Dewan Ahli AI'} • {artifact.createdAt}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs select-text leading-relaxed text-slate-300 whitespace-pre-wrap bg-slate-950/60">
          {artifact.content}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDownload}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Markdown</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Tutup
            </button>
            {artifact.recommendedAction && onApplyAction && (
              <button
                type="button"
                onClick={() => {
                  onApplyAction(artifact.recommendedAction!);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-500 to-sky-500 hover:from-purple-400 hover:to-sky-400 text-white shadow-lg shadow-purple-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Terapkan Blueprint ini</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
