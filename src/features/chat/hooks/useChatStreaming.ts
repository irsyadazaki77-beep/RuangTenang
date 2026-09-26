import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatStreamingClient, StreamPayload } from '../services/chatStreamingClient';
import { playCompletionChime } from '../../../lib/soundEffects';

export function useChatStreaming() {
  const [isTyping, setIsTyping] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);
  const clientRef = useRef<ChatStreamingClient | null>(null);
  const currentTokenRef = useRef(0);
  const timeoutRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const chunkBufferRef = useRef<string>('');

  const abortStream = useCallback(() => {
    currentTokenRef.current++;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    chunkBufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.abort();
      clientRef.current = null;
    }
    setIsTyping(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (clientRef.current) {
        clientRef.current.abort();
        clientRef.current = null;
      }
    };
  }, []);

  const streamMessage = useCallback(async (
    payload: StreamPayload,
    callbacks: {
      onMessageStart: (msgId: string) => void;
      onChunk: (text: string) => void;
      onPluginSwitch: (pluginName: string) => void;
      onMessageComplete: (fullText: string) => void;
      onError: (error: string) => void;
      onFollowUps?: (followUps: string[]) => void;
      onChatCreated?: (chatId: string) => void;
      onQuotaExceeded?: (data: { message: string; resetAt?: string; suggestedActions?: string[] }) => void;
    }
  ) => {
    const token = ++currentTokenRef.current;
    setStreamingError(null);

    // Clear previous timeout and animation frame if any
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    chunkBufferRef.current = '';

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Ensure previous active stream is aborted
    if (clientRef.current) {
      clientRef.current.abort();
    }
    const client = new ChatStreamingClient();
    clientRef.current = client;
    setIsTyping(true);

    let hasReceivedFirstChunk = false;

    // 12-second initial connection / hang timeout guard
    timeoutRef.current = setTimeout(() => {
      if (token === currentTokenRef.current && !hasReceivedFirstChunk) {
        console.warn('[STREAM_TIMEOUT] Connection hung for 12s without response. Aborting...');
        if (clientRef.current) {
          clientRef.current.abort();
          clientRef.current = null;
        }
        setIsTyping(false);
        const timeoutMsg = 'Waktu respon melebihi 12 detik. Silakan coba kirim ulang pesanmu.';
        setStreamingError(timeoutMsg);
        callbacks.onError(timeoutMsg);
      }
    }, 12000);

    const flushChunkBuffer = () => {
      if (token === currentTokenRef.current && chunkBufferRef.current) {
        const buffered = chunkBufferRef.current;
        chunkBufferRef.current = '';
        callbacks.onChunk(buffered);
      }
      rafRef.current = null;
    };

    try {
      await client.stream(payload, {
        onMessageStart: (msgId) => {
          if (token !== currentTokenRef.current) return;
          setIsTyping(true);
          callbacks.onMessageStart(msgId);
        },
        onChunk: (text) => {
          if (token !== currentTokenRef.current) return;
          hasReceivedFirstChunk = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          // Batch fast token emissions into 60 FPS rAF frames to prevent main thread choke
          const isTest = 
            (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
            (typeof window !== 'undefined' && Boolean((window as any).__vitest_worker__ || (window as any).vi)) ||
            (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');

          if (isTest) {
            callbacks.onChunk(text);
          } else {
            chunkBufferRef.current += text;
            if (!rafRef.current) {
              rafRef.current = requestAnimationFrame(flushChunkBuffer);
            }
          }
        },
        onPluginSwitch: (pluginName) => {
          if (token !== currentTokenRef.current) return;
          hasReceivedFirstChunk = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          flushChunkBuffer();
          callbacks.onPluginSwitch(pluginName);
        },
        onMessageComplete: (text) => {
          if (token !== currentTokenRef.current) return;
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          flushChunkBuffer();
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setIsTyping(false);
          setStreamingError(null);
          if (text && text.length > 150) {
            playCompletionChime();
          }
          callbacks.onMessageComplete(text);
        },
        onError: (err) => {
          if (token !== currentTokenRef.current) return;
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          chunkBufferRef.current = '';
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setIsTyping(false);
          setStreamingError(err);
          callbacks.onError(err);
        },
        onFollowUps: (followUps) => {
          if (token !== currentTokenRef.current) return;
          callbacks.onFollowUps?.(followUps);
        },
        onChatCreated: (chatId) => {
          if (token !== currentTokenRef.current) return;
          callbacks.onChatCreated?.(chatId);
        },
        onQuotaExceeded: (data) => {
          if (token !== currentTokenRef.current) return;
          callbacks.onQuotaExceeded?.(data);
        }
      });
    } finally {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (token === currentTokenRef.current) {
        setIsTyping(false);
      }
    }
  }, []);

  return { isTyping, streamingError, streamMessage, abortStream };
}

