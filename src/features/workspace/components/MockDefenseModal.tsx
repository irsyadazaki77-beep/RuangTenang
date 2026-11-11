import React, { useState, useEffect } from 'react';
import {
  Award,
  ChevronRight,
  Clock,
  GraduationCap,
  RotateCcw,
  Send,
  Sparkles,
  X,
  FileText,
  CheckCircle2,
  Mic,
  Volume2,
  VolumeX,
  Radio,
  Flame,
  RefreshCw,
  Cpu
} from 'lucide-react';
import {
  DefenseExamType,
  DefenseQuestion,
  DefenseAnswerEvaluation,
  MockDefenseSession,
  DEFAULT_EXAMINERS,
  generateMockQuestions,
  evaluateDefenseAnswer,
  generateDefenseReportMarkdown
} from '../utils/mockDefenseModel';
import { speechDefenseService } from '../services/speechDefenseService';
import { defenseApiService } from '../services/defenseApiService';
import { FluidVoiceVisualizer } from '../../chat/components/FluidVoiceVisualizer';
import { safeLocalStorage } from '../../../lib/storage';

interface MockDefenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  contextText?: string;
  onSaveToCanvas?: (markdownContent: string, title: string) => void;
}

const STORAGE_KEY = 'ruangtenang_mock_defense_session';

