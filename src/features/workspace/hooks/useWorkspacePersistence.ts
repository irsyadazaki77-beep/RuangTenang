import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '../../chat/types';
import { WorkspaceArtifact } from '../types';
import { WorkspaceApiService } from '../services/workspaceApiService';
import { createWelcomeMessage } from '../constants/workspaceConstants';
import { useToast } from '../../../components/Toast';

interface UseWorkspacePersistenceOptions {
  chatId?: string;
  workspaceIdentity?: string;
  userName?: string;
}

interface UseWorkspacePersistenceReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  persistedArtifacts: WorkspaceArtifact[];
  isLoadingMessages: boolean;
  isLoadingArtifacts: boolean;
  clearWorkspaceConversation: (targetChatId?: string) => Promise<boolean>;
  isClearingConversation: boolean;
}

export function useWorkspacePersistence({
  chatId,
  workspaceIdentity,
  userName
}: UseWorkspacePersistenceOptions): UseWorkspacePersistenceReturn {
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const [messages, setMessages] = useState<Message[]>([createWelcomeMessage(userName)]);
  const [persistedArtifacts, setPersistedArtifacts] = useState<WorkspaceArtifact[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [isClearingConversation, setIsClearingConversation] = useState(false);

  const activeAbortControllerRef = useRef<AbortController | null>(null);
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

  useEffect(() => {
    // Abort previous pending requests on chatId change
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

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
          WorkspaceApiService.fetchMessages(chatId, signal)
        ]);

        if (signal.aborted || messageLoadGenerationRef.current !== loadGeneration || activeChatIdRef.current !== chatId || activeWorkspaceIdentityRef.current !== workspaceIdentity) return;

        if (artifactsResult.status === 'fulfilled') {
          setPersistedArtifacts(artifactsResult.value || []);
        } else if (artifactsResult.reason?.name !== 'AbortError') {
          console.warn('[useWorkspacePersistence] Artifacts load error:', artifactsResult.reason);
        }

        if (messagesResult.status === 'fulfilled' && messageLoadGenerationRef.current === loadGeneration) {
          const fetchedMsgs = messagesResult.value || [];
          if (fetchedMsgs.length > 0) {
            setMessages(fetchedMsgs);
          } else {
            setMessages([createWelcomeMessage(userName)]);
          }
        } else if (messagesResult.status === 'rejected' && messagesResult.reason?.name !== 'AbortError' && messageLoadGenerationRef.current === loadGeneration) {
          console.warn('[useWorkspacePersistence] Messages load error:', messagesResult.reason);
          setMessages([createWelcomeMessage(userName)]);
          showToastRef.current('Riwayat Workspace gagal dimuat. Periksa koneksi lalu coba lagi.', 'error');
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
    };
  }, [chatId, userName, workspaceIdentity]);

  const clearWorkspaceConversation = useCallback((targetChatId?: string): Promise<boolean> => {
    if (clearPromiseRef.current) return clearPromiseRef.current;
    const conversationId = targetChatId ?? chatId;
    const workspaceAtStart = workspaceIdentity;
    const clearOperation = (async () => {
      if (mountedRef.current && activeWorkspaceIdentityRef.current === workspaceAtStart) setIsClearingConversation(true);
      // Invalidate any initial-load response started before this clear request.
      const clearGeneration = ++messageLoadGenerationRef.current;
      const isCurrentClear = () => mountedRef.current && activeWorkspaceIdentityRef.current === workspaceAtStart && messageLoadGenerationRef.current === clearGeneration;
      try {
        if (conversationId) await WorkspaceApiService.clearMessages(conversationId);
        if (isCurrentClear() && (conversationId ?? undefined) === (activeChatIdRef.current ?? undefined)) {
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
    persistedArtifacts,
    isLoadingMessages,
    isLoadingArtifacts,
    clearWorkspaceConversation,
    isClearingConversation
  };
}
