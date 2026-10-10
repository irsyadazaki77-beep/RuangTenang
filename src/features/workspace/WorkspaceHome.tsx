import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Code2, FileText, FlaskConical, Lightbulb, Menu, Plus, Search, Sparkles } from 'lucide-react';
import type { Chat } from '../chat/types';
import { WorkspaceApiService, type WorkspaceSearchResult } from './services/workspaceApiService';
import type { WorkspaceContract } from '../../../shared/contracts/workspace';

interface WorkspaceHomeProps {
  chats: Chat[];
  isLoading?: boolean;
  onOpenSidebar?: () => void;
}

const quickActions = [
  { label: 'Analisis dokumen', prompt: 'Bantu saya menganalisis dokumen yang saya lampirkan. Rangkum tujuan, temuan utama, bukti pendukung, dan pertanyaan yang masih terbuka.', icon: FileText },
  { label: 'Tulis dokumen', prompt: 'Bantu saya menulis dokumen. Tanyakan tujuan, pembaca, dan bahan yang sudah tersedia sebelum menyusun draf.', icon: BookOpen },
  { label: 'Review kode', prompt: 'Tinjau kode yang saya berikan. Cari bug, risiko keamanan, dan perbaikan paling penting dengan penjelasan singkat.', icon: Code2 },
  { label: 'Riset topik', prompt: 'Bantu saya meneliti topik ini. Susun pertanyaan riset, kata kunci pencarian, sumber yang relevan, dan hal yang perlu diverifikasi.', icon: FlaskConical },
  { label: 'Brainstorm ide', prompt: 'Mari brainstorm ide untuk pekerjaan saya. Berikan beberapa pilihan dan cara mengevaluasinya.', icon: Lightbulb },
  { label: 'Bandingkan jawaban', prompt: 'Bandingkan beberapa pendekatan untuk permintaan saya dan jelaskan perbedaan, kelebihan, serta keterbatasannya.', icon: Sparkles, compare: true },
  { label: 'Buat presentasi', prompt: 'Bantu saya merancang presentasi yang jelas. Tanyakan topik, audiens, durasi, dan bahan yang tersedia sebelum menyusun alur slide.', icon: FileText },
  { label: 'Analisis data', prompt: 'Bantu saya memahami data ini. Tanyakan tujuan analisis, lalu jelaskan pola dan keterbatasan datanya.', icon: Search },
];

const workspaceChats = (chats: Chat[]) => chats
  .filter(chat => chat.workspaceMode === 'RUANG_KERJA' && !chat.isArchived && !chat.isTemporary)
  .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

