import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Sparkles,
  FileCode,
  FileText,
  Eye,
  Edit3,
  ArrowUpRight,
  BarChart3,
  Radio
} from 'lucide-react';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { useToast } from '../../../components/Toast';
import {
  VisualCanvasStudio,
  NotebookLmPodcastStudio,
  AcademicQuickExportBar,
  extractMermaidBlocks,
  extractNumericTablesFromMarkdown
} from '../../workspace/components/CanvasVisualAndAudioStudio';

export interface QuickCanvasArtifact {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'code';
  language?: string;
}

interface QuickArtifactCanvasDrawerProps {
  artifact: QuickCanvasArtifact | null;
  onClose: () => void;
  onUpdateArtifact: (updated: QuickCanvasArtifact) => void;
  onRequestAiPolish?: (instruction: string, currentContent: string) => void;
  onOpenInFullWorkspace?: (artifact: QuickCanvasArtifact) => void;
}

export function extractQuickArtifactFromMessage(content: string, messageId: string): QuickCanvasArtifact | null {
  if (!content) return null;

  // 1. Check XML <artifact ...> tag
  const xmlMatch = content.match(/<artifact\s+([^>]+)>([\s\S]*?)<\/artifact>/i);
  if (xmlMatch) {
    const attrs = xmlMatch[1];
    const body = xmlMatch[2].trim();
    const titleMatch = attrs.match(/title="([^"]+)"/i);
    const typeMatch = attrs.match(/type="([^"]+)"/i);
    const langMatch = attrs.match(/language="([^"]+)"/i);
    return {
      id: `canvas_${messageId}`,
      title: titleMatch?.[1] || 'Dokumen Artefak AI',
      content: body,
      type: typeMatch?.[1]?.toLowerCase() === 'code' || Boolean(langMatch) ? 'code' : 'document',
      language: langMatch?.[1]
    };
  }

  // 2. Check directive :::artifact{...}
  const dirMatch = content.match(/:::artifact\{([^}]*)\}\s*\n([\s\S]*?):::/i);
  if (dirMatch) {
    const attrs = dirMatch[1];
    const body = dirMatch[2].trim();
    const titleMatch = attrs.match(/title="([^"]+)"/i);
    const typeMatch = attrs.match(/type="([^"]+)"/i);
    return {
      id: `canvas_${messageId}`,
      title: titleMatch?.[1] || 'Draf Dokumen Canvas',
      content: body,
      type: typeMatch?.[1]?.toLowerCase() === 'code' ? 'code' : 'document'
    };
  }

  // 3. Check substantial fenced code block (> 6 lines)
  const codeMatch = content.match(/```([a-zA-Z0-9_-]*)\n([\s\S]{140,}?)```/);
  if (codeMatch) {
    const lang = codeMatch[1] || 'kode';
    const codeBody = codeMatch[2].trim();
    if (codeBody.split('\n').length >= 5) {
      return {
        id: `canvas_${messageId}`,
        title: `Potongan Kode (${lang.toUpperCase()})`,
        content: codeBody,
        type: 'code',
        language: lang
      };
    }
  }

  // 4. Substantial structured document (> 450 chars with headings, tables, or numbered sections)
  if (content.length >= 450 && (/^#{1,3}\s+/m.test(content) || /^\d+\.\s+\*\*/m.test(content) || /\|[ \t]*:?-+:?[ \t]*\|/.test(content))) {
    const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
    return {
      id: `canvas_${messageId}`,
      title: headingMatch ? headingMatch[1].replace(/[*#`]/g, '').trim().slice(0, 60) : 'Draf Dokumen & Catatan Terstruktur',
      content: content.trim(),
      type: 'document'
    };
  }

  return null;
}

export const QuickArtifactCanvasDrawer: React.FC<QuickArtifactCanvasDrawerProps> = ({
  artifact,
  onClose,
  onUpdateArtifact,
  onRequestAiPolish,
  onOpenInFullWorkspace
}) => {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'visual' | 'podcast'>('preview');
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (artifact) {
      setDraftContent(artifact.content);
      setDraftTitle(artifact.title);
      const hasMermaid = extractMermaidBlocks(artifact.content).length > 0;
      const hasNumericTable = extractNumericTablesFromMarkdown(artifact.content).length > 0;
      if (hasMermaid && artifact.type === 'code') {
        setViewMode('visual');
      } else if (artifact.type === 'code' && !hasNumericTable) {
        setViewMode('edit');
      } else {
        setViewMode('preview');
      }
    }
  }, [artifact]);

  if (!artifact) return null;

  const wordCount = draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0;
  const lineCount = draftContent ? draftContent.split('\n').length : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(draftContent);
    setCopied(true);
    showToast('Konten Canvas disalin ke papan klip', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAppendContent = (snippet: string) => {
    const nextContent = `${draftContent.trimEnd()}\n${snippet}`;
    setDraftContent(nextContent);
    onUpdateArtifact({ ...artifact, title: draftTitle, content: nextContent });
  };

  return (
    <aside
      aria-label="Live Artifact & Interactive Canvas"
      className="w-full lg:w-[48%] xl:w-[50%] h-full shrink-0 border-l border-stone-200/85 dark:border-slate-800 bg-[#FAF8F5] dark:bg-[#0D1117] flex flex-col z-30 animate-fade-in"
    >
      {/* Top Header */}
      <div className="px-4 py-2.5 border-b border-stone-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl border border-stone-200/80 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
            {artifact.type === 'code' ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={draftTitle}
              onChange={e => {
                setDraftTitle(e.target.value);
                onUpdateArtifact({ ...artifact, title: e.target.value, content: draftContent });
              }}
              className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-slate-100 bg-transparent focus:outline-none truncate w-full"
              aria-label="Judul Artefak Canvas"
            />
            <div className="text-[11px] text-stone-400 dark:text-slate-500 font-mono tabular-nums">
              {artifact.type === 'code' ? (artifact.language || 'CODE').toUpperCase() : 'NASKAH'} · {wordCount} kata · {lineCount} baris
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 shrink-0">
          <div className="inline-flex rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-100/80 dark:bg-slate-800/80 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-2xs'
                  : 'text-stone-500 dark:text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Naskah</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'edit'
                  ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-2xs'
                  : 'text-stone-500 dark:text-slate-400'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Sunting</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'visual'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-stone-500 dark:text-slate-400'
              }`}
              title="Visual Canvas: Diagram Mermaid, Grafik Recharts, & Pratinjau UI"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Visual</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('podcast')}
              className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'podcast'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs'
                  : 'text-stone-500 dark:text-slate-400'
              }`}
              title="Studio Audio Overview 2 Host (Dr. Rina & Raka) ala NotebookLM"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Audio 2 Host</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Salin isi Canvas"
            aria-label="Salin isi Canvas"
          >
            {copied ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Canvas"
            aria-label="Tutup Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: Preview, Editor, Visual Canvas, or NotebookLM Podcast Studio */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
        {viewMode === 'edit' ? (
          <textarea
            value={draftContent}
            onChange={e => {
              setDraftContent(e.target.value);
              onUpdateArtifact({ ...artifact, title: draftTitle, content: e.target.value });
            }}
            spellCheck={false}
            className="w-full h-full min-h-[380px] bg-white dark:bg-slate-900/90 border border-stone-200/80 dark:border-slate-800 rounded-2xl p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-stone-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none"
          />
        ) : viewMode === 'visual' ? (
          <VisualCanvasStudio
            title={draftTitle || 'Visualisasi Naskah'}
            content={draftContent}
            onAppendContent={handleAppendContent}
          />
        ) : viewMode === 'podcast' ? (
          <NotebookLmPodcastStudio
            artifactId={artifact.id}
            artifactTitle={draftTitle || 'Naskah Akademik'}
            sourceContent={draftContent}
            onAppendTranscriptToCanvas={md => {
              handleAppendContent(md);
              setViewMode('preview');
            }}
          />
        ) : (
          <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800/90 bg-white dark:bg-slate-900/80 p-5 sm:p-7 prose prose-stone dark:prose-invert max-w-[65ch] mx-auto text-sm leading-relaxed font-serif">
            {artifact.type === 'code' ? (
              <pre className="font-mono text-xs overflow-x-auto">
                <code>{draftContent}</code>
              </pre>
            ) : (
              <LazyMarkdown content={draftContent} />
            )}
          </div>
        )}
      </div>

      {/* Bottom AI Polish, Full Academic Export (.DOCX / .PDF / .BibTeX) & Unified Workspace Bridge Bar */}
      <div className="px-4 py-2.5 border-t border-stone-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <AcademicQuickExportBar
            title={draftTitle || 'Naskah Akademik Skripsi'}
            content={draftContent}
          />

          {onRequestAiPolish && (
            <button
              type="button"
              onClick={() => onRequestAiPolish('Ubah ke gaya akademik baku (PUEBI) lengkap dengan sitasi dan struktur sub-bab', draftContent)}
              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-slate-700 hover:border-teal-400 text-[11px] font-medium text-stone-700 dark:text-slate-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>Polemik & Poles Ilmiah</span>
            </button>
          )}
        </div>

        {onOpenInFullWorkspace && (
          <button
            type="button"
            onClick={() => onOpenInFullWorkspace({ ...artifact, title: draftTitle, content: draftContent })}
            className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Buka di Studio RuangKerja</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
};

