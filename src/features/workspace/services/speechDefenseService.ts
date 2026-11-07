/**
 * Speech Defense Service for RuangKerja (RuangTenang Kampus)
 * Provides 100% browser-native Speech-to-Text (STT) and Text-to-Speech (TTS)
 * for offline and zero-cost thesis defense simulations.
 */

export interface SpeechRecognitionResultCallback {
  (transcript: string, isFinal: boolean): void;
}

export interface SpeechDefenseServiceOptions {
  onResult?: SpeechRecognitionResultCallback;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
  lang?: string;
}

// Window interface augmentation for Chromium WebKit Speech
interface CustomSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

class SpeechDefenseService {
  private recognition: any = null;
  private isListening = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as any;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
  }

  public startListening(options: SpeechDefenseServiceOptions): boolean {
    if (!this.isRecognitionSupported()) {
      options.onError?.('Browser Anda tidak mendukung Web Speech Recognition. Silakan gunakan Google Chrome atau Microsoft Edge terbaru.');
      return false;
    }

    this.stopListening();
    this.stopSpeaking();

    const win = window as any;
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = options.lang || 'id-ID';

      this.recognition.onresult = (event: CustomSpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const transcript = (finalTranscript || interimTranscript).trim();
        if (transcript) {
          options.onResult?.(transcript, Boolean(finalTranscript));
        }
      };

      this.recognition.onerror = (err: any) => {
        const errorMsg = err?.error || 'Gagal merekam suara';
        if (errorMsg === 'no-speech') return; // Abaikan jeda hening
        options.onError?.(`Kesalahan mikrofon: ${errorMsg}`);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        options.onEnd?.();
      };

      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e: any) {
      options.onError?.(e?.message || 'Gagal memulai mikrofon');
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
      this.isListening = false;
    }
  }

  public getListeningStatus(): boolean {
    return this.isListening;
  }

  public speak(
    text: string,
    options?: {
      examinerId?: string;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: string) => void;
    }
  ): boolean {
    if (!this.isSynthesisSupported()) {
      options?.onError?.('Browser Anda tidak mendukung Text-to-Speech sintesis.');
      return false;
    }

    this.stopSpeaking();

    try {
      const cleanText = text
        .replace(/[*_#`$]/g, '') // Bersihkan simbol markdown / LaTeX
        .replace(/\n+/g, '. ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'id-ID';

      // Persona voice tuning:
      // Examiner 1: Dr. Hendra (Ketua Penguji Kritis) -> Pitch sedikit rendah, nada berwibawa
      // Examiner 2: Prof. Ratna (Penguji Teori Ahli) -> Pitch sedikit tinggi, artikulatif
      // Examiner 3: Dra. Nurul (Sekretaris / Pembimbing) -> Pitch ramah, tempo tenang
      if (options?.examinerId === 'examiner-1') {
        utterance.pitch = options.pitch ?? 0.88;
        utterance.rate = options.rate ?? 0.96;
      } else if (options?.examinerId === 'examiner-2') {
        utterance.pitch = options.pitch ?? 1.12;
        utterance.rate = options.rate ?? 1.0;
      } else if (options?.examinerId === 'examiner-3') {
        utterance.pitch = options.pitch ?? 1.02;
        utterance.rate = options.rate ?? 0.92;
      } else {
        utterance.pitch = options?.pitch ?? 1.0;
        utterance.rate = options?.rate ?? 0.98;
      }

      // Voice selection: cari suara id-ID jika tersedia di sistem
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang === 'id-ID' || v.lang.startsWith('id'));
      if (idVoice) {
        utterance.voice = idVoice;
      }

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        options?.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        options?.onError?.(e.error || 'Gagal membacakan teks');
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e: any) {
      options?.onError?.(e?.message || 'Gagal memanggil synthesizer suara');
      return false;
    }
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      this.currentUtterance = null;
    }
  }
}

export const speechDefenseService = new SpeechDefenseService();

export function isSpeechRecognitionSupported(): boolean {
  return speechDefenseService.isRecognitionSupported();
}

export function isSpeechSynthesisSupported(): boolean {
  return speechDefenseService.isSynthesisSupported();
}
