import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserSession } from '../../../types';
import { apiClient } from '../../../lib/apiClient';
import { clientDb } from '../../../lib/clientDb';
import { getAuthSessionSnapshot, isCurrentAuthenticatedSession } from '../../../lib/authSessionLifecycle';
import { Chat } from '../types';

type Toast = (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useChatLibrary(user: UserSession | null, showToast: Toast) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.id;
  const userRole = user?.role;
  const previousUserIdRef = useRef(userId);

  const fetchChats = useCallback(async () => {
    if (!userId || userRole === 'guest') {
      setChats([]);
      setIsLoadingChats(false);
      return;
    }
    const session = getAuthSessionSnapshot();
    if (!isCurrentAuthenticatedSession(session) || session.userId !== userId) {
      setChats([]);
      setIsLoadingChats(false);
      return;
    }

    setIsLoadingChats(true);
    try {
      const response = await apiClient.get<Chat[]>('/api/v1/chat/history');
      if (!isCurrentAuthenticatedSession(session)) return;
      if (response.success && Array.isArray(response.data)) {
        setChats(response.data);
        try {
          await clientDb.saveEncrypted(`chats_${userId}`, JSON.stringify(response.data));
        } catch {
          // The remote response remains usable when offline cache persistence fails.
        }
        return;
      }

      if (response.status !== 401) console.warn('Fetch chats failed:', response.error);
      await restoreCachedChats(userId, session, setChats);
    } catch (error) {
      if (!isCurrentAuthenticatedSession(session)) return;
      console.warn('Failed to fetch chat history:', error);
      await restoreCachedChats(userId, session, setChats);
    } finally {
      if (isCurrentAuthenticatedSession(session)) setIsLoadingChats(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    if (previousUserIdRef.current !== user?.id) {
      previousUserIdRef.current = user?.id;
      setChats([]);
    }
    if (user?.id) void fetchChats();
    else {
      setChats([]);
      setIsLoadingChats(false);
    }
  }, [fetchChats, user?.id]);

  const handleDeleteChat = useCallback(async (id: string) => {
    const previousChats = chats;
    setChats(current => current.filter(chat => chat.id !== id));
    if (location.pathname === `/c/${id}`) navigate('/');
    try {
      const response = await apiClient.delete(`/api/v1/chat/${id}`);
      if (!response.success) throw new Error(response.error || 'Gagal menghapus percakapan');
    } catch (error) {
      setChats(previousChats);
      showToast(getErrorMessage(error, 'Gagal menghapus percakapan'), 'error');
      void fetchChats();
    }
  }, [chats, fetchChats, location.pathname, navigate, showToast]);

  const handleUpdateTitle = useCallback(async (id: string, title: string) => {
    const previousChats = chats;
    setChats(current => current.map(chat => chat.id === id ? { ...chat, title } : chat));
    try {
      const response = await apiClient.put(`/api/v1/chat/${id}/title`, { title });
      if (!response.success) throw new Error(response.error || 'Gagal mengubah judul percakapan');
    } catch (error) {
      setChats(previousChats);
      showToast(getErrorMessage(error, 'Gagal mengubah judul percakapan'), 'error');
      void fetchChats();
    }
  }, [chats, fetchChats, showToast]);

  const handleTogglePin = useCallback(async (id: string) => {
    const previousChats = chats;
    setChats(current => current.map(chat => chat.id === id ? { ...chat, isPinned: !chat.isPinned } : chat));
    try {
      const response = await apiClient.put(`/api/v1/chat/${id}/pin`);
      if (!response.success) throw new Error(response.error || 'Gagal menyematkan percakapan');
    } catch (error) {
      setChats(previousChats);
      showToast(getErrorMessage(error, 'Gagal menyematkan percakapan'), 'error');
      void fetchChats();
    }
  }, [chats, fetchChats, showToast]);

  const handleToggleArchive = useCallback(async (id: string) => {
    const chat = chats.find(item => item.id === id);
    if (!chat) return;
    const previousChats = chats;
    const isArchived = !chat.isArchived;
    setChats(current => current.map(item => item.id === id ? { ...item, isArchived } : item));
    try {
      const response = await apiClient.put(`/api/v1/chat/${id}/archive`, { isArchived });
      if (!response.success) throw new Error(response.error || 'Gagal mengarsip percakapan');
    } catch (error) {
      setChats(previousChats);
      showToast(getErrorMessage(error, 'Gagal mengarsip percakapan'), 'error');
      void fetchChats();
    }
  }, [chats, fetchChats, showToast]);

  return { chats, setChats, isLoadingChats, fetchChats, handleDeleteChat, handleUpdateTitle, handleTogglePin, handleToggleArchive };
}

async function restoreCachedChats(
  userId: string,
  session: ReturnType<typeof getAuthSessionSnapshot>,
  setChats: Dispatch<SetStateAction<Chat[]>>
): Promise<void> {
  try {
    const cachedJson = await clientDb.getDecrypted(`chats_${userId}`);
    if (!isCurrentAuthenticatedSession(session)) return;
    const cachedValue: unknown = cachedJson ? JSON.parse(cachedJson) : [];
    setChats(Array.isArray(cachedValue) ? cachedValue as Chat[] : []);
  } catch {
    if (isCurrentAuthenticatedSession(session)) setChats([]);
  }
}
