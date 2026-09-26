import { useState, useEffect, useMemo, useCallback } from 'react';
import { Message } from '../types';
import { apiClient } from '../../../lib/apiClient';

export interface UseChatSearchOptions {
  chatId: string | undefined;
  messages: Message[];
  nextCursor: string | null;
  isLoadingMore: boolean;
  fetchMessages: (cursor?: string) => Promise<void>;
}

export function useChatSearch({
  chatId,
  messages,
  nextCursor,
  isLoadingMore,
  fetchMessages
}: UseChatSearchOptions) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [backendMatchedIds, setBackendMatchedIds] = useState<string[]>([]);

  // Backend search integration across all messages in conversation
  useEffect(() => {
    if (!searchQuery.trim() || !chatId) {
      setBackendMatchedIds([]);
      return;
    }

    let isSubscribed = true;
    const q = searchQuery.trim();

    const timer = setTimeout(() => {
      apiClient.get<any>(`/api/chat/${chatId}/search?q=${encodeURIComponent(q)}`)
        .then(res => {
          if (!isSubscribed) return;
          const results = res.data?.results || (res as any).results || res.data;
          if (Array.isArray(results)) {
            setBackendMatchedIds(results.map((r: any) => r.id));
          } else {
            setBackendMatchedIds([]);
          }
        })
        .catch(() => {
          if (isSubscribed) setBackendMatchedIds([]);
        });
    }, 400);

    return () => {
      clearTimeout(timer);
      isSubscribed = false;
    };
  }, [chatId, searchQuery]);

  // Combined search matches (backend + local)
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const localMatches = messages.filter(m => m.content && m.content.toLowerCase().includes(q)).map(m => m.id);
    if (!chatId) return localMatches;

    const combinedSet = new Set([...backendMatchedIds, ...localMatches]);
    return Array.from(combinedSet);
  }, [messages, searchQuery, chatId, backendMatchedIds]);

  const scrollToMatchedMessage = useCallback((targetId: string) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (nextCursor && !isLoadingMore) {
      // If message is in older un-rendered page, load more messages
      fetchMessages(nextCursor);
    }
  }, [nextCursor, isLoadingMore, fetchMessages]);

  useEffect(() => {
    setCurrentSearchIndex(0);
    if (searchMatches.length > 0) {
      const targetId = searchMatches[0];
      scrollToMatchedMessage(targetId);
    }
  }, [searchMatches, scrollToMatchedMessage]);

  const handleSearchNext = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentSearchIndex + 1) % searchMatches.length;
    setCurrentSearchIndex(nextIdx);
    const targetId = searchMatches[nextIdx];
    scrollToMatchedMessage(targetId);
  }, [searchMatches, currentSearchIndex, scrollToMatchedMessage]);

  const handleSearchPrev = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentSearchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentSearchIndex(prevIdx);
    const targetId = searchMatches[prevIdx];
    scrollToMatchedMessage(targetId);
  }, [searchMatches, currentSearchIndex, scrollToMatchedMessage]);

  return {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    currentSearchIndex,
    setCurrentSearchIndex,
    searchMatches,
    handleSearchNext,
    handleSearchPrev,
    scrollToMatchedMessage
  };
}
