import { StoredAttachment } from '../types';
import type { FileSourceReference } from '../../../../shared/contracts/files';
import { AUTH_SESSION_INVALIDATED_EVENT } from '../../../lib/apiClient';

export type StreamState = 'idle' | 'connecting' | 'streaming' | 'completed' | 'aborted' | 'failed';

export interface QuotaExceededData {
  message: string;
  resetAt?: string;
  suggestedActions?: string[];
}

export interface RoutingEventData {
  modelUsed: string;
  modelName?: string;
  routingMode: 'manual' | 'auto';
  routingReason: string;
  presetId?: string;
  isFallback?: boolean;
  fallbackFrom?: string;
  fallbackFromName?: string;
  profileId?: string;
  isDegraded?: boolean;
  degradationNotice?: string;
}

export interface StreamCallbacks {
  onStateChange?: (state: StreamState) => void;
  onMessageStart?: (msgId: string) => void;
  onChunk?: (text: string) => void;
  onPluginSwitch?: (pluginName: string, parameters?: Record<string, unknown>) => void;
  onMessageComplete?: (fullText: string) => void | Promise<void>;
  onError?: (error: string) => void | Promise<void>;
  onFollowUps?: (followUps: string[]) => void;
  onChatCreated?: (chatId: string) => void;
  onQuotaExceeded?: (data: QuotaExceededData) => void;
  onRoutingMetadata?: (data: RoutingEventData) => void;
  onSources?: (sources: FileSourceReference[]) => void;
  onConsentRequired?: () => void;
}

export interface StreamPayload {
  message: string;
  chatId?: string;
  /** Stable key for retry-safe Workspace message persistence. */
  idempotencyKey?: string;
  isTemporary?: boolean;
  workspaceMode?: boolean;
  /** Session-only acknowledgement for anonymous AI processing; never account-persisted. */
  guestAiConsent?: boolean;
  pluginResult?: string;
  chatMode?: string;
  responseStyle?: string;
  aiModel?: string;
  attachments?: StoredAttachment[];
  includeWorkspaceFiles?: boolean;
  workspaceAttachmentIds?: string[];
  /** Supplemental Canvas/workspace context; handled separately from the message saved in chat history. */
  workspaceContext?: string;
  isolatedTaskExecution?: boolean;
  taskCategory?: string;
  latencyPreference?: string;
  qualityPreference?: string;
  presetId?: string;
  history?: Array<{ role: 'user' | 'assistant' | 'model'; content: string }>;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

function reportClientAiTiming(name: 'AI_TTFT' | 'AI_TOTAL', value: number) {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined' || !Number.isFinite(value) || value < 0) return;
  window.dispatchEvent(new CustomEvent('rt-ai-stream-performance', { detail: { name, value } }));
}

function highResolutionNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

async function getNetworkFailureMessage(requestSignal: AbortSignal): Promise<string> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Koneksi internet sedang offline. Sambungkan kembali jaringan, lalu tekan Kirim Ulang Pesan.';
  }

  const controller = new AbortController();
  const abortProbe = () => controller.abort();
  if (requestSignal.aborted) abortProbe();
  else requestSignal.addEventListener('abort', abortProbe, { once: true });
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch('/api/v1/health', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal
    });

    if (response.ok) {
      return 'Server aplikasi aktif, tetapi koneksi ke layanan AI terputus. Periksa model AI lalu tekan Kirim Ulang Pesan.';
    }

    return `Server aplikasi merespons dengan status ${response.status}. Coba lagi setelah layanan pulih.`;
  } catch {
    return 'Server RuangKerja tidak merespons. Pastikan server aplikasi aktif dan koneksi internet tersedia, lalu tekan Kirim Ulang Pesan.';
  } finally {
    clearTimeout(timeout);
    requestSignal.removeEventListener('abort', abortProbe);
  }
}

export class ChatStreamingClient {
  private activeToken = 0;
  private abortController: AbortController | null = null;
  private state: StreamState = 'idle';

  private changeState(token: number, state: StreamState, callback?: (s: StreamState) => void) {
    if (token !== this.activeToken) return;
    this.state = state;
    if (callback) {
      try {
        callback(state);
      } catch (err) {
        console.warn('Error in onStateChange callback:', err);
      }
    }
  }

  async stream(payload: StreamPayload, callbacks: StreamCallbacks): Promise<void> {
    const token = ++this.activeToken;

    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
    }

