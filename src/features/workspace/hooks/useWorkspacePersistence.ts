import { useState, useEffect, useRef } from 'react';
import { Message } from '../../chat/types';
import { WorkspaceArtifact } from '../types';
import { WorkspaceApiService } from '../services/workspaceApiService';
import { createWelcomeMessage } from '../constants/workspaceConstants';

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
  clearMessages: () => void;
  resetToWelcome: () => void;
}

export function useWorkspacePersistence({
  chatId,
  userName
}: UseWorkspacePersistenceOptions): UseWorkspacePersistenceReturn {
  const [messages, setMessages] = useState<Message[]>([createWelcomeMessage(userName)]);
  const [persistedArtifacts, setPersistedArtifacts] = useState<WorkspaceArtifact[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);

  const activeAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous pending requests on chatId change
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const { signal } = abortController;

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

        if (messagesResult.status === 'fulfilled') {
          const fetchedMsgs = messagesResult.value || [];
          if (fetchedMsgs.length > 0) {
            setMessages(fetchedMsgs);
          } else {
            setMessages([createWelcomeMessage(userName)]);
          }
        } else if (messagesResult.reason?.name !== 'AbortError') {
          console.warn('[useWorkspacePersistence] Messages load error:', messagesResult.reason);
          setMessages([createWelcomeMessage(userName)]);
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

  const clearMessages = () => {
    setMessages([
      {
        id: `msg_clear_${Date.now()}`,
        role: 'assistant',
        content: 'Obrolan telah dibersihkan. Siap memulai sesi pekerjaan akademik baru.',
        createdAt: new Date()
      }
    ]);
  };

  const resetToWelcome = () => {
    setMessages([createWelcomeMessage(userName)]);
  };

  return {
    messages,
    setMessages,
    persistedArtifacts,
    isLoadingMessages,
    isLoadingArtifacts,
    clearMessages,
    resetToWelcome
  };
}
