import { useCallback, useEffect, useRef, useState } from 'react';
import { Message } from '../types';

export function useChatScroll(messages: Message[], isTyping: boolean, streamingContent?: string) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const updateViewportHeight = () => {
      const viewport = window.visualViewport;
      setViewportHeight(viewport && window.innerWidth < 768 ? viewport.height : null);
    };
    updateViewportHeight();
    const viewport = window.visualViewport;
    viewport.addEventListener('resize', updateViewportHeight);
    viewport.addEventListener('scroll', updateViewportHeight, { passive: true });
    return () => {
      viewport.removeEventListener('resize', updateViewportHeight);
      viewport.removeEventListener('scroll', updateViewportHeight);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const element = scrollContainerRef.current;
    const nearBottom = element
      ? element.scrollHeight - element.scrollTop - element.clientHeight <= 120
      : document.documentElement.scrollHeight - window.scrollY - window.innerHeight <= 120;
    setIsAtBottom(nearBottom);
    setShowScrollBottom(!nearBottom);
  }, []);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (element) element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element?.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToBottom = useCallback((smooth = true) => {
    const element = scrollContainerRef.current;
    if (element) {
      if (smooth && typeof element.scrollTo === 'function') {
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
      } else {
        element.scrollTop = element.scrollHeight;
      }
    }
    setIsAtBottom(true);
    setShowScrollBottom(false);
  }, []);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!isAtBottom || !element) return;
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);

    scrollRafRef.current = requestAnimationFrame(() => {
      const current = scrollContainerRef.current;
      if (!current) return;
      const distance = current.scrollHeight - (current.scrollTop + current.clientHeight);
      if (distance > 2) current.scrollTo({ top: current.scrollHeight, behavior: distance > 240 ? 'smooth' : 'auto' });
    });

    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [messages, isTyping, streamingContent, isAtBottom]);

  return { bottomRef, scrollContainerRef, showScrollBottom, isAtBottom, viewportHeight, scrollToBottom };
}
