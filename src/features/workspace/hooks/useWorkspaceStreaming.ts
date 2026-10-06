import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatStreamingClient } from '../../chat/services/chatStreamingClient';
import { Message, StoredAttachment } from '../../chat/types';
import { parseArtifactsFromText } from '../utils/artifactParser';
import { useToast } from '../../../components/Toast';
import { WorkspaceArtifact, WorkspaceComposerConfig } from '../types';

export type WorkspaceStreamingStatus =
  | 'idle'
  | 'preparing'
  | 'connecting'
  | 'streaming'
  | 'finalizing'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface WorkspaceRequestIdentity {
  requestId: string;
  workspaceId?: string;
  chatId?: string;
  generation: number;
}

interface UseWorkspaceStreamingOptions {
  chatId?: string;
  workspaceIdentity?: string;
  onChatIdReceived?: (chatId: string, identity: WorkspaceRequestIdentity) => void;
  onChatCreated?: (chatId: string, identity: WorkspaceRequestIdentity) => void;
  onStreamArtifactExtracted?: (artifact: WorkspaceArtifact, isStreaming: boolean, identity: WorkspaceRequestIdentity) => void;
  onStreamCompleted?: (assistantMessage: Message, extractedArtifacts: WorkspaceArtifact[], identity: WorkspaceRequestIdentity) => void | Promise<void>;
}

const ARTIFACT_PARSE_INTERVAL_MS = 100;
const STREAM_UI_FLUSH_INTERVAL_MS = 50;
const ARTIFACT_OPEN_TAG = '<artifact';

