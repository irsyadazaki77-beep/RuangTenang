import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import { Bold, Heading2, Italic, List, ListOrdered, Redo2, Sparkles, Table2, Undo2, Edit3 } from 'lucide-react';
import type { WorkspaceArtifactSelection, ArtifactPatch } from '../types';
import type { WorkspaceArtifact } from '../types';

export function mapMarkdownTextSelection(markdown: string, text: string, expectedVisibleOffset: number): { start: number; end: number } | null {
  const visible: string[] = [];
  const offsets: number[] = [];
  let lineStart = true;
  for (let index = 0; index < markdown.length;) {
    if (lineStart) {
      const marker = markdown.slice(index).match(/^(?:#{1,6}|[-+*]|\d+[.)])\s+/);
      if (marker) { index += marker[0].length; lineStart = false; continue; }
    }
    if (markdown[index] === '\\' && index + 1 < markdown.length) {
      visible.push(markdown[index + 1]); offsets.push(index + 1); index += 2; lineStart = false; continue;
    }
    if ('`*_~'.includes(markdown[index])) {
      const marker = markdown[index];
      let end = index + 1;
      while (markdown[end] === marker) end += 1;
      if (end - index <= 3) { index = end; continue; }
    }
    const character = markdown[index];
    visible.push(character); offsets.push(index); index += 1;
    lineStart = character === '\n';
  }
  const rendered = visible.join('');
  let matchAt = -1;
  let closest = Number.POSITIVE_INFINITY;
  for (let index = rendered.indexOf(text); index >= 0; index = rendered.indexOf(text, index + 1)) {
    const distance = Math.abs(index - expectedVisibleOffset);
    if (distance < closest) { closest = distance; matchAt = index; }
  }
  if (!text || matchAt < 0 || offsets[matchAt] === undefined) return null;
  return { start: offsets[matchAt], end: offsets[matchAt + text.length - 1] + 1 };
}

interface ArtifactCanvasEditorProps {
  artifactType: string;
  content: string;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (content: string) => void;
  onBlur: () => void;
  selection: WorkspaceArtifactSelection | null;
  onSelect: (target: HTMLTextAreaElement) => void;
  onSelectText: (selection: { start: number; end: number; text: string } | null) => void;
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
  artifact?: WorkspaceArtifact;
  onRequestRevision?: (prompt: string, artifact: WorkspaceArtifact) => void;
}

export const ArtifactCanvasEditor: React.FC<ArtifactCanvasEditorProps> = ({
  artifactType, content, editorRef, onChange, onBlur, selection, onSelect, onSelectText, inlineActions, isStreaming,
  onRequestInlineEdit, showInlineAsk, setShowInlineAsk, inlineInstruction, setInlineInstruction,
  onRequestAsk, patch, patchError, onDismissPatch, onAcceptPatch, isSaving, wordCount, artifact, onRequestRevision
}) => {
  const [mode, setMode] = useState<'visual' | 'markdown'>('visual');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectTextRef = useRef(onSelectText);
  onSelectTextRef.current = onSelectText;
  const isRichText = artifactType === 'DOCUMENT' || artifactType === 'OUTLINE';

  const captureRichTextSelection = (current: NonNullable<ReturnType<typeof useEditor>>) => {
    const { from, to } = current.state.selection;
    const text = current.state.doc.textBetween(from, to, '\n').trim();
    if (!text) { onSelectTextRef.current(null); return; }

    const expected = current.state.doc.textBetween(0, from, '\n').length;
    const range = mapMarkdownTextSelection(current.getMarkdown(), text, expected);
    onSelectTextRef.current(range ? { ...range, text } : null);
  };

  const editor = useEditor({
    extensions: [StarterKit, TableKit, Markdown],
    content,
    contentType: 'markdown',
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => onChangeRef.current(current.getMarkdown()),
    onSelectionUpdate: ({ editor: current }) => captureRichTextSelection(current)
  }, []);

  useEffect(() => {
    if (!editor || mode !== 'visual') return;
    if (editor.getMarkdown() !== content) editor.commands.setContent(content, { contentType: 'markdown', emitUpdate: false });
  }, [content, editor, mode]);

  const toggle = (action: () => void) => { action(); editor?.view.focus(); };
  return <div className="mx-auto flex min-h-145 max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
    <div className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-4">
      <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200"><Edit3 className="h-3.5 w-3.5 text-emerald-600" />{artifactType === 'CODE' ? 'Editor Kode Program' : 'Editor Draf Dokumen'}</span>
      <div className="flex items-center gap-2">
        {artifact && onRequestRevision && artifactType !== 'CODE' && <div className="flex items-center gap-1" role="group" aria-label="Aksi Agent">
          {(() => { const actions = [['Create', 'Buat dokumen yang lebih terstruktur berdasarkan tujuan dan isi draf ini; pertahankan fakta yang ada.'], ['Revise', 'Revisi dokumen ini agar lebih jelas, konsisten, dan sesuai tujuan; pertahankan fakta dan cakupan.'], ['Expand', 'Kembangkan dokumen ini dengan penjelasan dan konteks yang relevan; jangan menambahkan klaim atau sumber yang tidak didukung.'], ['Summarize', 'Ringkas dokumen ini sambil mempertahankan tujuan, temuan, dan poin penting.'], ['Format', 'Format ulang dokumen ini dengan heading, subheading, paragraf, daftar, dan tabel yang sesuai tanpa mengubah makna.']]; return <>
            <div className="hidden items-center gap-1 sm:flex"><span className="mr-0.5 text-[10px] font-medium">Agent:</span>{actions.map(([label, prompt]) => <button key={label} type="button" disabled={isStreaming} onClick={() => onRequestRevision(prompt, { ...artifact, content })} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{label}</button>)}</div>
            <details className="relative sm:hidden"><summary className="list-none cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300">AI actions</summary><div className="absolute right-0 top-full z-30 mt-1 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">{actions.map(([label, prompt]) => <button key={label} type="button" disabled={isStreaming} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onRequestRevision(prompt, { ...artifact, content }); }} className="block w-full rounded px-2 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800">{label}</button>)}</div></details>
          </>; })()}
        </div>}
        {isRichText && <div role="group" aria-label="Jenis editor" className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          <button type="button" aria-pressed={mode === 'visual'} onClick={() => setMode('visual')} className={`rounded-md px-2 py-1 text-[10px] ${mode === 'visual' ? 'bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : ''}`}>Visual</button>
          <button type="button" aria-pressed={mode === 'markdown'} onClick={() => setMode('markdown')} className={`rounded-md px-2 py-1 text-[10px] ${mode === 'markdown' ? 'bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : ''}`}>Markdown</button>
        </div>}
        <span className="hidden text-[11px] sm:inline">Ctrl + S · {wordCount} kata</span>
      </div>
    </div>
    {mode === 'visual' && isRichText && <>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-2 py-1.5 dark:border-slate-800" role="toolbar" aria-label="Pemformatan dokumen">
        <button type="button" title="Tebal" aria-label="Tebal" onClick={() => toggle(() => editor?.chain().focus().toggleBold().run())} className={`rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${editor?.isActive('bold') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : ''}`}><Bold className="h-4 w-4" /></button>
        <button type="button" title="Miring" aria-label="Miring" onClick={() => toggle(() => editor?.chain().focus().toggleItalic().run())} className={`rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${editor?.isActive('italic') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : ''}`}><Italic className="h-4 w-4" /></button>
        <button type="button" title="Heading 2" aria-label="Heading 2" onClick={() => toggle(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())} className={`rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${editor?.isActive('heading', { level: 2 }) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : ''}`}><Heading2 className="h-4 w-4" /></button>
        <button type="button" title="Daftar berpoin" aria-label="Daftar berpoin" onClick={() => toggle(() => editor?.chain().focus().toggleBulletList().run())} className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><List className="h-4 w-4" /></button>
        <button type="button" title="Daftar bernomor" aria-label="Daftar bernomor" onClick={() => toggle(() => editor?.chain().focus().toggleOrderedList().run())} className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><ListOrdered className="h-4 w-4" /></button>
        <button type="button" title="Sisipkan tabel" aria-label="Sisipkan tabel" onClick={() => toggle(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())} className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><Table2 className="h-4 w-4" /></button>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <button type="button" title="Urungkan" aria-label="Urungkan" disabled={!editor?.can().undo()} onClick={() => toggle(() => editor?.chain().focus().undo().run())} className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><Undo2 className="h-4 w-4" /></button>
        <button type="button" title="Ulangi" aria-label="Ulangi" disabled={!editor?.can().redo()} onClick={() => toggle(() => editor?.chain().focus().redo().run())} className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><Redo2 className="h-4 w-4" /></button>
      </div>
      <EditorContent editor={editor} onBlur={onBlur} className="min-h-125 flex-1 overflow-auto px-5 py-4 text-sm leading-7 text-slate-800 outline-none dark:text-slate-100 [&_.tiptap]:min-h-110 [&_.tiptap]:outline-none [&_h1]:my-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:my-3 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-4 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:p-2 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 dark:[&_th]:border-slate-700 dark:[&_th]:bg-slate-800 dark:[&_td]:border-slate-700" />
    </>}
    {selection && <div role="toolbar" aria-label="Aksi AI untuk teks terpilih" className="flex flex-wrap items-center gap-1.5 border-b border-emerald-100 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/25">
      <span className="mr-1 flex items-center gap-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300"><Sparkles className="h-3.5 w-3.5" />Teks dipilih</span>
      {inlineActions.map(([label, instruction]) => <button key={label} type="button" aria-label={`${label} teks terpilih`} disabled={isStreaming} onClick={() => onRequestInlineEdit(instruction)} className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-slate-200">{label}</button>)}
      <button type="button" disabled={isStreaming} onClick={() => setShowInlineAsk(!showInlineAsk)} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300" aria-expanded={showInlineAsk}>Ask AI</button>
      {showInlineAsk && <form className="flex w-full gap-1.5 pt-1" onSubmit={event => { event.preventDefault(); onRequestAsk(); }}><input autoFocus value={inlineInstruction} onChange={event => setInlineInstruction(event.target.value)} placeholder="Instruksi untuk teks ini…" aria-label="Instruksi revisi teks terpilih" className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-emerald-900 dark:bg-slate-950 dark:text-slate-100" /><button type="submit" disabled={!inlineInstruction.trim() || isStreaming} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Buat usulan</button></form>}
    </div>}
    {patch && <section aria-label="Usulan perubahan AI" className="border-b border-violet-200 bg-white p-3 dark:border-violet-900/70 dark:bg-slate-950">
      <div className="mb-2 flex items-center justify-between gap-2"><h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"><Sparkles className="h-3.5 w-3.5 text-violet-600" />Usulan perubahan</h3><span className="text-[10px] text-slate-500">Hanya bagian terpilih</span></div>
      <div className="space-y-1.5 text-xs"><div className="rounded-lg border-l-2 border-rose-400 bg-rose-50 px-2.5 py-2 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide">Dihapus</span><pre className="whitespace-pre-wrap font-sans">{patch.originalText || '(kosong)'}</pre></div><div className="rounded-lg border-l-2 border-emerald-500 bg-emerald-50 px-2.5 py-2 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide">Ditambahkan</span><pre className="whitespace-pre-wrap font-sans">{patch.replacementText || '(kosong)'}</pre></div></div>
      {patchError && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{patchError}</p>}
      <div className="mt-2.5 flex justify-end gap-2"><button type="button" onClick={onDismissPatch} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">Tolak</button><button type="button" onClick={onAcceptPatch} disabled={isSaving} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{isSaving ? 'Menyimpan…' : 'Terapkan'}</button></div>
    </section>}
    {(mode === 'markdown' || !isRichText) && <textarea ref={editorRef} value={content} onChange={event => onChange(event.target.value)} onBlur={onBlur} onSelect={event => onSelect(event.currentTarget)} onMouseUp={event => onSelect(event.currentTarget)} onKeyUp={event => onSelect(event.currentTarget)} placeholder="Ketik atau sesuaikan draf dokumen Anda di sini..." className="min-h-125 w-full flex-1 resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-900 focus:outline-none selection:bg-emerald-500/20 dark:text-slate-100 sm:p-5 sm:text-sm" />}
  </div>;
};
