export type StreamState = 'idle' | 'connecting' | 'streaming' | 'completed' | 'aborted' | 'failed';

export interface StreamCallbacks {
  onStateChange?: (state: StreamState) => void;
  onMessageStart?: (msgId: string) => void;
  onChunk?: (text: string) => void;
  onPluginSwitch?: (pluginName: string) => void;
  onMessageComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
  onFollowUps?: (followUps: string[]) => void;
  onChatCreated?: (chatId: string) => void;
}

export interface StreamPayload {
  message: string;
  chatId?: string;
  isTemporary?: boolean;
  pluginResult?: string;
  chatMode?: string;
  responseStyle?: string;
  aiModel?: string;
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
      } catch (e) {}
    }

    const abortController = new AbortController();
    this.abortController = abortController;
    const assistantMsgId = `msg_${Date.now() + 1}`;
    let currentText = '';
    let pluginName = '';

    this.changeState(token, 'connecting', callbacks.onStateChange);

    try {
      if (token === this.activeToken && callbacks.onMessageStart) {
        callbacks.onMessageStart(assistantMsgId);
      }

      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      if (token !== this.activeToken) {
        return;
      }

      if (!response.ok) {
        let errorMsg = `HTTP Kesalahan ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      if (!response.body) throw new Error("No response body");

      this.changeState(token, 'streaming', callbacks.onStateChange);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      const READ_TIMEOUT_MS = 25000; // 25s read timeout

      const readLoop = async () => {
        while (!done) {
          if (token !== this.activeToken) {
            try { reader.cancel(); } catch (e) {}
            return;
          }

          let timerId: any = null;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timerId = setTimeout(() => reject(new Error('Read timeout')), READ_TIMEOUT_MS);
          });

          try {
            const result = await Promise.race([
              reader.read(),
              timeoutPromise
            ]);

            if (timerId) clearTimeout(timerId);

            if (token !== this.activeToken) {
              try { reader.cancel(); } catch (e) {}
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
                    done = true;
                    break;
                  }
                  try {
                    const parsed = JSON.parse(dataStr);
                    
                    if (parsed.error) {
                      throw new Error(parsed.text || parsed.error || 'Gagal memproses respons');
                    } else if (parsed.tool_call || (parsed.type === 'plugin' && parsed.plugin)) {
                      pluginName = parsed.tool_call || parsed.plugin;
                      if (token === this.activeToken && callbacks.onPluginSwitch) {
                        callbacks.onPluginSwitch(pluginName);
                      }
                    } else if (parsed.text || (parsed.type === 'text' && parsed.content)) {
                      const content = parsed.text || parsed.content;
                      currentText += content;
                      if (token === this.activeToken && callbacks.onChunk) {
                        callbacks.onChunk(content);
                      }
                    } else if (parsed.type === 'followup' && parsed.questions) {
                      if (token === this.activeToken && callbacks.onFollowUps) {
                        callbacks.onFollowUps(parsed.questions);
                      }
                    } else if (parsed.chatId) {
                      if (token === this.activeToken && callbacks.onChatCreated) {
                        callbacks.onChatCreated(parsed.chatId);
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
          } catch (loopErr) {
            if (timerId) clearTimeout(timerId);
            throw loopErr;
          }
        }

        // Flush remaining buffer
        if (token === this.activeToken && buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text || (parsed.type === 'text' && parsed.content)) {
                  const content = parsed.text || parsed.content;
                  currentText += content;
                  if (token === this.activeToken && callbacks.onChunk) {
                    callbacks.onChunk(content);
                  }
                }
              } catch (e) {}
            }
          }
        }
      };

      await readLoop();
      
      if (token !== this.activeToken) {
        return;
      }

      this.changeState(token, 'completed', callbacks.onStateChange);

      if (!pluginName && callbacks.onMessageComplete) {
        callbacks.onMessageComplete(currentText);
      }

    } catch (err: any) {
      if (token !== this.activeToken) {
        return;
      }

      if (err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('abort'))) {
        console.log('Stream aborted by client');
        this.changeState(token, 'aborted', callbacks.onStateChange);
        // Only trigger completion with existing text if there was content streamed
        if (callbacks.onMessageComplete && currentText.trim()) {
          callbacks.onMessageComplete(currentText);
        }
      } else {
        console.error('Streaming client error:', err);
        this.changeState(token, 'failed', callbacks.onStateChange);
        if (callbacks.onError) {
          callbacks.onError(err.message || 'Koneksi terputus.');
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
      } catch (e) {}
      this.abortController = null;
    }
    this.state = 'aborted';
  }
}
