import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '../../chat/types';
import { WorkspaceArtifact } from '../types';
import { WorkspaceApiService } from '../services/workspaceApiService';
import { createWelcomeMessage } from '../constants/workspaceConstants';
import { useToast } from '../../../components/Toast';

interface UseWorkspacePersistenceOptions {
  chatId?: string;
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
  const messageLoadGenerationRef = useRef(0);
  const clearPromiseRef = useRef<Promise<boolean> | null>(null);
  activeChatIdRef.current = chatId;

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

    const loadWorkspaceData = async () => {
      setIsLoadingArtifacts(true);
      setIsLoadingMessages(true);

      try {
        const [artifactsResult, messagesResult] = await Promise.allSettled([
          WorkspaceApiService.fetchArtifacts(chatId, signal),
          chatId ? WorkspaceApiService.fetchMessages(chatId, signal) : Promise.resolve([])
        ]);

        if (signal.aborted) return;

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
        if (!signal.aborted) {
          setIsLoadingMessages(false);
          setIsLoadingArtifacts(false);
        }
      }
    };

    loadWorkspaceData();

    return () => {
      abortController.abort();
    };
  }, [chatId, userName]);

  const clearWorkspaceConversation = useCallback((targetChatId?: string): Promise<boolean> => {
    if (clearPromiseRef.current) return clearPromiseRef.current;
    const conversationId = targetChatId ?? chatId;
    const clearOperation = (async () => {
      setIsClearingConversation(true);
      // Invalidate any initial-load response started before this clear request.
      messageLoadGenerationRef.current += 1;
      try {
        if (conversationId) await WorkspaceApiService.clearMessages(conversationId);
        if ((conversationId ?? undefined) === (activeChatIdRef.current ?? undefined)) {
          setMessages([createWelcomeMessage(userName)]);
        }
        return true;
      } catch (error) {
        console.warn('[useWorkspacePersistence] Conversation clear failed:', error);
        showToastRef.current('Percakapan gagal dibersihkan. Riwayat tetap ditampilkan.', 'error');
        return false;
      } finally {
        setIsClearingConversation(false);
        clearPromiseRef.current = null;
      }
    })();
    clearPromiseRef.current = clearOperation;
    return clearOperation;
  }, [chatId, userName]);

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
