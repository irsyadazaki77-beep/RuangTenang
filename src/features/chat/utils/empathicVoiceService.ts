/**
 * Empathic Voice Service
 * Manages human-sounding text-to-speech for RuangTenang emotional companion.
 * Prioritizes natural Indonesian voices and cleans technical markdown/emojis for fluent speech.
 */

export interface VoicePreference {
  rate: number;
  pitch: number;
  voiceName?: string;
}

const DEFAULT_PREFERENCE: VoicePreference = {
  rate: 0.92,
  pitch: 0.96,
};

export class EmpathicVoiceService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    this.voices = window.speechSynthesis.getVoices();
    return this.voices;
  }

  /**
   * Find the best natural Indonesian voice available on the device.
   */
  public getBestIndonesianVoice(): SpeechSynthesisVoice | null {
    const voices = this.loadVoices();
    if (!voices.length) return null;

    // 1. Prioritize natural neural Indonesian voices
    const naturalIndonesian = voices.find(v => 
      (v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase() === 'id-id') &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online'))
    );
    if (naturalIndonesian) return naturalIndonesian;

    // 2. Any Indonesian voice
    const anyIndonesian = voices.find(v => 
      v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase() === 'id-id'
    );
    if (anyIndonesian) return anyIndonesian;

    // 3. Malay voice fallback (phonetically very close to Indonesian)
    const malay = voices.find(v => v.lang.toLowerCase().startsWith('ms'));
    if (malay) return malay;

    return null;
  }

  /**
   * Clean markdown, URLs, emojis, citations, and code blocks for fluid, natural human speech.
   */
  public cleanTextForSpeech(rawText: string): string {
    if (!rawText) return '';

    return rawText
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Remove code blocks and artifact tags
      .replace(/:::[\s\S]*?:::/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove URLs
      .replace(/https?:\/\/\S+/g, '')
      // Remove citations like [cite: 1, 2]
      .replace(/\[cite:[^\]]+\]/g, '')
      // Remove markdown links [Text](URL) -> Text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images ![Alt](URL)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove markdown formatting symbols
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      // Remove headings and list markers
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^>\s+/gm, '')
      // Remove emojis to avoid robotic descriptions
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Clean up excess whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speak text with empathetic cadence and pacing.
   */
  public speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      preference?: Partial<VoicePreference>;
    }
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    this.stop();

    const clean = this.cleanTextForSpeech(text);
    if (!clean) return false;

    const utterance = new SpeechSynthesisUtterance(clean);
    const bestVoice = this.getBestIndonesianVoice();

    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = 'id-ID';
    }

    const rate = options?.preference?.rate ?? DEFAULT_PREFERENCE.rate;
    const pitch = options?.preference?.pitch ?? DEFAULT_PREFERENCE.pitch;

    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      options?.onError?.(e);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.speaking;
  }
}

export const empathicVoiceService = new EmpathicVoiceService();
