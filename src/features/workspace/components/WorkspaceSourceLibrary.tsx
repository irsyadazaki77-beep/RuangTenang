import React, { useLayoutEffect, useRef, useState } from 'react';
import { BookMarked, Check, Copy, Download, FileText, Pencil, Save, Upload } from 'lucide-react';
import type { ResearchSource, ResearchSourceMetadata } from '../../../../shared/contracts/files';
import { WorkspaceApiService } from '../services/workspaceApiService';
import { downloadBibTeXFile, downloadRISFile, generateBibTeX, parseCitations, ParsedReference } from '../utils/citationExport';

export function WorkspaceSourceLibrary({ chatId, onPreview }: { chatId?: string; onPreview: (sourceId: string) => void }) {
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [importedRefs, setImportedRefs] = useState<ParsedReference[]>([]);
  const [copiedBib, setCopiedBib] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResearchSourceMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(chatId));
  const bibInputRef = useRef<HTMLInputElement>(null);
  const activeChatIdRef = useRef(chatId);
  activeChatIdRef.current = chatId;
  useLayoutEffect(() => {
    setSources([]);
    setImportedRefs([]);
    setError(null);
    setEditingId(null);
    setDraft(null);
    setIsLoading(Boolean(chatId));
    if (!chatId) return;
    const controller = new AbortController();
    void WorkspaceApiService.fetchResearchSources(chatId, controller.signal).then(result => {
      if (!controller.signal.aborted && activeChatIdRef.current === chatId) setSources(result);
    }).catch(reason => {
      if (!controller.signal.aborted && activeChatIdRef.current === chatId) setError(reason instanceof Error ? reason.message : 'Sumber gagal dimuat.');
    }).finally(() => {
      if (!controller.signal.aborted && activeChatIdRef.current === chatId) setIsLoading(false);
    });
    return () => controller.abort();
  }, [chatId]);
  const beginEdit = (source: ResearchSource) => {
    setEditingId(source.id);
    setDraft({ title: source.title, ...(source.author ? { author: source.author } : {}), ...(source.year ? { year: source.year } : {}), ...(source.doi ? { doi: source.doi } : {}), ...(source.url ? { url: source.url } : {}) });
  };
  const save = async (source: ResearchSource) => {
    if (!chatId || !draft) return;
    const savingChatId = chatId;
    try {
      const saved = await WorkspaceApiService.updateResearchSource(savingChatId, source.id, draft);
      if (activeChatIdRef.current !== savingChatId) return;
      setSources(current => current.map(item => item.id === source.id ? saved : item)); setEditingId(null); setDraft(null); setError(null);
    } catch (reason) {
      if (activeChatIdRef.current === savingChatId) setError(reason instanceof Error ? reason.message : 'Metadata sumber gagal disimpan.');
    }
  };
  const buildCombinedBibContent = () => {
    const sourceBibs = sources.map((src, idx) => {
      const key = (src.author || src.title || 'source').split(/\s+/)[0].toLowerCase().replace(/[^\w]/g, '') || 'source';
      const lines = [
        `@misc{${key}${src.year || ''}_${idx + 1},`,
        `  title = {${src.title}},`,
        ...(src.author ? [`  author = {${src.author}},`] : []),
        ...(src.year ? [`  year = {${src.year}},`] : []),
        ...(src.doi ? [`  doi = {${src.doi}},`] : []),
        ...(src.url ? [`  url = {${src.url}},`] : []),
        `}`
      ];
      return lines.join('\n');
    });
    const importedBibs = importedRefs.map(r => r.raw || '').filter(Boolean);
    return [...sourceBibs, ...importedBibs].join('\n\n');
  };
  const handleCopyAllBib = async () => {
    const raw = buildCombinedBibContent();
    const bib = generateBibTeX(raw, 'Library Workspace');
    if (!bib) return;
    await navigator.clipboard.writeText(bib);
    setCopiedBib(true);
    setTimeout(() => setCopiedBib(false), 2000);
  };
  const handleImportBibFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseCitations(text);
      if (parsed.length > 0) {
        setImportedRefs(prev => [...parsed, ...prev]);
      }
    } catch {
      // ignore read failure
    }
  };
  if (!chatId) return <p className="py-8 text-center text-xs text-slate-500">Sumber tersedia setelah Workspace tersimpan.</p>;
  if (isLoading) return <p role="status" className="py-8 text-center text-xs text-slate-500">Memuat sumber…</p>;
  if (error && !sources.length && !importedRefs.length) return <p role="alert" className="py-8 text-center text-xs text-rose-600">{error}</p>;
  return <div
    className="space-y-2 py-2"
    onDragOver={e => e.preventDefault()}
    onDrop={e => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith('.bib') || file.name.endsWith('.ris'))) {
        void handleImportBibFile(file);
      }
    }}
  >
    <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/50">
      <input
        ref={bibInputRef}
        type="file"
        accept=".bib,.ris"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) void handleImportBibFile(f);
          e.target.value = '';
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => bibInputRef.current?.click()}
        className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-[10.5px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300 cursor-pointer"
        title="Impor file referensi .bib atau .ris dari Zotero / Mendeley"
      >
        <Upload className="h-3 w-3" />
        <span>Impor .bib / .ris</span>
      </button>
      {(sources.length > 0 || importedRefs.length > 0) && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void handleCopyAllBib()}
            className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10.5px] font-semibold text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 cursor-pointer"
            title="Salin seluruh sumber ke clipboard dalam format BibTeX untuk Zotero / Mendeley"
          >
            {copiedBib ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            <span>{copiedBib ? 'Tersalin!' : 'Salin Zotero (.bib)'}</span>
          </button>
          <button
            type="button"
            onClick={() => downloadBibTeXFile(buildCombinedBibContent(), 'sumber-workspace')}
            className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-mono text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            title="Unduh file .bib"
          >
            <Download className="h-2.5 w-2.5" />.bib
          </button>
          <button
            type="button"
            onClick={() => downloadRISFile(buildCombinedBibContent(), 'sumber-workspace')}
            className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-mono text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            title="Unduh file .ris"
          >
            <Download className="h-2.5 w-2.5" />.ris
          </button>
        </div>
      )}
    </div>
    {error && <p role="alert" className="px-1 text-xs text-rose-600">{error}</p>}
    {!sources.length && !importedRefs.length && <p className="py-6 text-center text-xs text-slate-500">Belum ada sumber dokumen siap di Workspace ini. Anda juga dapat mengimpor file .bib/.ris di atas.</p>}
    {importedRefs.map(ref => (
      <article key={ref.id} className="rounded-lg border border-emerald-200/70 bg-emerald-50/20 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-start gap-2">
          <BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{ref.title || ref.citeKey}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              {ref.authors.join(', ') || 'Penulis tidak diketahui'}{ref.year ? ` · ${ref.year}` : ''}{ref.journal ? ` · ${ref.journal}` : ''}
            </p>
            {ref.doi && <p className="mt-0.5 text-[10px] font-mono text-emerald-700 dark:text-emerald-300">DOI: {ref.doi}</p>}
          </div>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">.bib/.ris</span>
        </div>
      </article>
    ))}
    {sources.map(source => <article key={source.id} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
      <div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><button type="button" onClick={() => onPreview(source.id)} className="block max-w-full truncate text-left text-xs font-semibold text-slate-800 hover:text-emerald-700 dark:text-slate-100">{source.title}</button><p className="mt-0.5 truncate text-[10px] text-slate-500">{source.fileName}{source.pageCount ? ` · ${source.pageCount} halaman` : ''}</p><p className="mt-1 text-[10px] text-slate-500">{source.metadataConfidence === 'user_provided' ? 'Metadata dari pengguna' : 'Metadata belum diketahui'}{source.author ? ` · ${source.author}` : ''}{source.year ? ` · ${source.year}` : ''}</p>{source.doi && <p className="mt-1 break-all text-[10px] text-amber-700 dark:text-amber-300">DOI belum diverifikasi: {source.doi}</p>}</div><button type="button" aria-label={`Edit metadata ${source.title}`} onClick={() => editingId === source.id ? setEditingId(null) : beginEdit(source)} className="rounded p-1 text-slate-400 hover:text-emerald-700"><Pencil className="h-3.5 w-3.5" /></button></div>
      {editingId === source.id && draft && <div className="mt-2 grid gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <input aria-label="Judul sumber" value={draft.title} maxLength={240} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Judul" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <input aria-label="Penulis sumber" value={draft.author || ''} maxLength={240} onChange={event => setDraft({ ...draft, author: event.target.value || undefined })} placeholder="Penulis (opsional)" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <input aria-label="Tahun sumber" type="number" min={1000} max={2200} value={draft.year || ''} onChange={event => setDraft({ ...draft, year: event.target.value ? Number(event.target.value) : undefined })} placeholder="Tahun" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <input aria-label="DOI sumber" value={draft.doi || ''} maxLength={300} onChange={event => setDraft({ ...draft, doi: event.target.value || undefined })} placeholder="DOI (format diperiksa, tidak diverifikasi eksternal)" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <input aria-label="URL sumber" value={draft.url || ''} maxLength={1000} onChange={event => setDraft({ ...draft, url: event.target.value || undefined })} placeholder="URL HTTPS (opsional)" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <button type="button" onClick={() => void save(source)} className="inline-flex h-8 items-center justify-center gap-1 rounded bg-emerald-700 px-2 text-xs font-semibold text-white"><Save className="h-3 w-3" />Simpan metadata</button>
      </div>}
    </article>)}
  </div>;
}
