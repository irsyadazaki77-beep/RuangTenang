import { useState, useRef, useCallback, useEffect } from 'react';

export interface LiveVoiceMessage {
  id: string;
  speaker: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  persona?: string;
}

export interface LiveSessionConfig {
  persona?: 'default' | 'examiner_methodology' | 'examiner_theory' | 'empathetic_counselor';
  systemPrompt?: string;
  onInterrupted?: () => void;
  onAiResponseChunk?: (chunk: string) => void;
  onAiResponseComplete?: (fullText: string) => void;
  onError?: (err: Error) => void;
}

export interface UseRealtimeLiveSessionReturn {
  isSessionActive: boolean;
  isListening: boolean;
  isAiSpeaking: boolean;
  isProcessing: boolean;
  isMuted: boolean;
  userVolume: number;
  aiVolume: number;
  persona: 'default' | 'examiner_methodology' | 'examiner_theory' | 'empathetic_counselor';
  transcripts: LiveVoiceMessage[];
  currentPartialInput: string;
  currentAiSpeech: string;
  startLiveSession: (config?: LiveSessionConfig) => Promise<boolean>;
  stopLiveSession: () => void;
  interruptAi: () => void;
  toggleMute: () => void;
  setPersona: (persona: 'default' | 'examiner_methodology' | 'examiner_theory' | 'empathetic_counselor') => void;
  sendSpokenTurn: (text: string) => Promise<void>;
  clearTranscripts: () => void;
}

