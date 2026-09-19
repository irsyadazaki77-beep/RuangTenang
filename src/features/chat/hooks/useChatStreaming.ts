import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatStreamingClient, StreamPayload } from '../services/chatStreamingClient';

export function useChatStreaming() {
  const [isTyping, setIsTyping] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);
  const clientRef = useRef<ChatStreamingClient | null>(null);
  const currentTokenRef = useRef(0);
  const timeoutRef = useRef<any>(null);

  const abortStream = useCallback(() => {
    currentTokenRef.current++;
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
    }
  ) => {
    const token = ++currentTokenRef.current;
    setStreamingError(null);

    // Clear previous timeout if any
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
          callbacks.onChunk(text);
        },
        onPluginSwitch: (pluginName) => {
          if (token !== currentTokenRef.current) return;
          hasReceivedFirstChunk = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          callbacks.onPluginSwitch(pluginName);
        },
        onMessageComplete: (text) => {
          if (token !== currentTokenRef.current) return;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setIsTyping(false);
          setStreamingError(null);
          callbacks.onMessageComplete(text);
        },
        onError: (err) => {
          if (token !== currentTokenRef.current) return;
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
        }
      });
    } finally {
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

