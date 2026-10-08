import React, { useState, useMemo } from 'react';
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
import { WorkspaceArtifact, ArtifactType, WorkspaceTab, WorkspaceArtifactSelection, ArtifactPatch } from '../types';
import { ArtifactCanvas } from './ArtifactCanvas';
import { WorkspaceToolDefinition } from '../tools/toolTypes';

interface WorkspaceCanvasPaneProps {
  artifacts: WorkspaceArtifact[];
  activeArtifact: WorkspaceArtifact | null;
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
  onSaveArtifact: (content: string, title?: string, createVersionSnapshot?: boolean, expectedUpdatedAt?: string) => Promise<unknown> | unknown;
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
  onDraftContentChange?: (artifactId: string, content: string) => void;
  revisionCommit?: { artifactId: string; content: string; version: number } | null;
}

export const WorkspaceCanvasPane: React.FC<WorkspaceCanvasPaneProps> = React.memo(({
  artifacts,
  activeArtifact,
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
  revisionCommit
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ArtifactType | 'ALL'>('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const getArtifactTabIcon = (type: ArtifactType) => {
    switch (type) {
      case 'CODE': return <FileCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'CITATION': return <Quote className="w-3.5 h-3.5 text-amber-500" />;
      case 'OUTLINE': return <ListTree className="w-3.5 h-3.5 text-teal-500" />;
      case 'CHART': return <BarChart3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      case 'TABLE': return <Table2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      default: return <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  // Filter artifacts by search query & type filter
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter(art => {
      const matchType = filterType === 'ALL' || art.type === filterType;
      const matchQuery = !searchQuery.trim() || 
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchQuery;
    });
  }, [artifacts, filterType, searchQuery]);

  return (
    <>
      {/* DESKTOP RIGHT PANE: LIVE ARTIFACT CANVAS */}
      {isCanvasOpen && (
        <section 
        className="hidden xl:flex flex-1 min-h-0 min-w-0 flex-col h-full overflow-hidden transition-all duration-200"
        >
          {isCreatingArtifact && <div role="status" className="flex h-8 shrink-0 items-center gap-2 border-b border-emerald-100 bg-emerald-50/70 px-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Membuat dokumen di Canvas…</div>}
          {activeArtifact?.persistenceStatus && activeArtifact.persistenceStatus !== 'persistent' && <div className="flex min-h-8 shrink-0 items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" role="status">
            <span>{activeArtifact.persistenceStatus === 'failed' ? 'Draf masih tersimpan lokal. Penyimpanan ke Ruang Kerja belum berhasil.' : activeArtifact.persistenceStatus === 'saving' ? 'Menyimpan draf ke Ruang Kerja…' : 'Draf tersimpan lokal dan akan dipindahkan setelah chat dibuat.'}</span>
            {activeArtifact.persistenceStatus === 'failed' && hasWorkspaceChat && <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { void Promise.resolve(onSaveArtifact(activeArtifact.content, activeArtifact.title)).catch(() => undefined); }}>Coba simpan</button>}
          </div>}
          {/* Multi-Artifact Tab & Filter Strip (when > 1 artifacts exist) */}
          {artifacts.length > 1 && (
            <div className="h-9 px-3 bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1 shrink-0 z-10">
              {/* Tab Strip with Horizontal Scroll */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0 py-1">
                {filteredArtifacts.map((art) => {
                  const isActive = art.id === activeArtifactId;
                  return (
                    <button
                      key={art.id}
                      aria-selected={isActive}
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
                      <span className="truncate max-w-[130px]">{art.title}</span>
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
                      className="h-6 w-20 sm:w-28 text-[11px] pl-5 pr-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold' 
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

          {activeArtifact ? (
            <ArtifactCanvas
              artifact={activeArtifact}
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
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>+ Buat Draf Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCreateNewArtifact('CODE')}
                  className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-3xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-500" />
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
        {mobileActiveTab === 'canvas' && (
          <motion.div
            key="mobile-canvas-drawer"
            initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: 0.18 }}
            className="xl:hidden fixed inset-0 z-40 bg-white dark:bg-[#0F172A] flex flex-col shadow-2xl pt-safe pb-safe"
          >
            {/* Mobile Drawer Top Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
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

            {/* Drawer Body */}
            <div className="flex-1 overflow-hidden">
              {activeArtifact ? (
                <ArtifactCanvas
                  artifact={activeArtifact}
                  onUpdateArtifact={onUpdateActiveArtifact}
                  onSaveArtifact={onSaveArtifact}
                  onRollbackVersion={onRollbackVersion}
                  onClose={() => onSetMobileActiveTab('chat')}
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
              ) : (
                <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Artefak Aktif</h3>
                  <button
                    type="button"
                    onClick={() => onCreateNewArtifact('DOCUMENT')}
                    className="h-8 px-3 mt-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
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