export function useRealtimeLiveSession(initialConfig?: LiveSessionConfig): UseRealtimeLiveSessionReturn {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [persona, setPersonaState] = useState<'default' | 'examiner_methodology' | 'examiner_theory' | 'empathetic_counselor'>(
    initialConfig?.persona || 'default'
  );
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<LiveVoiceMessage[]>([]);
  const [currentPartialInput, setCurrentPartialInput] = useState('');
  const [currentAiSpeech, setCurrentAiSpeech] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const configRef = useRef<LiveSessionConfig | undefined>(initialConfig);
  configRef.current = initialConfig;

  const animFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;

  const setPersona = useCallback((newPersona: 'default' | 'examiner_methodology' | 'examiner_theory' | 'empathetic_counselor') => {
    setPersonaState(newPersona);
    if (configRef.current) {
      configRef.current.persona = newPersona;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      if (next) {
        setUserVolume(0);
      }
      return next;
    });
  }, []);

  // Stop synthetic audio playback
  const interruptAi = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsAiSpeaking(false);
    setIsProcessing(false);
    isSpeakingRef.current = false;
    setAiVolume(0);
    configRef.current?.onInterrupted?.();
  }, []);

  const stopLiveSession = useCallback(() => {
    interruptAi();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // no-op
      }
      recognitionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsSessionActive(false);
    setIsListening(false);
    setIsProcessing(false);
    setUserVolume(0);
    setCurrentPartialInput('');
  }, [interruptAi]);

  // Voice synthesis player with volume simulation
  const speakAiResponse = useCallback((text: string, currentPersona?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsProcessing(false);
      return;
    }
    interruptAi();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';

    // Adjust pitch and rate based on persona
    if (currentPersona === 'examiner_methodology') {
      utterance.pitch = 0.9;
      utterance.rate = 1.05;
    } else if (currentPersona === 'examiner_theory') {
      utterance.pitch = 1.1;
      utterance.rate = 0.95;
    } else if (currentPersona === 'empathetic_counselor') {
      utterance.pitch = 1.02;
      utterance.rate = 0.94;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }

    // Try to find natural Indonesian or Malay voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.startsWith('id') || v.lang.startsWith('ms'));
    if (idVoice) utterance.voice = idVoice;

    utterance.onstart = () => {
      setIsProcessing(false);
      setIsAiSpeaking(true);
      isSpeakingRef.current = true;
      setCurrentAiSpeech(text);
      // Simulate AI speaking wave
      setAiVolume(0.75);
    };

    utterance.onend = () => {
      setIsAiSpeaking(false);
      isSpeakingRef.current = false;
      setAiVolume(0);
      setCurrentAiSpeech('');
    };

    utterance.onerror = () => {
      setIsAiSpeaking(false);
      setIsProcessing(false);
      isSpeakingRef.current = false;
      setAiVolume(0);
      setCurrentAiSpeech('');
    };

    window.speechSynthesis.speak(utterance);
  }, [interruptAi]);

  // Simulate or execute spoken turn to AI
  const sendSpokenTurn = useCallback(async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed) return;

    // Interrupt AI if it was speaking when user spoke
    if (isSpeakingRef.current) {
      interruptAi();
    }

    const userMsg: LiveVoiceMessage = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      speaker: 'user',
      text: trimmed,
      timestamp: Date.now()
    };

    setTranscripts(prev => [...prev, userMsg]);
    setCurrentPartialInput('');
    setIsProcessing(true);

    // Formulate prompt context
    const activePersona = configRef.current?.persona || persona || 'default';

    try {
      // Call chat endpoint or formulate intelligent immediate response
      const payload = {
        message: trimmed,
        mode: 'live_voice',
        persona: activePersona,
        systemPrompt: configRef.current?.systemPrompt
      };

      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      let aiText = '';
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        aiText = data?.reply || data?.message || data?.text || '';
      }

      // Intelligent responsive fallback if backend is offline/mock
      if (!aiText) {
        if (activePersona === 'examiner_methodology') {
          aiText = `Pertanyaan metodologis Anda mengenai "${trimmed.slice(0, 40)}..." telah saya catat. Coba jelaskan kembali: bagaimana Anda menjamin reliabilitas dan validitas instrumen pada sampel tersebut?`;
        } else if (activePersona === 'examiner_theory') {
          aiText = `Menarik. Namun dari sudut pandang teori utama, apakah rujukan Anda sudah mencakup perdebatan ilmiah terbaru dalam 5 tahun terakhir?`;
        } else if (activePersona === 'empathetic_counselor') {
          aiText = `Aku mendengarkanmu dengan seksama. Cerita tentang "${trimmed.slice(0, 50)}" sangat bisa kupahami. Tarik napas perlahan... kamu tidak sendirian di sini. Apa yang paling kamu butuhkan saat ini?`;
        } else {
          aiText = `Saya mendengarkan. Anda mengatakan: "${trimmed}". Mari kita telaah bersama langkah selanjutnya.`;
        }
      }

      const aiMsg: LiveVoiceMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        speaker: 'assistant',
        text: aiText,
        timestamp: Date.now(),
        persona: activePersona
      };

      setTranscripts(prev => [...prev, aiMsg]);
      speakAiResponse(aiText, activePersona);
      configRef.current?.onAiResponseComplete?.(aiText);
    } catch (err: any) {
      setIsProcessing(false);
      configRef.current?.onError?.(err);
    }
  }, [interruptAi, persona, speakAiResponse]);

  const startLiveSession = useCallback(async (sessionConfig?: LiveSessionConfig): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    if (sessionConfig) {
      configRef.current = sessionConfig;
      if (sessionConfig.persona) {
        setPersonaState(sessionConfig.persona);
      }
    }

    try {
      // 1. Initialize microphone & audio context
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Volume monitoring loop
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        if (isMutedRef.current) {
          setUserVolume(0);
          animFrameRef.current = requestAnimationFrame(updateVolume);
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 128);
        setUserVolume(normalized);

        // Voice Activity Detection (VAD): If user speaks loudly while AI is talking, interrupt AI!
        if (normalized > 0.35 && isSpeakingRef.current) {
          interruptAi();
        }

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 2. Initialize SpeechRecognition
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.lang = 'id-ID';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          if (isMutedRef.current) return;

          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const finalTranscript = event.results[i][0].transcript;
              sendSpokenTurn(finalTranscript);
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setCurrentPartialInput(interimTranscript);
        };

        recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech') {
            console.warn('[LiveVoice] SpeechRecognition error:', e.error);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsSessionActive(true);
      setIsListening(true);
      return true;
    } catch (err: any) {
      console.error('[LiveVoice] Gagal memulai sesi suara langsung:', err);
      configRef.current?.onError?.(err);
      stopLiveSession();
      return false;
    }
  }, [interruptAi, sendSpokenTurn, stopLiveSession]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, [stopLiveSession]);

  return {
    isSessionActive,
    isListening,
    isAiSpeaking,
    isProcessing,
    isMuted,
    userVolume,
    aiVolume,
    persona,
    transcripts,
    currentPartialInput,
    currentAiSpeech,
    startLiveSession,
    stopLiveSession,
    interruptAi,
    toggleMute,
    setPersona,
    sendSpokenTurn,
    clearTranscripts
  };
}
