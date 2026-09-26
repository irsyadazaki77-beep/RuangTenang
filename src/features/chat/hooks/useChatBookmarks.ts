import { useState, useEffect, useCallback } from 'react';
import { UserSession } from '../../../types';
import { apiClient } from '../../../lib/apiClient';

export interface UseChatBookmarksOptions {
  user: UserSession | null;
  chatId: string | undefined;
  showToast: (msg: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

export function useChatBookmarks({ user, chatId, showToast }: UseChatBookmarksOptions) {
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState<Set<string>>(new Set());

  // Fetch bookmarks on mount / user change / chatId change
  useEffect(() => {
    if (!user || user.role === 'guest') {
      setBookmarkedMessageIds(new Set());
      return;
    }
    let isSubscribed = true;
    apiClient.get<{ success: boolean; bookmarks: Array<{ messageId: string }> }>('/api/chat/bookmarks')
      .then(res => {
        if (!isSubscribed) return;
        if (res.success && Array.isArray(res.data?.bookmarks)) {
          setBookmarkedMessageIds(new Set(res.data.bookmarks.map(b => b.messageId)));
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [user, chatId]);

  // Bookmark toggle handler
  const handleToggleBookmark = useCallback(async (messageId: string, currentStatus: boolean) => {
    if (!user || user.role === 'guest') {
      showToast('Silakan masuk untuk menyimpan pesan.', 'info');
      return;
    }
    if (currentStatus) {
      try {
        const res = await apiClient.delete<{ success: boolean }>(`/api/chat/bookmarks/${messageId}`);
        if (res.success) {
          setBookmarkedMessageIds(prev => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
          });
          showToast('Pesan dihapus dari simpanan', 'info');
        }
      } catch {
        showToast('Gagal menghapus simpanan', 'error');
      }
    } else {
      try {
        const targetChatId = chatId || 'temp';
        const res = await apiClient.post<{ success: boolean }>(`/api/chat/${targetChatId}/bookmarks`, { messageId });
        if (res.success) {
          setBookmarkedMessageIds(prev => {
            const next = new Set(prev);
            next.add(messageId);
            return next;
          });
          showToast('Pesan berhasil disimpan', 'success');
        }
      } catch {
        showToast('Gagal menyimpan pesan', 'error');
      }
    }
  }, [user, chatId, showToast]);

  return {
    isBookmarksModalOpen,
    setIsBookmarksModalOpen,
    bookmarkedMessageIds,
    setBookmarkedMessageIds,
    handleToggleBookmark
  };
}
