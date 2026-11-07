import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  X,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  FilePlus,
  Printer,
  BookOpen,
  Check,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import {
  QuizSpec,
  QuizEvaluationSummary,
  evaluateQuizAttempt
} from '../utils/quizModel';
import { generateQuiz } from '../../../services/quizService';

interface WorkspaceQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  contextText: string;
  sourceDocumentNames?: string[];
  existingQuiz?: QuizSpec | null;
  onCreateArtifact?: (content: string, title: string) => void;
}

type ModalStage = 'setup' | 'exam' | 'review';

export function WorkspaceQuizModal({
  isOpen,
  onClose,
  initialTopic = '',
  contextText,
  sourceDocumentNames = [],
  existingQuiz = null,
  onCreateArtifact
}: WorkspaceQuizModalProps) {
  const [stage, setStage] = useState<ModalStage>(existingQuiz ? 'exam' : 'setup');
  const [topic, setTopic] = useState(initialTopic || 'Materi Dokumen');
  const [difficulty, setDifficulty] = useState<'mudah' | 'sedang' | 'sulit'>('sedang');
  const [questionCount, setQuestionCount] = useState<number>(5);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active quiz state
  const [quiz, setQuiz] = useState<QuizSpec | null>(existingQuiz);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [evaluation, setEvaluation] = useState<QuizEvaluationSummary | null>(null);

  // Review filter
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct'>('all');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingQuiz) {
        setQuiz(existingQuiz);
        setStage('exam');
        initExamSession(existingQuiz);
      } else {
        setStage('setup');
        setTopic(initialTopic || 'Materi Dokumen Terlampir');
      }
    }
  }, [isOpen, existingQuiz, initialTopic]);

  const initExamSession = (activeQuiz: QuizSpec) => {
    setQuiz(activeQuiz);
    setCurrentIndex(0);
    setUserAnswers({});
    setEvaluation(null);
    const totalSeconds = (activeQuiz.timeLimitMinutes || 10) * 60;
    setTimeRemainingSeconds(totalSeconds);
    setStartTime(Date.now());
    setStage('exam');
  };

  // Timer countdown handler
  useEffect(() => {
    if (stage === 'exam' && timeRemainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleFinishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const handleStartGenerate = async () => {
    if (!contextText.trim()) {
      setError('Belum ada dokumen materi acuan yang dapat dijadikan bahan soal kuis.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const generated = await generateQuiz({
        contextText,
        topic: topic.trim() || 'Materi Dokumen',
        difficulty,
        totalQuestions: questionCount,
        sourceDocumentNames
      });

      initExamSession(generated);
    } catch (err: any) {
      setError(err?.message || 'Gagal menghasilkan kuis simulasi ujian.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (!quiz) return;
    const currentQ = quiz.questions[currentIndex];
    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionIndex
    }));
  };

  const handleFinishExam = () => {
    if (!quiz) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const result = evaluateQuizAttempt(quiz, userAnswers, timeSpent);
    setEvaluation(result);
    setStage('review');
  };

  const handleSaveToCanvas = () => {
    if (!quiz || !onCreateArtifact) return;
    const rawJson = JSON.stringify(quiz, null, 2);
    onCreateArtifact(rawJson, quiz.title);
    onClose();
  };

  const handlePrint = () => {
    if (!quiz) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${quiz.title}</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; padding: 32px; color: #1e293b; max-width: 800px; margin: auto; }
          h1 { color: #0f172a; margin-bottom: 4px; }
          .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
          .score-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
          .question { margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; page-break-inside: avoid; }
          .question-title { font-weight: 700; font-size: 14px; margin-bottom: 12px; }
          .option { padding: 6px 12px; border-radius: 6px; margin-bottom: 6px; font-size: 13px; background: #f8fafc; }
          .correct { background: #dcfce7; color: #166534; font-weight: 600; }
          .explanation { background: #eff6ff; color: #1e40af; border-left: 3px solid #3b82f6; padding: 8px 12px; font-size: 12px; margin-top: 10px; border-radius: 0 6px 6px 0; }
        </style>
      </head>
      <body>
        <h1>${quiz.title}</h1>
        <div class="meta">Topik: ${quiz.topic} · Tingkat: ${quiz.difficulty.toUpperCase()} · Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>
        ${evaluation ? `
          <div class="score-box">
            <h3 style="margin-top:0;">Hasil Evaluasi Ujian</h3>
            <p><strong>Skor: ${evaluation.scorePercentage}% (Nilai: ${evaluation.gradeLetter})</strong> · Benar: ${evaluation.correctAnswersCount}/${evaluation.totalQuestions} soal</p>
            <p>${evaluation.summaryFeedback}</p>
          </div>
        ` : ''}
        ${quiz.questions.map((q, i) => `
          <div class="question">
            <div class="question-title">Soal ${i + 1}. ${q.question}</div>
            ${q.options.map((opt, optIdx) => `
              <div class="option ${optIdx === q.correctIndex ? 'correct' : ''}">
                ${['A', 'B', 'C', 'D'][optIdx]}. ${opt} ${optIdx === q.correctIndex ? '✓ (Kunci Jawaban)' : ''}
              </div>
            `).join('')}
            <div class="explanation"><strong>Pembahasan:</strong> ${q.explanation}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(userAnswers).length;
  const currentQ = quiz?.questions[currentIndex];

  const filteredQuestions = useMemo(() => {
    if (!quiz || stage !== 'review') return [];
    return quiz.questions.filter(q => {
      const isCorrect = userAnswers[q.id] === q.correctIndex;
      if (reviewFilter === 'wrong') return !isCorrect;
      if (reviewFilter === 'correct') return isCorrect;
      return true;
    });
  }, [quiz, stage, userAnswers, reviewFilter]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-4 sm:px-6 py-3.5 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8.5 w-8.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="quiz-modal-title" className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                  {stage === 'setup' ? 'Simulasi Ujian & Kuis AI' : quiz?.title || 'Simulasi Ujian'}
                </h2>
                <span className="text-[10px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-300/40">
                  {stage === 'exam' ? 'Sesi Berlangsung' : stage === 'review' ? 'Lembar Evaluasi' : 'Bebas Biaya (Rp 0)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {stage === 'setup'
                  ? 'Generate latihan soal ujian langsung dari dokumen materi kuliah Anda'
                  : stage === 'exam'
                  ? `Soal ${currentIndex + 1} dari ${quiz?.questions.length || 0} · Pilih jawaban terbaik`
                  : 'Diagnosis kelemahan materi dan pembahasan lengkap per nomor soal'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stage === 'exam' && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                timeRemainingSeconds <= 60
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300 animate-pulse'
                  : timeRemainingSeconds <= 180
                  ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timeRemainingSeconds)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Tutup modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {/* TAMPILAN 1: SETUP */}
          {stage === 'setup' && (
            <div className="space-y-4">
              {/* Info Dokumen Acuan */}
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-950/80 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Dokumen Acuan Latihan Ujian:</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {sourceDocumentNames.length > 0
                      ? sourceDocumentNames.join(', ')
                      : 'Naskah teks aktif di RuangKerja'}
                  </p>
                  <p className="text-[10.5px] text-indigo-600 dark:text-indigo-400 pt-0.5">
                    AI akan membuat soal berdasarkan fakta dan formula nyata dari materi ini.
                  </p>
                </div>
              </div>

              {/* Form Input Topik */}
              <div className="space-y-1.5">
                <label htmlFor="quiz-topic" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Fokus Topik / Bab Ujian:
                </label>
                <input
                  id="quiz-topic"
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Contoh: Siklus Krebs & Respirasi Seluler, Hukum Termodinamika, Analisis Regresi..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-950/50 p-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Pilihan Tingkat Kesulitan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tingkat Kesulitan:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mudah', label: 'Mudah', desc: 'Definisi & pemahaman dasar (C1-C2)' },
                    { id: 'sedang', label: 'Sedang', desc: 'Analisis konsep & variabel (C3)' },
                    { id: 'sulit', label: 'Sulit', desc: 'Studi kasus & penalaran kritis (C4)' },
                  ].map(diff => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setDifficulty(diff.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        difficulty === diff.id
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500/50'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold">{diff.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{diff.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Jumlah Soal */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jumlah Butir Soal:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { count: 5, time: '10 menit', label: '5 Soal Kilat' },
                    { count: 10, time: '20 menit', label: '10 Soal Standar' },
                    { count: 15, time: '30 menit', label: '15 Soal Simulasi' },
                  ].map(item => (
                    <button
                      key={item.count}
                      type="button"
                      onClick={() => setQuestionCount(item.count)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        questionCount === item.count
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500/50'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold">{item.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Batas: {item.time}</p>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* TAMPILAN 2: SESI UJIAN (ACTIVE EXAM) */}
          {stage === 'exam' && quiz && currentQ && (
            <div className="space-y-5">
              {/* Stepper / Palet Soal */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar max-w-[70%]">
                  {quiz.questions.map((q, idx) => {
                    const isAnswered = userAnswers[q.id] !== undefined;
                    const isCurrent = idx === currentIndex;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-7 w-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all shrink-0 ${
                          isCurrent
                            ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400'
                            : isAnswered
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-slate-500 font-medium shrink-0">
                  Terjawab: <span className="font-bold text-indigo-600 dark:text-indigo-400">{answeredCount}</span> / {quiz.questions.length}
                </div>
              </div>

              {/* Teks Pertanyaan */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Nomor {currentIndex + 1}
                  </span>
                  {currentQ.topicTag && (
                    <span className="text-[10.5px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                      {currentQ.topicTag}
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {currentQ.question}
                </p>
              </div>

              {/* Pilihan Opsi Jawaban (A, B, C, D) */}
              <div className="space-y-2.5 pt-1">
                {currentQ.options.map((option, optIdx) => {
                  const isSelected = userAnswers[currentQ.id] === optIdx;
                  const label = ['A', 'B', 'C', 'D'][optIdx];
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full p-3 sm:p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 dark:border-indigo-500 text-slate-900 dark:text-slate-100 shadow-xs ring-1 ring-indigo-500/50'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {label}
                      </div>
                      <span className="text-xs sm:text-sm leading-relaxed pt-0.5">{option}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-auto mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tombol Navigasi Bawah */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                {currentIndex < quiz.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(i => Math.min(quiz.questions.length - 1, i + 1))}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <span>Selanjutnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishExam}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selesaikan Ujian</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAMPILAN 3: LEMBAR EVALUASI & REVIEW HASIL */}
          {stage === 'review' && quiz && evaluation && (
            <div className="space-y-5">
              {/* Score Dashboard Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-950 dark:to-indigo-950/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`h-16 w-16 rounded-2xl flex flex-col items-center justify-center font-black text-white shadow-md ${
                    evaluation.scorePercentage >= 80 ? 'bg-emerald-600' : evaluation.scorePercentage >= 60 ? 'bg-indigo-600' : 'bg-amber-600'
                  }`}>
                    <span className="text-xl leading-none">{evaluation.gradeLetter}</span>
                    <span className="text-[10px] font-medium tracking-tight mt-0.5">{evaluation.scorePercentage}%</span>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      Evaluasi Performa Ujian
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {evaluation.summaryFeedback}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      <span>Benar: <strong className="text-emerald-600">{evaluation.correctAnswersCount}</strong></span>
                      <span>Salah: <strong className="text-rose-600">{evaluation.incorrectAnswersCount}</strong></span>
                      <span>Waktu: <strong>{Math.floor(evaluation.timeSpentSeconds / 60)}m {evaluation.timeSpentSeconds % 60}d</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => initExamSession(quiz)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ulangi Ujian</span>
                </button>
              </div>

              {/* Diagnostik Topik Lemah */}
              {evaluation.weakTopics.length > 0 && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Rekomendasi Area yang Perlu Diulas Kembali:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {evaluation.weakTopics.map(t => (
                      <span key={t} className="px-2.5 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-300/50 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Pembahasan */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pembahasan Detail Soal:
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  {(['all', 'wrong', 'correct'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setReviewFilter(f)}
                      className={`px-2.5 py-1 rounded-lg border transition-all ${
                        reviewFilter === f
                          ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {f === 'all' ? 'Semua' : f === 'wrong' ? 'Salah Saja' : 'Benar Saja'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daftar Soal & Pembahasan */}
              <div className="space-y-3.5">
                {filteredQuestions.map((q, idx) => {
                  const userSelected = userAnswers[q.id];
                  const isCorrect = userSelected === q.correctIndex;
                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                          {idx + 1}. {q.question}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {isCorrect ? 'Benar' : 'Salah'}
                        </span>
                      </div>

                      {/* Options */}
                      <div className="space-y-1.5 pl-1">
                        {q.options.map((opt, optIdx) => {
                          const isOptionCorrect = optIdx === q.correctIndex;
                          const isUserPick = optIdx === userSelected;
                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                                isOptionCorrect
                                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                                  : isUserPick && !isCorrect
                                  ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <span>{['A', 'B', 'C', 'D'][optIdx]}. {opt}</span>
                              {isOptionCorrect && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Kunci Jawaban ✓</span>
                              )}
                              {isUserPick && !isCorrect && (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">Jawaban Anda ✕</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pembahasan */}
                      <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-l-2 border-indigo-500 rounded-r-lg text-xs space-y-1">
                        <p className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Pembahasan Analitis:
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11.5px]">
                          {q.explanation}
                        </p>
                        {q.referenceSnippet && (
                          <p className="text-[10.5px] text-slate-500 italic pt-1 border-t border-indigo-100 dark:border-indigo-900/60 mt-1">
                            Rujukan: "{q.referenceSnippet}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 px-4 sm:px-6 py-3.5 bg-slate-50/70 dark:bg-slate-950/40">
          <p className="text-[11px] text-slate-400">
            {stage === 'setup'
              ? (isGenerating ? 'AI sedang merancang soal ujian...' : 'Ditenagai Gemini LLM bebas biaya')
              : stage === 'exam'
              ? 'Pilih jawaban yang paling tepat sebelum waktu habis'
              : 'Hasil kuis siap disimpan atau dicetak'}
          </p>

          <div className="flex items-center gap-2">
            {stage === 'setup' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isGenerating}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleStartGenerate}
                  disabled={isGenerating || !contextText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Merancang Soal...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Mulai Buat Kuis</span>
                    </>
                  )}
                </button>
              </>
            )}

            {stage === 'exam' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal / Keluar
                </button>
                <button
                  type="button"
                  onClick={handleFinishExam}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kumpulkan Ujian</span>
                </button>
              </>
            )}

            {stage === 'review' && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / PDF</span>
                </button>
                {onCreateArtifact && (
                  <button
                    type="button"
                    onClick={handleSaveToCanvas}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Simpan ke Canvas</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Selesai
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
