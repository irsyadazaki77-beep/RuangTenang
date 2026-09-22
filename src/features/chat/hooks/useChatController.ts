import { useState, useRef, useCallback, useEffect } from 'react';
import { Message } from '../../../types';
import { useChatStreaming } from './useChatStreaming';
import { StreamPayload } from '../services/chatStreamingClient';

export interface UseChatControllerOptions {
  chatId?: string;
  chatMode?: string;
  responseStyle?: string;
  isTemporary?: boolean;
  onAssistantChunk?: (chunk: string, accumulated: string) => void;
  onAssistantComplete?: (fullText: string) => void;
  onFollowUps?: (followUps: string[]) => void;
  onChatCreated?: (newChatId: string) => void;
}

export function useChatController(options: UseChatControllerOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeStreamingMessage, setActiveStreamingMessage] = useState<Message | null>(null);
  const [quotaExceededInfo, setQuotaExceededInfo] = useState<{
    message: string;
    resetAt?: string;
    suggestedActions?: string[];
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const accumulatedTextRef = useRef('');

  const { isTyping, streamingError, streamMessage, abortStream } = useChatStreaming();

  /**
   * Accessible auto-scroll supporting `prefers-reduced-motion`
   */
  const scrollToBottom = useCallback((smooth = true) => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = (!smooth || prefersReducedMotion) ? 'auto' : 'smooth';

    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: 'end' });
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      });
    }
  }, []);

  // Auto-scroll on new message chunk or typing change
  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, activeStreamingMessage?.content, scrollToBottom]);

  /**
   * Cancel in-progress AI generation
   */
  const handleStopGenerating = useCallback(() => {
    abortStream();
    if (activeStreamingMessage && accumulatedTextRef.current) {
      const finalizedMsg: Message = {
        ...activeStreamingMessage,
        content: accumulatedTextRef.current + ' *(dibatalkan oleh pengguna)*'
      };
      setMessages(prev => [...prev, finalizedMsg]);
    }
    setActiveStreamingMessage(null);
    accumulatedTextRef.current = '';
  }, [abortStream, activeStreamingMessage]);

  /**
   * Send a prompt message and stream AI response
   */
  const sendMessage = useCallback(async (
    promptText: string,
    customPayload?: Partial<StreamPayload>
  ) => {
    const trimmed = promptText.trim();
    if (!trimmed || isTyping) return;

    const userMsgId = `user_${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setQuotaExceededInfo(null);
    accumulatedTextRef.current = '';

    const assistantMsgId = `asst_${Date.now()}`;
    const payload: StreamPayload = {
      message: trimmed,
      chatId: options.chatId,
      chatMode: options.chatMode || 'RuangTenang',
      responseStyle: options.responseStyle || 'Mendalam',
      isTemporary: options.isTemporary,
      ...customPayload
    };

    await streamMessage(payload, {
      onMessageStart: () => {
        setActiveStreamingMessage({
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          createdAt: new Date()
        });
      },
      onChunk: (chunk: string) => {
        accumulatedTextRef.current += chunk;
        setActiveStreamingMessage({
          id: assistantMsgId,
          role: 'assistant',
          content: accumulatedTextRef.current,
          createdAt: new Date()
        });
        options.onAssistantChunk?.(chunk, accumulatedTextRef.current);
      },
      onPluginSwitch: () => {},
      onMessageComplete: (fullText: string) => {
        const finalContent = fullText || accumulatedTextRef.current;
        const finalizedMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content: finalContent,
          createdAt: new Date()
        };
        setMessages(prev => [...prev, finalizedMsg]);
        setActiveStreamingMessage(null);
        accumulatedTextRef.current = '';
        options.onAssistantComplete?.(finalContent);
      },
      onError: (err: string) => {
        setActiveStreamingMessage(null);
        accumulatedTextRef.current = '';
        console.warn('[CHAT_CONTROLLER] Stream error:', err);
      },
      onFollowUps: (followUps: string[]) => {
        options.onFollowUps?.(followUps);
      },
      onChatCreated: (newChatId: string) => {
        options.onChatCreated?.(newChatId);
      },
      onQuotaExceeded: (data) => {
        setQuotaExceededInfo(data);
      }
    });
  }, [isTyping, options, streamMessage]);

  return {
    messages,
    setMessages,
    inputText,
    setInputText,
    isTyping,
    streamingError,
    activeStreamingMessage,
    quotaExceededInfo,
    scrollContainerRef,
    bottomRef,
    scrollToBottom,
    sendMessage,
    handleStopGenerating
  };
}
