import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, FilePlus2, Square, SquareStop } from 'lucide-react';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';
import type { WorkspaceComparisonCandidate, WorkspaceComparisonRun } from '../types';

interface Props {
  run: WorkspaceComparisonRun | null;
  onUseResponse: (run: WorkspaceComparisonRun, candidate: WorkspaceComparisonCandidate) => Promise<boolean | void> | boolean | void;
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
        {(candidate.status === 'streaming' || candidate.status === 'queued') && (
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

interface CandidateChunkBuffer {
  candidateId: string;
  attemptId: string;
  chunks: string[];
}

export const WorkspaceComparisonPanel = React.memo(function WorkspaceComparisonPanel({ run, onUseResponse, onSendToCanvas, onCompareAgain }: Props) {
  const { models } = useAiModelCatalog();
  const [candidates, setCandidates] = useState<WorkspaceComparisonCandidate[]>([]);
  const [activeMobileId, setActiveMobileId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectionPending, setSelectionPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const retryControllersRef = useRef(new Map<string, AbortController>());
  const candidateAttemptsRef = useRef(new Map<string, string>());
  const mobileTabRefs = useRef(new Map<string, HTMLButtonElement>());
  const candidatesRef = useRef<WorkspaceComparisonCandidate[]>([]);
  const candidateChunkBuffersRef = useRef(new Map<string, CandidateChunkBuffer>());
  const candidateChunkTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const runIdRef = useRef<string | null>(null);

  const modelsRef = useRef(models);
  modelsRef.current = models;
  const updateCandidate = useCallback((id: string, update: Partial<WorkspaceComparisonCandidate>, expectedAttemptId?: string) => {
    const next = candidatesRef.current.map(candidate => candidate.candidateId === id && (!expectedAttemptId || candidateAttemptsRef.current.get(id) === expectedAttemptId)
        ? candidate.status === 'cancelled' && update.status !== 'cancelled' && expectedAttemptId === candidate.attemptId ? candidate : { ...candidate, ...update }
        : candidate);
    candidatesRef.current = next;
    setCandidates(next);
  }, []);

  const discardCandidateChunkBuffers = useCallback((candidateId?: string) => {
    for (const [key, buffer] of candidateChunkBuffersRef.current) {
      if (candidateId && buffer.candidateId !== candidateId) continue;
      const timer = candidateChunkTimersRef.current.get(key);
      if (timer) clearTimeout(timer);
      candidateChunkTimersRef.current.delete(key);
      candidateChunkBuffersRef.current.delete(key);
    }
  }, []);

  const flushCandidateChunks = useCallback((candidateId: string, attemptId: string) => {
    const key = `${candidateId}:${attemptId}`;
    const timer = candidateChunkTimersRef.current.get(key);
    if (timer) clearTimeout(timer);
    candidateChunkTimersRef.current.delete(key);
    const buffer = candidateChunkBuffersRef.current.get(key);
    candidateChunkBuffersRef.current.delete(key);
    if (!buffer || candidateAttemptsRef.current.get(candidateId) !== attemptId) return;
    const candidate = candidatesRef.current.find(item => item.candidateId === candidateId);
    updateCandidate(candidateId, { status: 'streaming', output: (candidate?.output || '') + buffer.chunks.join('') }, attemptId);
  }, [updateCandidate]);

  const enqueueCandidateChunk = useCallback((candidateId: string, attemptId: string, text: string) => {
    const key = `${candidateId}:${attemptId}`;
    let buffer = candidateChunkBuffersRef.current.get(key);
    if (!buffer) {
      buffer = { candidateId, attemptId, chunks: [] };
      candidateChunkBuffersRef.current.set(key, buffer);
    }
    buffer.chunks.push(text);
    if (!candidateChunkTimersRef.current.has(key)) {
      candidateChunkTimersRef.current.set(key, setTimeout(() => flushCandidateChunks(candidateId, attemptId), 50));
    }
  }, [flushCandidateChunks]);

  useEffect(() => {
    if (!run) return;
    discardCandidateChunkBuffers();
    const runKey = `${run.workspaceIdentity || ''}:${run.chatId || ''}:${run.comparisonId}:${run.snapshotId}`;
    const activeRetryControllers = retryControllersRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    runIdRef.current = runKey;
    let active = true;
    candidateAttemptsRef.current.clear();
    activeRetryControllers.forEach(item => item.abort());
    activeRetryControllers.clear();
    const nextCandidates = run.selectedModelIds.map(modelId => ({ candidateId: modelId, modelId, modelName: modelsRef.current.find(model => model.id === modelId)?.name || modelId, status: 'queued' as const, output: '' }));
    candidatesRef.current = nextCandidates;
    setCandidates(nextCandidates);
    setActiveMobileId(nextCandidates[0]?.candidateId || '');
    setNotice('');
    setSelectedCandidateId(null);
    setSelectionPending(false);
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
            let event: { type: string; comparisonId: string; snapshotId?: string; contextFingerprint?: string; candidateId?: string; attemptId?: string; attempts?: Array<{ candidateId: string; attemptId: string }>; modelName?: string; text?: string; latencyMs?: number; errorCode?: string };
            try { event = JSON.parse(line.slice(6)); } catch { continue; }
            if (!active || event.comparisonId !== run.comparisonId || event.snapshotId !== run.snapshotId || runIdRef.current !== runKey) continue;
            if (event.type === 'comparison_started' && event.attempts) {
              event.attempts.forEach(attempt => {
                candidateAttemptsRef.current.set(attempt.candidateId, attempt.attemptId);
                updateCandidate(attempt.candidateId, { attemptId: attempt.attemptId, comparisonId: event.comparisonId, snapshotId: event.snapshotId, contextFingerprint: event.contextFingerprint });
              });
              continue;
            }
            const id = event.candidateId;
            if (!id || !event.attemptId) continue;
            if (event.type === 'candidate_started' && run.selectedModelIds.includes(id)) {
              candidateAttemptsRef.current.set(id, event.attemptId);
              updateCandidate(id, { status: 'streaming', modelName: event.modelName || id, comparisonId: event.comparisonId, snapshotId: event.snapshotId, attemptId: event.attemptId, contextFingerprint: event.contextFingerprint }, event.attemptId);
            } else if (candidateAttemptsRef.current.get(id) !== event.attemptId) continue;
            else if (event.type === 'candidate_chunk' && event.text) enqueueCandidateChunk(id, event.attemptId, event.text);
            else if (event.type === 'candidate_completed') {
              flushCandidateChunks(id, event.attemptId);
              updateCandidate(id, { status: 'completed', latencyMs: event.latencyMs }, event.attemptId);
            } else if (event.type === 'candidate_failed') {
              flushCandidateChunks(id, event.attemptId);
              updateCandidate(id, {
                status: 'failed', latencyMs: event.latencyMs,
                error: event.errorCode === 'OUTPUT_REJECTED' ? 'Respons ditahan oleh pemeriksaan keamanan.' : event.errorCode === 'PROVIDER_NOT_CONFIGURED' ? 'Provider model ini belum tersedia.' : 'Model gagal menyelesaikan respons.'
              }, event.attemptId);
            } else if (event.type === 'candidate_cancelled') {
              flushCandidateChunks(id, event.attemptId);
              updateCandidate(id, { status: 'cancelled', latencyMs: event.latencyMs }, event.attemptId);
            }
          }
        }
      } catch (error) {
        if (active && !controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'Comparison terputus.');
      } finally {
        if (active && runIdRef.current === runKey) setIsRunning(retryControllersRef.current.size > 0);
      }
    };
    const startTimer = window.setTimeout(() => { void start(); }, 0);
    return () => {
      const hasServerWork = candidatesRef.current.some(candidate => candidate.status === 'queued' || candidate.status === 'streaming');
      active = false;
      window.clearTimeout(startTimer);
      controller.abort();
      activeRetryControllers.forEach(item => item.abort());
      activeRetryControllers.clear();
      discardCandidateChunkBuffers();
      if (hasServerWork) {
        void fetch(`/api/v1/chat/compare/${run.comparisonId}/cancel`, {
          method: 'POST', credentials: 'include', headers: csrfHeaders()
        }).catch(() => undefined);
      }
      abortRef.current = null;
      if (runIdRef.current === runKey) runIdRef.current = null;
    };
  }, [run, updateCandidate, discardCandidateChunkBuffers, enqueueCandidateChunk, flushCandidateChunks]);

  const cancelOne = useCallback(async (candidateId: string) => {
    if (!run) return;
    const attemptId = candidateAttemptsRef.current.get(candidateId);
    if (!attemptId) return;
    flushCandidateChunks(candidateId, attemptId);
    retryControllersRef.current.get(attemptId)?.abort();
    updateCandidate(candidateId, { status: 'cancelled' }, attemptId);
    await fetch(`/api/v1/chat/compare/${run.comparisonId}/cancel/${encodeURIComponent(candidateId)}`, { method: 'POST', credentials: 'include', headers: csrfHeaders(), body: JSON.stringify({ attemptId }) }).catch(() => undefined);
  }, [run, updateCandidate, flushCandidateChunks]);

  const stopAll = useCallback(async () => {
    if (!run) return;
    for (const candidate of candidatesRef.current) {
      const attemptId = candidateAttemptsRef.current.get(candidate.candidateId);
      if (attemptId) flushCandidateChunks(candidate.candidateId, attemptId);
    }
    const next = candidatesRef.current.map(candidate => candidate.status === 'streaming' || candidate.status === 'queued' ? { ...candidate, status: 'cancelled' as const } : candidate);
    candidatesRef.current = next;
    setCandidates(next);
    retryControllersRef.current.forEach(item => item.abort());
    retryControllersRef.current.clear();
    await fetch(`/api/v1/chat/compare/${run.comparisonId}/cancel`, { method: 'POST', credentials: 'include', headers: csrfHeaders() }).catch(() => undefined);
    abortRef.current?.abort();
    setIsRunning(false);
  }, [run, flushCandidateChunks]);

  const retryOne = useCallback(async (candidateId: string) => {
    if (!run) return;
    discardCandidateChunkBuffers(candidateId);
    const attemptId = crypto.randomUUID();
    candidateAttemptsRef.current.set(candidateId, attemptId);
    updateCandidate(candidateId, { status: 'queued', output: '', error: undefined, latencyMs: undefined, attemptId });
    const controller = new AbortController();
    retryControllersRef.current.set(attemptId, controller);
    setIsRunning(true);
    try {
      const response = await fetch(`/api/v1/chat/compare/${run.comparisonId}/retry/${encodeURIComponent(candidateId)}`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
        signal: controller.signal,
        body: JSON.stringify({ snapshotId: run.snapshotId, attemptId })
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        updateCandidate(candidateId, { status: response.status === 410 ? 'failed' : 'failed', error: body.message || 'Gagal mencoba ulang model ini.' }, attemptId);
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
          let event: { type: string; comparisonId?: string; snapshotId?: string; candidateId?: string; attemptId?: string; contextFingerprint?: string; text?: string; latencyMs?: number; errorCode?: string };
          try { event = JSON.parse(line.slice(6)); } catch { continue; }
          if (event.comparisonId !== run.comparisonId || event.snapshotId !== run.snapshotId || event.candidateId !== candidateId || event.attemptId !== attemptId || runIdRef.current !== `${run.workspaceIdentity || ''}:${run.chatId || ''}:${run.comparisonId}:${run.snapshotId}`) continue;
          if (event.type === 'candidate_started') updateCandidate(candidateId, { status: 'streaming', comparisonId: event.comparisonId, snapshotId: event.snapshotId, contextFingerprint: event.contextFingerprint }, attemptId);
          else if (event.type === 'candidate_chunk' && event.text) enqueueCandidateChunk(candidateId, attemptId, event.text);
          else if (event.type === 'candidate_completed') {
            flushCandidateChunks(candidateId, attemptId);
            updateCandidate(candidateId, { status: 'completed', latencyMs: event.latencyMs }, attemptId);
          } else if (event.type === 'candidate_failed') {
            flushCandidateChunks(candidateId, attemptId);
            updateCandidate(candidateId, {
              status: 'failed',
              latencyMs: event.latencyMs,
              error: event.errorCode === 'OUTPUT_REJECTED' ? 'Respons ditahan oleh pemeriksaan keamanan.' : 'Model gagal menyelesaikan respons.'
            }, attemptId);
          } else if (event.type === 'candidate_cancelled') {
            flushCandidateChunks(candidateId, attemptId);
            updateCandidate(candidateId, { status: 'cancelled', latencyMs: event.latencyMs }, attemptId);
          }
        }
      }
    } catch {
      if (!controller.signal.aborted) updateCandidate(candidateId, { status: 'failed', error: 'Gagal menghubungi model.' }, attemptId);
    } finally {
      retryControllersRef.current.delete(attemptId);
      if (runIdRef.current === `${run.workspaceIdentity || ''}:${run.chatId || ''}:${run.comparisonId}:${run.snapshotId}`) setIsRunning(Boolean(abortRef.current && !abortRef.current.signal.aborted) || retryControllersRef.current.size > 0);
    }
  }, [run, updateCandidate, enqueueCandidateChunk, flushCandidateChunks, discardCandidateChunkBuffers]);

  const useCandidateResponse = useCallback((selectedRun: WorkspaceComparisonRun, selectedCandidate: WorkspaceComparisonCandidate) => {
    if (selectionPending || selectedCandidateId) return;
    setSelectionPending(true);
    void Promise.resolve(onUseResponse(selectedRun, selectedCandidate)).then(result => {
      if (result !== false) setSelectedCandidateId(selectedCandidate.candidateId);
    }).finally(() => setSelectionPending(false));
  }, [onUseResponse, selectedCandidateId, selectionPending]);

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
      {candidates.map(candidate => <div key={candidate.candidateId} className={candidate.candidateId === activeMobileId ? '' : 'hidden md:block'}><CandidateCard candidate={candidate} run={run} selected={candidate.candidateId === selectedCandidateId} selectionLocked={selectedCandidateId !== null || selectionPending} onUse={useCandidateResponse} onCanvas={onSendToCanvas} onCancel={cancelOne} onRetry={retryOne} /></div>)}
    </div>
  </section>;
});