    const abortController = new AbortController();
    this.abortController = abortController;
    const requestStartedAt = highResolutionNow();
    let firstContentRecorded = false;
    const assistantMsgId = `msg_${Date.now() + 1}`;
    let currentText = '';
    let pluginName = '';
    let announcedChatId: string | undefined;
    let consentRequiredAnnounced = false;

    this.changeState(token, 'connecting', callbacks.onStateChange);

    try {
      if (token === this.activeToken && callbacks.onMessageStart) {
        callbacks.onMessageStart(assistantMsgId);
      }

      const csrfToken = getCookie('XSRF-TOKEN');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      if (token !== this.activeToken || abortController.signal.aborted) return;
      let response: Response | null = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      // If 403 occurs due to CSRF token mismatch/expiry, attempt fresh token refresh once
      if (response.status === 403 && token === this.activeToken && !abortController.signal.aborted) {
        try {
          const freshRes = await fetch('/api/csrf-token', { credentials: 'include' });
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            const freshToken = freshData.csrfToken || getCookie('XSRF-TOKEN');
            if (freshToken) {
              headers['X-CSRF-Token'] = freshToken;
              response = await fetch('/api/v1/chat/stream', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify(payload),
                signal: abortController.signal
              });
            }
          }
        } catch {
          // ignore retry error
        }
      }

      if (token !== this.activeToken) {
        return;
      }

      if (!response.ok) {
        if (response.status === 401 && typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_SESSION_INVALIDATED_EVENT));
        }
        let errorMsg = `HTTP Kesalahan ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      if (!response.body) throw new Error("No response body");

      this.changeState(token, 'streaming', callbacks.onStateChange);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      let receivedDoneMarker = false;
      const readLoop = async () => {
        while (!done) {
          if (token !== this.activeToken) {
            try { reader.cancel(); } catch {}
            return;
          }

          const result = await reader.read();

            if (token !== this.activeToken) {
              try { reader.cancel(); } catch {}
              return;
            }

            const { value, done: readerDone } = result;
            done = readerDone;

            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              // Retain incomplete line in buffer
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (token !== this.activeToken) return;

                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.substring(6).trim();
                  if (dataStr === '[DONE]') {
                    receivedDoneMarker = true;
                    done = true;
                    break;
                  }
                  try {
                    const parsed = JSON.parse(dataStr);

                    // A completion event may include both chatId and sources. Handle
                    // the chat ID independently so source metadata cannot swallow it.
                    if (parsed.chatId && parsed.chatId !== announcedChatId) {
                      announcedChatId = parsed.chatId;
                      if (token === this.activeToken && callbacks.onChatCreated) {
                        callbacks.onChatCreated(parsed.chatId);
                      }
                    }
                    if ((parsed.type === 'consent_required' || parsed.code === 'AI_CONSENT_REQUIRED') && !consentRequiredAnnounced) {
                      consentRequiredAnnounced = true;
                      if (token === this.activeToken) callbacks.onConsentRequired?.();
                    }
                    // Older/still-running servers may only return the local notice
                    // text without the structured consent_required event.
                    if (
                      typeof parsed.text === 'string' &&
                      /persetujuan pemrosesan ai belum aktif/i.test(parsed.text) &&
                      !consentRequiredAnnounced
                    ) {
                      consentRequiredAnnounced = true;
                      if (token === this.activeToken) callbacks.onConsentRequired?.();
                    }

                    if (parsed.quotaExceeded || parsed.error === 'DAILY_LIMIT_EXCEEDED') {
                      if (token === this.activeToken && callbacks.onQuotaExceeded) {
                        callbacks.onQuotaExceeded({
                          message: parsed.message || parsed.text || 'Kuota harian Anda telah tercapai.',
                          resetAt: parsed.resetAt,
                          suggestedActions: parsed.suggestedActions
                        });
                      }
                      if (parsed.error) {
                        throw new Error(parsed.message || parsed.text || parsed.error || 'Gagal memproses respons');
                      }
                    } else if (parsed.error) {
                      throw new Error(parsed.message || parsed.text || (typeof parsed.error === 'string' ? parsed.error : 'Gagal memproses respons'));
                    } else if (parsed.tool_call || (parsed.type === 'plugin' && parsed.plugin)) {
                      pluginName = parsed.tool_call || parsed.plugin;
                      if (token === this.activeToken && callbacks.onPluginSwitch) {
                        callbacks.onPluginSwitch(pluginName, parsed.parameters);
                      }
                    } else if (parsed.type === 'routing') {
                      if (token === this.activeToken && callbacks.onRoutingMetadata) {
                        callbacks.onRoutingMetadata({
                          modelUsed: parsed.modelUsed,
                          modelName: parsed.modelName,
                          routingMode: parsed.routingMode,
                          routingReason: parsed.routingReason,
                          isFallback: Boolean(parsed.isFallback),
                          fallbackFrom: parsed.fallbackFrom,
                          fallbackFromName: parsed.fallbackFromName,
                          profileId: parsed.profileId,
                          isDegraded: Boolean(parsed.isDegraded),
                          degradationNotice: parsed.degradationNotice
                        });
                      }
                    } else if (Array.isArray(parsed.sources)) {
                      if (token === this.activeToken && callbacks.onSources) callbacks.onSources(parsed.sources as FileSourceReference[]);
                    } else if (parsed.text || (parsed.type === 'text' && parsed.content)) {
                      const content = parsed.text || parsed.content;
                      currentText += content;
                      if (!firstContentRecorded && typeof content === 'string' && content.length > 0) {
                        firstContentRecorded = true;
                        reportClientAiTiming('AI_TTFT', highResolutionNow() - requestStartedAt);
                      }
                      if (token === this.activeToken && callbacks.onChunk) {
                        callbacks.onChunk(content);
                      }
                    } else if (parsed.type === 'followup' && parsed.questions) {
                      if (token === this.activeToken && callbacks.onFollowUps) {
                        callbacks.onFollowUps(parsed.questions);
                      }
                    }
                  } catch (e: any) {
                    if (e.message !== 'Unexpected end of JSON input' && e.message !== 'Unexpected token' && !e.message.includes('JSON')) {
                      throw e;
                    }
                  }
                }
              }
            }
        }

        // Flush remaining buffer
        if (token === this.activeToken && buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === '[DONE]') {
              receivedDoneMarker = true;
            } else {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text || (parsed.type === 'text' && parsed.content)) {
                  const content = parsed.text || parsed.content;
                  currentText += content;
                  if (!firstContentRecorded && typeof content === 'string' && content.length > 0) {
                    firstContentRecorded = true;
                    reportClientAiTiming('AI_TTFT', highResolutionNow() - requestStartedAt);
                  }
                  if (token === this.activeToken && callbacks.onChunk) {
                    callbacks.onChunk(content);
                  }
                }
              } catch {}
            }
          }
        }
      };

      await readLoop();

      if (token !== this.activeToken) {
        return;
      }

      if (!receivedDoneMarker) {
        // A validated tool call is already a complete, actionable UI event.
        // The server may disconnect before its trailing [DONE] marker arrives.
        if (pluginName) {
          this.changeState(token, 'completed', callbacks.onStateChange);
          return;
        }
        throw new Error(currentText.trim()
          ? 'Respons terputus sebelum selesai. Coba ulangi permintaan.'
          : 'Koneksi ke provider AI terputus sebelum respons diterima. Coba ulangi permintaan.');
      }

      this.changeState(token, 'completed', callbacks.onStateChange);

      if (!pluginName && callbacks.onMessageComplete) {
        await callbacks.onMessageComplete(currentText);
      }
      if (firstContentRecorded) reportClientAiTiming('AI_TOTAL', highResolutionNow() - requestStartedAt);

    } catch (err: any) {
      if (token !== this.activeToken) {
        return;
      }

      if (err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('abort'))) {
        console.info('Stream aborted by client');
        this.changeState(token, 'aborted', callbacks.onStateChange);
      } else {
        console.error('Streaming client error:', err);
        this.changeState(token, 'failed', callbacks.onStateChange);
        if (callbacks.onError) {
          const rawMessage = typeof err?.message === 'string' ? err.message : '';
          const isNetworkFailure = err instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(rawMessage);
          const errorMessage = isNetworkFailure
            ? await getNetworkFailureMessage(abortController.signal)
            : rawMessage || 'Koneksi terputus.';
          if (token !== this.activeToken || abortController.signal.aborted) return;
          await callbacks.onError(errorMessage);
        }
      }
    } finally {
      if (this.abortController === abortController) {
        this.abortController = null;
      }
    }
  }

  abort() {
    this.activeToken++;
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = null;
    }
    this.state = 'aborted';
  }
}
