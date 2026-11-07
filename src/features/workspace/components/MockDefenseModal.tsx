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
  Radio
} from 'lucide-react';
import { useRealtimeLiveSession } from '../../chat/hooks/useRealtimeLiveSession';
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

interface MockDefenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  contextText?: string;
  onSaveToCanvas?: (markdownContent: string, title: string) => void;
}

export const MockDefenseModal: React.FC<MockDefenseModalProps> = ({
  isOpen,
  onClose,
  initialTitle = '',
  contextText = '',
  onSaveToCanvas
}) => {
  const [examType, setExamType] = useState<DefenseExamType>('SIDANG_SKRIPSI');
  const [thesisTitle] = useState(initialTitle || 'Analisis Efektivitas Pembelajaran Mandiri');
  const [questions, setQuestions] = useState<DefenseQuestion[]>(() => generateMockQuestions(initialTitle, 'SIDANG_SKRIPSI', contextText));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [studentInput, setStudentInput] = useState('');
  const [evaluations, setEvaluations] = useState<Record<string, DefenseAnswerEvaluation>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(120); // 2 minutes countdown per question
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const liveSession = useRealtimeLiveSession({
    persona: 'examiner_methodology',
    systemPrompt: `Anda adalah Dewan Penguji Sidang Skripsi. Uji mahasiswa dengan teliti dan santun.`
  });

  // When live session transcribes speech, sync to student input
  useEffect(() => {
    if (liveSession.currentPartialInput) {
      setStudentInput(prev => (prev ? `${prev} ` : '') + liveSession.currentPartialInput);
    }
  }, [liveSession.currentPartialInput]);

  const toggleVoiceMode = async () => {
    if (isVoiceMode) {
      liveSession.stopLiveSession();
      setIsVoiceMode(false);
    } else {
      const ok = await liveSession.startLiveSession();
      if (ok) setIsVoiceMode(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
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

  if (!isOpen) return null;

  const currentQ = questions[currentIdx];
  const activeExaminer = DEFAULT_EXAMINERS.find(e => e.id === currentQ?.examinerId) || DEFAULT_EXAMINERS[0];
  const currentEval = currentQ ? evaluations[currentQ.id] : undefined;
  const isLastQuestion = currentIdx === questions.length - 1;

  const handleAnswerSubmit = () => {
    if (!currentQ || !studentInput.trim() || isEvaluating) return;
    setIsEvaluating(true);
    setTimeout(() => {
      const ev = evaluateDefenseAnswer(currentQ, studentInput);
      setEvaluations(prev => ({ ...prev, [currentQ.id]: ev }));
      setIsEvaluating(false);
      setIsTimerRunning(false);
    }, 400);
  };

  const handleNextQuestion = () => {
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
    onSaveToCanvas?.(reportMd, `Berita Acara Simulasi Sidang - ${thesisTitle.slice(0, 30)}`);
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
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                  Interactive Drill
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uji ketangguhan argumen proposal & skripsi bersama Dewan Penguji AI
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

        {/* Exam Type Selector & Title bar */}
        <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Jenis Ujian:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setExamType('SEMINAR_PROPOSAL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  examType === 'SEMINAR_PROPOSAL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                Seminar Proposal (Sempro)
              </button>
              <button
                type="button"
                onClick={() => setExamType('SIDANG_SKRIPSI')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  examType === 'SIDANG_SKRIPSI'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                Sidang Skripsi Akhir
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceMode}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                isVoiceMode
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 animate-pulse'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
              }`}
            >
              {isVoiceMode ? (
                <>
                  <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                  <span>Live Voice Aktif</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mode Suara 🎙️</span>
                </>
              )}
            </button>
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
              {/* Active Examiner Persona Card */}
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

              {/* Examiner Question Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pertanyaan {currentIdx + 1} dari {questions.length} ({currentQ.chapterTag})
                  </span>

                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                    <Clock className={`w-3.5 h-3.5 ${timerSeconds < 30 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                    <span className={timerSeconds < 30 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                      {formatTimer(timerSeconds)}
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed italic">
                  "{currentQ.question}"
                </p>

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
                    {isVoiceMode && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>Mendengarkan ucapan Anda</span>
                        <div className="flex items-center gap-0.5 ml-1">
                          <span className="w-0.5 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, liveSession.userVolume * 18)}px` }} />
                          <span className="w-0.5 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(6, liveSession.userVolume * 24)}px` }} />
                          <span className="w-0.5 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, liveSession.userVolume * 16)}px` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={studentInput}
                    onChange={e => setStudentInput(e.target.value)}
                    placeholder="Sampaikan jawaban saudara dengan kaidah ilmiah (cth: 'Izin menjawab Dr. Hendra, berdasarkan landasan teori pada Bab 2...')"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-400">
                      Gunakan bahasa lugas, santun, dan sebutkan data empiris jika ada.
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
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Kepercayaan Diri: <b>{currentEval.confidenceScore}%</b></span>
                      <span>Ketepatan Teori: <b>{currentEval.theoryScore}%</b></span>
                      <span>Logika Sanggahan: <b>{currentEval.defenseLogicScore}%</b></span>
                    </div>
                  </div>

                  {/* Critique */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      Ulasan Dewan Penguji:
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {currentEval.critique}
                    </p>
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
                        Rata-rata Nilai: {avg}/100 ({avg >= 80 ? 'Lulus Memuaskan (A)' : 'Lulus dengan Catatan Revisi'})
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
                        {ev ? `${ev.score} poin` : '-'}
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
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
