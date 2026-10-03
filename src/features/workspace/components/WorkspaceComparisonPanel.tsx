import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, FilePlus2, Square, SquareStop } from 'lucide-react';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';
import type { WorkspaceComparisonCandidate, WorkspaceComparisonRun } from '../types';

interface Props {
  run: WorkspaceComparisonRun | null;
  onUseResponse: (run: WorkspaceComparisonRun, candidate: WorkspaceComparisonCandidate) => void;
  onSendToCanvas: (candidate: WorkspaceComparisonCandidate) => void;
  onCompareAgain: (run: WorkspaceComparisonRun) => void;
}

function csrfHeaders(): Record<string, string> {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  return { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(match ? { 'X-CSRF-Token': decodeURIComponent(match[1]) } : {}) };
}

const CandidateCard = React.memo(function CandidateCard({ candidate, run, selected, selectionLocked, onUse, onCanvas, onCancel, onRetry }: {
  candidate: WorkspaceComparisonCandidate;
  run: WorkspaceComparisonRun;
  selected: boolean;
  selectionLocked: boolean;
  onUse: Props['onUseResponse'];
  onCanvas: Props['onSendToCanvas'];
  onCancel: (candidateId: string) => void;
  onRetry: (candidateId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const statusDisplay = candidate.status === 'queued'
    ? { text: 'Thinking…', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' }
    : candidate.status === 'streaming'
    ? { text: 'Generating…', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' }
    : candidate.status === 'completed'
    ? { text: 'Selesai', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' }
    : candidate.status === 'cancelled'
    ? { text: 'Dihentikan', color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' }
    : { text: 'Gagal', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' };

  const copy = async () => {
    try { await navigator.clipboard.writeText(candidate.output); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
    catch { setCopied(false); }
  };

  return <article id={`comparison-candidate-${candidate.candidateId}`} aria-labelledby={`comparison-tab-${candidate.candidateId}`} className="min-w-0 flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950 transition-all">
    <header className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{candidate.modelName}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`inline-block px-1.5 py-0.2 rounded-full border text-[9px] font-medium ${statusDisplay.color}`}>
            {statusDisplay.text}
          </span>
          {candidate.latencyMs !== undefined && (
            <span role="status" aria-live="polite" className="text-[10px] text-slate-400">
              {(candidate.latencyMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {candidate.status === 'streaming' && (
          <button type="button" onClick={() => onCancel(candidate.candidateId)} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={`Hentikan ${candidate.modelName}`}><Square className="h-3 w-3" />Stop</button>
        )}
        {(candidate.status === 'failed' || candidate.status === 'cancelled') && (
          <button type="button" onClick={() => onRetry(candidate.candidateId)} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={`Coba lagi ${candidate.modelName}`}>Retry</button>
        )}
      </div>
    </header>
    <div className="flex-1 min-h-28 max-h-[55vh] overflow-y-auto p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap select-text">
      {candidate.error || candidate.output || (candidate.status === 'streaming' ? 'Menulis…' : candidate.status === 'failed' ? 'Respons model ini gagal dibuat. Kandidat lain tetap berjalan.' : candidate.status === 'cancelled' ? 'Respons dihentikan.' : 'Menunggu respons…')}
    </div>
    <footer className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-2 py-2 dark:border-slate-800">
      <button type="button" disabled={candidate.status !== 'completed' || !candidate.output || selectionLocked} onClick={() => onUse(run, candidate)} className="h-7 rounded-md bg-emerald-700 px-2.5 text-[10px] font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Check className="mr-1 inline h-3 w-3" />{selected ? 'Dipakai di percakapan' : 'Gunakan jawaban ini'}</button>
      <button type="button" disabled={!candidate.output} onClick={copy} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Copy className="h-3 w-3" />{copied ? 'Tersalin' : 'Salin'}</button>
      <button type="button" disabled={candidate.status !== 'completed' || !candidate.output} onClick={() => onCanvas(candidate)} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><FilePlus2 className="h-3 w-3" />Kirim ke Canvas</button>
    </footer>
  </article>;
});

export const WorkspaceComparisonPanel = React.memo(function WorkspaceComparisonPanel({ run, onUseResponse, onSendToCanvas, onCompareAgain }: Props) {
  const { models } = useAiModelCatalog();
  const [candidates, setCandidates] = useState<WorkspaceComparisonCandidate[]>([]);
  const [activeMobileId, setActiveMobileId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mobileTabRefs = useRef(new Map<string, HTMLButtonElement>());
  const candidatesRef = useRef<WorkspaceComparisonCandidate[]>([]);
  const runIdRef = useRef<string | null>(null);

  const modelsRef = useRef(models);
  modelsRef.current = models;
  const updateCandidate = useCallback((id: string, update: Partial<WorkspaceComparisonCandidate>) => {
    const next = candidatesRef.current.map(candidate => candidate.candidateId === id
        ? candidate.status === 'cancelled' && update.status !== 'cancelled' ? candidate : { ...candidate, ...update }
        : candidate);
    candidatesRef.current = next;
    setCandidates(next);
  }, []);

  useEffect(() => {
    if (!run) return;
    const controller = new AbortController();
    abortRef.current = controller;
    runIdRef.current = run.comparisonId;
    let active = true;
    const nextCandidates = run.selectedModelIds.map(modelId => ({ candidateId: modelId, modelId, modelName: modelsRef.current.find(model => model.id === modelId)?.name || modelId, status: 'queued' as const, output: '' }));
    candidatesRef.current = nextCandidates;
    setCandidates(nextCandidates);
    setActiveMobileId(nextCandidates[0]?.candidateId || '');
    setNotice('');
    setSelectedCandidateId(null);
    setIsRunning(true);

    const start = async () => {
      try {
        const response = await fetch('/api/v1/chat/compare/stream', { method: 'POST', credentials: 'include', headers: csrfHeaders(), signal: controller.signal, body: JSON.stringify(run) });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || 'Comparison tidak dapat dimulai.');
        }
        if (!response.body) throw new Error('Stream comparison tidak tersedia.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const event = JSON.parse(line.slice(6)) as { type: string; comparisonId: string; candidateId?: string; modelName?: string; text?: string; latencyMs?: number; errorCode?: string };
            if (!active || event.comparisonId !== run.comparisonId || runIdRef.current !== run.comparisonId) continue;
            const id = event.candidateId;
            if (event.type === 'candidate_started' && id) updateCandidate(id, { status: 'streaming', modelName: event.modelName || id });
            else if (event.type === 'candidate_chunk' && id && event.text) updateCandidate(id, { status: 'streaming', output: (candidatesRef.current.find(candidate => candidate.candidateId === id)?.output || '') + event.text });
            else if (event.type === 'candidate_completed' && id) updateCandidate(id, { status: 'completed', latencyMs: event.latencyMs });
            else if (event.type === 'candidate_failed' && id) updateCandidate(id, {
              status: 'failed', latencyMs: event.latencyMs,
              ...(event.errorCode === 'OUTPUT_REJECTED' ? { output: '', error: 'Respons ditahan oleh pemeriksaan keamanan.' } : {})
            });
            else if (event.type === 'candidate_cancelled' && id) updateCandidate(id, { status: 'cancelled', latencyMs: event.latencyMs });
          }
        }
      } catch (error) {
        if (active && !controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'Comparison terputus.');
      } finally {
        if (active) setIsRunning(false);
      }
    };
    const startTimer = window.setTimeout(() => { void start(); }, 0);
    return () => {
      active = false;
      window.clearTimeout(startTimer);
      controller.abort();
      abortRef.current = null;
      if (runIdRef.current === run.comparisonId) runIdRef.current = null;
    };
  }, [run, updateCandidate]);

  const cancelOne = useCallback(async (candidateId: string) => {
    if (!run) return;
    updateCandidate(candidateId, { status: 'cancelled' });
    await fetch(`/api/v1/chat/compare/${run.comparisonId}/cancel/${encodeURIComponent(candidateId)}`, { method: 'POST', credentials: 'include', headers: csrfHeaders() }).catch(() => undefined);
  }, [run, updateCandidate]);

  const stopAll = useCallback(async () => {
    if (!run) return;
    const next = candidatesRef.current.map(candidate => candidate.status === 'streaming' || candidate.status === 'queued' ? { ...candidate, status: 'cancelled' as const } : candidate);
    candidatesRef.current = next;
    setCandidates(next);
    await fetch(`/api/v1/chat/compare/${run.comparisonId}/cancel`, { method: 'POST', credentials: 'include', headers: csrfHeaders() }).catch(() => undefined);
    abortRef.current?.abort();
    setIsRunning(false);
  }, [run]);

  const retryOne = useCallback(async (candidateId: string) => {
    if (!run) return;
    updateCandidate(candidateId, { status: 'queued', output: '', error: undefined, latencyMs: undefined });
    try {
      const singleCandidateRun = {
        ...run,
        comparisonId: crypto.randomUUID(),
        selectedModelIds: [candidateId]
      };
      const response = await fetch('/api/v1/chat/compare/stream', {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
        body: JSON.stringify(singleCandidateRun)
      });
      if (!response.ok || !response.body) {
        updateCandidate(candidateId, { status: 'failed', error: 'Gagal mencoba ulang model ini.' });
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const event = JSON.parse(line.slice(6)) as { type: string; candidateId?: string; text?: string; latencyMs?: number; errorCode?: string };
          if (event.type === 'candidate_started') updateCandidate(candidateId, { status: 'streaming' });
          else if (event.type === 'candidate_chunk' && event.text) {
            updateCandidate(candidateId, {
              status: 'streaming',
              output: (candidatesRef.current.find(c => c.candidateId === candidateId)?.output || '') + event.text
            });
          } else if (event.type === 'candidate_completed') {
            updateCandidate(candidateId, { status: 'completed', latencyMs: event.latencyMs });
          } else if (event.type === 'candidate_failed') {
            updateCandidate(candidateId, {
              status: 'failed',
              latencyMs: event.latencyMs,
              ...(event.errorCode === 'OUTPUT_REJECTED' ? { output: '', error: 'Respons ditahan oleh pemeriksaan keamanan.' } : {})
            });
          } else if (event.type === 'candidate_cancelled') {
            updateCandidate(candidateId, { status: 'cancelled', latencyMs: event.latencyMs });
          }
        }
      }
    } catch {
      updateCandidate(candidateId, { status: 'failed', error: 'Gagal menghubungi model.' });
    }
  }, [run, updateCandidate]);

  const useCandidateResponse = useCallback((selectedRun: WorkspaceComparisonRun, selectedCandidate: WorkspaceComparisonCandidate) => {
    setSelectedCandidateId(selectedCandidate.candidateId);
    onUseResponse(selectedRun, selectedCandidate);
  }, [onUseResponse]);

  if (!run) return null;
  return <section aria-label="Hasil comparison AI" className="mx-auto w-full max-w-6xl px-3 pb-4 sm:px-5">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Perbandingan jawaban</h3><p className="text-[10px] text-slate-500">{selectedCandidateId ? 'Jawaban terpilih masuk ke percakapan; kandidat lain tetap di panel ini.' : 'Satu prompt · hasil belum ditambahkan ke riwayat percakapan'}</p></div>
      <div className="flex items-center gap-2">{isRunning && <button type="button" onClick={stopAll} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><SquareStop className="h-3 w-3" />Stop All</button>}<button type="button" disabled={isRunning} onClick={() => onCompareAgain(run)} className="h-7 rounded-md px-2 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Compare Again</button></div>
    </div>
    {notice && <p role="alert" className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{notice}</p>}
    <div role="tablist" aria-label="Pilih model jawaban" className="mb-2 flex gap-1 overflow-x-auto md:hidden">
      {candidates.map((candidate, index) => <button key={candidate.candidateId} id={`comparison-tab-${candidate.candidateId}`} ref={node => { if (node) mobileTabRefs.current.set(candidate.candidateId, node); else mobileTabRefs.current.delete(candidate.candidateId); }} role="tab" aria-controls={`comparison-candidate-${candidate.candidateId}`} aria-selected={candidate.candidateId === activeMobileId} tabIndex={candidate.candidateId === activeMobileId ? 0 : -1} onClick={() => setActiveMobileId(candidate.candidateId)} onKeyDown={event => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const nextIndex = (index + (event.key === 'ArrowRight' ? 1 : -1) + candidates.length) % candidates.length;
        const nextId = candidates[nextIndex].candidateId;
        setActiveMobileId(nextId);
        mobileTabRefs.current.get(nextId)?.focus();
      }} className="min-h-9 shrink-0 rounded-lg border border-slate-200 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700">{candidate.modelName} · {candidate.status === 'completed' ? 'Selesai' : candidate.status === 'failed' ? 'Gagal' : candidate.status === 'cancelled' ? 'Stop' : candidate.status === 'streaming' ? 'Menjawab' : 'Menunggu'}</button>)}
    </div>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
      {candidates.map(candidate => <div key={candidate.candidateId} className={candidate.candidateId === activeMobileId ? '' : 'hidden md:block'}><CandidateCard candidate={candidate} run={run} selected={candidate.candidateId === selectedCandidateId} selectionLocked={selectedCandidateId !== null} onUse={useCandidateResponse} onCanvas={onSendToCanvas} onCancel={cancelOne} onRetry={retryOne} /></div>)}
    </div>
  </section>;
});
