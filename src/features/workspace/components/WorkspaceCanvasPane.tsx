import React from 'react';
import { 
  FileText, 
  FileCode, 
  Quote, 
  ListTree, 
  FilePlus, 
  X 
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { WorkspaceArtifact, ArtifactType, WorkspaceTab } from '../types';
import { ArtifactCanvas } from './ArtifactCanvas';

interface WorkspaceCanvasPaneProps {
  artifacts: WorkspaceArtifact[];
  activeArtifact: WorkspaceArtifact | null;
  activeArtifactId: string;
  isCanvasOpen: boolean;
  isCanvasExpanded: boolean;
  isStreaming: boolean;
  mobileActiveTab: WorkspaceTab;
  onSelectArtifact: (id: string) => void;
  onCloseCanvas: () => void;
  onToggleExpand: () => void;
  onUpdateActiveArtifact: (updated: Partial<WorkspaceArtifact>) => void;
  onSaveArtifact: (content: string, title?: string) => Promise<void> | void;
  onRollbackVersion: (targetVersion: number) => Promise<void> | void;
  onRequestRevision: (revisionPrompt: string, currentArtifact: WorkspaceArtifact) => void;
  onCreateNewArtifact: (type: ArtifactType) => void;
  onSetMobileActiveTab: (tab: WorkspaceTab) => void;
}

export const WorkspaceCanvasPane: React.FC<WorkspaceCanvasPaneProps> = ({
  artifacts,
  activeArtifact,
  activeArtifactId,
  isCanvasOpen,
  isCanvasExpanded,
  isStreaming,
  mobileActiveTab,
  onSelectArtifact,
  onCloseCanvas,
  onToggleExpand,
  onUpdateActiveArtifact,
  onSaveArtifact,
  onRollbackVersion,
  onRequestRevision,
  onCreateNewArtifact,
  onSetMobileActiveTab
}) => {
  const shouldReduceMotion = useReducedMotion();

  const getArtifactTabIcon = (type: ArtifactType) => {
    switch (type) {
      case 'CODE': return <FileCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'CITATION': return <Quote className="w-3.5 h-3.5 text-amber-500" />;
      case 'OUTLINE': return <ListTree className="w-3.5 h-3.5 text-teal-500" />;
      default: return <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <>
      {/* DESKTOP RIGHT PANE: LIVE ARTIFACT CANVAS */}
      {isCanvasOpen && (
        <section 
          className="hidden lg:flex flex-1 flex-col h-full overflow-hidden transition-all duration-200"
        >
          {/* Multi-Artifact Tab Strip (when > 1 artifacts exist) */}
          {artifacts.length > 1 && (
            <div className="h-9 px-3 bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 z-10">
              {artifacts.map((art) => {
                const isActive = art.id === activeArtifactId;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => onSelectArtifact(art.id)}
                    className={`h-6.5 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
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
              isStreaming={isStreaming}
              isExpanded={isCanvasExpanded}
              onToggleExpand={onToggleExpand}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Artefak Aktif</h3>
              <p className="text-xs max-w-xs mt-1 mb-3">
                Kirim pertanyaan di kolom obrolan atau buat draf dokumen/kode baru untuk ditampilkan di Canvas.
              </p>
              <button
                type="button"
                onClick={() => onCreateNewArtifact('DOCUMENT')}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>+ Buat Draf Baru</span>
              </button>
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
            className="lg:hidden fixed inset-0 z-40 bg-white dark:bg-[#0F172A] flex flex-col shadow-2xl"
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
};
