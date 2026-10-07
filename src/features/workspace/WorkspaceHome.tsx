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
  { label: 'Review kode', prompt: 'Tinjau kode yang saya berikan. Cari bug, risiko keamanan, dan perbaikan paling penting dengan penjelasan singkat.', icon: Code2 },
  { label: 'Bandingkan model', prompt: 'Bandingkan beberapa pendekatan untuk permintaan saya. Nyatakan kesepakatan, perbedaan penting, serta kekuatan dan keterbatasan tiap jawaban.', icon: Sparkles, compare: true },
  { label: 'Ringkas jurnal', prompt: 'Bantu saya merangkum jurnal: tujuan, metode, hasil, keterbatasan, dan implikasinya.', icon: FlaskConical },
  { label: 'Cari referensi', prompt: 'Bantu saya menyusun strategi pencarian referensi untuk topik ini. Sarankan kata kunci, sinonim, dan kriteria sumber yang relevan.', icon: Search },
  { label: 'Buat presentasi', prompt: 'Bantu saya merancang presentasi yang jelas. Tanyakan topik, audiens, durasi, dan bahan yang tersedia sebelum menyusun alur slide.', icon: FileText },
  { label: 'Brainstorm ide', prompt: 'Mari brainstorm ide untuk project saya. Bantu saya menghasilkan beberapa opsi dan cara mengevaluasinya.', icon: Lightbulb },
];

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
  const filteredArtifacts = query ? artifacts.filter(artifact => artifact.title.toLocaleLowerCase().includes(query)) : artifacts;
  const filteredFiles = query ? files.filter(file => file.filename.toLocaleLowerCase().includes(query)) : files;
  const startWorkspace = (prompt?: string, compareMode = false) => navigate('/workspace/new', { state: prompt ? { initialPrompt: prompt, initialCompareMode: compareMode } : undefined });
  const pinned = filteredWorkspaces.filter(workspace => workspace.isPinned);
  const unpinned = filteredWorkspaces.filter(workspace => !workspace.isPinned);
  const activeTasks: Array<{ task: WorkspaceTaskContract; workspace: WorkspaceContract }> = filteredWorkspaces.flatMap(workspace => (workspace.tasks || []).filter(task => task.status !== 'done').map(task => ({ task, workspace })));

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50/70 px-4 py-6 dark:bg-[#0b1220] sm:px-7 sm:py-9">
      <div className="mx-auto w-full max-w-5xl">
        {onOpenSidebar && <button type="button" onClick={onOpenSidebar} className="mb-5 flex h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"><Menu className="h-4 w-4" /> Menu workspace</button>}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400"><Sparkles className="h-4 w-4" /> RuangKerja</div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Apa yang ingin Anda kerjakan?</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">Lanjutkan workspace, buka dokumen terakhir, atau mulai pekerjaan baru dengan file dan konteks yang tetap terorganisir.</p>
          </div>
          <button type="button" onClick={() => startWorkspace()} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500">
            <Plus className="h-4 w-4" /> Workspace baru
          </button>
        </div>

        <label className="mt-7 flex h-11 max-w-2xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-400 shadow-sm focus-within:border-emerald-500 dark:border-slate-700 dark:bg-slate-900">
          <Search className="h-4 w-4 shrink-0" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari workspace atau dokumen" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" aria-label="Cari workspace atau dokumen" />
        </label>

        {query.length >= 2 && <section className="mt-5" aria-label="Hasil pencarian Workspace"><h2 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Hasil pencarian {searchLoading ? '· mencari…' : `· ${searchResults.length}`}</h2>{searchResults.length > 0 ? <div className="grid gap-2 sm:grid-cols-2">{searchResults.slice(0, 8).map((result, index) => <WorkspaceCard key={`${result.kind}:${result.itemId || result.chatId}:${index}`} title={result.title} detail={`${result.kind === 'workspace' ? 'Workspace' : result.kind === 'task' ? 'Task' : result.kind === 'artifact' ? 'Dokumen' : result.kind === 'file' ? 'File' : 'Percakapan'} · ${result.snippet}`} updatedAt={result.updatedAt} onClick={() => navigate(`/workspace/c/${encodeURIComponent(result.chatId)}`)} />)}</div> : !searchLoading ? <p className="rounded-xl border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-700">Tidak ada hasil yang cocok.</p> : null}</section>}

        <section className="mt-8" aria-labelledby="quick-actions-title">
          <div className="mb-3 flex items-center justify-between"><h2 id="quick-actions-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mulai dengan cepat</h2></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {quickActions.map(({ label, prompt, icon: Icon, compare }) => (
              <button key={label} type="button" onClick={() => startWorkspace(prompt, compare)} className="group flex min-h-[88px] flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30">
                <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <span className="flex w-full items-center justify-between gap-1 text-xs font-medium text-slate-700 dark:text-slate-200">{label}<ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" /></span>
              </button>
            ))}
          </div>
        </section>

        {(pinned.length > 0 || unpinned.length > 0 || legacyChats.length > 0) && <section className="mt-9" aria-labelledby="recent-workspaces-title">
          <h2 id="recent-workspaces-title" className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Workspace terbaru</h2>
          {pinned.length > 0 && <div className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{pinned.slice(0, 3).map(workspace => <WorkspaceCard key={workspace.id} title={workspace.name} detail={workspace.planSummary ? `${workspace.planSummary.completedCount}/${workspace.planSummary.taskCount} task selesai · ${workspace.planSummary.title}` : `${workspace.tasks?.filter(task => task.status !== 'done').length || 0} task aktif`} updatedAt={workspace.updatedAt} pinned onClick={() => navigate(`/workspace/c/${encodeURIComponent(workspace.chatId)}`)} />)}</div>}
          {unpinned.length > 0 && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{unpinned.slice(0, 6).map(workspace => <WorkspaceCard key={workspace.id} title={workspace.name} detail={workspace.planSummary ? `${workspace.planSummary.completedCount}/${workspace.planSummary.taskCount} task selesai · ${workspace.planSummary.title}` : `${workspace.tasks?.filter(task => task.status !== 'done').length || 0} task aktif`} updatedAt={workspace.updatedAt} onClick={() => navigate(`/workspace/c/${encodeURIComponent(workspace.chatId)}`)} />)}</div>}
          {!recent.length && legacyChats.slice(0, 6).map(chat => <WorkspaceCard key={chat.id} title={chat.title} updatedAt={chat.updatedAt} onClick={() => navigate(`/workspace/c/${encodeURIComponent(chat.id)}`)} />)}
          {!filteredWorkspaces.length && !legacyChats.length && query && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">Workspace tidak ditemukan.</p>}
        </section>}

        {activeTasks.length > 0 && <section className="mt-9" aria-labelledby="active-tasks-title"><h2 id="active-tasks-title" className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Task aktif</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{activeTasks.slice(0, 6).map(({ task, workspace }) => <WorkspaceCard key={task.id} title={task.title} detail={`${workspace.name} · ${task.status === 'running' ? 'Sedang dikerjakan' : task.status === 'failed' ? 'Perlu dicoba lagi' : 'Belum dikerjakan'}`} updatedAt={task.updatedAt} icon={<span className={`h-2 w-2 rounded-full ${task.status === 'running' ? 'animate-pulse bg-amber-500' : task.status === 'failed' ? 'bg-rose-500' : 'bg-slate-400'}`} />} onClick={() => navigate(`/workspace/c/${encodeURIComponent(workspace.chatId)}`)} />)}</div></section>}

        {filteredArtifacts.length > 0 && <section className="mt-9" aria-labelledby="recent-documents-title">
          <h2 id="recent-documents-title" className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Dokumen terbaru</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{filteredArtifacts.slice(0, 6).map(artifact => {
            const ownerWorkspace = workspaces.find(workspace => workspace.chatId === artifact.chatId);
            const ownerChat = legacyChats.find(chat => chat.id === artifact.chatId);
            return <WorkspaceCard key={artifact.id} title={artifact.title} detail={ownerWorkspace?.name || ownerChat?.title || 'Workspace'} updatedAt={artifact.updatedAt} icon={<FileText className="h-4 w-4" />} onClick={() => artifact.chatId && navigate(`/workspace/c/${encodeURIComponent(artifact.chatId)}`)} disabled={!artifact.chatId} />;
          })}</div>
        </section>}

        {filteredFiles.length > 0 && <section className="mt-9" aria-labelledby="recent-files-title"><h2 id="recent-files-title" className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">File terbaru</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{filteredFiles.slice(0, 6).map(file => <WorkspaceCard key={file.id} title={file.filename} detail={`${file.workspaceName} · ${file.status === 'ready' ? `Siap${file.chunkCount ? ` · ${file.chunkCount} bagian` : ''}` : file.status === 'processing' ? 'Diproses' : 'Perlu diperiksa'}`} updatedAt={file.createdAt} icon={<FileText className="h-4 w-4" />} onClick={() => navigate(`/workspace/c/${encodeURIComponent(file.workspaceId)}`)} />)}</div></section>}

        {loadError && <p role="status" className="mt-5 text-xs text-amber-700 dark:text-amber-300">{loadError} Riwayat percakapan lama tetap dapat dibuka dari sidebar.</p>}

        {!isLoading && !isLoadingArtifacts && !recent.length && !legacyChats.length && !artifacts.length && !files.length && <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Workspace dan dokumen Anda akan muncul di sini.</p>
          <p className="mt-1 text-xs text-slate-500">Mulai pekerjaan pertama, lalu lanjutkan dari command center ini kapan saja.</p>
        </div>}
      </div>
    </div>
  );
};

const WorkspaceCard: React.FC<{ title: string; detail?: string; updatedAt?: string; pinned?: boolean; icon?: React.ReactNode; disabled?: boolean; onClick: () => void }> = ({ title, detail, updatedAt, pinned, icon, disabled, onClick }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-sm disabled:cursor-default dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">{icon || <BookOpen className="h-4 w-4" />}</span>
    <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{title}{pinned && <span className="text-[10px] text-amber-600">• Disematkan</span>}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{detail || (updatedAt ? `Diperbarui ${new Date(updatedAt).toLocaleDateString('id-ID')}` : 'Workspace')}</span></span>
    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
  </button>
);

export default WorkspaceHome;
