import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Circle, ListChecks, Pause, Play, Plus, Sparkles, X } from 'lucide-react';
import type { WorkspacePlan, WorkspaceTaskStatus } from '../../../../shared/contracts/workspace';

const agentToolLabels: Record<string, string> = {
  search_workspace_documents: 'Pencarian dokumen',
  read_workspace_artifact: 'Membaca artifact',
  inspect_workspace_dataset: 'Inspeksi dataset',
  analyze_workspace_dataset: 'Analisis dataset'
};

interface Props {
  plan: WorkspacePlan | null;
  workspaceKey?: string;
  isLoading?: boolean;
  canPersist: boolean;
  isGenerating: boolean;
  isExecuting: boolean;
  isContinuousRunning?: boolean;
  onStartContinuous?: () => void;
  onStopContinuous?: () => void;
  onGenerate: (goal: string) => void;
  onUpdate: (plan: WorkspacePlan) => Promise<unknown>;
  onTransition: (action: 'pause' | 'resume') => void;
  onRecover: (taskId: string, executionId: string) => void;
  onModelChange: (taskId: string, modelId: string | null) => void;
  onRun: (taskId: string, feedback?: string) => void;
  onCancel: () => void;
  onComplete: () => void;
  modelOptions: Array<{ id: string; name: string }>;
  onOpenArtifact: (artifactId: string) => void;
  onOpenSource: (source: { documentId: string }) => void;
  onAcceptReview: (taskId: string) => void;
  onRejectReview: (taskId: string) => void;
  hideHeader?: boolean;
  focusedTaskId?: string;
}