export function useWorkspaceStreaming({
  chatId,
  workspaceIdentity = chatId ? `chat:${chatId}` : 'local:workspace',
  onChatIdReceived,
  onChatCreated,
  onStreamArtifactExtracted,
  onStreamCompleted
}: UseWorkspaceStreamingOptions) {
  const { showToast } = useToast();
  const [streamingStatus, setStreamingStatus] = useState<WorkspaceStreamingStatus>('idle');
  const [activeStreamingMessage, setActiveStreamingMessage] = useState<Message | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const statusRef = useRef<WorkspaceStreamingStatus>('idle');
  const currentWorkspaceRef = useRef(workspaceIdentity);
  currentWorkspaceRef.current = workspaceIdentity;
  const committedWorkspaceRef = useRef(workspaceIdentity);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const activeIdentityRef = useRef<WorkspaceRequestIdentity | null>(null);
  const streamingClientRef = useRef<ChatStreamingClient | null>(null);
  const completedRequestsRef = useRef(new Set<string>());
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamUiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastParseAtRef = useRef(0);

  const setStatus = useCallback((status: WorkspaceStreamingStatus) => {
    if (statusRef.current === status) return;
    statusRef.current = status;
    if (mountedRef.current) setStreamingStatus(status);
  }, []);

  const clearParseTimer = useCallback(() => {
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    parseTimerRef.current = null;
  }, []);

  const clearStreamUiTimer = useCallback(() => {
    if (streamUiTimerRef.current) clearTimeout(streamUiTimerRef.current);
    streamUiTimerRef.current = null;
  }, []);

  const isCurrentRequest = useCallback((identity: WorkspaceRequestIdentity) => {
    const active = activeIdentityRef.current;
    return mountedRef.current && !!active && active.requestId === identity.requestId &&
      active.generation === identity.generation && generationRef.current === identity.generation &&
      active.workspaceId === identity.workspaceId && currentWorkspaceRef.current === identity.workspaceId &&
      statusRef.current !== 'cancelled' && statusRef.current !== 'error' && statusRef.current !== 'completed';
  }, []);

  const invalidateActiveRequest = useCallback((status: WorkspaceStreamingStatus) => {
    generationRef.current += 1;
    activeIdentityRef.current = null;
    clearParseTimer();
    clearStreamUiTimer();
    streamingClientRef.current?.abort();
    streamingClientRef.current = null;
    if (mountedRef.current) setActiveStreamingMessage(null);
    setStatus(status);
    if (mountedRef.current) setActiveRequestId(null);
  }, [clearParseTimer, clearStreamUiTimer, setStatus]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      activeIdentityRef.current = null;
      clearParseTimer();
      clearStreamUiTimer();
      streamingClientRef.current?.abort();
      streamingClientRef.current = null;
    };
  }, [clearParseTimer, clearStreamUiTimer]);

  useEffect(() => {
    if (committedWorkspaceRef.current === workspaceIdentity) return;
    committedWorkspaceRef.current = workspaceIdentity;
    invalidateActiveRequest('cancelled');
  }, [invalidateActiveRequest, workspaceIdentity]);

  const abortStream = useCallback((silent = false) => {
    const hadActiveRequest = !!activeIdentityRef.current || ['preparing', 'connecting', 'streaming', 'finalizing'].includes(statusRef.current);
    invalidateActiveRequest('cancelled');
    if (!silent && hadActiveRequest) showToast('Respons dihentikan.', 'info');
  }, [invalidateActiveRequest, showToast]);

  const sendMessageStream = useCallback(async (
    userPrompt: string,
    customSystemNote?: string,
    attachments?: StoredAttachment[],
    config?: WorkspaceComposerConfig,
    requestSnapshotId?: string
  ) => {
    if (!userPrompt.trim() || ['preparing', 'connecting', 'streaming', 'finalizing'].includes(statusRef.current)) return;

    // Every send, including a retry, owns a new transport request ID and generation.
    const generation = ++generationRef.current;
    const identity: WorkspaceRequestIdentity = {
      requestId: requestSnapshotId || crypto.randomUUID(),
      workspaceId: workspaceIdentity,
      chatId,
      generation
    };
    activeIdentityRef.current = identity;
    completedRequestsRef.current.delete(identity.requestId);
    clearParseTimer();
    clearStreamUiTimer();
    lastParseAtRef.current = 0;
    setActiveRequestId(identity.requestId);
    setActiveStreamingMessage(null);
    setStatus('preparing');

    // Let the preparing phase render before opening the network transport.
    await Promise.resolve();
    if (!isCurrentRequest(identity)) return;

    const assistantMsgId = `asst_${identity.requestId}`;
    let accumulatedText = '';
    let artifactCandidateSeen = false;
    let artifactScanTail = '';
    let routingMeta: Partial<Message> = {};
    let createdChatId: string | undefined;
    let completionHandled = false;
    let requestFailed = false;
    const client = new ChatStreamingClient();
    streamingClientRef.current = client;
    setStatus('connecting');

    const publishArtifactPreview = () => {
      parseTimerRef.current = null;
      if (!isCurrentRequest(identity)) return;
      if (!artifactCandidateSeen) return;
      const parsed = parseArtifactsFromText(accumulatedText, true, identity.requestId);
      const preview = parsed.activeStreamingArtifact || parsed.artifacts[parsed.artifacts.length - 1];
      if (preview) onStreamArtifactExtracted?.(preview, true, identity);
      lastParseAtRef.current = Date.now();
    };

    const scheduleArtifactPreview = () => {
      if (!artifactCandidateSeen) return;
      const elapsed = Date.now() - lastParseAtRef.current;
      if (elapsed >= ARTIFACT_PARSE_INTERVAL_MS) {
        publishArtifactPreview();
      } else if (!parseTimerRef.current) {
        parseTimerRef.current = setTimeout(publishArtifactPreview, ARTIFACT_PARSE_INTERVAL_MS - elapsed);
      }
    };

    const flushStreamingMessage = () => {
      streamUiTimerRef.current = null;
      if (!isCurrentRequest(identity)) return;
      setActiveStreamingMessage({ id: assistantMsgId, role: 'assistant', content: accumulatedText, createdAt: new Date(), ...routingMeta });
    };

    const scheduleStreamingMessageFlush = () => {
      if (!streamUiTimerRef.current) streamUiTimerRef.current = setTimeout(flushStreamingMessage, STREAM_UI_FLUSH_INTERVAL_MS);
    };

    const finishWithError = async () => {
      if (!isCurrentRequest(identity) || completionHandled || completedRequestsRef.current.has(identity.requestId)) return;
      completionHandled = true;
      completedRequestsRef.current.add(identity.requestId);
      clearParseTimer();
      clearStreamUiTimer();
      requestFailed = true;
      setActiveStreamingMessage(null);
      try {
        await onStreamCompleted?.({
          id: `err_${identity.requestId}`,
          role: 'assistant',
          content: 'Respons belum berhasil dibuat karena koneksi atau layanan terputus. Silakan kirim ulang pesan Anda.',
          error: true,
          retryRequestId: requestSnapshotId,
          createdAt: new Date()
        }, [], identity);
      } finally {
        if (activeIdentityRef.current?.requestId === identity.requestId && generationRef.current === identity.generation) {
          activeIdentityRef.current = null;
          setActiveRequestId(null);
          setStatus('error');
        }
      }
    };

    try {
      const formattedPrompt = customSystemNote
        ? `${userPrompt}\n\n[Catatan Konteks Canvas: ${customSystemNote}]`
        : userPrompt;
      await client.stream({
        message: formattedPrompt,
        chatId: chatId || undefined,
        chatMode: 'RuangKerja',
        responseStyle: config?.responseStyle && config.responseStyle !== 'Default'
          ? `${config.responseMode}; ${config.responseStyle}`
          : config?.responseMode ?? 'Seimbang',
        aiModel: config?.aiModel,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        presetId: config?.presetId,
        taskCategory: config?.taskCategory,
        latencyPreference: config?.latencyPreference,
        qualityPreference: config?.qualityPreference
      }, {
        onChatCreated: newChatId => {
          if (isCurrentRequest(identity)) {
            createdChatId = newChatId;
            identity.chatId = newChatId;
          }
        },
        onRoutingMetadata: data => {
          if (isCurrentRequest(identity)) routingMeta = data;
        },
        onMessageStart: () => {
          if (!isCurrentRequest(identity)) return;
          setActiveStreamingMessage({ id: assistantMsgId, role: 'assistant', content: '', createdAt: new Date() });
        },
        onChunk: chunk => {
          if (!isCurrentRequest(identity)) return;
          setStatus('streaming');
          accumulatedText += chunk;
          const scanText = artifactScanTail + chunk.toLowerCase();
          if (!artifactCandidateSeen && scanText.includes(ARTIFACT_OPEN_TAG)) artifactCandidateSeen = true;
          artifactScanTail = scanText.slice(-(ARTIFACT_OPEN_TAG.length - 1));
          scheduleStreamingMessageFlush();
          scheduleArtifactPreview();
        },
        onMessageComplete: async finalText => {
          if (!isCurrentRequest(identity) || completionHandled || completedRequestsRef.current.has(identity.requestId)) return;
          completionHandled = true;
          completedRequestsRef.current.add(identity.requestId);
          clearParseTimer();
          clearStreamUiTimer();
          setStatus('finalizing');
          setActiveStreamingMessage(null);

          // Parse once from the authoritative final text; partial previews never persist.
          const parsedFinal = finalText.toLowerCase().includes(ARTIFACT_OPEN_TAG)
            ? parseArtifactsFromText(finalText, false, identity.requestId)
            : { cleanedText: finalText, artifacts: [] };
          const { cleanedText, artifacts } = parsedFinal;
          const finalAssistantMessage: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: cleanedText || finalText,
            createdAt: new Date(),
            ...routingMeta
          };
          try {
            await onStreamCompleted?.(finalAssistantMessage, artifacts, identity);
          } catch (_error) {
            console.error('[WorkspaceStreaming] Completion handler failed.', { requestId: identity.requestId, workspaceId: identity.workspaceId, generation: identity.generation });
            if (isCurrentRequest(identity)) setStatus('error');
            return;
          }
          if (!isCurrentRequest(identity)) return;
          if (createdChatId) onChatIdReceived?.(createdChatId, identity);
        },
        onError: async () => { await finishWithError(); }
      });

      if (!isCurrentRequest(identity)) return;
      if (!completionHandled) await finishWithError();
      if (createdChatId && !requestFailed) {
        onChatCreated?.(createdChatId, identity);
      }
      if (isCurrentRequest(identity)) {
        activeIdentityRef.current = null;
        setActiveRequestId(null);
        setStatus(requestFailed ? 'error' : 'completed');
      }
    } catch (error) {
      if (!isCurrentRequest(identity)) return;
      const aborted = error instanceof Error && error.name === 'AbortError';
      if (aborted) {
        invalidateActiveRequest('cancelled');
        return;
      }
      await finishWithError();
    }
  }, [chatId, workspaceIdentity, onChatIdReceived, onChatCreated, onStreamArtifactExtracted, onStreamCompleted, clearParseTimer, clearStreamUiTimer, isCurrentRequest, setStatus, invalidateActiveRequest]);

  return {
    streamingStatus,
    isStreaming: ['preparing', 'connecting', 'streaming', 'finalizing'].includes(streamingStatus),
    activeStreamingMessage,
    activeRequestId,
    isRequestCurrent: isCurrentRequest,
    sendMessageStream,
    abortStream
  };
}
