import { apiClient } from './apiClient';

export type SpeechPlaybackStatus = 'idle' | 'loading' | 'playing';
export type SpeechVoiceMode = 'empathetic' | 'study_overview';

interface SpeechListenerState {
  activeId: string | null;
  status: SpeechPlaybackStatus;
  source: 'gemini-tts' | 'browser-fallback' | null;
}

const MAX_CACHE_ENTRIES = 8;

class EmpatheticSpeechPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private activeId: string | null = null;
  private status: SpeechPlaybackStatus = 'idle';
  private source: 'gemini-tts' | 'browser-fallback' | null = null;
  private listeners = new Set<(state: SpeechListenerState) => void>();
  private audioUrlCache = new Map<string, string>();

  public subscribe(listener: (state: SpeechListenerState) => void): () => void {
    this.listeners.add(listener);
    listener({
      activeId: this.activeId,
      status: this.status,
      source: this.source,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot: SpeechListenerState = {
      activeId: this.activeId,
      status: this.status,
      source: this.source,
    };
    this.listeners.forEach(fn => fn(snapshot));
  }

  public stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore browser speech synthesis cancellation errors
      }
    }
    this.activeId = null;
    this.status = 'idle';
    this.source = null;
    this.notify();
  }

  private cacheAudioBlobUrl(cacheKey: string, blobUrl: string) {
    if (this.audioUrlCache.has(cacheKey)) {
      return;
    }
    if (this.audioUrlCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.audioUrlCache.keys().next().value;
      if (oldestKey) {
        const oldUrl = this.audioUrlCache.get(oldestKey);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        this.audioUrlCache.delete(oldestKey);
      }
    }
    this.audioUrlCache.set(cacheKey, blobUrl);
  }

  private playBrowserFallback(id: string, cleanText: string, mode: SpeechVoiceMode): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.stop();
      return false;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
      if (idVoice) {
        utterance.voice = idVoice;
      } else {
        utterance.lang = 'id-ID';
      }

      utterance.pitch = mode === 'empathetic' ? 0.96 : 1.0;
      utterance.rate = mode === 'empathetic' ? 0.93 : 0.98;

      utterance.onend = () => {
        if (this.activeId === id) {
          this.activeId = null;
          this.status = 'idle';
          this.source = null;
          this.notify();
        }
      };
      utterance.onerror = () => {
        if (this.activeId === id) {
          this.activeId = null;
          this.status = 'idle';
          this.source = null;
          this.notify();
        }
      };

      this.activeId = id;
      this.status = 'playing';
      this.source = 'browser-fallback';
      this.notify();
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  public async speak(options: {
    id: string;
    text: string;
    mode?: SpeechVoiceMode;
    voiceName?: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
  }): Promise<void> {
    this.stop();
    await this.toggleSpeak(options);
  }

  public async toggleSpeak(options: {
    id: string;
    text: string;
    mode?: SpeechVoiceMode;
    voiceName?: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
  }): Promise<void> {
    const { id, text, mode = 'empathetic', voiceName = mode === 'empathetic' ? 'Kore' : 'Zephyr' } = options;

    if (this.activeId === id && this.status !== 'idle') {
      this.stop();
      return;
    }

    this.stop();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[#\-*+>\d.]+\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);

    if (!cleanText) return;

    const cacheKey = `${mode}:${voiceName}:${cleanText.slice(0, 240)}:${cleanText.length}`;
    const cachedUrl = this.audioUrlCache.get(cacheKey);

    if (cachedUrl) {
      await this.playWavUrl(id, cachedUrl, cleanText, mode);
      return;
    }

    this.activeId = id;
    this.status = 'loading';
    this.source = null;
    this.notify();

    const controller = new AbortController();
    this.abortController = controller;

    try {
      const response = await apiClient.fetchJson<{
        success: boolean;
        fallback?: boolean;
        mimeType?: string;
        audioBase64?: string;
        cleanText?: string;
      }>('/api/v1/ai/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: cleanText,
          voiceName,
          mode,
        }),
        signal: controller.signal,
      });

      if (controller.signal.aborted || this.activeId !== id) {
        return;
      }

      if (!response.fallback && response.audioBase64) {
        const binary = atob(response.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: response.mimeType || 'audio/wav' });
        const blobUrl = URL.createObjectURL(blob);
        this.cacheAudioBlobUrl(cacheKey, blobUrl);
        await this.playWavUrl(id, blobUrl, cleanText, mode);
        return;
      }

      this.playBrowserFallback(id, response.cleanText || cleanText, mode);
    } catch {
      if (controller.signal.aborted) return;
      this.playBrowserFallback(id, cleanText, mode);
    }
  }

  private async playWavUrl(id: string, blobUrl: string, fallbackText: string, mode: SpeechVoiceMode): Promise<void> {
    try {
      const audio = new Audio(blobUrl);
      this.currentAudio = audio;
      this.activeId = id;
      this.status = 'playing';
      this.source = 'gemini-tts';
      this.notify();

      audio.onended = () => {
        if (this.activeId === id) {
          this.currentAudio = null;
          this.activeId = null;
          this.status = 'idle';
          this.source = null;
          this.notify();
        }
      };

      audio.onerror = () => {
        if (this.activeId === id) {
          this.currentAudio = null;
          this.playBrowserFallback(id, fallbackText, mode);
        }
      };

      await audio.play();
    } catch {
      this.playBrowserFallback(id, fallbackText, mode);
    }
  }

  public disposeAllCachedUrls(): void {
    this.stop();
    this.audioUrlCache.forEach(url => URL.revokeObjectURL(url));
    this.audioUrlCache.clear();
  }
}

export const speechPlayer = new EmpatheticSpeechPlayer();