function relativeDate(value?: string) {
  if (!value) return 'Baru dibuat';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Baru dibuat';
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Diperbarui hari ini';
  if (days === 1) return 'Diperbarui kemarin';
  if (days < 7) return `Diperbarui ${days} hari lalu`;
  return `Diperbarui ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
}

export const WorkspaceHome: React.FC<WorkspaceHomeProps> = ({ chats, isLoading = false, onOpenSidebar }) => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceContract[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<WorkspaceSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [search, setSearch] = useState('');
  const legacyChats = useMemo(() => workspaceChats(chats), [chats]);

  useEffect(() => {
    const controller = new AbortController();
    void WorkspaceApiService.listWorkspaces(controller.signal).then(setWorkspaces).catch(() => {
      if (!controller.signal.aborted) setLoadError('Workspace belum dapat dimuat. Riwayat lama tetap tersedia di sidebar.');
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoadingWorkspaces(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError(false);
      void WorkspaceApiService.searchWorkspaces(query, controller.signal).then(results => {
        if (!controller.signal.aborted) setSearchResults(results);
      }).catch(() => {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setSearchError(true);
        }
      }).finally(() => { if (!controller.signal.aborted) setSearchLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search]);

  const recent = useMemo(() => {
    const fromApi = workspaces.filter(workspace => !workspace.isArchived).map(workspace => ({
      id: workspace.chatId,
      title: workspace.name,
      updatedAt: workspace.updatedAt,
      pinned: Boolean(workspace.isPinned),
    }));
    const knownIds = new Set(fromApi.map(workspace => workspace.id));
    const fromLegacy = legacyChats.filter(chat => !knownIds.has(chat.id)).map(chat => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      pinned: Boolean(chat.isPinned),
    }));
    return [...fromApi, ...fromLegacy]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 6);
  }, [legacyChats, workspaces]);

  const startWorkspace = (prompt?: string, compareMode = false) => navigate('/workspace/new', {
    state: prompt ? { initialPrompt: prompt, initialCompareMode: compareMode } : undefined,
  });
  const openSearchResult = (result: WorkspaceSearchResult) => navigate(`/workspace/c/${encodeURIComponent(result.chatId)}`, {
    state: { workspaceSearchTarget: { kind: result.kind, itemId: result.itemId, title: result.title } },
  });
  const showResults = search.trim().length >= 2;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-transparent px-4 py-5 transition-colors duration-500 sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto w-full max-w-3xl">
        {onOpenSidebar && <button type="button" onClick={onOpenSidebar} className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-600 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"><Menu className="h-4 w-4" /> Menu workspace</button>}

        <section className="border-b border-slate-200/80 pb-6 dark:border-slate-800 sm:pb-7">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400"><Sparkles className="h-4 w-4" /> RuangKerja</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Apa yang ingin kamu kerjakan?</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Mulai pekerjaan baru atau lanjutkan yang terakhir.</p>
            </div>
            <button type="button" onClick={() => startWorkspace()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500"><Plus className="h-4 w-4" /> Workspace baru</button>
          </div>
          <label className="mt-5 flex h-11 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 text-slate-400 transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-900">
            <Search className="h-4 w-4 shrink-0" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari workspace, tugas, file, atau dokumen" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" aria-label="Cari workspace, tugas, file, atau dokumen" />
            {search && <button type="button" onClick={() => setSearch('')} className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800">Hapus</button>}
          </label>
        </section>

        {showResults ? (
          <section className="mt-6" aria-label="Hasil pencarian RuangKerja">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Hasil pencarian</h2><span role="status" className="text-xs text-slate-500">{searchLoading ? 'Mencari…' : searchError ? 'Pencarian gagal' : `${searchResults.length} hasil`}</span></div>
            {searchResults.length > 0 ? <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">{searchResults.slice(0, 10).map((result, index) => <SearchResultRow key={`${result.kind}:${result.itemId || result.chatId}:${index}`} result={result} onClick={() => openSearchResult(result)} />)}</div> : !searchLoading && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700">{searchError ? 'Coba lagi sebentar.' : 'Tidak ada hasil yang cocok.'}</p>}
          </section>
        ) : <>
          <section className="mt-6" aria-labelledby="continue-working-title">
            <div className="mb-2 flex items-center justify-between gap-3"><h2 id="continue-working-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lanjutkan pekerjaan</h2>{(isLoading || isLoadingWorkspaces) && <span role="status" className="text-xs text-slate-500">Memuat…</span>}</div>
            {recent.length > 0 ? <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">{recent.map(workspace => <button key={workspace.id} type="button" onClick={() => navigate(`/workspace/c/${encodeURIComponent(workspace.id)}`)} className="group flex min-h-[62px] w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:hover:bg-slate-800/60 sm:px-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800 group-hover:text-emerald-800 dark:text-slate-100 dark:group-hover:text-emerald-300">{workspace.title}</span><span className="mt-0.5 block text-[11px] text-slate-500">{relativeDate(workspace.updatedAt)}</span></span>{workspace.pinned && <span className="hidden text-[11px] text-slate-500 sm:inline">Disematkan</span>}<ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 sm:opacity-100" /></button>)}</div> : !isLoading && !isLoadingWorkspaces && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700">{loadError || 'Workspace yang kamu buka akan muncul di sini.'}</p>}
            {loadError && recent.length > 0 && <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">{loadError}</p>}
          </section>

          <section className="mt-7" aria-labelledby="quick-start-title">
            <div className="mb-2"><h2 id="quick-start-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mulai dengan cepat</h2><p className="mt-0.5 text-xs text-slate-500">Pilih titik awal, lalu sesuaikan bersama asisten.</p></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{quickActions.slice(0, 4).map(({ label, prompt, icon: Icon, compare }) => <QuickAction key={label} label={label} icon={<Icon className="h-4 w-4" />} onClick={() => startWorkspace(prompt, compare)} />)}</div>
            <details className="group mt-2 rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-800/70"><span>Lihat aktivitas lainnya</span><span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span></summary>
              <div className="grid grid-cols-1 gap-2 border-t border-slate-100 p-2 sm:grid-cols-2 dark:border-slate-800">{quickActions.slice(4).map(({ label, prompt, icon: Icon, compare }) => <QuickAction key={label} label={label} icon={<Icon className="h-4 w-4" />} onClick={() => startWorkspace(prompt, compare)} />)}</div>
            </details>
          </section>
        </>}
      </div>
    </div>
  );
};

const labels: Record<WorkspaceSearchResult['kind'], string> = { workspace: 'Workspace', task: 'Tugas', artifact: 'Dokumen', file: 'File', message: 'Percakapan' };
const SearchResultRow: React.FC<{ result: WorkspaceSearchResult; onClick: () => void }> = ({ result, onClick }) => <button type="button" onClick={onClick} className="flex min-h-[62px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:hover:bg-slate-800/60 sm:px-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{result.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{labels[result.kind]} · {result.snippet}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" /></button>;

const QuickAction: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void }> = ({ label, icon, onClick }) => <button type="button" onClick={onClick} className="group flex min-h-[58px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">{icon}</span><span className="min-w-0 flex-1 text-xs font-medium leading-5 text-slate-700 group-hover:text-emerald-800 dark:text-slate-200 dark:group-hover:text-emerald-200">{label}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" /></button>;

export default WorkspaceHome;
