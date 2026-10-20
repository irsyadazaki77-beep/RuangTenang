import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, FileText, Lightbulb, Menu, Plus, Search, Sparkles } from 'lucide-react';
import type { Chat } from '../chat/types';
import { STARTER_TASKS } from './constants/workspaceConstants';
import { WorkspaceApiService, type WorkspaceSearchResult } from './services/workspaceApiService';
import type { WorkspaceContract } from '../../../shared/contracts/workspace';
import { BrandLogo } from '../../components/ui/BrandLogo';

interface WorkspaceHomeProps {
  chats: Chat[];
  isLoading?: boolean;
  isGuest?: boolean;
  onOpenSidebar?: () => void;
}

const additionalActions = [
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

export const WorkspaceHome: React.FC<WorkspaceHomeProps> = ({ chats, isLoading = false, isGuest = false, onOpenSidebar }) => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceContract[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(!isGuest);
  const [isLoadingMoreWorkspaces, setIsLoadingMoreWorkspaces] = useState(false);
  const [hasMoreWorkspaces, setHasMoreWorkspaces] = useState(false);
  const [nextWorkspaceOffset, setNextWorkspaceOffset] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [reloadWorkspaces, setReloadWorkspaces] = useState(0);
  const [searchResults, setSearchResults] = useState<WorkspaceSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [nextSearchCursor, setNextSearchCursor] = useState<string | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [searchRetryCount, setSearchRetryCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchKind, setSearchKind] = useState<'all' | WorkspaceSearchResult['kind']>('all');
  const [visibleSearchCount, setVisibleSearchCount] = useState(20);
  const loadMoreControllerRef = useRef<AbortController | null>(null);
  const searchMoreControllerRef = useRef<AbortController | null>(null);
  const legacyChats = useMemo(() => workspaceChats(chats), [chats]);

  useEffect(() => () => {
    loadMoreControllerRef.current?.abort();
    searchMoreControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (isGuest) {
      setWorkspaces([]);
      setHasMoreWorkspaces(false);
      setNextWorkspaceOffset(0);
      setLoadError(null);
      setLoadMoreError(null);
      setIsLoadingWorkspaces(false);
      return;
    }
    const controller = new AbortController();
    setIsLoadingWorkspaces(true);
    setLoadError(null);
    void WorkspaceApiService.listWorkspaces(0, controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setWorkspaces(result.items);
        setHasMoreWorkspaces(result.hasMore);
        setNextWorkspaceOffset(result.nextOffset);
        setLoadMoreError(null);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError('Workspace belum dapat dimuat. Coba lagi atau buka riwayat lama dari sidebar.');
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoadingWorkspaces(false);
    });
    return () => controller.abort();
  }, [isGuest, reloadWorkspaces]);

  const loadMoreWorkspaces = async () => {
    if (isGuest || !hasMoreWorkspaces || isLoadingMoreWorkspaces) return;
    setIsLoadingMoreWorkspaces(true);
    setLoadMoreError(null);
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    try {
      const result = await WorkspaceApiService.listWorkspaces(nextWorkspaceOffset, controller.signal);
      if (controller.signal.aborted) return;
      setWorkspaces(current => {
        const knownIds = new Set(current.map(workspace => workspace.chatId));
        return [...current, ...result.items.filter(workspace => !knownIds.has(workspace.chatId))];
      });
      setHasMoreWorkspaces(result.hasMore);
      setNextWorkspaceOffset(result.nextOffset);
    } catch (reason) {
      if (!controller.signal.aborted) setLoadMoreError(reason instanceof Error ? reason.message : 'Workspace berikutnya gagal dimuat.');
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
        if (!controller.signal.aborted) setIsLoadingMoreWorkspaces(false);
      }
    }
  };

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchLoadingMore(false);
      setHasMoreSearchResults(false);
      setNextSearchCursor(null);
      setSearchError(false);
      setVisibleSearchCount(20);
      return;
    }
    if (isGuest) {
      const normalizedQuery = query.toLowerCase();
      const localMatches: WorkspaceSearchResult[] =
        searchKind === 'all' || searchKind === 'workspace'
          ? legacyChats
              .filter(chat => chat.title.toLowerCase().includes(normalizedQuery))
              .map(chat => ({
                kind: 'workspace' as const,
                chatId: chat.id,
                title: chat.title,
                snippet: relativeDate(chat.updatedAt),
                updatedAt: chat.updatedAt || new Date().toISOString()
              }))
          : [];
      setSearchResults(localMatches);
      setSearchLoading(false);
      setSearchLoadingMore(false);
      setHasMoreSearchResults(false);
      setNextSearchCursor(null);
      setSearchError(false);
      setVisibleSearchCount(20);
      return;
    }
    const controller = new AbortController();
    setSearchResults([]);
    setVisibleSearchCount(20);
    setSearchLoading(true);
    setSearchLoadingMore(false);
    setHasMoreSearchResults(false);
    setNextSearchCursor(null);
    setSearchError(false);
    const timer = window.setTimeout(() => {
      void WorkspaceApiService.searchWorkspaces(query, controller.signal, searchKind).then(page => {
        if (!controller.signal.aborted) {
          setSearchResults(page.items);
          setHasMoreSearchResults(page.hasMore);
          setNextSearchCursor(page.nextCursor);
        }
      }).catch(() => {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setSearchError(true);
        }
      }).finally(() => { if (!controller.signal.aborted) setSearchLoading(false); });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      searchMoreControllerRef.current?.abort();
    };
  }, [isGuest, legacyChats, search, searchKind, searchRetryCount]);

  const loadMoreSearchResults = async () => {
    if (!hasMoreSearchResults || !nextSearchCursor || searchLoading || searchLoadingMore) return;
    const controller = new AbortController();
    searchMoreControllerRef.current = controller;
    setSearchLoadingMore(true);
    setSearchError(false);
    try {
      const page = await WorkspaceApiService.searchWorkspaces(search.trim(), controller.signal, searchKind, nextSearchCursor);
      if (controller.signal.aborted) return;
      setSearchResults(current => {
        const knownResults = new Set(current.map(result => `${result.kind}:${result.itemId || result.chatId}`));
        return [...current, ...page.items.filter(result => !knownResults.has(`${result.kind}:${result.itemId || result.chatId}`))];
      });
      setHasMoreSearchResults(page.hasMore);
      setNextSearchCursor(page.nextCursor);
      setVisibleSearchCount(count => Math.max(count, searchResults.length + page.items.length));
    } catch {
      if (!controller.signal.aborted) setSearchError(true);
    } finally {
      if (searchMoreControllerRef.current === controller) {
        searchMoreControllerRef.current = null;
        if (!controller.signal.aborted) setSearchLoadingMore(false);
      }
    }
  };

  const [showAllRecent, setShowAllRecent] = useState(false);

  const allRecent = useMemo(() => {
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
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }, [legacyChats, workspaces]);

  const recent = useMemo(() => {
    return showAllRecent ? allRecent : allRecent.slice(0, 6);
  }, [allRecent, showAllRecent]);

  const startWorkspace = (prompt?: string, compareMode = false) => navigate('/workspace/new', {
    state: prompt ? { initialPrompt: prompt, initialCompareMode: compareMode } : undefined,
  });
  const openSearchResult = (result: WorkspaceSearchResult) => navigate(`/workspace/c/${encodeURIComponent(result.chatId)}`, {
    state: { workspaceSearchTarget: { kind: result.kind, itemId: result.itemId, title: result.title } },
  });
  const showResults = search.trim().length >= 2;

  return (
    <div className="relative h-full min-h-0 overflow-y-auto bg-gradient-to-br from-[#f0f4ff]/70 via-[#f8fafc]/80 to-[#eef2ff]/70 px-4 py-5 transition-colors duration-300 dark:from-[#090e17]/80 dark:via-slate-950/90 dark:to-[#0f172a]/80 sm:px-7 sm:py-8 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-indigo-200/20 blur-3xl dark:bg-indigo-900/15" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl dark:bg-blue-900/10" />
      <div className="relative mx-auto w-full max-w-3xl">
        {onOpenSidebar && <button type="button" onClick={onOpenSidebar} className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-600 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"><Menu className="h-4 w-4" /> Menu workspace</button>}

        <section className="rounded-3xl border border-white/80 bg-white/65 p-4 shadow-[0_20px_55px_-42px_rgba(79,70,229,0.3)] backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/55 dark:shadow-[0_20px_55px_-40px_rgba(0,0,0,0.8)] sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <BrandLogo mode="RUANG_KERJA" size="lg" iconOnly />
            <div><p className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">RuangKerja</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Bagian dari RuangTenang</p></div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Apa yang ingin kamu kerjakan?</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Mulai pekerjaan baru atau lanjutkan yang terakhir.</p>
            </div>
            <button type="button" onClick={() => startWorkspace()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-600 dark:hover:bg-indigo-500"><Plus className="h-4 w-4" /> Workspace baru</button>
          </div>
          <label className="mt-5 flex h-11 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 text-slate-400 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900">
            <Search className="h-4 w-4 shrink-0" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari workspace, tugas, file, atau dokumen" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" aria-label="Cari workspace, tugas, file, atau dokumen" />
            {search && <button type="button" onClick={() => setSearch('')} className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800">Hapus</button>}
          </label>
        </section>

        {showResults ? (
          <section className="mt-6" aria-label="Hasil pencarian RuangKerja">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Hasil pencarian</h2><span role="status" className="text-xs text-slate-500">{searchLoading ? 'Mencari…' : searchLoadingMore ? 'Melanjutkan pencarian…' : searchError ? 'Pencarian gagal' : `${searchResults.length} hasil${hasMoreSearchResults ? ' · pencarian belum selesai' : ''}`}</span></div>
            <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter kategori pencarian">
              {(['all', 'workspace', 'task', 'artifact', 'file', 'message'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSearchKind(tab)}
                  aria-pressed={searchKind === tab}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    searchKind === tab
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab === 'all' ? 'Semua' : labels[tab as WorkspaceSearchResult['kind']]}
                </button>
              ))}
            </div>
            {searchResults.length > 0 ? <>
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">{searchResults.slice(0, visibleSearchCount).map((result, index) => <SearchResultRow key={`${result.kind}:${result.itemId || result.chatId}:${index}`} result={result} onClick={() => openSearchResult(result)} />)}</div>
              {searchResults.length > visibleSearchCount && <button type="button" onClick={() => setVisibleSearchCount(count => count + 20)} className="mt-2.5 inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Tampilkan hasil berikutnya ({searchResults.length - visibleSearchCount})</button>}
            </> : !searchLoading && <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">{searchError ? 'Pencarian belum berhasil. Coba lagi.' : hasMoreSearchResults ? 'Belum ada hasil pada bagian data ini. Lanjutkan pencarian untuk memeriksa data lainnya.' : 'Tidak ada hasil yang cocok.'}</p>
              {searchError && <button type="button" onClick={() => setSearchRetryCount(count => count + 1)} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Coba lagi</button>}
            </div>}
            {hasMoreSearchResults && <button type="button" disabled={searchLoading || searchLoadingMore} onClick={() => void loadMoreSearchResults()} className="mt-2.5 inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-wait disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">{searchLoadingMore ? 'Melanjutkan pencarian…' : 'Telusuri data berikutnya'}</button>}
          </section>
        ) : <>
          <section className="mt-6" aria-labelledby="continue-working-title">
            <div className="mb-2 flex items-center justify-between gap-3"><h2 id="continue-working-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lanjutkan pekerjaan</h2>{(isLoading || isLoadingWorkspaces) && <span role="status" className="text-xs text-slate-500">Memuat…</span>}</div>
            {recent.length > 0 ? (
              <>
                <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">{recent.map(workspace => <button key={workspace.id} type="button" onClick={() => navigate(`/workspace/c/${encodeURIComponent(workspace.id)}`)} className="group flex min-h-15.5 w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:hover:bg-slate-800/60 sm:px-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800 group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300">{workspace.title}</span><span className="mt-0.5 block text-[11px] text-slate-500">{relativeDate(workspace.updatedAt)}</span></span>{workspace.pinned && <span className="hidden text-[11px] text-slate-500 sm:inline">Disematkan</span>}<ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 sm:opacity-100" /></button>)}</div>
                {(allRecent.length > 6 || hasMoreWorkspaces) && <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {!showAllRecent ? <button
                    type="button"
                    onClick={() => setShowAllRecent(true)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >Tampilkan daftar Workspace ({allRecent.length}{hasMoreWorkspaces ? '+' : ''})</button> : <>
                    <button type="button" onClick={() => setShowAllRecent(false)} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Tampilkan 6 terbaru saja</button>
                    {hasMoreWorkspaces && <button type="button" disabled={isLoadingMoreWorkspaces} onClick={() => void loadMoreWorkspaces()} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">{isLoadingMoreWorkspaces ? 'Memuat…' : 'Muat 100 Workspace lagi'}</button>}
                    {loadMoreError && <span role="alert" className="text-xs text-rose-600">{loadMoreError}</span>}
                  </>}
                </div>}
              </>
            ) : !isLoading && !isLoadingWorkspaces && <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700"><p>{loadError || 'Workspace yang kamu buka akan muncul di sini.'}</p>{loadError && <button type="button" onClick={() => setReloadWorkspaces(value => value + 1)} className="min-h-9 rounded-md border border-slate-300 px-3 font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Coba lagi</button>}</div>}
        {loadError && recent.length > 0 && <div role="status" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-300"><span>{loadError}</span><button type="button" onClick={() => setReloadWorkspaces(value => value + 1)} className="min-h-9 rounded-md border border-amber-300 px-2.5 font-medium hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-900 dark:hover:bg-amber-950/40">Coba lagi</button></div>}
          </section>

          <section className="mt-7" aria-labelledby="quick-start-title">
            <div className="mb-2"><h2 id="quick-start-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mulai dengan cepat</h2><p className="mt-0.5 text-xs text-slate-500">Pilih titik awal, lalu sesuaikan bersama asisten.</p></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{STARTER_TASKS.map(task => <QuickAction key={task.id} label={task.title} description={task.subtitle} icon={task.icon} onClick={() => startWorkspace(task.prompt)} />)}</div>
            <details className="group mt-2 rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800/70"><span>Lihat aktivitas lainnya</span><span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span></summary>
              <div className="grid grid-cols-1 gap-2 border-t border-slate-100 p-2 sm:grid-cols-2 dark:border-slate-800">{additionalActions.map(({ label, prompt, icon: Icon, compare }) => <QuickAction key={label} label={label} icon={<Icon className="h-4 w-4" />} onClick={() => startWorkspace(prompt, compare)} />)}</div>
            </details>
          </section>
        </>}
      </div>
    </div>
  );
};

const labels: Record<WorkspaceSearchResult['kind'], string> = { workspace: 'Workspace', task: 'Tugas', artifact: 'Dokumen', file: 'File', message: 'Percakapan' };
const SearchResultRow: React.FC<{ result: WorkspaceSearchResult; onClick: () => void }> = ({ result, onClick }) => <button type="button" onClick={onClick} className="flex min-h-15.5 w-full items-center gap-3 px-3.5 py-2.5 text-left transition first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:hover:bg-slate-800/60 sm:px-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{result.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{labels[result.kind]} · {result.snippet}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" /></button>;

const QuickAction: React.FC<{ label: string; description?: string; icon: React.ReactNode; onClick: () => void }> = ({ label, description, icon, onClick }) => <button type="button" onClick={onClick} className="group flex min-h-16 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">{icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-medium leading-5 text-slate-700 line-clamp-2 group-hover:text-indigo-700 dark:text-slate-200 dark:group-hover:text-indigo-300">{label}</span>{description && <span className="block text-[11px] leading-4 text-slate-500 line-clamp-2 dark:text-slate-400">{description}</span>}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" /></button>;

export default WorkspaceHome;
