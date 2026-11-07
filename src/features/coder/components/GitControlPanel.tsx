import React, { useState } from 'react';
import {
  GitCommit,
  GitBranch,
  RotateCcw,
  Layers
} from 'lucide-react';
import { CodebaseSnapshot } from '../RuangCoderIDE';

interface GitControlPanelProps {
  files: Record<string, string>;
  lastDiff: {
    path: string;
    beforeContent: string;
    afterContent: string;
  } | null;
  snapshots: CodebaseSnapshot[];
  onCommit: (message: string) => void;
  onRollback: (snapshot: CodebaseSnapshot) => void;
  onOpenFile: (file: string) => void;
}

export const GitControlPanel: React.FC<GitControlPanelProps> = ({
  files,
  lastDiff,
  snapshots,
  onCommit,
  onRollback,
  onOpenFile
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [activeBranch] = useState('main');

  const handleCommitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    onCommit(commitMessage.trim());
    setCommitMessage('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-xs font-sans">
      {/* Branch & Status Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-400" />
          <span className="font-mono font-bold text-slate-200">branch:</span>
          <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            {activeBranch}
          </span>
        </div>
        <span className="text-[10px] text-slate-500">{Object.keys(files).length} files tracked</span>
      </div>

      {/* Commit Input Box */}
      <form onSubmit={handleCommitSubmit} className="p-3 border-b border-slate-800 space-y-2">
        <input
          type="text"
          value={commitMessage}
          onChange={e => setCommitMessage(e.target.value)}
          placeholder="Pesan commit (misal: feat: tambah fitur baru)..."
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 outline-none focus:border-sky-500/60"
        />
        <button
          type="submit"
          disabled={!commitMessage.trim()}
          className="w-full py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>Commit Changes to Snapshot</span>
        </button>
      </form>

      {/* Changes Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Working changes */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            <span>Perubahan Terkini (Working Tree)</span>
            {lastDiff && <span className="text-amber-400">1 Modifikasi</span>}
          </div>
          {lastDiff ? (
            <div
              onClick={() => onOpenFile(lastDiff.path)}
              className="p-2 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between hover:bg-slate-800 cursor-pointer transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="font-mono text-slate-200 truncate">{lastDiff.path}</span>
              </div>
              <span className="text-[10px] text-amber-300 font-mono">MODIFIED</span>
            </div>
          ) : (
            <div className="text-slate-500 italic py-2">
              Tidak ada perubahan yang belum di-commit.
            </div>
          )}
        </div>

        {/* Commit History Timeline */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Riwayat Commit ({snapshots.length})</span>
          </div>
          <div className="space-y-1.5">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitCommit className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-semibold text-slate-200 truncate text-[11px]">
                      {snap.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{snap.timestamp}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>{snap.fileCount} files snapshot</span>
                  <button
                    type="button"
                    onClick={() => onRollback(snap)}
                    className="px-2 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition"
                    title="Kembalikan keadaan workspace ke commit ini"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Rollback</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