export const MockDefenseModal: React.FC<MockDefenseModalProps> = ({
  isOpen,
  onClose,
  initialTitle = '',
  contextText = '',
  onSaveToCanvas
}) => {
  const [examType, setExamType] = useState<DefenseExamType>('SIDANG_SKRIPSI');
  const [rigorLevel, setRigorLevel] = useState<'standar' | 'killer'>('standar');
  const [thesisTitle] = useState(initialTitle || 'Analisis Efektivitas Pembelajaran Mandiri');
  const [questions, setQuestions] = useState<DefenseQuestion[]>(() => generateMockQuestions(initialTitle, 'SIDANG_SKRIPSI', contextText));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [studentInput, setStudentInput] = useState('');
  const [evaluations, setEvaluations] = useState<Record<string, DefenseAnswerEvaluation>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(120); // 2 minutes countdown per question
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Voice states (Native browser Web Speech API: STT & TTS)
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingExaminer, setIsSpeakingExaminer] = useState(false);
  const [isSpeakingCritique, setIsSpeakingCritique] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const isSpeechSupported = speechDefenseService.isRecognitionSupported();
  const isSynthesisSupported = speechDefenseService.isSynthesisSupported();

  // Load / Save session from local storage for offline resilience
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = safeLocalStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.thesisTitle === thesisTitle && parsed.examType === examType) {
            setQuestions(parsed.questions || generateMockQuestions(thesisTitle, examType, contextText));
            setCurrentIdx(parsed.currentIdx || 0);
            setEvaluations(parsed.evaluations || {});
            setShowSummary(Boolean(parsed.showSummary));
            if (parsed.rigorLevel === 'killer' || parsed.rigorLevel === 'standar') {
              setRigorLevel(parsed.rigorLevel);
            }
            return;
          }
        }
      } catch {
        // ignore
      }

      const q = generateMockQuestions(thesisTitle, examType, contextText);
      setQuestions(q);
      setCurrentIdx(0);
      setStudentInput('');
      setEvaluations({});
      setShowSummary(false);
      setTimerSeconds(120);
      setIsTimerRunning(true);
    }
  }, [isOpen, examType, contextText, thesisTitle]);

  // Save progress locally
  useEffect(() => {
    if (isOpen && questions.length > 0) {
      try {
        safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify({
          thesisTitle,
          examType,
          rigorLevel,
          questions,
          currentIdx,
          evaluations,
          showSummary,
          updatedAt: new Date().toISOString()
        }));
      } catch {
        // ignore
      }
    }
  }, [isOpen, thesisTitle, examType, rigorLevel, questions, currentIdx, evaluations, showSummary]);

  // Clean up speech on unmount or close
  useEffect(() => {
    return () => {
      speechDefenseService.stopListening();
      speechDefenseService.stopSpeaking();
    };
  }, []);

  // Countdown timer for defense answer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isOpen && isTimerRunning && timerSeconds > 0 && !evaluations[questions[currentIdx]?.id]) {
      interval = setInterval(() => {
        setTimerSeconds(s => Math.max(0, s - 1));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isOpen, isTimerRunning, timerSeconds, currentIdx, evaluations, questions]);

  const currentQ = questions[currentIdx];
  const activeExaminer = DEFAULT_EXAMINERS.find(e => e.id === currentQ?.examinerId) || DEFAULT_EXAMINERS[0];
  const currentEval = currentQ ? evaluations[currentQ.id] : undefined;
  const isLastQuestion = currentIdx === questions.length - 1;

  // Toggle Voice Input (Mic STT)
  const toggleListening = () => {
    if (isListening) {
      speechDefenseService.stopListening();
      setIsListening(false);
    } else {
      setSpeechError(null);
      const success = speechDefenseService.startListening({
        lang: 'id-ID',
        onResult: (transcript, isFinal) => {
          setStudentInput(prev => {
            if (isFinal) {
              return prev ? `${prev} ${transcript}` : transcript;
            }
            return transcript;
          });
        },
        onError: (err) => {
          setSpeechError(err);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        }
      });
      if (success) setIsListening(true);
    }
  };

  // Toggle Examiner Question Speech (TTS)
  const toggleSpeakQuestion = () => {
    if (isSpeakingExaminer) {
      speechDefenseService.stopSpeaking();
      setIsSpeakingExaminer(false);
    } else {
      if (!currentQ) return;
      speechDefenseService.speak(currentQ.question, {
        examinerId: activeExaminer.id,
        onStart: () => setIsSpeakingExaminer(true),
        onEnd: () => setIsSpeakingExaminer(false),
        onError: () => setIsSpeakingExaminer(false)
      });
    }
  };

  // Toggle Examiner Critique Speech (TTS)
  const toggleSpeakCritique = () => {
    if (isSpeakingCritique) {
      speechDefenseService.stopSpeaking();
      setIsSpeakingCritique(false);
    } else {
      if (!currentEval?.critique) return;
      speechDefenseService.speak(currentEval.critique, {
        examinerId: activeExaminer.id,
        onStart: () => setIsSpeakingCritique(true),
        onEnd: () => setIsSpeakingCritique(false),
        onError: () => setIsSpeakingCritique(false)
      });
    }
  };

  // Stop speaking when question changes
  useEffect(() => {
    speechDefenseService.stopSpeaking();
    setIsSpeakingExaminer(false);
    setIsSpeakingCritique(false);
  }, [currentIdx]);

  if (!isOpen) return null;

  const handleAnswerSubmit = async () => {
    if (!currentQ || !studentInput.trim() || isEvaluating) return;
    setIsEvaluating(true);
    speechDefenseService.stopListening();
    setIsListening(false);

    try {
      const ev = await defenseApiService.evaluateAnswer({
        question: currentQ,
        studentAnswer: studentInput,
        examiner: activeExaminer,
        thesisTitle,
        examType,
        rigorLevel
      });
      setEvaluations(prev => ({ ...prev, [currentQ.id]: ev }));
      setIsTimerRunning(false);
    } catch {
      const ev = evaluateDefenseAnswer(currentQ, studentInput);
      setEvaluations(prev => ({ ...prev, [currentQ.id]: ev }));
      setIsTimerRunning(false);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGenerateAiQuestions = async (newRigor?: 'standar' | 'killer', newExamType?: DefenseExamType) => {
    const targetRigor = newRigor || rigorLevel;
    const targetExam = newExamType || examType;
    setIsGeneratingAiQuestions(true);
    speechDefenseService.stopSpeaking();
    speechDefenseService.stopListening();
    setIsSpeakingExaminer(false);
    setIsSpeakingCritique(false);

    try {
      const res = await defenseApiService.generateQuestions({
        thesisTitle,
        examType: targetExam,
        contextText,
        rigorLevel: targetRigor
      });
      setQuestions(res.questions);
      setCurrentIdx(0);
      setStudentInput('');
      setEvaluations({});
      setShowSummary(false);
      setTimerSeconds(120);
      setIsTimerRunning(true);
    } catch {
      const q = generateMockQuestions(thesisTitle, targetExam, contextText);
      setQuestions(q);
      setCurrentIdx(0);
      setStudentInput('');
      setEvaluations({});
      setShowSummary(false);
      setTimerSeconds(120);
      setIsTimerRunning(true);
    } finally {
      setIsGeneratingAiQuestions(false);
    }
  };

  const handleNextQuestion = () => {
    speechDefenseService.stopSpeaking();
    speechDefenseService.stopListening();
    setIsSpeakingExaminer(false);
    setIsSpeakingCritique(false);
    setIsListening(false);

    if (isLastQuestion) {
      setShowSummary(true);
    } else {
      setCurrentIdx(prev => prev + 1);
      setStudentInput('');
      setTimerSeconds(120);
      setIsTimerRunning(true);
    }
  };

  const handleResetSession = () => {
    speechDefenseService.stopSpeaking();
    speechDefenseService.stopListening();
    setIsSpeakingExaminer(false);
    setIsSpeakingCritique(false);
    safeLocalStorage.removeItem(STORAGE_KEY);
    const q = generateMockQuestions(thesisTitle, examType, contextText);
    setQuestions(q);
    setCurrentIdx(0);
    setStudentInput('');
    setEvaluations({});
    setShowSummary(false);
    setTimerSeconds(120);
    setIsTimerRunning(true);
  };

  const handleSaveReport = () => {
    const session: MockDefenseSession = {
      id: `defense-${Date.now()}`,
      examType,
      thesisTitle,
      examiners: DEFAULT_EXAMINERS,
      questions,
      evaluations,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    const reportMd = generateDefenseReportMarkdown(session);
    onSaveToCanvas?.(reportMd, `Berita Acara Sidang - ${thesisTitle.slice(0, 30)}`);
    onClose();
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Simulasi Sidang & Ujian (AI Mock Defense)
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Voice & Offline Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latihan mental dan uji ketangguhan argumen bersama Dewan Penguji AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetSession}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Mulai Ulang Simulasi"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Exam Type Selector, Rigor Mode & Voice status bar */}
        <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Ujian:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => { setExamType('SEMINAR_PROPOSAL'); handleGenerateAiQuestions(rigorLevel, 'SEMINAR_PROPOSAL'); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  examType === 'SEMINAR_PROPOSAL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                Sempro
              </button>
              <button
                type="button"
                onClick={() => { setExamType('SIDANG_SKRIPSI'); handleGenerateAiQuestions(rigorLevel, 'SIDANG_SKRIPSI'); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  examType === 'SIDANG_SKRIPSI'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                Sidang Skripsi
              </button>
            </div>

            {/* Rigor Selector: Standar vs Killer */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setRigorLevel('standar')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  rigorLevel === 'standar'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                Standar
              </button>
              <button
                type="button"
                onClick={() => setRigorLevel('killer')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  rigorLevel === 'killer'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
                title="Mode Penguji Killer: Mencecar metodologi, validitas instrumen, dan bias secara agresif"
              >
                <Flame className="w-3 h-3 text-amber-300" />
                <span>Penguji Killer</span>
              </button>
            </div>

            {/* AI Regenerate Questions Button */}
            <button
              type="button"
              disabled={isGeneratingAiQuestions}
              onClick={() => handleGenerateAiQuestions()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
              title="Generate 4 pertanyaan baru berdasarkan judul & abstrak skripsi saudara menggunakan AI"
            >
              <RefreshCw className={`w-3 h-3 ${isGeneratingAiQuestions ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAiQuestions ? 'Menyusun Soal...' : 'Soal AI Khusus Judul'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">Kemajuan:</span>
            <div className="flex items-center gap-1">
              {questions.map((q, idx) => {
                const isDone = Boolean(evaluations[q.id]);
                const isCurrent = idx === currentIdx;
                return (
                  <span
                    key={q.id}
                    className={`h-2 rounded-full transition-all ${
                      isCurrent
                        ? 'w-6 bg-indigo-600'
                        : isDone
                        ? 'w-2 bg-emerald-500'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!showSummary ? (
            <>
              {/* Active Examiner Persona Card with Voice Avatar */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${activeExaminer.avatarBg}`}>
                  {activeExaminer.avatarText}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {activeExaminer.name}
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      {activeExaminer.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeExaminer.title} · <span className="text-indigo-600 dark:text-indigo-400 font-medium">Fokus: {activeExaminer.focusArea}</span>
                  </p>
                </div>
              </div>

              {/* Examiner Question Box with Speech Audio Button */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pertanyaan {currentIdx + 1} dari {questions.length} ({currentQ.chapterTag})
                  </span>

                  <div className="flex items-center gap-2">
                    {isSynthesisSupported && (
                      <button
                        type="button"
                        onClick={toggleSpeakQuestion}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all ${
                          isSpeakingExaminer
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs animate-pulse'
                            : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50'
                        }`}
                        title={isSpeakingExaminer ? 'Hentikan Suara Penguji' : 'Dengarkan Pertanyaan Penguji'}
                      >
                        {isSpeakingExaminer ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        <span>{isSpeakingExaminer ? 'Bersuara...' : 'Dengarkan 🔊'}</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                      <Clock className={`w-3.5 h-3.5 ${timerSeconds < 30 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                      <span className={timerSeconds < 30 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                        {formatTimer(timerSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed italic">
                  "{currentQ.question}"
                </p>

                {isSpeakingExaminer && (
                  <div className="flex items-center justify-center py-2">
                    <FluidVoiceVisualizer
                      state="speaking"
                      persona={activeExaminer.id === 'examiner-1' ? 'examiner_methodology' : activeExaminer.id === 'examiner-2' ? 'examiner_theory' : 'empathetic_counselor'}
                      size={90}
                    />
                  </div>
                )}

                <div className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 bg-white/60 dark:bg-slate-900/50 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                  💡 <span className="font-semibold">Petunjuk Penguji:</span> {currentQ.contextHint}
                </div>
              </div>

              {/* Answer Input or Evaluation Result */}
              {!currentEval ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Jawaban / Argumen Pembelaan Saudara:
                    </label>

                    {isSpeechSupported ? (
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                          isListening
                            ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 shadow-xs animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <Radio className="w-3 h-3 text-rose-600 animate-pulse" />
                            <span>Merekam Ucapan...</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3 h-3 text-indigo-600" />
                            <span>Bicara via Mic 🎙️</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Ketik jawaban di bawah</span>
                    )}
                  </div>

                  {speechError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50">
                      {speechError}
                    </p>
                  )}

                  <textarea
                    rows={4}
                    value={studentInput}
                    onChange={e => setStudentInput(e.target.value)}
                    placeholder="Sampaikan jawaban saudara dengan kaidah ilmiah (cth: 'Izin menjawab Dr. Hendra, berdasarkan landasan teori pada Bab 2...')"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-400">
                      Bisa berbicara langsung lewat mikrofon atau ketik naskah argumen.
                    </p>
                    <button
                      type="button"
                      disabled={!studentInput.trim() || isEvaluating}
                      onClick={handleAnswerSubmit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs"
                    >
                      {isEvaluating ? (
                        <>Sedang Menilai...</>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Serahkan Jawaban</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Evaluation Card */
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-scale-up">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`text-base font-extrabold px-3 py-1 rounded-xl ${
                        currentEval.score >= 80
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : currentEval.score >= 70
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        Skor: {currentEval.score}/100 (Grade {currentEval.grade})
                      </div>
                      {currentEval.isAiEvaluated && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                          <Cpu className="w-3 h-3 text-indigo-600" />
                          <span>AI First-Principles</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Kepercayaan Diri: <b>{currentEval.confidenceScore}%</b></span>
                      <span>Ketepatan Teori: <b>{currentEval.theoryScore}%</b></span>
                      <span>Logika Sanggahan: <b>{currentEval.defenseLogicScore}%</b></span>
                    </div>
                  </div>

                  {/* Critique */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                        Ulasan Dewan Penguji:
                      </h5>

                      {isSynthesisSupported && (
                        <button
                          type="button"
                          onClick={toggleSpeakCritique}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border transition-all ${
                            isSpeakingCritique
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs animate-pulse'
                              : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50'
                          }`}
                          title="Dengarkan ulasan dan cecaran penguji dengan suara lisan"
                        >
                          {isSpeakingCritique ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          <span>{isSpeakingCritique ? 'Hentikan Suara' : 'Dengar Ulasan 🔊'}</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {currentEval.critique}
                    </p>
                  </div>

                  {/* Follow-up question / Cecaran tambahan */}
                  {currentEval.followUpQuestion && (
                    <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
                        <Flame className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cecaran Lanjutan Dosen Penguji:</span>
                      </div>
                      <p className="text-rose-900/90 dark:text-rose-200/90 italic font-serif leading-relaxed">
                        "{currentEval.followUpQuestion}"
                      </p>
                    </div>
                  )}

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                        Poin Kelebihan:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-emerald-900/90 dark:text-emerald-200/80 text-[11px]">
                        {currentEval.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                      </ul>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                        Catatan Evaluasi:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 dark:text-amber-200/80 text-[11px]">
                        {currentEval.weaknesses.map((w, idx) => <li key={idx}>{w}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Suggested Counter Defense */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Contoh Formulasi Sanggahan Ilmiah Ideal:
                    </h5>
                    <p className="text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/60 font-serif">
                      "{currentEval.suggestedImprovement}"
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
                    >
                      <span>{isLastQuestion ? 'Lihat Berita Acara Kelulusan' : 'Lanjut ke Pertanyaan Berikutnya'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Session Summary View */
            <div className="space-y-5 animate-fade-in">
              <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-sm">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Simulasi Sidang Selesai!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Selamat, saudara telah menyelesaikan cecaran pertanyaan dari Dewan Penguji untuk {examType.replace(/_/g, ' ')}.
                </p>

                {(() => {
                  const evals = Object.values(evaluations);
                  const avg = Math.round(evals.reduce((a, b) => a + b.score, 0) / (evals.length || 1));
                  return (
                    <div className="pt-2">
                      <div className="inline-block px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-extrabold text-sm border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                        Rata-rata Nilai: {avg}/100 ({avg >= 85 ? 'Lulus Memuaskan (A)' : avg >= 75 ? 'Lulus Baik (B+)' : 'Lulus dengan Catatan Revisi'})
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Questions recap */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Rekapitulasi Butir Evaluasi:
                </h5>
                {questions.map((q, idx) => {
                  const ev = evaluations[q.id];
                  return (
                    <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {idx + 1}. {q.chapterTag}
                        </span>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-sm sm:max-w-md mt-0.5">
                          {q.question}
                        </p>
                      </div>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 ml-2">
                        {ev ? `${ev.score} poin (${ev.grade})` : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleResetSession}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Ulangi Simulasi
                </button>

                <button
                  type="button"
                  onClick={handleSaveReport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Simpan Berita Acara ke Kanvas</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
