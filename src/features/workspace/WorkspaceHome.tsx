import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Code2, FileText, FlaskConical, Lightbulb, Menu, Plus, Search, Sparkles } from 'lucide-react';
import type { Chat } from '../chat/types';
import type { WorkspaceArtifact } from './types';
import { WorkspaceApiService, type WorkspaceAttachmentDto, type WorkspaceSearchResult } from './services/workspaceApiService';
import type { WorkspaceContract, WorkspaceTaskContract } from '../../../shared/contracts/workspace';

interface WorkspaceHomeProps {
  chats: Chat[];
  isLoading?: boolean;
  onOpenSidebar?: () => void;
}

const quickActions = [
  { label: 'Analisis dokumen', prompt: 'Bantu saya menganalisis dokumen ini. Rangkum tujuan, temuan utama, bukti pendukung, dan pertanyaan yang masih terbuka.', icon: FileText },
  { label: 'Tulis laporan', prompt: 'Bantu saya menyusun laporan. Mulai dengan menanyakan topik, audiens, dan bahan yang sudah tersedia.', icon: BookOpen },
  { label: 'Ringkas jurnal', prompt: 'Bantu saya merangkum jurnal: tujuan, metode, hasil, keterbatasan, dan implikasinya.', icon: FlaskConical },
  { label: 'Brainstorm ide', prompt: 'Mari brainstorm ide untuk project saya. Bantu saya menghasilkan beberapa opsi dan cara mengevaluasinya.', icon: Lightbulb },
  { label: 'Review kode', prompt: 'Tinjau kode yang saya berikan. Cari bug, risiko keamanan, dan perbaikan paling penting dengan penjelasan singkat.', icon: Code2 },
  { label: 'Bandingkan model', prompt: 'Bandingkan beberapa pendekatan untuk permintaan saya. Nyatakan kesepakatan, perbedaan penting, serta kekuatan dan keterbatasan tiap jawaban.', icon: Sparkles, compare: true },
  { label: 'Cari referensi', prompt: 'Bantu saya menyusun strategi pencarian referensi untuk topik ini. Sarankan kata kunci, sinonim, dan kriteria sumber yang relevan.', icon: Search },
  { label: 'Buat presentasi', prompt: 'Bantu saya merancang presentasi yang jelas. Tanyakan topik, audiens, durasi, dan bahan yang tersedia sebelum menyusun alur slide.', icon: FileText },
];

type Collection = 'workspaces' | 'tasks' | 'documents' | 'files';

const workspaceChats = (chats: Chat[]) => chats
  .filter(chat => chat.workspaceMode === 'RUANG_KERJA' && !chat.isArchived && !chat.isTemporary)
  .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

