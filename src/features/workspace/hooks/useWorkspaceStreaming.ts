import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatStreamingClient } from '../../chat/services/chatStreamingClient';
import { Message } from '../../chat/types';
import { parseArtifactsFromText } from '../utils/artifactParser';
import { useToast } from '../../../components/Toast';
import { StreamingStatus, WorkspaceArtifact } from '../types';

interface UseWorkspaceStreamingOptions {
  chatId?: string;
  onStreamArtifactExtracted?: (artifact: WorkspaceArtifact, isStreaming: boolean) => void;
  onStreamCompleted?: (assistantMessage: Message, extractedArtifacts: WorkspaceArtifact[]) => void;
}

export function useWorkspaceStreaming({
  chatId,
  onStreamArtifactExtracted,
  onStreamCompleted
}: UseWorkspaceStreamingOptions) {
  const { showToast } = useToast();
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus>('idle');
  const [activeStreamingMessage, setActiveStreamingMessage] = useState<Message | null>(null);

  const streamingClientRef = useRef<ChatStreamingClient | null>(null);

  // Clean up streaming client on chatId change or component unmount
  useEffect(() => {
    return () => {
      if (streamingClientRef.current) {
        streamingClientRef.current.abort();
        streamingClientRef.current = null;
      }
    };
  }, [chatId]);

  const abortStream = useCallback(() => {
    if (streamingClientRef.current) {
      streamingClientRef.current.abort();
    }
    setStreamingStatus('aborted');
    setActiveStreamingMessage(null);
    showToast('Respons dihentikan.', 'info');
  }, [showToast]);

  const sendMessageStream = useCallback(async (
    userPrompt: string,
    customSystemNote?: string,
    attachments?: any[]
  ) => {
    if (!userPrompt.trim() || streamingStatus === 'streaming' || streamingStatus === 'connecting') {
      return;
    }

    // Abort any existing stream before starting a new one
    if (streamingClientRef.current) {
      streamingClientRef.current.abort();
    }

    setStreamingStatus('connecting');
    const assistantMsgId = `asst_${Date.now()}`;
    let accumulatedText = '';

    streamingClientRef.current = new ChatStreamingClient();

    const formattedPrompt = customSystemNote 
      ? `${userPrompt}\n\n[Catatan Konteks Canvas: ${customSystemNote}]` 
      : userPrompt;

    try {
      await streamingClientRef.current.stream(
        {
          message: formattedPrompt,
          chatId: chatId || undefined,
          chatMode: 'RuangKerja',
          responseStyle: 'Mendalam',
          attachments: attachments && attachments.length > 0 ? attachments : undefined
        },
        {
          onMessageStart: () => {
            setStreamingStatus('streaming');
            setActiveStreamingMessage({
              id: assistantMsgId,
              role: 'assistant',
              content: '',
              createdAt: new Date()
            });
          },
          onChunk: (chunk: string) => {
            accumulatedText += chunk;
            setActiveStreamingMessage({
              id: assistantMsgId,
              role: 'assistant',
              content: accumulatedText,
              createdAt: new Date()
            });

            // Parse live artifacts during stream
            const { artifacts: extracted, activeStreamingArtifact } = parseArtifactsFromText(accumulatedText, true);

            if (activeStreamingArtifact) {
              onStreamArtifactExtracted?.(activeStreamingArtifact, true);
            } else if (extracted.length > 0) {
              onStreamArtifactExtracted?.(extracted[0], true);
            }
          },
          onMessageComplete: (finalText: string) => {
            setStreamingStatus('completed');
            setActiveStreamingMessage(null);

            const { cleanedText, artifacts: extracted } = parseArtifactsFromText(finalText, false);

            const finalAssistantMessage: Message = {
              id: assistantMsgId,
              role: 'assistant',
              content: cleanedText || finalText,
              createdAt: new Date()
            };

            onStreamCompleted?.(finalAssistantMessage, extracted);
          },
          onError: (errMsg: string) => {
            setStreamingStatus('error');
            setActiveStreamingMessage(null);
            showToast(`Kesalahan komunikasi: ${errMsg}`, 'error');

            const errorMessage: Message = {
              id: `err_${Date.now()}`,
              role: 'assistant',
              content: `⚠️ Terjadi kendala komunikasi: ${errMsg}. Silakan coba kirim ulang.`,
              error: true,
              createdAt: new Date()
            };

            onStreamCompleted?.(errorMessage, []);
          }
        }
      );
    } catch (_err: any) {
      setStreamingStatus('error');
      setActiveStreamingMessage(null);
      showToast('Gagal memproses permintaan AI.', 'error');
    }
  }, [chatId, streamingStatus, onStreamArtifactExtracted, onStreamCompleted, showToast]);

  return {
    streamingStatus,
    isStreaming: streamingStatus === 'streaming' || streamingStatus === 'connecting',
    activeStreamingMessage,
    sendMessageStream,
    abortStream
  };
}
