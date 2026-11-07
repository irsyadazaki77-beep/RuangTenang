import React from 'react';
import { AlertCircle, Wrench, Brain, ArrowUpRight, Copy, Check, X } from 'lucide-react';

export interface ParsedErrorLocation {
  file: string;
  line: number;
  col?: number;
}

export function parseErrorLocation(errorText: string): ParsedErrorLocation | null {
  if (!errorText) return null;
  // Patterns:
  // 1. at ... (file.js:14:5) or at file.js:14:5
  const jsMatch = /(?:at\s+(?:[^\n\r(]*\()?)?([a-zA-Z0-9_\-./\\]+\.(?:js|ts|jsx|tsx|mjs|cjs|py|html|css)):(\d+)(?::(\d+))?/i.exec(errorText);
  if (jsMatch) {
    const rawFile = jsMatch[1].replace(/^.*[/\\]/, '');
    const line = parseInt(jsMatch[2], 10);
    const col = jsMatch[3] ? parseInt(jsMatch[3], 10) : undefined;
    return { file: rawFile, line, col };
  }
  // 2. Python pattern: File "main.py", line 14
  const pyMatch = /File\s+["']([^"']+\.py)["'],\s+line\s+(\d+)/i.exec(errorText);
  if (pyMatch) {
    const rawFile = pyMatch[1].replace(/^.*[/\\]/, '');
    const line = parseInt(pyMatch[2], 10);
    return { file: rawFile, line };
  }
  return null;
}

export interface ErrorLensActionBannerProps {
  errorText: string;
  sourceCommand?: string;
  activeFilePath?: string;
  isDark?: boolean;
  onAskKiHadjar: (errorPrompt: string) => void;
  onAutoFix: (errorPrompt: string) => void;
  onNavigateToFileLine?: (file: string, line: number, col?: number) => void;
  onDismiss?: () => void;
}

export const ErrorLensActionBanner: React.FC<ErrorLensActionBannerProps> = ({
  errorText,
  sourceCommand,
  activeFilePath,
  isDark = true,
  onAskKiHadjar,
  onAutoFix,
  onNavigateToFileLine,
  onDismiss
}) => {
  const [copied, setCopied] = React.useState(false);
  const location = React.useMemo(() => parseErrorLocation(errorText), [errorText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskKiHadjar = () => {
    const prompt = `Ki Hadjar, tolong jelaskan akar masalah error berikut ${
      sourceCommand ? `saat menjalankan "${sourceCommand}"` : ''
    }${location ? ` pada berkas ${location.file} baris ${location.line}` : ''}:\n\`\`\`\n${errorText.slice(0, 500)}\n\`\`\``;
    onAskKiHadjar(prompt);
  };

  const handleAutoFix = () => {
    const prompt = `Dewan Ahli, tolong perbaiki error berikut secara presisi${
      location ? ` di berkas ${location.file}` : activeFilePath ? ` di berkas ${activeFilePath}` : ''
    }:\n\`\`\`\n${errorText.slice(0, 500)}\n\`\`\``;
    onAutoFix(prompt);
  };

  return (
    <div
      className={`mx-2 my-1.5 p-2 rounded-lg border text-xs shadow-md transition-all animate-fadeIn ${
        isDark
          ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
          : 'bg-rose-50 border-rose-200 text-rose-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>Error Lens Terdeteksi</span>
          {location && (
            <button
              type="button"
              onClick={() => onNavigateToFileLine?.(location.file, location.line, location.col)}
              className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors cursor-pointer"
              title="Buka file dan lompat ke baris error"
            >
              <span>{location.file}:{location.line}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
            title="Salin teks error"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
              title="Tutup banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-1 font-mono text-[11px] opacity-90 line-clamp-2 select-text">
        {errorText.split('\n')[0]}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleAskKiHadjar}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
        >
          <Brain className="w-3 h-3" />
          <span>Jelaskan Masalah (Ki Hadjar)</span>
        </button>
        <button
          type="button"
          onClick={handleAutoFix}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
        >
          <Wrench className="w-3 h-3" />
          <span>Perbaiki Otomatis</span>
        </button>
      </div>
    </div>
  );
};
