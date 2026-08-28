import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '../types';
import { apiClient } from '../../../lib/apiClient';

export function useChatHistory(chatId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [fetchMessagesError, setFetchMessagesError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadedChatIdRef = useRef<string | null>(null);
  const activeFetchChatIdRef = useRef<string | undefined>(chatId);

  useEffect(() => {
    activeFetchChatIdRef.current = chatId;
    if (chatId !== loadedChatIdRef.current) {
      setMessages([]);
      setFetchMessagesError(null);
    }
  }, [chatId]);

  const fetchMessages = useCallback(async (cursor?: string) => {
    if (!chatId) {
      setMessages([]);
      loadedChatIdRef.current = null;
      return;
    }

    const targetChatId = chatId;

    if (!cursor) {
      setIsLoadingMessages(true);
      setFetchMessagesError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let url = `/api/v1/chat/${chatId}/messages?limit=50`;
      if (cursor) url += `&cursor=${cursor}`;

      const res = await apiClient.get<any>(url);

      if (activeFetchChatIdRef.current !== targetChatId) {
        return;
      }

      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch messages');
      }

      const data = res.data;
      if (data && Array.isArray(data.data)) {
        if (cursor) {
          setMessages(prev => {
            const combined = [...data.data, ...prev];
            const seen = new Set();
            return combined.filter((m: Message) => {
              if (seen.has(m.id)) return false;
              seen.add(m.id);
              return true;
            });
          });
        } else {
          setMessages(data.data);
        }
        setNextCursor(data.nextCursor || null);
        loadedChatIdRef.current = targetChatId;
      } else {
        setMessages(Array.isArray(data) ? data : []);
        loadedChatIdRef.current = targetChatId;
      }
    } catch (err: any) {
      if (activeFetchChatIdRef.current !== targetChatId) return;
      console.error('Fetch messages error:', err);
      if (!cursor) {
        setFetchMessagesError(err.message || 'Gagal memuat pesan. Silakan coba lagi.');
      }
    } finally {
      if (activeFetchChatIdRef.current === targetChatId) {
        if (cursor) setIsLoadingMore(false);
        else setIsLoadingMessages(false);
      }
    }
  }, [chatId]);

  return {
    messages,
    setMessages,
    isLoadingMessages,
    fetchMessagesError,
    nextCursor,
    isLoadingMore,
    fetchMessages,
    loadedChatIdRef
  };
}
