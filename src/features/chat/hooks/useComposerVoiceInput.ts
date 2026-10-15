import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '../../../components/Toast';

export interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

export interface SpeechRecognitionErrorEvent {
  error: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
export type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export type AudioTranscriptionEngine = 'browser_speech_recognition' | 'provider_transcription';

export interface VoiceInputState {
  isListening: boolean;
  engine: AudioTranscriptionEngine;
  interimTranscript: string;
  permissionGranted: boolean | null;
}

/**
 * Enhanced voice input hook for RuangTenang & RuangKerja composer.
 * Adheres strictly to security & privacy:
 * - Never activates microphone without explicit user click.
 * - Supports graceful cancellation, permission handling, interim editing, and Indonesian localization.
 * - Layered abstraction ready for browser Speech Recognition and server/provider transcription.
 */
export function useComposerVoiceInput(input: string, setInput: (value: string) => void) {
  const { showToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const initialInputRef = useRef<string>('');

  const cancelListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        if (typeof recognitionRef.current.abort === 'function') {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
    showToast('Perekaman suara dibatalkan.', 'info');
  }, [showToast]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleListening = () => {
    const browserWindow = window as SpeechRecognitionWindow;
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      showToast('Browser Anda tidak mendukung fitur perekaman suara (Speech Recognition).', 'info');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    try {
      const recognition = new Recognition();
      initialInputRef.current = input;
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = event => {
        let transcript = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          transcript += event.results[index][0]?.transcript || '';
        }
        if (transcript) {
          setInterimTranscript(transcript);
          const prefix = initialInputRef.current ? (initialInputRef.current.endsWith(' ') ? initialInputRef.current : `${initialInputRef.current} `) : '';
          setInput(prefix + transcript);
        }
      };

      recognition.onerror = event => {
        console.warn('[VOICE_INPUT] Speech recognition event error:', event.error);
        setIsListening(false);
        setInterimTranscript('');
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setPermissionGranted(false);
          showToast('Izin akses mikrofon ditolak oleh browser atau sistem.', 'error');
        } else if (event.error === 'no-speech') {
          showToast('Tidak ada suara terdeteksi. Silakan coba berbicara lebih dekat.', 'info');
        } else {
          showToast(`Gagal merekam suara: ${event.error}`, 'warning');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setPermissionGranted(true);
      showToast('Mendengarkan ucapan Anda (Bahasa Indonesia)... Tekan tombol lagi untuk selesai.', 'info');
    } catch (error: any) {
      console.error('[VOICE_INPUT] Failed to initiate speech recognition:', error);
      setIsListening(false);
      setInterimTranscript('');
      showToast('Tidak dapat mengaktifkan input suara. Periksa izin mikrofon perangkat Anda.', 'error');
    }
  };

  return {
    isListening,
    interimTranscript,
    permissionGranted,
    toggleListening,
    cancelListening,
    engine: 'browser_speech_recognition' as AudioTranscriptionEngine
  };
}
