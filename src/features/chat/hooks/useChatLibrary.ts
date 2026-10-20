import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserSession } from '../../../types';
import { apiClient } from '../../../lib/apiClient';
import { clientDb } from '../../../lib/clientDb';
import { getAuthSessionSnapshot, isCurrentAuthenticatedSession } from '../../../lib/authSessionLifecycle';
import { Chat } from '../types';
import {
  getGuestChats,
  deleteGuestChat,
  updateGuestChatTitle,
  togglePinGuestChat,
  toggleArchiveGuestChat,
  GUEST_CHATS_UPDATED_EVENT
} from '../../../lib/guestChatStorage';

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
      const guestChats = getGuestChats();
      setChats(guestChats);
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
      const [historyResult, workspaceResult] = await Promise.allSettled([
        apiClient.get<Chat[]>('/api/v1/chat/history'),
        apiClient.get<{
          items: Array<{
            chatId: string;
            name: string;
            isPinned?: boolean;
            isArchived?: boolean;
            createdAt?: string;
            updatedAt?: string;
          }>;
          hasMore?: boolean;
          nextOffset?: number;
        } | Array<{
          chatId: string;
          name: string;
          isPinned?: boolean;
          isArchived?: boolean;
          createdAt?: string;
          updatedAt?: string;
        }>>('/api/v1/workspace')
      ]);
      if (!isCurrentAuthenticatedSession(session)) return;

      const historyResponse = historyResult.status === 'fulfilled' ? historyResult.value : null;
      const workspaceResponse = workspaceResult.status === 'fulfilled' ? workspaceResult.value : null;
      const historyItems: Chat[] | null = Array.isArray(historyResponse?.data)
        ? historyResponse.data
        : Array.isArray((historyResponse?.data as any)?.data)
          ? (historyResponse?.data as any).data
          : null;
      const hasHistory = Boolean(historyResponse?.success && historyItems);
      const workspaceItems: Array<{
        chatId: string;
        name: string;
        isPinned?: boolean;
        isArchived?: boolean;
        createdAt?: string;
        updatedAt?: string;
      }> | null = Array.isArray(workspaceResponse?.data)
        ? workspaceResponse.data
        : Array.isArray((workspaceResponse?.data as any)?.items)
          ? (workspaceResponse?.data as any).items
          : Array.isArray((workspaceResponse?.data as any)?.data?.items)
            ? (workspaceResponse?.data as any).data.items
            : Array.isArray((workspaceResponse?.data as any)?.data)
              ? (workspaceResponse?.data as any).data
              : null;
      const hasWorkspaceList = Boolean(workspaceResponse?.success && workspaceItems);

      if (hasHistory || hasWorkspaceList) {
        const mergedById = new Map<string, Chat>();
        if (hasWorkspaceList && workspaceItems) {
          for (const workspace of workspaceItems) {
            if (!workspace?.chatId) continue;
            mergedById.set(workspace.chatId, {
              id: workspace.chatId,
              title: workspace.name || 'Workspace baru',
              isPinned: Boolean(workspace.isPinned),
              isArchived: Boolean(workspace.isArchived),
              workspaceMode: 'RUANG_KERJA',
              createdAt: workspace.createdAt,
              updatedAt: workspace.updatedAt || workspace.createdAt || new Date().toISOString()
            });
          }
        }
        if (hasHistory && historyItems) {
          for (const chat of historyItems) {
            if (!chat?.id) continue;
            const workspaceChat = mergedById.get(chat.id);
            mergedById.set(chat.id, {
              ...workspaceChat,
              ...chat,
              workspaceMode: chat.workspaceMode || workspaceChat?.workspaceMode || 'RUANG_TENANG'
            });
          }
        }
        const fetchedChats = [...mergedById.values()].sort((a, b) => {
          if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        });
        setChats(fetchedChats);
        try {
          await clientDb.saveEncrypted(`chats_${userId}`, JSON.stringify(fetchedChats));
        } catch {
          // The remote response remains usable when offline cache persistence fails.
        }
        return;
      }

      const status = historyResponse?.status || workspaceResponse?.status;
      const error = historyResponse?.error || workspaceResponse?.error;
      if (status !== 401) console.warn('Fetch chats failed:', error || 'Both chat history sources failed.');
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

  useEffect(() => {
    if (userRole === 'guest' || !userId) {
      const handleGuestChatsUpdated = () => {
        setChats(getGuestChats());
      };
      window.addEventListener(GUEST_CHATS_UPDATED_EVENT, handleGuestChatsUpdated);
      return () => {
        window.removeEventListener(GUEST_CHATS_UPDATED_EVENT, handleGuestChatsUpdated);
      };
    }
  }, [userRole, userId]);

  const handleDeleteChat = useCallback(async (id: string) => {
    if (userRole === 'guest' || id.startsWith('guest_')) {
      deleteGuestChat(id);
      setChats(getGuestChats());
      if (location.pathname === `/c/${id}`) navigate('/');
      return;
    }
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
  }, [chats, fetchChats, location.pathname, navigate, showToast, userRole]);

  const handleUpdateTitle = useCallback(async (id: string, title: string) => {
    if (userRole === 'guest' || id.startsWith('guest_')) {
      updateGuestChatTitle(id, title);
      setChats(getGuestChats());
      return;
    }
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
  }, [chats, fetchChats, showToast, userRole]);

  const handleTogglePin = useCallback(async (id: string) => {
    if (userRole === 'guest' || id.startsWith('guest_')) {
      togglePinGuestChat(id);
      setChats(getGuestChats());
      return;
    }
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
  }, [chats, fetchChats, showToast, userRole]);

  const handleToggleArchive = useCallback(async (id: string) => {
    if (userRole === 'guest' || id.startsWith('guest_')) {
      const chat = chats.find(item => item.id === id);
      if (!chat) return;
      const isArchived = !chat.isArchived;
      toggleArchiveGuestChat(id, isArchived);
      setChats(getGuestChats());
      return;
    }
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
  }, [chats, fetchChats, showToast, userRole]);

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
