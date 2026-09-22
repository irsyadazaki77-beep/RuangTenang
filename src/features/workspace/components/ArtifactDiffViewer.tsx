import React, { useMemo } from 'react';
import { WorkspaceArtifact, ArtifactVersionRecord } from '../types';
import { computeLineDiff, DiffChange } from '../utils/diffHelper';
import { GitCompare, Plus, Minus, ArrowLeftRight, CheckCircle2 } from 'lucide-react';

interface ArtifactDiffViewerProps {
  currentArtifact: WorkspaceArtifact;
  baseVersion?: ArtifactVersionRecord | null;
  onCloseDiff?: () => void;
}

export const ArtifactDiffViewer: React.FC<ArtifactDiffViewerProps> = ({
  currentArtifact,
  baseVersion,
  onCloseDiff
}) => {
  // Determine previous content to compare against
  const previousContent = useMemo(() => {
    if (baseVersion) return baseVersion.content;
    if (currentArtifact.versions && currentArtifact.versions.length > 0) {
      // Compare with the previous version if available
      const sorted = [...currentArtifact.versions].sort((a, b) => b.version - a.version);
      const prev = sorted.find(v => v.version < currentArtifact.version) || sorted[0];
      return prev ? prev.content : '';
    }
    return '';
  }, [baseVersion, currentArtifact]);

  const diffResult = useMemo(() => {
    return computeLineDiff(previousContent, currentArtifact.content);
  }, [previousContent, currentArtifact.content]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diffResult.forEach(item => {
      if (item.type === 'added') added++;
      else if (item.type === 'removed') removed++;
      else unchanged++;
    });

    return { added, removed, unchanged };
  }, [diffResult]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-mono text-xs overflow-hidden rounded-xl border border-slate-800">
      {/* Diff Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-[11px]">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">
            Perbandingan Versi: v{currentArtifact.version} vs v{baseVersion?.version || Math.max(1, currentArtifact.version - 1)}
          </span>
          <div className="flex items-center gap-1.5 ml-3 font-sans">
            <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-bold flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> {stats.added}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-400 border border-rose-800/80 font-bold flex items-center gap-0.5">
              <Minus className="w-3 h-3" /> {stats.removed}
            </span>
          </div>
        </div>

        {onCloseDiff && (
          <button
            type="button"
            onClick={onCloseDiff}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1 font-sans text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kembali ke Hasil Bersih</span>
          </button>
        )}
      </div>

      {/* Diff Content Viewport */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 custom-scrollbar bg-[#0d131f]">
        {diffResult.length === 0 || (stats.added === 0 && stats.removed === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 text-center font-sans">
            <ArrowLeftRight className="w-8 h-8 text-slate-600 mb-2" />
            <p className="font-medium">Tidak ada perbedaan isi antara versi ini dan versi sebelumnya.</p>
          </div>
        ) : (
          diffResult.map((line: DiffChange, idx: number) => {
            if (line.type === 'added') {
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-2 py-0.5 bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500 rounded-xs select-text"
                >
                  <span className="w-6 text-right text-slate-500 select-none font-mono text-[10px] shrink-0">
                    {line.lineNumberNew ?? '+'}
                  </span>
                  <span className="text-emerald-400 select-none font-bold shrink-0">+</span>
                  <span className="flex-1 whitespace-pre-wrap break-all leading-relaxed">
                    {line.value || ' '}
                  </span>
                </div>
              );
            }

            if (line.type === 'removed') {
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-2 py-0.5 bg-rose-950/40 text-rose-300 line-through opacity-80 border-l-2 border-rose-500 rounded-xs select-text"
                >
                  <span className="w-6 text-right text-slate-500 select-none font-mono text-[10px] shrink-0">
                    {line.lineNumberOld ?? '-'}
                  </span>
                  <span className="text-rose-400 select-none font-bold shrink-0">-</span>
                  <span className="flex-1 whitespace-pre-wrap break-all leading-relaxed">
                    {line.value || ' '}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className="flex items-start gap-2 px-2 py-0.5 text-slate-400 hover:bg-slate-800/30 rounded-xs select-text"
              >
                <span className="w-6 text-right text-slate-600 select-none font-mono text-[10px] shrink-0">
                  {line.lineNumberNew ?? line.lineNumberOld ?? ' '}
                </span>
                <span className="w-2.5 select-none text-slate-600 shrink-0"> </span>
                <span className="flex-1 whitespace-pre-wrap break-all leading-relaxed text-slate-300">
                  {line.value || ' '}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
