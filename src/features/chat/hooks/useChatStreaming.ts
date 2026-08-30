import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatStreamingClient, StreamPayload } from '../services/chatStreamingClient';

export function useChatStreaming() {
  const [isTyping, setIsTyping] = useState(false);
  const clientRef = useRef<ChatStreamingClient | null>(null);
  const currentTokenRef = useRef(0);

  const abortStream = useCallback(() => {
    currentTokenRef.current++;
    if (clientRef.current) {
      clientRef.current.abort();
      clientRef.current = null;
    }
    setIsTyping(false);
  }, []);

  useEffect(() => {
    return () => {
      currentTokenRef.current++;
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

    // Ensure previous active stream is aborted
    if (clientRef.current) {
      clientRef.current.abort();
    }
    const client = new ChatStreamingClient();
    clientRef.current = client;
    setIsTyping(true);

    try {
      await client.stream(payload, {
        onMessageStart: (msgId) => {
          if (token !== currentTokenRef.current) return;
          setIsTyping(true);
          callbacks.onMessageStart(msgId);
        },
        onChunk: (text) => {
          if (token !== currentTokenRef.current) return;
          callbacks.onChunk(text);
        },
        onPluginSwitch: (pluginName) => {
          if (token !== currentTokenRef.current) return;
          callbacks.onPluginSwitch(pluginName);
        },
        onMessageComplete: (text) => {
          if (token !== currentTokenRef.current) return;
          setIsTyping(false);
          callbacks.onMessageComplete(text);
        },
        onError: (err) => {
          if (token !== currentTokenRef.current) return;
          setIsTyping(false);
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
      if (token === currentTokenRef.current) {
        setIsTyping(false);
      }
    }
  }, []);

  return { isTyping, streamMessage, abortStream };
}

