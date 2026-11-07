import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  VolumeX,
  RefreshCw,
  MessageSquare,
  X,
  GraduationCap,
  Heart,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import {
  useRealtimeLiveSession,
  type LiveVoiceMessage
} from '../hooks/useRealtimeLiveSession';
import {
  FluidVoiceVisualizer,
  type FluidVisualizerState
} from './FluidVoiceVisualizer';

export interface FluidVoiceCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (text: string) => void;
  onSyncTranscriptsToChat?: (transcripts: LiveVoiceMessage[]) => void;
  lastAssistantMessage?: string;
  isAiStreaming?: boolean;
  initialPersona?: 'empathetic_counselor' | 'examiner_methodology' | 'examiner_theory' | 'default';
}

export const FluidVoiceCompanionModal: React.FC<FluidVoiceCompanionModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  onSyncTranscriptsToChat,
  lastAssistantMessage: _lastAssistantMessage = '',
  isAiStreaming = false,
  initialPersona = 'empathetic_counselor'
}) => {
  const { showToast } = useToast();
  const [isTranscriptDrawerOpen, setIsTranscriptDrawerOpen] = useState(false);
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(0);

  const liveSession = useRealtimeLiveSession({
    persona: initialPersona,
    systemPrompt:
      initialPersona === 'empathetic_counselor'
        ? 'Anda adalah konselor dan teman curhat yang sangat empatis, hangat, dan menenangkan untuk mahasiswa Indonesia. Gunakan bahasa Indonesia yang santun, suportif, dan ringkas dalam percakapan lisan.'
        : 'Anda adalah dewan penguji sidang skripsi. Berikan evaluasi ilmiah yang konstruktif, tajam, dan santun.'
  });

  // Calculate visualizer state
  const visualizerState = useMemo<FluidVisualizerState>(() => {
    if (liveSession.isMuted) return 'muted';
    if (liveSession.isAiSpeaking) return 'speaking';
    if (liveSession.isProcessing || isAiStreaming) return 'processing';
    if (liveSession.isListening) return 'listening';
    return 'idle';
  }, [liveSession.isMuted, liveSession.isAiSpeaking, liveSession.isProcessing, isAiStreaming, liveSession.isListening]);

  // Session duration timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isOpen && liveSession.isSessionActive) {
      timer = setInterval(() => {
        setSessionDurationSeconds(s => s + 1);
      }, 1000);
    } else {
      setSessionDurationSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, liveSession.isSessionActive]);

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(sessionDurationSeconds / 60);
    const secs = sessionDurationSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [sessionDurationSeconds]);

  const handleEndCall = useCallback(() => {
    const recordedTranscripts = [...liveSession.transcripts];
    liveSession.stopLiveSession();

    // Handoff transcripts to chat
    if (recordedTranscripts.length > 0) {
      if (onSyncTranscriptsToChat) {
        onSyncTranscriptsToChat(recordedTranscripts);
      } else if (onSendMessage) {
        const transcriptSummary = recordedTranscripts
          .map(t => `${t.speaker === 'user' ? '🗣️ Anda' : '🌿 RuangTenang'}: ${t.text}`)
          .join('\n\n');
        const formattedNotice = `📝 **Catatan Sesi Suara Langsung (${formattedDuration}):**\n\n${transcriptSummary}`;
        onSendMessage(formattedNotice);
      }
      showToast('Sesi suara selesai. Transkrip telah disimpan ke obrolan.', 'success');
    }

    onClose();
  }, [formattedDuration, liveSession, onClose, onSendMessage, onSyncTranscriptsToChat, showToast]);

  // Start live session when modal opens
  useEffect(() => {
    if (!isOpen) {
      liveSession.stopLiveSession();
      setIsTranscriptDrawerOpen(false);
      return;
    }

    let isMounted = true;
    void (async () => {
      const ok = await liveSession.startLiveSession({
        persona: initialPersona
      });
      if (!ok && isMounted) {
        showToast('Izin mikrofon diperlukan untuk Live Voice Companion.', 'info');
      }
    })();

    return () => {
      isMounted = false;
      liveSession.stopLiveSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keyboard shortcut listener (Escape to end, M to toggle mute)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleEndCall();
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        // Toggle mute with M if not typing in an input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          liveSession.toggleMute();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleEndCall, liveSession]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Voice Companion RuangTenang"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 sm:p-6 animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-lg h-[640px] max-h-[92vh] rounded-3xl border border-teal-500/30 bg-radial from-slate-900 via-slate-950 to-slate-950 p-6 flex flex-col items-center justify-between shadow-2xl text-slate-100 overflow-hidden">
        {/* Ambient background bloom */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

        {/* TOP BAR: Persona switcher & call status */}
        <div className="w-full flex items-center justify-between z-10">
          {/* Persona selector pill */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => liveSession.setPersona('empathetic_counselor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                liveSession.persona === 'empathetic_counselor'
                  ? 'bg-teal-500/30 text-teal-200 border border-teal-400/50 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-teal-400" />
              <span>Sahabat Curhat</span>
            </button>
            <button
              type="button"
              onClick={() => liveSession.setPersona('examiner_methodology')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                liveSession.persona === 'examiner_methodology'
                  ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/50 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mentor Akademik</span>
            </button>
          </div>

          {/* Session timer & E2E encrypted badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs font-mono text-teal-300">
              <Clock className="w-3 h-3 text-teal-400" />
              <span>{formattedDuration}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsTranscriptDrawerOpen(!isTranscriptDrawerOpen)}
              className={`p-2 rounded-full transition-colors ${
                isTranscriptDrawerOpen
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-400/50'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
              }`}
              title="Lihat Transkrip Percakapan"
              aria-label="Lihat Transkrip Percakapan"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CENTER: Fluid Audio Aura Visualizer & Subtitles */}
        <div className="flex flex-col items-center justify-center my-auto z-10 w-full max-w-sm px-4">
          <FluidVoiceVisualizer
            userVolume={liveSession.userVolume}
            aiVolume={liveSession.aiVolume}
            state={visualizerState}
            persona={liveSession.persona}
            size={260}
          />

          {/* Real-time Subtitles / Live Transcript Floating Stream */}
          <div className="mt-4 text-center min-h-[58px] flex flex-col items-center justify-center w-full">
            {liveSession.isMuted ? (
              <p className="text-xs font-medium text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                Mikrofon dimatikan (Tekan M atau ikon mic untuk membuka)
              </p>
            ) : liveSession.currentAiSpeech ? (
              <div className="bg-slate-900/80 border border-teal-500/30 px-3.5 py-1.5 rounded-2xl shadow-lg max-w-xs animate-in fade-in duration-200">
                <p className="text-xs text-teal-100 font-medium line-clamp-3 leading-relaxed">
                  "{liveSession.currentAiSpeech}"
                </p>
              </div>
            ) : liveSession.currentPartialInput ? (
              <div className="bg-slate-900/80 border border-emerald-500/30 px-3.5 py-1.5 rounded-2xl shadow-lg max-w-xs animate-in fade-in duration-200">
                <p className="text-xs text-emerald-200 italic line-clamp-2">
                  "{liveSession.currentPartialInput}"
                </p>
              </div>
            ) : liveSession.isProcessing ? (
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memahami ceritamu...</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-normal">
                Bicaralah dengan santai layaknya teman bercerita...
              </p>
            )}
          </div>
        </div>

        {/* BOTTOM DOCK: Controls */}
        <div className="w-full flex items-center justify-center gap-5 z-10 pt-2 pb-1">
          {/* Mute/Unmute Mic */}
          <button
            type="button"
            onClick={liveSession.toggleMute}
            className={`p-3.5 rounded-full transition-all cursor-pointer ${
              liveSession.isMuted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
            }`}
            title={liveSession.isMuted ? 'Nyalakan Mikrofon (M)' : 'Matikan Mikrofon (M)'}
            aria-label={liveSession.isMuted ? 'Nyalakan Mikrofon' : 'Matikan Mikrofon'}
          >
            {liveSession.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Interrupt AI Button (Visible / active when AI speaks) */}
          {liveSession.isAiSpeaking ? (
            <button
              type="button"
              onClick={liveSession.interruptAi}
              className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-2 shadow-md transition-all animate-in zoom-in-95 cursor-pointer"
              title="Potong pembicaraan asisten"
            >
              <VolumeX className="w-4 h-4 text-teal-400" />
              <span>Sela Asisten</span>
            </button>
          ) : null}

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-950/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Akhiri Sesi Suara (Esc)"
            aria-label="Akhiri Sesi Suara"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* SLIDE-OVER TRANSCRIPT DRAWER */}
        {isTranscriptDrawerOpen && (
          <div className="absolute inset-x-0 bottom-0 top-16 bg-slate-900/95 backdrop-blur-md rounded-t-3xl border-t border-slate-700/80 p-5 flex flex-col z-20 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-semibold text-slate-200">Transkrip Sesi Suara</span>
                <span className="text-[10px] text-slate-400">({liveSession.transcripts.length} giliran)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTranscriptDrawerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-3 text-xs leading-relaxed">
              {liveSession.transcripts.length === 0 ? (
                <div className="text-center text-slate-500 py-10">
                  Belum ada percakapan suara yang tercatat. Bicaralah untuk memulai!
                </div>
              ) : (
                liveSession.transcripts.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.speaker === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 mb-0.5">
                      {msg.speaker === 'user' ? 'Anda' : 'RuangTenang'}
                    </span>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                        msg.speaker === 'user'
                          ? 'bg-teal-600/30 text-teal-100 border border-teal-500/40 rounded-br-xs'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Transkrip tersimpan lokal
              </span>
              <button
                type="button"
                onClick={liveSession.clearTranscripts}
                className="hover:text-rose-400 transition-colors"
              >
                Hapus riwayat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
