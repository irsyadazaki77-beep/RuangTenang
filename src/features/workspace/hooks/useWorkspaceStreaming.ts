import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatStreamingClient } from '../../chat/services/chatStreamingClient';
import { Message } from '../../chat/types';
import { parseArtifactsFromText } from '../utils/artifactParser';
import { useToast } from '../../../components/Toast';
import { StreamingStatus, WorkspaceArtifact } from '../types';
import { WorkspaceComposerConfig } from '../types';
import { StoredAttachment } from '../../chat/types';

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
    attachments?: StoredAttachment[],
    config?: WorkspaceComposerConfig
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
    let routingMeta: { modelUsed?: string; routingMode?: 'manual' | 'auto'; routingReason?: string } = {};

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
          responseStyle: config?.responseStyle && config.responseStyle !== 'Default'
            ? `${config.responseMode}; ${config.responseStyle}`
            : config?.responseMode ?? 'Seimbang',
          aiModel: config?.aiModel,
          attachments: attachments && attachments.length > 0 ? attachments : undefined,
          presetId: config?.presetId,
          taskCategory: config?.taskCategory,
          latencyPreference: config?.latencyPreference,
          qualityPreference: config?.qualityPreference
        },
        {
          onRoutingMetadata: (data) => {
            routingMeta = data;
          },
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
              createdAt: new Date(),
              ...routingMeta
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
              createdAt: new Date(),
              ...routingMeta
            };

            onStreamCompleted?.(finalAssistantMessage, extracted);
          },
          onError: (_errMsg: string) => {
            setStreamingStatus('error');
            setActiveStreamingMessage(null);
            // Keep transport details out of the user-facing conversation.

            const errorMessage: Message = {
              id: `err_${Date.now()}`,
              role: 'assistant',
              content: 'Respons belum berhasil dibuat karena koneksi atau layanan terputus. Silakan kirim ulang pesan Anda.',
              error: true,
              createdAt: new Date()
            };

            onStreamCompleted?.(errorMessage, []);
          }
        }
      );
    } catch (_err: unknown) {
      setStreamingStatus('error');
      setActiveStreamingMessage(null);
      onStreamCompleted?.({
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'Respons belum berhasil dibuat karena koneksi atau layanan terputus. Silakan kirim ulang pesan Anda.',
        error: true,
        createdAt: new Date()
      }, []);
    }
  }, [chatId, streamingStatus, onStreamArtifactExtracted, onStreamCompleted]);

  return {
    streamingStatus,
    isStreaming: streamingStatus === 'streaming' || streamingStatus === 'connecting',
    activeStreamingMessage,
    sendMessageStream,
    abortStream
  };
}
