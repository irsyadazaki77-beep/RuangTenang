import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatStreamingClient, StreamPayload } from '../services/chatStreamingClient';

export function useChatStreaming() {
  const [isTyping, setIsTyping] = useState(false);
  const clientRef = useRef<ChatStreamingClient | null>(null);

  const abortStream = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.abort();
      clientRef.current = null;
    }
    setIsTyping(false);
  }, []);

  useEffect(() => {
    return () => {
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
    // Ensure previous active stream is aborted
    if (clientRef.current) {
      clientRef.current.abort();
    }
    clientRef.current = new ChatStreamingClient();
    setIsTyping(true);

    try {
      await clientRef.current.stream(payload, {
        ...callbacks,
        onMessageStart: (msgId) => {
          setIsTyping(true);
          callbacks.onMessageStart(msgId);
        },
        onMessageComplete: (text) => {
          setIsTyping(false);
          callbacks.onMessageComplete(text);
        },
        onError: (err) => {
          setIsTyping(false);
          callbacks.onError(err);
        }
      });
    } finally {
      setIsTyping(false);
    }
  }, []);

  return { isTyping, streamMessage, abortStream };
}
