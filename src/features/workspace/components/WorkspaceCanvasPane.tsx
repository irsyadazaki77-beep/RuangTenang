import React, { Suspense, useState, useMemo } from 'react';
import {
  FileText,
  FileCode,
  Quote,
  ListTree,
  FilePlus,
  X,
  Search,
  ChevronDown,
  BarChart3,
  Table2
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { WorkspaceArtifact, ArtifactType, WorkspaceTab, WorkspaceArtifactSelection, ArtifactPatch, WorkspaceChapterScope } from '../types';
import { CHAPTER_SCOPE_LABELS, inferArtifactChapterScope } from '../utils/workspaceContext';
import { WorkspaceToolDefinition } from '../tools/toolTypes';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';

const ArtifactCanvas = React.lazy(() => import('./ArtifactCanvas').then(module => ({ default: module.ArtifactCanvas })));

function CanvasLoadingFallback() {
  return <div className="flex min-h-40 flex-1 items-center justify-center text-xs text-slate-500" role="status">Memuat Canvas…</div>;
}

function ProposalPreview({ proposal, onDismiss }: {
  proposal: { title: string; type: ArtifactType; content: string; language?: string };
  onDismiss?: () => void;
}) {
  const isPresentation = proposal.language === 'presentation' || (proposal.content.includes('"format": "ruangtenang-presentation-v1"') || proposal.content.includes('"format":"ruangtenang-presentation-v1"'));
  const isTable = proposal.type === 'TABLE' || proposal.content.includes('"type": "table"') || proposal.content.includes('"type":"table"');

  let tableData: { title?: string; columns: string[]; rows: Array<Record<string, unknown>> } | null = null;
  if (isTable) {
    try {
      const parsed = JSON.parse(proposal.content);
      if (parsed.type === 'table' && Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
        tableData = parsed;
      }
    } catch {
      // Fallback to table markdown or raw
    }
  }

  let deckData: { format: string; theme?: string; slides: Array<{ title: string; body: string; notes?: string }> } | null = null;
  if (isPresentation) {
    try {
      const parsed = JSON.parse(proposal.content);
      if (parsed.format === 'ruangtenang-presentation-v1' && Array.isArray(parsed.slides)) {
        deckData = parsed;
      }
    } catch {
      // Fallback
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="Preview proposal Agent">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Proposal Agent · belum disimpan
          </p>
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {proposal.title}
          </h3>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">
            {proposal.type}{proposal.language ? ` · ${proposal.language}` : ''} · Tinjau dan setujui di panel Rencana untuk menyimpan ke Canvas
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-amber-100 dark:text-slate-200 dark:hover:bg-amber-900/40 shadow-3xs cursor-pointer"
          >
            Kembali ke Canvas
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {deckData ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Slide Deck ({deckData.slides.length} slide)</span>
              <span className="text-[11px] uppercase tracking-wider font-mono">Tema: {deckData.theme || 'academic_minimal'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deckData.slides.map((s, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>Slide {idx + 1}</span>
                    <span className="truncate max-w-[200px]">{s.title}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.title}</h4>
                  <pre className="text-xs whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    {s.body}
                  </pre>
                  {s.notes && (
                    <p className="text-[10px] text-slate-500 italic border-l-2 border-emerald-500 pl-2">
                      Catatan: {s.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : tableData ? (
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {tableData.title || proposal.title} ({tableData.rows.length} baris · {tableData.columns.length} kolom)
              </span>
              <span className="text-[11px]">Format: Structured Table JSON</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    {tableData.columns.map(col => (
                      <th key={col} className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tableData.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {tableData!.columns.map(col => (
                        <td key={col} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="prose dark:prose-invert max-w-4xl mx-auto text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            <LazyMarkdown content={proposal.content} />
          </div>
        )}
      </div>
    </section>
  );
}

interface WorkspaceCanvasPaneProps {
  artifacts: WorkspaceArtifact[];
  activeArtifact: WorkspaceArtifact | null;
  proposalPreview?: { taskId: string; title: string; type: ArtifactType; content: string; language?: string } | null;
  onDismissProposalPreview?: () => void;
  draftContent?: string;
  draftBaseVersion?: number;
  draftBaseUpdatedAt?: string;
  scrollStorageKey?: string;
  activeArtifactId: string;
  isCanvasOpen: boolean;
  isCanvasExpanded: boolean;
  isStreaming: boolean;
  isCreatingArtifact?: boolean;
  hasWorkspaceChat?: boolean;
  mobileActiveTab: WorkspaceTab;
  onSelectArtifact: (id: string) => void;
  onCloseCanvas: () => void;
  onToggleExpand: () => void;
  onUpdateActiveArtifact: (updated: Partial<WorkspaceArtifact>) => void;
  onSaveArtifact: (content: string, title?: string, createVersionSnapshot?: boolean, expectedUpdatedAt?: string, expectedVersion?: number) => Promise<unknown> | unknown;
  onRollbackVersion: (targetVersion: number) => Promise<void> | void;
  onRequestRevision: (revisionPrompt: string, currentArtifact: WorkspaceArtifact) => void;
  onSelectTool?: (tool: WorkspaceToolDefinition, currentArtifact: WorkspaceArtifact) => void;
  onCreateNewArtifact: (type: ArtifactType) => void;
  onSetMobileActiveTab: (tab: WorkspaceTab) => void;
  onDuplicateArtifact?: (id: string) => Promise<void> | void;
  onDeleteArtifact?: (id: string) => Promise<void> | void;
  onSelectedTextChange?: (text: string) => void;
  onSelectionChange?: (selection: WorkspaceArtifactSelection | null) => void;
  onRequestInlineEdit?: (selection: WorkspaceArtifactSelection, instruction: string, currentArtifact: WorkspaceArtifact) => void;
  inlineEditPatch?: ArtifactPatch | null;
  onDismissInlineEdit?: () => void;
  onDraftContentChange?: (artifactId: string, content: string, baseVersion: number, baseUpdatedAt?: string) => void;
  revisionCommit?: { artifactId: string; content: string; version: number } | null;
  activeChapterScope?: WorkspaceChapterScope;
  onChangeChapterScope?: (scope: WorkspaceChapterScope) => void;
  onCreateChapterArtifact?: (scope: WorkspaceChapterScope) => void;
}

const CHAPTER_SCOPES: WorkspaceChapterScope[] = ['ALL', 'BAB_1', 'BAB_2', 'BAB_3', 'BAB_4', 'BAB_5', 'LAMPIRAN'];

export const WorkspaceCanvasPane: React.FC<WorkspaceCanvasPaneProps> = React.memo(({
  artifacts,
  activeArtifact,
  proposalPreview = null,
  onDismissProposalPreview,
  draftContent,
  draftBaseVersion,
  draftBaseUpdatedAt,
  scrollStorageKey,
  activeArtifactId,
  isCanvasOpen,
  isCanvasExpanded,
  isStreaming,
  isCreatingArtifact = false,
  hasWorkspaceChat = false,
  mobileActiveTab,
  onSelectArtifact,
  onCloseCanvas,
  onToggleExpand,
  onUpdateActiveArtifact,
  onSaveArtifact,
  onRollbackVersion,
  onRequestRevision,
  onSelectTool,
  onCreateNewArtifact,
  onSetMobileActiveTab,
  onDuplicateArtifact,
  onDeleteArtifact,
  onSelectedTextChange,
  onSelectionChange,
  onRequestInlineEdit,
  inlineEditPatch,
  onDismissInlineEdit,
  onDraftContentChange,
  revisionCommit,
  activeChapterScope = 'ALL',
  onChangeChapterScope,
  onCreateChapterArtifact
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => typeof window === 'undefined'
    ? true
    : window.matchMedia ? window.matchMedia('(min-width: 1280px)').matches : true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ArtifactType | 'ALL'>('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  React.useEffect(() => {
    const media = window.matchMedia?.('(min-width: 1280px)');
    if (media) {
      const update = () => setIsDesktopLayout(media.matches);
      update();
      media.addEventListener?.('change', update);
      return () => media.removeEventListener?.('change', update);
    }
    return undefined;
  }, []);

  const getArtifactTabIcon = (type: ArtifactType) => {
    switch (type) {
      case 'CODE': return <FileCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'CITATION': return <Quote className="w-3.5 h-3.5 text-amber-500" />;
      case 'OUTLINE': return <ListTree className="w-3.5 h-3.5 text-teal-500" />;
      case 'CHART': return <BarChart3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      case 'TABLE': return <Table2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      default: return <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  // Filter artifacts by search query, type filter, and optional chapter scope
  const filteredArtifacts = useMemo(() => {
    const base = artifacts.filter(art => {
      const matchType = filterType === 'ALL' || art.type === filterType;
      const matchQuery = !searchQuery.trim() ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchQuery;
    });
    if (activeChapterScope === 'ALL') return base;
    const chapterMatches = base.filter(art => inferArtifactChapterScope(art.title, art.chapterScope) === activeChapterScope);
    return chapterMatches.length > 0 ? chapterMatches : base;
  }, [artifacts, filterType, searchQuery, activeChapterScope]);

  return (
    <>
      {/* DESKTOP RIGHT PANE: LIVE ARTIFACT CANVAS */}
      {isCanvasOpen && isDesktopLayout && (
        <section
        className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-all duration-200 xl:flex"
        >
          {isCreatingArtifact && <div role="status" className="flex h-8 shrink-0 items-center gap-2 border-b border-indigo-100 bg-indigo-50/70 px-3 text-xs font-medium text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />Membuat dokumen di Canvas…</div>}
          {activeArtifact?.persistenceStatus && activeArtifact.persistenceStatus !== 'persistent' && <div className="flex min-h-8 shrink-0 items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" role="status">
            <span>{activeArtifact.persistenceStatus === 'failed' ? 'Draf masih tersimpan lokal. Penyimpanan ke Ruang Kerja belum berhasil.' : activeArtifact.persistenceStatus === 'saving' ? 'Menyimpan draf ke Ruang Kerja…' : 'Draf tersimpan lokal dan akan dipindahkan setelah chat dibuat.'}</span>
            {activeArtifact.persistenceStatus === 'failed' && hasWorkspaceChat && <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { void Promise.resolve(onSaveArtifact(draftContent ?? activeArtifact.content, activeArtifact.title, false, activeArtifact.updatedAt, activeArtifact.version)).catch(() => undefined); }}>Coba simpan</button>}
          </div>}
          {/* Sub-Document / Chapter Context Selector Strip (Multi-turn Context Memory Per-Bab) */}
          {onChangeChapterScope && (
            <div className="h-8 px-3 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0 z-10">
              <div role="group" aria-label="Fokus Sub-Dokumen / Bab" className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
                  Fokus Bab:
                </span>
                {CHAPTER_SCOPES.map(scope => {
                  const isScopeActive = activeChapterScope === scope;
                  const meta = CHAPTER_SCOPE_LABELS[scope];
                  return (
                    <button
                      key={scope}
                      type="button"
                      aria-pressed={isScopeActive}
                      onClick={() => onChangeChapterScope(scope)}
                      title={meta.fullLabel}
                      className={`h-6 px-2 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                        isScopeActive
                          ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                      }`}
                    >
                      {meta.shortLabel}
                    </button>
                  );
                })}
              </div>
              {activeChapterScope !== 'ALL' && onCreateChapterArtifact && (
                <button
                  type="button"
                  onClick={() => onCreateChapterArtifact(activeChapterScope)}
                  className="h-6 px-2 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10.5px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  title={`Buat dokumen draf khusus untuk ${CHAPTER_SCOPE_LABELS[activeChapterScope].fullLabel}`}
                >
                  + Draf {CHAPTER_SCOPE_LABELS[activeChapterScope].shortLabel}
                </button>
              )}
            </div>
          )}
          {/* Multi-Artifact Tab & Filter Strip (when > 1 artifacts exist) */}
          {artifacts.length > 1 && (
            <div className="h-9 px-3 bg-white dark:bg-secondary-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1 shrink-0 z-10">
              {/* Tab Strip with Horizontal Scroll */}
              <div role="group" aria-label="Pilih dokumen Canvas" className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0 py-1">
                {filteredArtifacts.map((art) => {
                  const isActive = art.id === activeArtifactId;
                  return (
                    <button
                      key={art.id}
                      aria-pressed={isActive}
                      type="button"
                      onClick={() => onSelectArtifact(art.id)}
                      className={`h-6.5 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold ring-1 ring-slate-200 dark:ring-slate-700'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title={art.title}
                    >
                      {getArtifactTabIcon(art.type)}
                      <span className="truncate max-w-32.5">{art.title}</span>
                      <span className="text-[9.5px] font-mono opacity-60">v{art.version || 1}</span>
                    </button>
                  );
                })}

                {filteredArtifacts.length === 0 && (
                  <span className="text-[11px] text-slate-400 px-2 italic">
                    Tidak ada artefak yang cocok
                  </span>
                )}
              </div>

              {/* Quick Tab Search / Type Selector for Scalability (> 3 artifacts) */}
              {artifacts.length > 3 && (
                <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-200 dark:border-slate-800">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Cari..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-6 w-20 sm:w-28 text-[11px] pl-5 pr-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <Search className="w-3 h-3 text-slate-400 absolute left-1.5 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className="h-6 px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10.5px] font-medium flex items-center gap-1 cursor-pointer"
                      title="Filter tipe artefak"
                    >
                      <span>{filterType === 'ALL' ? 'Semua' : filterType}</span>
                      <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                    </button>

                    {showFilterDropdown && (
                      <div className="absolute right-0 top-full mt-1 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1 z-30 space-y-0.5">
                        {(['ALL', 'DOCUMENT', 'CODE', 'CITATION', 'OUTLINE', 'CHART', 'TABLE'] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setFilterType(t);
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full text-left px-2 py-1 rounded-lg text-[10.5px] cursor-pointer ${
                              filterType === t
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {t === 'ALL' ? 'Semua Tipe' : t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {proposalPreview ? <ProposalPreview proposal={proposalPreview} onDismiss={onDismissProposalPreview} /> : activeArtifact ? (
            <Suspense fallback={<CanvasLoadingFallback />}>
            <ArtifactCanvas
              artifact={activeArtifact}
              initialDraftContent={draftContent}
              initialDraftBaseVersion={draftBaseVersion}
              initialDraftBaseUpdatedAt={draftBaseUpdatedAt}
              scrollStorageKey={scrollStorageKey}
              onUpdateArtifact={onUpdateActiveArtifact}
              onSaveArtifact={onSaveArtifact}
              onRollbackVersion={onRollbackVersion}
              onClose={onCloseCanvas}
              onRequestRevision={onRequestRevision}
              onSelectTool={onSelectTool}
              onDuplicateArtifact={onDuplicateArtifact}
              onDeleteArtifact={onDeleteArtifact}
              onSelectedTextChange={onSelectedTextChange}
              onSelectionChange={onSelectionChange}
              onRequestInlineEdit={onRequestInlineEdit}
              inlineEditPatch={inlineEditPatch}
              onDismissInlineEdit={onDismissInlineEdit}
              onDraftContentChange={onDraftContentChange}
              revisionCommit={revisionCommit}
              isStreaming={isStreaming}
              isExpanded={isCanvasExpanded}
              onToggleExpand={onToggleExpand}
            />
            </Suspense>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 sm:p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Canvas siap digunakan</h3>
              <p className="text-xs max-w-xs mt-1 mb-3 leading-relaxed">
                Buat outline, tulis dokumen, susun sitasi, atau mulai kode. Hasil kerja Anda tersimpan sebagai artefak di sini.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onCreateNewArtifact('DOCUMENT')}
                  className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>+ Buat Draf Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCreateNewArtifact('CODE')}
                  className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-3xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                  <span>+ Kode</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCreateNewArtifact('CITATION')}
                  className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-3xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <Quote className="w-3.5 h-3.5 text-amber-500" />
                  <span>+ Sitasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCreateNewArtifact('OUTLINE')}
                  className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-3xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <ListTree className="w-3.5 h-3.5 text-teal-500" />
                  <span>+ Outline</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* MOBILE SLIDE-OVER DRAWER FOR CANVAS */}
      <AnimatePresence>
        {mobileActiveTab === 'canvas' && !isDesktopLayout && (
          <motion.div
            key="mobile-canvas-drawer"
            initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: 0.18 }}
            className="xl:hidden absolute inset-0 z-10 bg-white dark:bg-secondary-900 flex flex-col shadow-2xl pb-safe"
          >
            {/* Mobile Drawer Top Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {activeArtifact?.title || 'Canvas Dokumen'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onSetMobileActiveTab('chat')}
                className="h-7 px-2.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                aria-label="Kembali ke Obrolan"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            {/* Mobile Persistence & Status Banner */}
            {activeArtifact?.persistenceStatus && activeArtifact.persistenceStatus !== 'persistent' && (
              <div className="flex min-h-8 shrink-0 items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" role="status">
                <span className="truncate">{activeArtifact.persistenceStatus === 'failed' ? 'Draf masih tersimpan lokal.' : activeArtifact.persistenceStatus === 'saving' ? 'Menyimpan draf ke Ruang Kerja…' : 'Draf tersimpan lokal.'}</span>
                {activeArtifact.persistenceStatus === 'failed' && hasWorkspaceChat && (
                  <button type="button" className="font-semibold underline underline-offset-2 shrink-0" onClick={() => { void Promise.resolve(onSaveArtifact(draftContent ?? activeArtifact.content, activeArtifact.title, false, activeArtifact.updatedAt, activeArtifact.version)).catch(() => undefined); }}>Coba simpan</button>
                )}
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex-1 overflow-hidden">
              {proposalPreview ? <ProposalPreview proposal={proposalPreview} onDismiss={onDismissProposalPreview} /> : activeArtifact ? (
                <Suspense fallback={<CanvasLoadingFallback />}>
                <ArtifactCanvas
                  artifact={activeArtifact}
                  initialDraftContent={draftContent}
                  initialDraftBaseVersion={draftBaseVersion}
                  initialDraftBaseUpdatedAt={draftBaseUpdatedAt}
                  scrollStorageKey={scrollStorageKey}
                  onUpdateArtifact={onUpdateActiveArtifact}
                  onSaveArtifact={onSaveArtifact}
                  onRollbackVersion={onRollbackVersion}
                  onClose={() => { onCloseCanvas(); onSetMobileActiveTab('chat'); }}
                  onRequestRevision={onRequestRevision}
                  onSelectTool={onSelectTool}
                  onDuplicateArtifact={onDuplicateArtifact}
              onDeleteArtifact={onDeleteArtifact}
              onSelectedTextChange={onSelectedTextChange}
              onSelectionChange={onSelectionChange}
              onRequestInlineEdit={onRequestInlineEdit}
              inlineEditPatch={inlineEditPatch}
              onDismissInlineEdit={onDismissInlineEdit}
              onDraftContentChange={onDraftContentChange}
              revisionCommit={revisionCommit}
                  isStreaming={isStreaming}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                />
                </Suspense>
              ) : (
                <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Artefak Aktif</h3>
                  <button
                    type="button"
                    onClick={() => onCreateNewArtifact('DOCUMENT')}
                    className="h-8 px-3 mt-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>+ Buat Draf Baru</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
