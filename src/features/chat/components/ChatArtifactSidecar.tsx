import React, { useState, useCallback, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Code2,
  Eye,
  Edit3,
  ExternalLink,
  Maximize2,
  Minimize2,
  FileText
} from 'lucide-react';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { renderHighlightedCode } from '../../../lib/codeHighlight';
import { getCoderFileName, stageCodeForCoder } from '../../../components/common/OpenInCoderButton';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import { safeLocalStorage } from '../../../lib/storage';

export interface ChatSidecarArtifact {
  title: string;
  content: string;
  language?: string;
}

interface Props {
  artifact: ChatSidecarArtifact | null;
  onClose: () => void;
  onUpdateContent?: (newContent: string) => void;
  onSendToFullWorkspace?: (content: string, title: string) => void;
}

/** Extracts the primary fenced code block if present, otherwise returns markdown document metadata. */
export function inspectArtifactContent(raw: string): {
  kind: 'html' | 'svg' | 'code' | 'markdown';
  language: string;
  extractedCode: string;
} {
  const fenceMatch = raw.match(/```([\w-]+)?\n([\s\S]*?)```/);
  if (fenceMatch) {
    const lang = (fenceMatch[1] || '').toLowerCase();
    const body = fenceMatch[2].trim();
    if (lang === 'html' || (body.startsWith('<') && body.includes('</'))) {
      return { kind: 'html', language: 'html', extractedCode: body };
    }
    if (lang === 'svg' || body.startsWith('<svg')) {
      return { kind: 'svg', language: 'svg', extractedCode: body };
    }
    if (lang && lang !== 'markdown' && lang !== 'md' && lang !== 'text') {
      return { kind: 'code', language: lang, extractedCode: body };
    }
  }
  return { kind: 'markdown', language: 'markdown', extractedCode: raw };
}

export const ChatArtifactSidecar: React.FC<Props> = React.memo(({
  artifact,
  onClose,
  onUpdateContent,
  onSendToFullWorkspace
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'source' | 'edit'>('preview');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sidecarWidth, setSidecarWidth] = useState<number>(() => {
    try {
      const saved = Number(safeLocalStorage.getItem('ruangtenang_sidecar_width'));
      if (saved && saved >= 380 && saved <= 960) return saved;
    } catch {}
    return 520;
  });
  const [isResizing, setIsResizing] = useState(false);
  const inRouter = useInRouterContext();
  const navigate = useNavigate();

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(380, Math.min(window.innerWidth * 0.7, window.innerWidth - e.clientX));
      setSidecarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        safeLocalStorage.setItem('ruangtenang_sidecar_width', String(sidecarWidth));
      } catch {}
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidecarWidth]);

  const inspected = useMemo(
    () => inspectArtifactContent(artifact?.content || ''),
    [artifact?.content]
  );

  const handleCopy = useCallback(async () => {
    if (!artifact) return;
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [artifact]);

  const handleDownload = useCallback(() => {
    if (!artifact) return;
    const ext =
      inspected.kind === 'html'
        ? 'html'
        : inspected.kind === 'svg'
        ? 'svg'
        : getCoderFileName(inspected.language)?.split('.').pop() || 'md';
    const blob = new Blob([inspected.kind === 'markdown' ? artifact.content : inspected.extractedCode], {
      type: 'text/plain;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'artefak'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [artifact, inspected]);

  const handleOpenInCoder = useCallback(() => {
    if (!artifact) return;
    const fileName = getCoderFileName(inspected.language) || 'index.html';
    try {
      stageCodeForCoder(
        inspected.kind === 'markdown' ? artifact.content : inspected.extractedCode,
        fileName
      );
      if (inRouter) navigate('/coder');
    } catch {
      /* ignore */
    }
  }, [artifact, inspected, inRouter, navigate]);

  if (!artifact) return null;

  return (
    <aside
      aria-label="Panel Artefak Canvas"
      style={!isExpanded && typeof window !== 'undefined' && window.innerWidth >= 1024 ? { width: `${sidecarWidth}px` } : undefined}
      className={`relative flex flex-col border-l border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#14171f]/95 backdrop-blur-xl shadow-2xl transition-all duration-150 z-30 select-${isResizing ? 'none' : 'auto'} ${
        isExpanded
          ? 'fixed inset-0 w-full h-full'
          : 'fixed inset-y-0 right-0 w-full sm:w-[460px] lg:static shrink-0 h-full'
      }`}
    >
      {/* Dynamic Desktop Resize Handle */}
      {!isExpanded && (
        <div
          onMouseDown={startResizing}
          title="Geser untuk mengubah lebar canvas"
          aria-label="Ubah lebar canvas"
          role="separator"
          aria-orientation="vertical"
          className={`hidden lg:flex items-center justify-center absolute left-0 top-0 bottom-0 w-2.5 -translate-x-1.5 cursor-col-resize z-40 group hover:bg-teal-500/20 active:bg-teal-500/30 transition-colors ${
            isResizing ? 'bg-teal-500/30 ring-1 ring-teal-500/40' : ''
          }`}
        >
          <div className="w-0.5 h-8 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-teal-500 transition-colors" />
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
              {artifact.title}
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 dark:text-teal-400">
              {inspected.kind === 'markdown' ? 'Dokumen Canvas' : `Artefak ${inspected.language.toUpperCase()}`}
            </span>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-lg text-[11px] font-medium shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Pratinjau</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('source')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'source'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Sumber</span>
          </button>
          {onUpdateContent && (
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={isExpanded ? 'Perkecil Panel' : 'Layar Penuh'}
            aria-label={isExpanded ? 'Perkecil Panel' : 'Layar Penuh'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Tutup Canvas"
            aria-label="Tutup Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
        {activeTab === 'preview' && (
          inspected.kind === 'html' || inspected.kind === 'svg' ? (
            <div className="w-full h-full min-h-[380px] rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white">
              <iframe
                title={artifact.title}
                sandbox="allow-scripts"
                srcDoc={inspected.extractedCode}
                className="w-full h-full min-h-[420px] border-0"
              />
            </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed">
              <LazyMarkdown content={artifact.content} />
            </div>
          )
        )}

        {activeTab === 'source' && (
          <div className="rounded-xl border border-slate-800 bg-[#0f141f] text-slate-100 p-4 overflow-x-auto text-xs font-mono leading-relaxed">
            <pre className="m-0">
              <code>
                {renderHighlightedCode(
                  inspected.kind === 'markdown' ? artifact.content : inspected.extractedCode,
                  inspected.language
                )}
              </code>
            </pre>
          </div>
        )}

        {activeTab === 'edit' && onUpdateContent && (
          <textarea
            aria-label="Editor Konten Artefak"
            value={artifact.content}
            onChange={e => onUpdateContent(e.target.value)}
            className="w-full h-full min-h-[380px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/80 p-3.5 text-xs sm:text-sm font-mono leading-relaxed text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none"
          />
        )}
      </div>

      {/* Footer Quick-Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {inRouter && (
            <button
              type="button"
              onClick={handleOpenInCoder}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600/10 hover:bg-sky-600/20 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-medium transition-colors cursor-pointer"
              title="Buka di RuangCoder IDE"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>RuangCoder</span>
            </button>
          )}
          {onSendToFullWorkspace && (
            <button
              type="button"
              onClick={() => onSendToFullWorkspace(artifact.content, artifact.title)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium transition-colors cursor-pointer shadow-2xs"
              title="Lanjutkan di Studio RuangKerja Penuh"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di RuangKerja</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
});

ChatArtifactSidecar.displayName = 'ChatArtifactSidecar';

