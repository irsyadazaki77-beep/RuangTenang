import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../../components/Toast';

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function useComposerVoiceInput(input: string, setInput: (value: string) => void) {
  const { showToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggleListening = () => {
    const browserWindow = window as SpeechRecognitionWindow;
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      showToast('Browser Anda tidak mendukung fitur perekaman suara (Speech Recognition).', 'info');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new Recognition();
      const initialInput = input;
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = event => {
        let transcript = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          transcript += event.results[index][0]?.transcript || '';
        }
        if (transcript) {
          const prefix = initialInput ? (initialInput.endsWith(' ') ? initialInput : `${initialInput} `) : '';
          setInput(prefix + transcript);
        }
      };
      recognition.onerror = event => {
        console.warn('[STT] Error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') showToast('Izin mikrofon ditolak oleh browser.', 'error');
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      showToast('Mendengarkan suara (Bahasa Indonesia)...', 'info');
    } catch (error) {
      console.error('[STT] Failed to start:', error);
      setIsListening(false);
    }
  };

  return { isListening, toggleListening };
}
