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
  private abortController: AbortController | null = null;
  private state: StreamState = 'idle';

  private changeState(state: StreamState, callback?: (s: StreamState) => void) {
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
    this.abortController = new AbortController();
    const assistantMsgId = `msg_${Date.now() + 1}`;
    let currentText = '';
    let pluginName = '';

    this.changeState('connecting', callbacks.onStateChange);

    try {
      if (callbacks.onMessageStart) callbacks.onMessageStart(assistantMsgId);

      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        let errorMsg = `HTTP Kesalahan ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      if (!response.body) throw new Error("No response body");

      this.changeState('streaming', callbacks.onStateChange);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      const READ_TIMEOUT_MS = 25000; // 25s read timeout

      const readLoop = async () => {
        while (!done) {
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

            const { value, done: readerDone } = result;
            done = readerDone;

            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              // Retain incomplete line in buffer
              buffer = lines.pop() || '';

              for (const line of lines) {
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
                      if (callbacks.onPluginSwitch) callbacks.onPluginSwitch(pluginName);
                    } else if (parsed.text || (parsed.type === 'text' && parsed.content)) {
                      const content = parsed.text || parsed.content;
                      currentText += content;
                      if (callbacks.onChunk) callbacks.onChunk(content);
                    } else if (parsed.type === 'followup' && parsed.questions) {
                      if (callbacks.onFollowUps) callbacks.onFollowUps(parsed.questions);
                    } else if (parsed.chatId) {
                      if (callbacks.onChatCreated) callbacks.onChatCreated(parsed.chatId);
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
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text || (parsed.type === 'text' && parsed.content)) {
                  const content = parsed.text || parsed.content;
                  currentText += content;
                  if (callbacks.onChunk) callbacks.onChunk(content);
                }
              } catch (e) {}
            }
          }
        }
      };

      await readLoop();
      
      this.changeState('completed', callbacks.onStateChange);

      if (!pluginName && callbacks.onMessageComplete) {
        callbacks.onMessageComplete(currentText);
      }

    } catch (err: any) {
      if (err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('abort'))) {
        console.log('Stream aborted by client');
        this.changeState('aborted', callbacks.onStateChange);
        // Only trigger completion with existing text if there was content streamed
        if (callbacks.onMessageComplete && currentText.trim()) {
          callbacks.onMessageComplete(currentText);
        }
      } else {
        console.error('Streaming client error:', err);
        this.changeState('failed', callbacks.onStateChange);
        if (callbacks.onError) {
          callbacks.onError(err.message || 'Koneksi terputus.');
        }
      }
    } finally {
      this.abortController = null;
    }
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