export const WorkspaceHome: React.FC<WorkspaceHomeProps> = ({ chats, isLoading = false, onOpenSidebar }) => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceContract[]>([]);
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([]);
  const [files, setFiles] = useState<Array<WorkspaceAttachmentDto & { workspaceId: string; workspaceName: string }>>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<WorkspaceSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(true);
  const [search, setSearch] = useState('');
  const [collection, setCollection] = useState<Collection>('workspaces');
  const legacyChats = useMemo(() => workspaceChats(chats), [chats]);
  const recent = useMemo(() => workspaces.filter(workspace => !workspace.isArchived), [workspaces]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.allSettled([WorkspaceApiService.listWorkspaces(controller.signal), WorkspaceApiService.fetchAllArtifacts(controller.signal)]).then(async ([workspaceResult, artifactResult]) => {
      if (controller.signal.aborted) return;
      if (workspaceResult.status === 'fulfilled') {
        setWorkspaces(workspaceResult.value);
        const attachmentResults = await Promise.allSettled(workspaceResult.value.slice(0, 12).map(workspace => WorkspaceApiService.fetchChatAttachments(workspace.chatId, controller.signal).then(items => items.map(file => ({ ...file, workspaceId: workspace.chatId, workspaceName: workspace.name })))));
        if (!controller.signal.aborted) setFiles(attachmentResults.flatMap(result => result.status === 'fulfilled' ? result.value : []));
      } else if (!controller.signal.aborted) setLoadError('Daftar Workspace gagal dimuat.');
      if (artifactResult.status === 'fulfilled') setArtifacts(artifactResult.value);
      if (!controller.signal.aborted) setIsLoadingArtifacts(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) { setSearchResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      void WorkspaceApiService.searchWorkspaces(query, controller.signal).then(setSearchResults).catch(() => {
        if (!controller.signal.aborted) setSearchResults([]);
      }).finally(() => { if (!controller.signal.aborted) setSearchLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search]);

  const query = search.trim().toLocaleLowerCase();
  const filteredWorkspaces = query ? recent.filter(workspace => workspace.name.toLocaleLowerCase().includes(query)) : recent;
  const filteredLegacyChats = query ? legacyChats.filter(chat => chat.title.toLocaleLowerCase().includes(query)) : legacyChats;
  const filteredArtifacts = query ? artifacts.filter(artifact => artifact.title.toLocaleLowerCase().includes(query)) : artifacts;
  const filteredFiles = query ? files.filter(file => file.filename.toLocaleLowerCase().includes(query)) : files;
  const startWorkspace = (prompt?: string, compareMode = false) => navigate('/workspace/new', { state: prompt ? { initialPrompt: prompt, initialCompareMode: compareMode } : undefined });
  const pinned = filteredWorkspaces.filter(workspace => workspace.isPinned);
  const unpinned = filteredWorkspaces.filter(workspace => !workspace.isPinned);
  const activeTasks: Array<{ task: WorkspaceTaskContract; workspace: WorkspaceContract }> = filteredWorkspaces.flatMap(workspace => (workspace.tasks || []).filter(task => task.status !== 'done').map(task => ({ task, workspace })));
  const workspaceCount = filteredWorkspaces.length || (recent.length ? 0 : filteredLegacyChats.length);
  const collectionCounts: Record<Collection, number> = {
    workspaces: workspaceCount,
    tasks: activeTasks.length,
    documents: filteredArtifacts.length,
    files: filteredFiles.length,
  };
  const collectionLabels: Record<Collection, string> = { workspaces: 'Workspace', tasks: 'Task', documents: 'Dokumen', files: 'File' };
  const allEmpty = !recent.length && !legacyChats.length && !artifacts.length && !files.length;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#f7f8f6] px-4 py-5 dark:bg-[#0b1220] sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto w-full max-w-5xl">
        {onOpenSidebar && <button type="button" onClick={onOpenSidebar} className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-600 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"><Menu className="h-4 w-4" /> Menu workspace</button>}

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400"><Sparkles className="h-4 w-4" /> RuangKerja</div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Apa yang ingin Anda kerjakan?</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">Mulai pekerjaan baru atau lanjutkan dari dokumen dan workspace terakhir Anda.</p>
            </div>
            <button type="button" onClick={() => startWorkspace()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500">
              <Plus className="h-4 w-4" /> Workspace baru
            </button>
          </div>

          <label className="mt-6 flex h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-slate-400 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:bg-slate-900">
            <Search className="h-4 w-4 shrink-0" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari workspace, task, atau dokumen" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" aria-label="Cari workspace, task, atau dokumen" />
            {search && <button type="button" onClick={() => setSearch('')} className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800">Hapus</button>}
          </label>
        </section>

        {query.length >= 2 && <section className="mt-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/15" aria-label="Hasil pencarian Workspace">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hasil pencarian</h2><span role="status" className="text-xs text-slate-500">{searchLoading ? 'Mencari…' : `${searchResults.length} hasil`}</span></div>
          {searchResults.length > 0 ? <div className="grid gap-2 sm:grid-cols-2">{searchResults.slice(0, 8).map((result, index) => <WorkspaceCard key={`${result.kind}:${result.itemId || result.chatId}:${index}`} title={result.title} detail={`${result.kind === 'workspace' ? 'Workspace' : result.kind === 'task' ? 'Task' : result.kind === 'artifact' ? 'Dokumen' : result.kind === 'file' ? 'File' : 'Percakapan'} · ${result.snippet}`} updatedAt={result.updatedAt} onClick={() => navigate(`/workspace/c/${encodeURIComponent(result.chatId)}`)} />)}</div> : !searchLoading ? <p className="rounded-xl border border-dashed border-emerald-300/80 px-4 py-4 text-center text-xs text-slate-600 dark:border-emerald-900 dark:text-slate-400">Tidak ada hasil yang cocok. Coba kata kunci lain.</p> : null}
        </section>}

        <section className="mt-7" aria-labelledby="quick-actions-title">
          <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="quick-actions-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mulai dengan cepat</h2><p className="mt-0.5 text-xs text-slate-500">Pilih titik awal, lalu sesuaikan bersama asisten.</p></div></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickActions.slice(0, 4).map(({ label, prompt, icon: Icon, compare }) => <QuickAction key={label} label={label} icon={<Icon className="h-4 w-4" />} onClick={() => startWorkspace(prompt, compare)} />)}
          </div>
          <details className="group mt-2 rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-800/70"><span>Aktivitas lainnya</span><span className="text-slate-400 group-open:rotate-180 transition-transform">⌄</span></summary>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-2 dark:border-slate-800 sm:grid-cols-4">
              {quickActions.slice(4).map(({ label, prompt, icon: Icon, compare }) => <QuickAction key={label} label={label} icon={<Icon className="h-4 w-4" />} onClick={() => startWorkspace(prompt, compare)} />)}
            </div>
          </details>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-labelledby="workspace-collection-title">
          <div className="border-b border-slate-200/80 px-4 pt-4 dark:border-slate-800 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 id="workspace-collection-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ruang kerja Anda</h2><p className="mt-1 text-xs text-slate-500">Lanjutkan pekerjaan, task, dan dokumen dari satu tempat.</p></div>
              {isLoading || isLoadingArtifacts ? <span role="status" className="pb-1 text-xs text-slate-500">Memuat…</span> : null}
            </div>
            <div className="mt-4 flex gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Jenis pekerjaan">
              {(['workspaces', 'tasks', 'documents', 'files'] as Collection[]).map(key => <button key={key} type="button" role="tab" aria-selected={collection === key} onClick={() => setCollection(key)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${collection === key ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'}`}><span>{collectionLabels[key]}</span><span className={`rounded-full px-1.5 py-0.5 text-[10px] ${collection === key ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{collectionCounts[key]}</span></button>)}
            </div>
          </div>

          <div className="p-3 sm:p-5" role="tabpanel" aria-label={collectionLabels[collection]}>
            {collection === 'workspaces' && (pinned.length || unpinned.length || (!recent.length && filteredLegacyChats.length)) ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...pinned, ...unpinned].slice(0, 9).map(workspace => <WorkspaceCard key={workspace.id} title={workspace.name} detail={workspace.planSummary ? `${workspace.planSummary.completedCount}/${workspace.planSummary.taskCount} task selesai · ${workspace.planSummary.title}` : `${workspace.tasks?.filter(task => task.status !== 'done').length || 0} task aktif`} updatedAt={workspace.updatedAt} pinned={Boolean(workspace.isPinned)} onClick={() => navigate(`/workspace/c/${encodeURIComponent(workspace.chatId)}`)} />)}
              {!recent.length && filteredLegacyChats.slice(0, 9).map(chat => <WorkspaceCard key={chat.id} title={chat.title} detail="Percakapan RuangKerja" updatedAt={chat.updatedAt} onClick={() => navigate(`/workspace/c/${encodeURIComponent(chat.id)}`)} />)}
            </div> : null}
            {collection === 'tasks' && activeTasks.length > 0 ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{activeTasks.slice(0, 9).map(({ task, workspace }) => <WorkspaceCard key={task.id} title={task.title} detail={`${workspace.name} · ${task.status === 'running' ? 'Sedang dikerjakan' : task.status === 'failed' ? 'Perlu dicoba lagi' : 'Belum dikerjakan'}`} updatedAt={task.updatedAt} icon={<span className={`h-2 w-2 rounded-full ${task.status === 'running' ? 'animate-pulse bg-amber-500' : task.status === 'failed' ? 'bg-rose-500' : 'bg-slate-400'}`} />} onClick={() => navigate(`/workspace/c/${encodeURIComponent(workspace.chatId)}`)} />)}</div> : null}
            {collection === 'documents' && filteredArtifacts.length > 0 ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{filteredArtifacts.slice(0, 9).map(artifact => {
              const ownerWorkspace = workspaces.find(workspace => workspace.chatId === artifact.chatId);
              const ownerChat = legacyChats.find(chat => chat.id === artifact.chatId);
              return <WorkspaceCard key={artifact.id} title={artifact.title} detail={ownerWorkspace?.name || ownerChat?.title || 'Workspace'} updatedAt={artifact.updatedAt} icon={<FileText className="h-4 w-4" />} onClick={() => artifact.chatId && navigate(`/workspace/c/${encodeURIComponent(artifact.chatId)}`)} disabled={!artifact.chatId} />;
            })}</div> : null}
            {collection === 'files' && filteredFiles.length > 0 ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{filteredFiles.slice(0, 9).map(file => <WorkspaceCard key={file.id} title={file.filename} detail={`${file.workspaceName} · ${file.status === 'ready' ? `Siap${file.chunkCount ? ` · ${file.chunkCount} bagian` : ''}` : file.status === 'processing' ? 'Diproses' : 'Perlu diperiksa'}`} updatedAt={file.createdAt} icon={<FileText className="h-4 w-4" />} onClick={() => navigate(`/workspace/c/${encodeURIComponent(file.workspaceId)}`)} />)}</div> : null}
            {collectionCounts[collection] === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-950/40">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{query ? `${collectionLabels[collection]} tidak ditemukan` : collection === 'workspaces' ? allEmpty ? 'Workspace pertama Anda dimulai di sini' : 'Belum ada workspace' : `Belum ada ${collectionLabels[collection].toLocaleLowerCase()} aktif`}</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{query ? 'Coba kata kunci lain atau hapus pencarian.' : collection === 'workspaces' ? 'Mulai pekerjaan baru, lalu semua progres dan dokumennya akan tersimpan di sini.' : 'Saat pekerjaan Anda menghasilkan item baru, item tersebut akan muncul di sini.'}</p>
              {collection === 'workspaces' && !query && <button type="button" onClick={() => startWorkspace()} className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Plus className="h-3.5 w-3.5" /> Workspace baru</button>}
            </div>}
          </div>
        </section>

        {loadError && <p role="status" className="mt-4 text-xs text-amber-700 dark:text-amber-300">{loadError} Riwayat percakapan lama tetap dapat dibuka dari sidebar.</p>}
      </div>
    </div>
  );
};

const QuickAction: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void }> = ({ label, icon, onClick }) => <button type="button" onClick={onClick} className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">{icon}</span><span className="min-w-0 flex-1 text-xs font-medium leading-5 text-slate-700 group-hover:text-emerald-800 dark:text-slate-200 dark:group-hover:text-emerald-200">{label}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 sm:opacity-100" /></button>;

const WorkspaceCard: React.FC<{ title: string; detail?: string; updatedAt?: string; pinned?: boolean; icon?: React.ReactNode; disabled?: boolean; onClick: () => void }> = ({ title, detail, updatedAt, pinned, icon, disabled, onClick }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="flex min-h-[68px] min-w-0 items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-default dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">{icon || <BookOpen className="h-4 w-4" />}</span>
    <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{title}{pinned && <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Disematkan</span>}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{detail || (updatedAt ? `Diperbarui ${new Date(updatedAt).toLocaleDateString('id-ID')}` : 'Workspace')}</span></span>
    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
  </button>
);

export default WorkspaceHome;