export const WorkspaceTasksPanel: React.FC<Props> = ({ plan, workspaceKey, isLoading = false, canPersist, isGenerating, isExecuting, isContinuousRunning = false, onStartContinuous, onStopContinuous, onGenerate, onUpdate, onTransition, onRecover, onModelChange, onRun, onCancel, onComplete, modelOptions, onOpenArtifact, onOpenSource, onAcceptReview, onRejectReview, hideHeader = false, focusedTaskId }) => {
  const [expanded, setExpanded] = useState(() => Boolean(plan));
  const [goal, setGoal] = useState('');
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const doneCount = plan?.tasks.filter(task => task.status === 'done').length || 0;
  const nextTask = useMemo(() => plan?.tasks.find(task => task.status === 'todo' && task.dependsOn.every(id => plan.tasks.find(candidate => candidate.id === id)?.status === 'done')), [plan]);
  const persist = async (updated: WorkspacePlan) => { try { const merged = updated.status === 'draft' ? { ...updated, tasks: updated.tasks.map(task => ({ ...task, title: titleEdits[task.id]?.trim() || task.title })) } : updated; await onUpdate({ ...merged, updatedAt: new Date().toISOString() }); setTitleEdits({}); setError(null); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Perubahan plan gagal disimpan.'); } };
  const updateTask = (taskId: string, patch: Partial<WorkspacePlan['tasks'][number]>) => plan && void persist({ ...plan, tasks: plan.tasks.map(task => task.id === taskId ? { ...task, ...patch } : task) });
  const reorder = (index: number, delta: number) => {
    if (!plan) return;
    const tasks = [...plan.tasks]; const target = index + delta;
    if (target < 0 || target >= tasks.length) return;
    [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
    // Preserve a valid order by making each reordered task depend only on earlier tasks.
    const ids = tasks.map(task => task.id);
    const normalized = tasks.map((task, i) => ({ ...task, dependsOn: task.dependsOn.filter(id => ids.indexOf(id) < i) }));
    void persist({ ...plan, tasks: normalized });
  };
  const statusLabel: Record<WorkspaceTaskStatus, string> = { todo: 'Menunggu', running: 'Berjalan', waiting_review: 'Perlu ditinjau', done: 'Selesai', failed: 'Gagal', cancelled: 'Dibatalkan' };

  useEffect(() => { if (plan) setExpanded(true); }, [plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- expand only when a different plan is loaded.
  useLayoutEffect(() => {
    setGoal('');
    setTitleEdits({});
    setReviewFeedback({});
    setError(null);
    setExpanded(false);
  }, [workspaceKey]);
  useEffect(() => {
    if (!focusedTaskId) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-workspace-task-id]'))
      .find(element => element.dataset.workspaceTaskId === focusedTaskId);
    target?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    target?.focus?.({ preventScroll: true });
  }, [focusedTaskId, plan?.tasks]);

  return <section className="shrink-0 border-b border-slate-200/70 bg-white dark:border-slate-800/80 dark:bg-[#0F172A]" aria-label="Agent Workflow">
    {!hideHeader && <div className="flex min-h-10 items-center gap-2 px-3 sm:px-4">
      <button type="button" onClick={() => setExpanded(open => !open)} aria-expanded={expanded} className="flex min-h-10 flex-1 items-center gap-2 text-left text-xs text-slate-600 dark:text-slate-300">
        <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><span className="font-semibold">Plan</span>
        {plan && <><span className="min-w-0 truncate text-slate-500">{plan.title}</span><span className="ml-auto shrink-0 text-slate-500">{doneCount}/{plan.tasks.length}</span></>}
        {!plan && <span className="text-slate-500">Uraikan pekerjaan bertahap</span>}
        <span className="text-slate-400">{expanded ? 'Tutup' : 'Buka'}</span>
      </button>
    </div>}
    {(expanded || hideHeader) && <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-3 py-3 sm:px-4">
      {error && <p role="alert" className="mb-2 text-xs text-rose-600">{error}</p>}
      {isLoading ? <p role="status" className="py-5 text-center text-xs text-slate-500">Memuat rencana Workspace…</p> : !plan ? <>
        <p className="mb-2 text-xs text-slate-500">Buat draft langkah yang bisa ditinjau dan diedit sebelum dijalankan.</p>
        {!canPersist && <p className="mb-2 text-[11px] text-slate-500">Kirim pesan untuk menyimpan Workspace sebelum membuat plan.</p>}
        <form onSubmit={event => { event.preventDefault(); if (goal.trim()) { setExpanded(true); onGenerate(goal.trim()); } }} className="flex gap-2">
          <input value={goal} onChange={event => setGoal(event.target.value.slice(0, 1000))} maxLength={1000} placeholder="Apa yang ingin diselesaikan?" aria-label="Tujuan workflow" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
          <button type="submit" disabled={!canPersist || !goal.trim() || isGenerating} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />{isGenerating ? 'Menyusun…' : 'Buat plan'}</button>
        </form>
      </> : <>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">{plan.title}</h3><p className="mt-1 text-[11px] text-slate-500">Tujuan: {plan.goal}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{plan.status}</span></div>
        <ol className="mt-3 space-y-1.5">
          {plan.tasks.map((task, index) => {
            const ready = task.dependsOn.every(id => plan.tasks.find(candidate => candidate.id === id)?.status === 'done');
            return <li key={task.id} data-workspace-task-id={task.id} tabIndex={focusedTaskId === task.id ? -1 : undefined} aria-current={focusedTaskId === task.id ? 'location' : undefined} className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${focusedTaskId === task.id ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30' : task.status === 'running' ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-slate-100 dark:border-slate-800'}`}>
              {task.status === 'done' ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : task.status === 'running' ? <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-amber-500" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
              <div className="min-w-0 flex-1">
                {plan.status === 'draft' ? <input aria-label={`Nama task ${index + 1}`} value={titleEdits[task.id] ?? task.title} onChange={event => setTitleEdits(current => ({ ...current, [task.id]: event.target.value.slice(0, 240) }))} className="w-full bg-transparent text-xs font-medium outline-none" /> : <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{task.title}</p>}
                <p className="text-[10px] text-slate-500">{statusLabel[task.status]}{task.status === 'running' && isExecuting ? ' · Agent sedang menjalankan task' : ''}{task.dependsOn.length ? ` · setelah ${task.dependsOn.map(id => plan.tasks.find(candidate => candidate.id === id)?.title).filter(Boolean).join(', ')}` : ''}</p>
                {task.output && <details className="mt-1"><summary className="cursor-pointer text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Tinjau hasil</summary><p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">{task.output.slice(0, 1200)}{task.output.length > 1200 ? '…' : ''}</p>{task.sources?.map(source => <button type="button" key={`${source.documentId}:${source.citationId}`} onClick={() => onOpenSource(source)} className="mr-2 mt-1 text-[10px] text-emerald-700 hover:underline dark:text-emerald-300">{source.filename}{source.sourceRef !== source.filename ? ` · ${source.sourceRef}` : ''}</button>)}{task.outputArtifactId && <button type="button" onClick={() => onOpenArtifact(task.outputArtifactId!)} className="mt-1 block text-[10px] font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Output → buka Canvas</button>}</details>}
                {task.executionEvents?.length ? <details className="mt-1"><summary className="cursor-pointer text-[10px] text-slate-500">Detail eksekusi ({task.executionEvents.length} langkah tercatat)</summary><ol className="mt-1 space-y-0.5 text-[10px] text-slate-500">{task.executionEvents.map((event, eventIndex) => <li key={`${event.step}:${event.kind}:${event.toolCallId || eventIndex}`}>{event.step}. {event.kind === 'model_decision' ? 'Penalaran model' : agentToolLabels[event.toolId || ''] || 'Tool'} · {event.status === 'completed' ? 'selesai' : event.status === 'cancelled' ? 'dibatalkan' : 'gagal'} · {event.durationMs} ms{event.errorCode ? ` · ${event.errorCode}` : ''}</li>)}</ol></details> : null}
                {task.status === 'waiting_review' && <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => onAcceptReview(task.id)} className="h-7 rounded bg-emerald-700 px-2 text-[10px] font-semibold text-white">Terima hasil</button><button type="button" onClick={() => onRejectReview(task.id)} className="h-7 rounded px-2 text-[10px] text-rose-700">Tolak</button><div className="flex min-w-40 flex-1 gap-1"><input aria-label={`Instruksi revisi ${task.title}`} value={reviewFeedback[task.id] || ''} onChange={event => setReviewFeedback(current => ({ ...current, [task.id]: event.target.value.slice(0, 1000) }))} placeholder="Masukan revisi…" className="h-7 min-w-0 flex-1 rounded border border-slate-200 bg-transparent px-2 text-[10px] dark:border-slate-700" /><button type="button" disabled={!reviewFeedback[task.id]?.trim() || isExecuting} onClick={() => onRun(task.id, reviewFeedback[task.id])} className="h-7 rounded border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">Minta revisi</button></div></div>}
              </div>
              {plan.status === 'draft' && <div className="flex shrink-0 items-center"><button type="button" aria-label={`Pindah task ${index + 1} ke atas`} onClick={() => reorder(index, -1)} className="p-1 text-slate-400"><ChevronUp className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Pindah task ${index + 1} ke bawah`} onClick={() => reorder(index, 1)} className="p-1 text-slate-400"><ChevronDown className="h-3.5 w-3.5" /></button><button type="button" disabled={plan.tasks.length <= 1} aria-label={`Hapus task ${task.title}`} onClick={() => void persist({ ...plan, tasks: plan.tasks.filter(item => item.id !== task.id).map(item => ({ ...item, dependsOn: item.dependsOn.filter(id => id !== task.id) })) })} className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"><X className="h-3.5 w-3.5" /></button></div>}
              {(plan.status === 'draft' || task.status === 'failed') && <select aria-label={`Model task ${index + 1}`} value={task.modelId || ''} onChange={event => { const modelId = event.target.value || null; if (plan.status === 'draft') updateTask(task.id, { modelId: modelId || undefined }); else onModelChange(task.id, modelId); }} className="h-7 max-w-28 rounded border border-slate-200 bg-white px-1 text-[10px] dark:border-slate-700 dark:bg-slate-900"><option value="">Auto</option><option value="auto">Auto routing</option>{modelOptions.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select>}
              {(plan.status === 'approved' || plan.status === 'running') && task.status === 'todo' && ready && <button type="button" disabled={isExecuting} onClick={() => onRun(task.id)} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-emerald-700 px-2 text-[10px] font-semibold text-white disabled:opacity-50"><Play className="h-3 w-3" />Jalankan</button>}
              {task.status === 'failed' && (plan.status === 'approved' || plan.status === 'running') && <button type="button" disabled={isExecuting || !ready} onClick={() => onRun(task.id)} className="text-[10px] font-semibold text-emerald-700 disabled:opacity-50">Coba lagi</button>}
              {task.status === 'running' && task.executionId && !isExecuting && <button type="button" onClick={() => onRecover(task.id, task.executionId!)} className="text-[10px] font-semibold text-amber-700">Tandai terputus</button>}
            </li>;
          })}
        </ol>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {plan.status === 'draft' && <>
            <button type="button" disabled={plan.tasks.length >= 12} onClick={() => void persist({ ...plan, tasks: [...plan.tasks, { id: crypto.randomUUID(), title: 'Task baru', type: 'analysis', dependsOn: [], status: 'todo' }] })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"><Plus className="h-3 w-3" />Tambah task</button>
            <button type="button" disabled={plan.tasks.length === 0 || plan.tasks.some(task => !(titleEdits[task.id] ?? task.title).trim())} onClick={() => void persist({ ...plan, status: 'approved', tasks: plan.tasks.map(task => ({ ...task, title: titleEdits[task.id]?.trim() || task.title })) })} className="ml-auto h-8 rounded-lg bg-emerald-700 px-3 text-[11px] font-semibold text-white disabled:opacity-50">Setujui plan</button>
          </>}
          {(plan.status === 'approved' || plan.status === 'running') && <>
            {onStartContinuous && nextTask && !isContinuousRunning && (
              <button
                type="button"
                disabled={isExecuting}
                onClick={onStartContinuous}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-[11px] font-semibold text-white shadow-xs hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                title="Jalankan seluruh langkah secara bertahap otomatis hingga tinjauan user"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Jalankan otomatis
              </button>
            )}
            {onStopContinuous && isContinuousRunning && (
              <button
                type="button"
                onClick={onStopContinuous}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                title="Hentikan eksekusi beruntun otomatis"
              >
                <Pause className="h-3 w-3" />
                Otomatis aktif (jeda)
              </button>
            )}
            {nextTask && !isContinuousRunning && <button type="button" disabled={isExecuting} onClick={() => onRun(nextTask.id)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"><Play className="h-3 w-3" />Jalankan berikutnya</button>}
            {isExecuting && <button type="button" onClick={onCancel} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 px-3 text-[11px] font-semibold text-rose-700"><X className="h-3 w-3" />Stop task</button>}
            {doneCount === plan.tasks.length && <button type="button" onClick={onComplete} className="ml-auto h-8 rounded-lg bg-slate-800 px-3 text-[11px] font-semibold text-white">Konfirmasi selesai</button>}
            {doneCount < plan.tasks.length && <button type="button" onClick={() => onTransition('pause')} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold text-slate-600"><Pause className="h-3 w-3" />Jeda</button>}
            <button type="button" onClick={onCancel} className="h-8 rounded-lg px-2 text-[11px] text-slate-500">Batalkan plan</button>
          </>}
          {plan.status === 'paused' && <button type="button" onClick={() => onTransition('resume')} className="h-8 rounded-lg bg-emerald-700 px-3 text-[11px] font-semibold text-white">Lanjutkan plan</button>}
          {plan.status === 'completed' && <p className="text-[11px] text-emerald-700">Hasil akhir dikonfirmasi.</p>}
        </div>
      </>}
    </div>}
  </section>;
};
