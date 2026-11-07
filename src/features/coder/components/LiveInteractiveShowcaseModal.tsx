import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  Check,
  X,
  Code2,
  Download
} from 'lucide-react';
import { generateStandaloneShowcaseHtml } from '../../../__tests__/unit/liveShowcaseEngine.test';

interface LiveInteractiveShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sourceCode: string;
}

export const LiveInteractiveShowcaseModal: React.FC<LiveInteractiveShowcaseModalProps> = ({
  isOpen,
  onClose,
  title,
  sourceCode
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const standaloneHtml = generateStandaloneShowcaseHtml({
    title,
    codeOrData: sourceCode
  });

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(standaloneHtml);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_showcase.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile': return 'max-w-[375px]';
      case 'tablet': return 'max-w-[768px]';
      default: return 'w-full';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Live Showcase & Demo Skripsi: {title}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300">
                  Interactive Web Sandbox
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Uji langsung modul web/simulasi hasil komputasi tugas akhir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport switch */}
            <div className="hidden sm:inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`p-1.5 rounded-md ${viewport === 'desktop' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                className={`p-1.5 rounded-md ${viewport === 'tablet' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                title="Tablet View"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`p-1.5 rounded-md ${viewport === 'mobile' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                title="Mobile View"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Tersalin!' : 'Salin HTML'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Demo</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sandbox Canvas */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center overflow-auto">
          <div className={`h-full ${getViewportWidth()} transition-all duration-200 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col`}>
            <iframe
              title="Showcase Preview"
              srcDoc={standaloneHtml}
              sandbox="allow-scripts"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
