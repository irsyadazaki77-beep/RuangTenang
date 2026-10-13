import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, GitCompare, History, RotateCcw, X } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants } from '../../../lib/motionTokens';
import { WorkspaceArtifact, ArtifactVersionRecord } from '../types';

interface ArtifactVersionHistoryModalProps {
  isOpen: boolean;
  artifact: WorkspaceArtifact;
  setPreviewingVersion: (version: ArtifactVersionRecord | null) => void;
  onClose: () => void;
  onCompare: (version: ArtifactVersionRecord) => void;
  onRollback?: (version: number) => Promise<void> | void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ArtifactVersionHistoryModal: React.FC<ArtifactVersionHistoryModalProps> = ({ isOpen, artifact, setPreviewingVersion, onClose, onCompare, onRollback, showToast }) => {
  const [isRollingBack, setIsRollingBack] = React.useState(false);
  return <AnimatePresence>
    {isOpen && <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs select-none" variants={modalBackdropVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
      <motion.div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" variants={modalPanelVariants} initial="hidden" animate="visible" exit="exit" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
          <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"><History className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">Riwayat Versi Artefak</h3><p className="text-xs text-slate-500 dark:text-slate-400">{artifact.title} • {artifact.versions?.length || 1} snapshot tersimpan</p></div></div>
          <button type="button" onClick={() => { setPreviewingVersion(null); onClose(); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {artifact.versions?.length ? artifact.versions.map(version => {
            const active = version.version === artifact.version;
            const date = version.createdAt ? new Date(version.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Waktu tidak tercatat';
            return <article key={version.id || `ver_${version.version}`} className={`rounded-xl border p-3.5 sm:p-4 ${active ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/80 dark:bg-emerald-950/20' : 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/50'}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>v{version.version}</span>{active && <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Versi Aktif</span>}<span className="flex items-center gap-1 text-[11px] text-slate-500"><Clock className="h-3 w-3" />{date}</span></div>
                <div className="flex items-center gap-2"><button type="button" onClick={() => onCompare(version)} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><GitCompare className="h-3 w-3" />Diff</button>{!active && <button type="button" disabled={isRollingBack} onClick={async () => { if (!window.confirm(`Pulihkan dokumen ke versi v${version.version}? Snapshot baru akan dicatat untuk versi saat ini.`)) return; setIsRollingBack(true); try { if (!onRollback) throw new Error('Pemulihan tidak tersedia'); await onRollback(version.version); onClose(); } catch { showToast('Versi belum berhasil dipulihkan.', 'error'); } finally { setIsRollingBack(false); } }} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300"><RotateCcw className="h-3 w-3" />Pulihkan</button>}</div>
              </div><div className="mb-1 line-clamp-1 text-xs font-medium text-slate-800 dark:text-slate-200">{version.title || artifact.title}</div><p className="line-clamp-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{version.content?.trim().slice(0, 140) || 'Konten kosong'}</p><div className="mt-2 text-[10px] text-slate-400">{(version.content || '').length.toLocaleString()} karakter</div>
            </article>;
          }) : <div className="py-8 text-center text-slate-400"><Clock className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-700" /><p className="text-xs font-medium">Hanya terdapat 1 versi aktif saat ini (v1).</p><p className="mt-1 text-[11px]">Setiap revisi AI atau penyimpanan berkala akan membuat snapshot versi.</p></div>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950 sm:p-4"><span className="text-[11px] text-slate-400">Pemulihan menyalin isi snapshot ke dokumen aktif.</span><button type="button" onClick={() => { setPreviewingVersion(null); onClose(); }} className="rounded-xl bg-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Tutup</button></div>
      </motion.div>
    </motion.div>}
  </AnimatePresence>;
};

