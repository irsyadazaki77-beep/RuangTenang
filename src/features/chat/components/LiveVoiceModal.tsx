import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  Volume2,
  Sparkles,
  Send,
  Square,
  Radio,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

export type VoicePersona = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';

interface VoiceTurnItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  latencyMs?: number;
}

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceMode?: boolean;
  projectInstructions?: string;
  onSyncTurnToChat?: (userText: string, assistantText: string) => void;
}

const VOICE_PERSONAS: Array<{ id: VoicePersona; label: string; desc: string }> = [
  { id: 'Kore', label: 'Kore', desc: 'Hangat, tenang & empatik' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Jernih, mengalir & suportif' },
  { id: 'Puck', label: 'Puck', desc: 'Cepat, responsif & dinamis' },
  { id: 'Charon', label: 'Charon', desc: 'Mendalam, analitis & metodologis' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Tegas, terstruktur & fokus' }
];

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  workspaceMode = false,
  projectInstructions,
  onSyncTurnToChat
}) => {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [voiceName, setVoiceName] = useState<VoicePersona>('Kore');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [turns, setTurns] = useState<VoiceTurnItem[]>([]);
  const [audioLevel, setAudioLevel] = useState(0.18);
  const [statusNote, setStatusNote] = useState<string>('Ketuk lingkaran suara atau mulai berbicara');
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const turnsRef = useRef<VoiceTurnItem[]>([]);
  turnsRef.current = turns;

  const stopAllAudioPlayback = useCallback(() => {
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      } catch {}
      audioElementRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }, []);

  const stopMicrophoneAnalyser = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const startMicrophoneAnalyser = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      stopMicrophoneAnalyser();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        setAudioLevel(Math.min(1, Math.max(0.12, avg * 2.4)));
        rafRef.current = requestAnimationFrame(updateLevel);
      };
      rafRef.current = requestAnimationFrame(updateLevel);
    } catch {
      // Fallback procedural animation if mic permission is handled solely by SpeechRecognition
    }
  }, [stopMicrophoneAnalyser]);

  const speakResponse = useCallback((text: string, audioBase64?: string, mimeType?: string) => {
    stopAllAudioPlayback();
    setPhase('speaking');
    setStatusNote('AI sedang berbicara · Ketuk untuk menyela (Barge-In)');

    if (audioBase64) {
      try {
        const audio = new Audio(`data:${mimeType || 'audio/wav'};base64,${audioBase64}`);
        audioElementRef.current = audio;
        audio.onended = () => {
          setPhase('idle');
          setStatusNote('Ketuk mikrofon untuk melanjutkan percakapan');
        };
        audio.onerror = () => {
          setPhase('idle');
          setStatusNote('Ketuk mikrofon untuk melanjutkan percakapan');
        };
        void audio.play();
        return;
      } catch {
        // Fall through to Web Speech API
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.02;
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.toLowerCase().includes('id'));
      if (idVoice) utterance.voice = idVoice;
      utterance.onend = () => {
        setPhase('idle');
        setStatusNote('Ketuk mikrofon untuk melanjutkan percakapan');
      };
      utterance.onerror = () => {
        setPhase('idle');
        setStatusNote('Ketuk mikrofon untuk melanjutkan percakapan');
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setPhase('idle');
      setStatusNote('Respons suara selesai ditampilkan');
    }
  }, [stopAllAudioPlayback]);

  const submitVoiceTurn = useCallback(async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed) return;

    stopAllAudioPlayback();
    stopMicrophoneAnalyser();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    setLiveTranscript('');
    setPhase('thinking');
    setStatusNote('Menyelaraskan konteks & menyusun respons suara...');

    const userTurn: VoiceTurnItem = {
      id: `v_user_${Date.now()}`,
      role: 'user',
      text: trimmed
    };
    setTurns(prev => [...prev, userTurn]);

    try {
      const res = await apiClient.post<{
        replyText: string;
        cleanSpeechText: string;
        audioBase64?: string;
        mimeType?: string;
        latencyMs?: number;
      }>('/api/v1/ai/live-voice-turn', {
        transcript: trimmed,
        voiceName,
        workspaceMode,
        projectInstructions,
        history: turnsRef.current.slice(-6).map(t => ({
          role: t.role,
          content: t.text
        }))
      });

      const payload = (res as any)?.replyText ? (res as any) : res.data;
      const replyText = payload?.replyText || 'Aku mendengarkanmu. Boleh ceritakan sedikit lebih lanjut bagian mana yang paling ingin kita bahas?';
      const speechText = payload?.cleanSpeechText || replyText;

      const assistantTurn: VoiceTurnItem = {
        id: `v_asst_${Date.now()}`,
        role: 'assistant',
        text: replyText,
        latencyMs: payload?.latencyMs
      };
      setTurns(prev => [...prev, assistantTurn]);
      onSyncTurnToChat?.(trimmed, replyText);

      speakResponse(speechText, payload?.audioBase64, payload?.mimeType);
    } catch {
      const fallbackReply = workspaceMode
        ? 'Saya mencatat poin utamamu. Mari kita bahas struktur argumennya secara bertahap.'
        : 'Aku mendengarkanmu dengan saksama. Tarik napas pelan sejenak, kita urai bersama-sama ya.';
      setTurns(prev => [
        ...prev,
        { id: `v_asst_${Date.now()}`, role: 'assistant', text: fallbackReply }
      ]);
      speakResponse(fallbackReply);
    }
  }, [voiceName, workspaceMode, projectInstructions, onSyncTurnToChat, speakResponse, stopAllAudioPlayback, stopMicrophoneAnalyser]);

  const startListening = useCallback(() => {
    // Barge-In: immediately stop any AI audio playback
    stopAllAudioPlayback();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setStatusNote('Browser ini belum mendukung mikrofon langsung. Gunakan kolom ketik cepat di bawah.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = true;

      let finalCaptured = '';

      recognition.onstart = () => {
        setPhase('listening');
        setStatusNote('Mendengarkan... Silakan berbicara dalam Bahasa Indonesia');
        void startMicrophoneAnalyser();
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalCaptured += transcriptChunk + ' ';
          } else {
            interim += transcriptChunk;
          }
        }
        setLiveTranscript((finalCaptured + interim).trim());
      };

      recognition.onerror = () => {
        stopMicrophoneAnalyser();
        setPhase('idle');
        setStatusNote('Ketuk lingkaran suara untuk mulai berbicara');
      };

      recognition.onend = () => {
        stopMicrophoneAnalyser();
        const textToSubmit = finalCaptured.trim();
        if (textToSubmit) {
          void submitVoiceTurn(textToSubmit);
        } else {
          setPhase(current => (current === 'listening' ? 'idle' : current));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setPhase('idle');
      setStatusNote('Tidak dapat mengakses mikrofon. Gunakan input teks di bawah.');
    }
  }, [startMicrophoneAnalyser, stopAllAudioPlayback, stopMicrophoneAnalyser, submitVoiceTurn]);

  const handleToggleOrb = () => {
    if (phase === 'listening') {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      stopMicrophoneAnalyser();
      if (liveTranscript.trim()) {
        void submitVoiceTurn(liveTranscript.trim());
      } else {
        setPhase('idle');
        setStatusNote('Ketuk lingkaran suara untuk mulai berbicara');
      }
      return;
    }

    if (phase === 'speaking') {
      // Barge-In interruption!
      stopAllAudioPlayback();
      startListening();
      return;
    }

    if (phase === 'idle') {
      startListening();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopAllAudioPlayback();
      stopMicrophoneAnalyser();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setPhase('idle');
      setLiveTranscript('');
    }
  }, [isOpen, stopAllAudioPlayback, stopMicrophoneAnalyser]);

  if (!isOpen) return null;

  const orbScale = phase === 'listening'
    ? 1 + audioLevel * 0.28
    : phase === 'speaking'
      ? 1.12
      : phase === 'thinking'
        ? 1.05
        : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#FAF9F6]/98 dark:bg-[#0D1117]/98 backdrop-blur-xl text-stone-900 dark:text-slate-100 p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Mode Suara Langsung Dua Arah"
    >
      {/* Top Bar: Mode Identity + Voice Persona Selector + Close */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Radio className={`w-4 h-4 ${phase !== 'idle' ? 'text-teal-600 dark:text-teal-400 animate-pulse' : 'text-stone-500'}`} />
          </span>
          <div>
            <div className="text-xs sm:text-sm font-semibold tracking-tight flex items-center gap-1.5">
              <span>Live Voice Studio</span>
              <span aria-hidden="true" className="text-stone-300 dark:text-slate-700">·</span>
              <span className="text-xs font-normal text-stone-500 dark:text-slate-400">
                {workspaceMode ? 'RuangKerja Riset' : 'RuangTenang Refleksi'}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 dark:text-slate-500">
              Percakapan dua arah real-time dengan interupsi alami (Barge-In)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Pilih Karakter Suara AI"
            value={voiceName}
            onChange={e => setVoiceName(e.target.value as VoicePersona)}
            className="h-9 rounded-xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-stone-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          >
            {VOICE_PERSONAS.map(p => (
              <option key={p.id} value={p.id}>
                Suara: {p.label} ({p.desc})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-800 flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup Mode Suara Langsung"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Stage: Reactive Audio Orb & Live Transcript */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto my-4 space-y-6 text-center px-4">
        <div className="relative flex items-center justify-center">
          {/* Outer Ambient Resonance Rings */}
          <div
            style={{ transform: `scale(${orbScale * 1.22})` }}
            className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full transition-transform duration-150 ${
              phase === 'listening'
                ? 'bg-teal-500/12 dark:bg-teal-400/12 border border-teal-500/25'
                : phase === 'speaking'
                  ? 'bg-indigo-500/15 dark:bg-indigo-400/15 border border-indigo-500/30 animate-pulse'
                  : phase === 'thinking'
                    ? 'bg-amber-500/12 border border-amber-500/25 animate-pulse'
                    : 'bg-stone-200/40 dark:bg-slate-800/40 border border-stone-200/60 dark:border-slate-800'
            }`}
          />
          <button
            type="button"
            onClick={handleToggleOrb}
            style={{ transform: `scale(${orbScale})` }}
            className={`absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer shadow-xl ${
              phase === 'listening'
                ? 'bg-teal-700 text-white ring-4 ring-teal-500/30'
                : phase === 'speaking'
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30'
                  : phase === 'thinking'
                    ? 'bg-stone-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-100 border border-stone-200 dark:border-slate-700 hover:border-teal-500'
            }`}
            aria-label={phase === 'listening' ? 'Hentikan mendengarkan' : 'Mulai berbicara'}
          >
            {phase === 'listening' ? (
              <Mic className="w-8 h-8 animate-pulse" />
            ) : phase === 'speaking' ? (
              <Volume2 className="w-8 h-8 animate-bounce" />
            ) : phase === 'thinking' ? (
              <Sparkles className="w-8 h-8 animate-spin" />
            ) : (
              <Mic className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            )}
            <span className="text-[11px] font-semibold tracking-wide uppercase">
              {phase === 'listening'
                ? 'Mendengar'
                : phase === 'speaking'
                  ? 'Menyela'
                  : phase === 'thinking'
                    ? 'Berpikir'
                    : 'Bicara'}
            </span>
          </button>
        </div>

        <div className="space-y-2 max-w-xl">
          <p className="text-xs font-medium text-stone-500 dark:text-slate-400">
            {statusNote}
          </p>
          {liveTranscript && (
            <p className="text-base sm:text-lg font-medium text-stone-900 dark:text-slate-100 leading-relaxed animate-fade-in">
              “{liveTranscript}”
            </p>
          )}
        </div>

        {/* Recent Spoken Turns Feed */}
        {turns.length > 0 && (
          <div className="w-full max-h-48 overflow-y-auto rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-3.5 space-y-2.5 text-left custom-scrollbar">
            {turns.slice(-4).map(turn => (
              <div key={turn.id} className="text-xs leading-relaxed">
                <div className="flex items-center justify-between text-[10.5px] text-stone-400 dark:text-slate-500 mb-0.5">
                  <span className="font-semibold text-stone-600 dark:text-slate-300">
                    {turn.role === 'user' ? 'Anda' : `AI (${voiceName})`}
                  </span>
                  {typeof turn.latencyMs === 'number' && (
                    <span className="font-mono tabular-nums">{turn.latencyMs} ms</span>
                  )}
                </div>
                <p className="text-stone-800 dark:text-slate-200">{turn.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Controls: Quick Text Fallback + Mic Toggle */}
      <div className="max-w-xl w-full mx-auto space-y-2">
        {!speechSupported && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 justify-center">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Gunakan input cepat di bawah untuk berdialog dengan suara AI ({voiceName}).</span>
          </div>
        )}
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!manualInput.trim() || phase === 'thinking') return;
            const text = manualInput.trim();
            setManualInput('');
            void submitVoiceTurn(text);
          }}
          className="flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm"
        >
          <input
            type="text"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="Atau ketik pesan untuk dijawab dengan suara..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-stone-800 dark:text-slate-100 placeholder:text-stone-400 focus:outline-none"
          />
          {phase === 'speaking' && (
            <button
              type="button"
              onClick={stopAllAudioPlayback}
              className="h-8 px-2.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-medium text-stone-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Hentikan Suara</span>
            </button>
          )}
          <button
            type="submit"
            disabled={!manualInput.trim() || phase === 'thinking'}
            className="w-8 h-8 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Kirim ke Suara AI"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
