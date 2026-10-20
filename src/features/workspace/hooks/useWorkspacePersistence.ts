import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Message } from '../../chat/types';
import { WorkspaceArtifact } from '../types';
import { WorkspaceApiService } from '../services/workspaceApiService';
import { createWelcomeMessage } from '../constants/workspaceConstants';
import { showWorkspaceLoadFailureOnce } from '../utils/workspaceLoadNotice';
import { useToast } from '../../../components/Toast';

export interface UseWorkspacePersistenceOptions {
  chatId?: string;
  workspaceIdentity?: string;
  loadAttemptId?: string;
  userName?: string;
  onNotFound?: () => void;
}

interface UseWorkspacePersistenceReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  loadOlderMessages: () => Promise<boolean>;
  persistedArtifacts: WorkspaceArtifact[];
  isLoadingMessages: boolean;
  isLoadingArtifacts: boolean;
  clearWorkspaceConversation: (targetChatId?: string) => Promise<boolean>;
  isClearingConversation: boolean;
}

export function useWorkspacePersistence({
  chatId,
  workspaceIdentity,
  loadAttemptId,
  userName,
  onNotFound
}: UseWorkspacePersistenceOptions): UseWorkspacePersistenceReturn {
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const onNotFoundRef = useRef(onNotFound);
  onNotFoundRef.current = onNotFound;
  const [messages, setMessages] = useState<Message[]>([createWelcomeMessage(userName)]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [persistedArtifacts, setPersistedArtifacts] = useState<WorkspaceArtifact[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [isClearingConversation, setIsClearingConversation] = useState(false);

  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const olderMessagesAbortControllerRef = useRef<AbortController | null>(null);
  const olderMessagesPromiseRef = useRef<Promise<boolean> | null>(null);
  const olderMessagesCursorRef = useRef<string | null>(null);
  const activeChatIdRef = useRef(chatId);
  const activeWorkspaceIdentityRef = useRef(workspaceIdentity);
  const messageLoadGenerationRef = useRef(0);
  const clearPromiseRef = useRef<Promise<boolean> | null>(null);
  const mountedRef = useRef(true);
  activeChatIdRef.current = chatId;
  activeWorkspaceIdentityRef.current = workspaceIdentity;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useLayoutEffect(() => {
    // Abort previous pending requests on chatId change
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    olderMessagesAbortControllerRef.current?.abort();
    olderMessagesAbortControllerRef.current = null;
    olderMessagesPromiseRef.current = null;
    olderMessagesCursorRef.current = null;
    setHasOlderMessages(false);
    setIsLoadingOlderMessages(false);

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const { signal } = abortController;
    const loadGeneration = ++messageLoadGenerationRef.current;
    setMessages([createWelcomeMessage(userName)]);
    setPersistedArtifacts([]);

    // A new Workspace has no server artifact collection. Never call the user-wide list here.
    if (!chatId) {
      setIsLoadingMessages(false);
      setIsLoadingArtifacts(false);
      return () => abortController.abort();
    }

    const loadWorkspaceData = async () => {
      setIsLoadingArtifacts(true);
      setIsLoadingMessages(true);

      try {
        const [artifactsResult, messagesResult] = await Promise.allSettled([
          WorkspaceApiService.fetchArtifacts(chatId, signal),
          WorkspaceApiService.fetchMessagesPage(chatId, undefined, signal)
        ]);

        if (signal.aborted || messageLoadGenerationRef.current !== loadGeneration || activeChatIdRef.current !== chatId || activeWorkspaceIdentityRef.current !== workspaceIdentity) return;

        if (artifactsResult.status === 'fulfilled') {
          setPersistedArtifacts(artifactsResult.value || []);
        } else if (artifactsResult.reason?.name !== 'AbortError') {
          console.warn('[useWorkspacePersistence] Artifacts load error:', artifactsResult.reason);
        }

        if (messagesResult.status === 'fulfilled' && messageLoadGenerationRef.current === loadGeneration) {
          const fetchedPage = messagesResult.value || { messages: [], nextCursor: null };
          const fetchedMsgs = fetchedPage.messages || [];
          olderMessagesCursorRef.current = fetchedPage.nextCursor;
          setHasOlderMessages(Boolean(fetchedPage.nextCursor));
          if (fetchedMsgs.length > 0) {
            setMessages(fetchedMsgs);
          } else {
            setMessages([createWelcomeMessage(userName)]);
          }
        } else if (messagesResult.status === 'rejected' && messagesResult.reason?.name !== 'AbortError' && messageLoadGenerationRef.current === loadGeneration) {
          console.warn('[useWorkspacePersistence] Messages load error:', messagesResult.reason);
          setMessages([createWelcomeMessage(userName)]);
          const status = (messagesResult.reason as { status?: number } | undefined)?.status;
          if (status === 404) {
            showToastRef.current('Workspace tidak ditemukan atau kamu tidak memiliki akses.', 'error');
            onNotFoundRef.current?.();
          } else if (status !== 401) {
            showWorkspaceLoadFailureOnce(loadAttemptId || `workspace-load:${chatId}`, showToastRef.current);
          }
        }
      } finally {
        if (!signal.aborted && messageLoadGenerationRef.current === loadGeneration && activeChatIdRef.current === chatId && activeWorkspaceIdentityRef.current === workspaceIdentity) {
          setIsLoadingMessages(false);
          setIsLoadingArtifacts(false);
        }
      }
    };

    loadWorkspaceData();

    return () => {
      abortController.abort();
      olderMessagesAbortControllerRef.current?.abort();
    };
  }, [chatId, loadAttemptId, userName, workspaceIdentity]);

  const loadOlderMessages = useCallback((): Promise<boolean> => {
    if (clearPromiseRef.current) return Promise.resolve(false);
    if (olderMessagesPromiseRef.current) return olderMessagesPromiseRef.current;
    const cursor = olderMessagesCursorRef.current;
    if (!chatId || !cursor) return Promise.resolve(false);

    const chatIdAtStart = chatId;
    const workspaceAtStart = workspaceIdentity;
    const loadGeneration = messageLoadGenerationRef.current;
    const abortController = new AbortController();
    olderMessagesAbortControllerRef.current = abortController;
    setIsLoadingOlderMessages(true);

    const isCurrentLoad = () => mountedRef.current &&
      activeChatIdRef.current === chatIdAtStart &&
      activeWorkspaceIdentityRef.current === workspaceAtStart &&
      messageLoadGenerationRef.current === loadGeneration &&
      !abortController.signal.aborted;

    const loadOperation = (async () => {
      try {
        const page = await WorkspaceApiService.fetchMessagesPage(chatIdAtStart, cursor, abortController.signal);
        if (!isCurrentLoad()) return false;

        let addedMessages = false;
        if (page.messages.length > 0) {
          const existingIds = new Set(messagesRef.current.map(message => message.id));
          const olderMessages = page.messages.filter(message => !existingIds.has(message.id));
          addedMessages = olderMessages.length > 0;
          setMessages(current => {
            const latestIds = new Set(current.map(message => message.id));
            const uniqueOlderMessages = olderMessages.filter(message => !latestIds.has(message.id));
            return uniqueOlderMessages.length > 0 ? [...uniqueOlderMessages, ...current] : current;
          });
        }
        olderMessagesCursorRef.current = page.nextCursor;
        setHasOlderMessages(Boolean(page.nextCursor));
        return addedMessages;
      } catch (error) {
        if (isCurrentLoad()) {
          console.warn('[useWorkspacePersistence] Older messages load error:', error);
          showToastRef.current('Pesan sebelumnya gagal dimuat. Coba lagi.', 'error');
        }
        return false;
      } finally {
        if (activeWorkspaceIdentityRef.current === workspaceAtStart && messageLoadGenerationRef.current === loadGeneration) {
          setIsLoadingOlderMessages(false);
        }
        if (olderMessagesAbortControllerRef.current === abortController) olderMessagesAbortControllerRef.current = null;
        if (olderMessagesPromiseRef.current === loadOperation) olderMessagesPromiseRef.current = null;
      }
    })();
    olderMessagesPromiseRef.current = loadOperation;
    return loadOperation;
  }, [chatId, workspaceIdentity]);

  const clearWorkspaceConversation = useCallback((targetChatId?: string): Promise<boolean> => {
    if (clearPromiseRef.current) return clearPromiseRef.current;
    const conversationId = targetChatId ?? chatId;
    const workspaceAtStart = workspaceIdentity;
    const clearOperation = (async () => {
      if (mountedRef.current && activeWorkspaceIdentityRef.current === workspaceAtStart) setIsClearingConversation(true);
      // Invalidate any initial-load response started before this clear request.
      const clearGeneration = ++messageLoadGenerationRef.current;
      olderMessagesAbortControllerRef.current?.abort();
      olderMessagesAbortControllerRef.current = null;
      olderMessagesPromiseRef.current = null;
      if (mountedRef.current && activeWorkspaceIdentityRef.current === workspaceAtStart) setIsLoadingOlderMessages(false);
      const isCurrentClear = () => mountedRef.current && activeWorkspaceIdentityRef.current === workspaceAtStart && messageLoadGenerationRef.current === clearGeneration;
      try {
        if (conversationId) await WorkspaceApiService.clearMessages(conversationId);
        if (isCurrentClear() && (conversationId ?? undefined) === (activeChatIdRef.current ?? undefined)) {
          olderMessagesCursorRef.current = null;
          setHasOlderMessages(false);
          setMessages([createWelcomeMessage(userName)]);
        }
        return true;
      } catch (error) {
        console.warn('[useWorkspacePersistence] Conversation clear failed:', error);
        if (isCurrentClear()) showToastRef.current('Percakapan gagal dibersihkan. Riwayat tetap ditampilkan.', 'error');
        return false;
      } finally {
        if (isCurrentClear()) setIsClearingConversation(false);
        clearPromiseRef.current = null;
      }
    })();
    clearPromiseRef.current = clearOperation;
    return clearOperation;
  }, [chatId, userName, workspaceIdentity]);

  return {
    messages,
    setMessages,
    hasOlderMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
    persistedArtifacts,
    isLoadingMessages,
    isLoadingArtifacts,
    clearWorkspaceConversation,
    isClearingConversation
  };
}
