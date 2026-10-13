import React from 'react';
import { Edit3, Sparkles } from 'lucide-react';
import type { WorkspaceArtifactSelection, ArtifactPatch } from '../types';

interface ArtifactCanvasEditorProps {
  artifactType: string;
  content: string;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (content: string) => void;
  onBlur: () => void;
  selection: WorkspaceArtifactSelection | null;
  onSelect: (target: HTMLTextAreaElement) => void;
  inlineActions: string[][];
  isStreaming: boolean;
  onRequestInlineEdit: (instruction: string) => void;
  showInlineAsk: boolean;
  setShowInlineAsk: (show: boolean) => void;
  inlineInstruction: string;
  setInlineInstruction: (value: string) => void;
  onRequestAsk: () => void;
  patch: ArtifactPatch | null;
  patchError: string;
  onDismissPatch: () => void;
  onAcceptPatch: () => void;
  isSaving: boolean;
  wordCount: number;
}

export const ArtifactCanvasEditor: React.FC<ArtifactCanvasEditorProps> = ({
  artifactType, content, editorRef, onChange, onBlur, selection, onSelect, inlineActions, isStreaming,
  onRequestInlineEdit, showInlineAsk, setShowInlineAsk, inlineInstruction, setInlineInstruction,
  onRequestAsk, patch, patchError, onDismissPatch, onAcceptPatch, isSaving, wordCount
}) => <div className="mx-auto flex min-h-145 max-w-3xl flex-col space-y-3 rounded-lg bg-white p-4 dark:bg-slate-900/70 sm:p-6">
  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
    <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200"><Edit3 className="h-3.5 w-3.5 text-emerald-600" />{artifactType === 'CODE' ? 'Editor Kode Program' : 'Editor Draf Dokumen'}</span>
    <span className="text-[11px]">Ctrl + S · {wordCount} kata</span>
  </div>
  {selection && <div role="toolbar" aria-label="Aksi AI untuk teks terpilih" className="flex flex-wrap items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/25">
    <span className="mr-1 flex items-center gap-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300"><Sparkles className="h-3.5 w-3.5" />Teks dipilih</span>
    {inlineActions.map(([label, instruction]) => <button key={label} type="button" aria-label={`${label} teks terpilih`} disabled={isStreaming} onClick={() => onRequestInlineEdit(instruction)} className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-slate-200">{label}</button>)}
    <button type="button" disabled={isStreaming} onClick={() => setShowInlineAsk(!showInlineAsk)} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300" aria-expanded={showInlineAsk}>Ask AI</button>
    {showInlineAsk && <form className="flex w-full gap-1.5 pt-1" onSubmit={event => { event.preventDefault(); onRequestAsk(); }}>
      <input autoFocus value={inlineInstruction} onChange={event => setInlineInstruction(event.target.value)} placeholder="Instruksi untuk teks ini…" aria-label="Instruksi revisi teks terpilih" className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-emerald-900 dark:bg-slate-950 dark:text-slate-100" />
      <button type="submit" disabled={!inlineInstruction.trim() || isStreaming} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Buat usulan</button>
    </form>}
  </div>}
  {patch && <section aria-label="Usulan perubahan AI" className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-900/70 dark:bg-slate-950">
    <div className="mb-2 flex items-center justify-between gap-2"><h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"><Sparkles className="h-3.5 w-3.5 text-violet-600" />Usulan perubahan</h3><span className="text-[10px] text-slate-500">Hanya bagian terpilih</span></div>
    <div className="space-y-1.5 text-xs"><div className="rounded-lg border-l-2 border-rose-400 bg-rose-50 px-2.5 py-2 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide">Dihapus</span><pre className="whitespace-pre-wrap font-sans">{patch.originalText || '(kosong)'}</pre></div><div className="rounded-lg border-l-2 border-emerald-500 bg-emerald-50 px-2.5 py-2 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide">Ditambahkan</span><pre className="whitespace-pre-wrap font-sans">{patch.replacementText || '(kosong)'}</pre></div></div>
    {patchError && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{patchError}</p>}
    <div className="mt-2.5 flex justify-end gap-2"><button type="button" onClick={onDismissPatch} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">Tolak</button><button type="button" onClick={onAcceptPatch} disabled={isSaving} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{isSaving ? 'Menyimpan…' : 'Terapkan'}</button></div>
  </section>}
  <textarea ref={editorRef} value={content} onChange={event => onChange(event.target.value)} onBlur={onBlur} onSelect={event => onSelect(event.currentTarget)} onMouseUp={event => onSelect(event.currentTarget)} onKeyUp={event => onSelect(event.currentTarget)} placeholder="Ketik atau sesuaikan draf dokumen Anda di sini..." className="min-h-125 w-full flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-slate-900 focus:outline-none selection:bg-emerald-500/20 dark:text-slate-100 sm:text-sm" />
</div>;

