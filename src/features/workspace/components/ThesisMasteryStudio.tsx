import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileDown,
  Presentation,
  FileText,
  HeartPulse,
  Award,
  Loader2,
  ArrowRight,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { apiClient } from '../../../lib/apiClient';
import { speechPlayer, type SpeechPlaybackStatus } from '../../../lib/speechPlayer';
import { useToast } from '../../../components/Toast';
import { useComposerVoiceInput } from '../../chat/hooks/useComposerVoiceInput';
import { exportEditablePptx } from '../utils/exportPptx';
import { exportToAcademicDocx } from '../utils/exportDocx';

const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Ignore storage quota or privacy mode errors
    }
  },
};

// ============================================================================
// 1. SIMULASI SIDANG SKRIPSI INTERAKTIF (SUARA & RUBRIK 4 DIMENSI)
// ============================================================================

export type ExaminerRoleKey = 'ketua_sidang' | 'penguji_metodologi' | 'penguji_substansi';

export interface DefenseRubricScores {
  penguasaanTeori: number;
  ketepatanMetodologi: number;
  argumentasiBukti: number;
  ketenanganArtikulasi: number;
  overallScore: number;
}

export interface DefenseQaItem {
  question: string;
  examinerFocus: string;
  modelAnswer: string;
}

export interface DefenseTurnRecord {
  id: string;
  examinerRole: ExaminerRoleKey;
  speakerName: string;
  roleTitle: string;
  voiceName: 'Charon' | 'Kore' | 'Fenrir';
  question: string;
  userAnswer?: string;
  feedbackSummary: string;
  idealAnswerKey: string;
  rubricScores: DefenseRubricScores;
  timestamp: string;
}

interface DefenseSimulationApiResponse {
  speakerName: string;
  roleTitle: string;
  voiceName: 'Charon' | 'Kore' | 'Fenrir';
  examinerRole: ExaminerRoleKey;
  feedbackSummary: string;
  idealAnswerKey: string;
  nextQuestion: string;
  rubricScores: DefenseRubricScores;
  defenseQaSheet: DefenseQaItem[];
}

const EXAMINER_PERSONA_META: Array<{
  key: ExaminerRoleKey;
  shortLabel: string;
  speakerName: string;
  focusDesc: string;
  voiceName: 'Charon' | 'Kore' | 'Fenrir';
}> = [
  {
    key: 'ketua_sidang',
    shortLabel: 'Ketua Sidang',
    speakerName: 'Prof. Dr. Hendra Wijaya',
    focusDesc: 'Urgensi Masalah · Kebaruan (Novelty) · Kontribusi Bab I & V',
    voiceName: 'Charon',
  },
  {
    key: 'penguji_metodologi',
    shortLabel: 'Penguji Metodologi',
    speakerName: 'Dr. Rina Kusuma',
    focusDesc: 'Desain Riset · Instrumen · Validitas & Analisis Bab III',
    voiceName: 'Kore',
  },
  {
    key: 'penguji_substansi',
    shortLabel: 'Penguji Substansi',
    speakerName: 'Dr. Bima Pratama',
    focusDesc: 'Sintesis Teori · Bukti Empiris Bab IV · Kepatuhan Sitasi APA 7th',
    voiceName: 'Fenrir',
  },
];

export const DefenseSimulatorStage: React.FC<{
  artifactId: string;
  title: string;
  sourceContent: string;
  onAppendToCanvas?: (markdown: string) => void;
}> = ({ artifactId, title, sourceContent, onAppendToCanvas }) => {
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState<ExaminerRoleKey>('ketua_sidang');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<DefenseSimulationApiResponse | null>(null);
  const [history, setHistory] = useState<DefenseTurnRecord[]>([]);
  const [answerDraft, setAnswerDraft] = useState('');
  const [showIdealKey, setShowIdealKey] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<SpeechPlaybackStatus>('idle');

  const { isListening, interimTranscript, toggleListening } = useComposerVoiceInput(
    answerDraft,
    setAnswerDraft
  );

  const activeAudioId = `defense-sim-${artifactId}-${history.length}`;

  useEffect(() => {
    return speechPlayer.subscribe(state => {
      if (state.activeId === activeAudioId) {
        setSpeechStatus(state.status);
      } else {
        setSpeechStatus('idle');
      }
    });
  }, [activeAudioId]);

  const fetchExaminerTurn = useCallback(
    async (role: ExaminerRoleKey, userAnswer?: string, prevQuestion?: string, nextTurnIdx = 0) => {
      setIsLoading(true);
      try {
        const res = await apiClient.fetchJson<{
          success: boolean;
          data: DefenseSimulationApiResponse;
        }>('/api/v1/ai/defense-simulation', {
          method: 'POST',
          body: JSON.stringify({
            title: title || 'Naskah Skripsi',
            sourceText: sourceContent.slice(0, 16000) || title || 'Kajian Ilmiah Mahasiswa',
            examinerRole: role,
            userQuestionOrAnswer: userAnswer,
            previousQuestion: prevQuestion,
            turnIndex: nextTurnIdx,
          }),
        });

        if (res.success && res.data) {
          setCurrentTurn(res.data);
          setShowIdealKey(Boolean(userAnswer));
          if (userAnswer && prevQuestion) {
            setHistory(prev => [
              ...prev,
              {
                id: `turn-${Date.now()}`,
                examinerRole: role,
                speakerName: res.data.speakerName,
                roleTitle: res.data.roleTitle,
                voiceName: res.data.voiceName,
                question: prevQuestion,
                userAnswer,
                feedbackSummary: res.data.feedbackSummary,
                idealAnswerKey: res.data.idealAnswerKey,
                rubricScores: res.data.rubricScores,
                timestamp: new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
            ]);
          }
        }
      } catch {
        showToast('Gagal memuat respons penguji sidang. Silakan coba lagi.', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [title, sourceContent, showToast]
  );

  useEffect(() => {
    void fetchExaminerTurn(selectedRole, undefined, undefined, 0);
  }, [selectedRole, fetchExaminerTurn]);

  const handleSpeakExaminerPrompt = () => {
    if (!currentTurn) return;
    const textToSpeak = `${currentTurn.feedbackSummary} Pertanyaan penguji: ${currentTurn.nextQuestion}`;
    void speechPlayer.toggleSpeak({
      id: activeAudioId,
      text: textToSpeak,
      mode: 'study_overview',
      voiceName: currentTurn.voiceName || 'Charon',
    });
  };

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = answerDraft.trim();
    if (!trimmed || !currentTurn || isLoading) return;
    const prevQ = currentTurn.nextQuestion;
    setAnswerDraft('');
    void fetchExaminerTurn(selectedRole, trimmed, prevQ, history.length + 1);
  };

  const handleInsertDefenseSummaryToCanvas = () => {
    if (!currentTurn || !onAppendToCanvas) return;
    const scores = currentTurn.rubricScores;
    const qaLines = (currentTurn.defenseQaSheet || [])
      .map(
        (item, idx) =>
          `### ${idx + 1}. ${item.question}\n- **Fokus Penguji:** ${item.examinerFocus}\n- **Panduan Jawaban Ilmiah:** ${item.modelAnswer}`
      )
      .join('\n\n');

    const historyLines =
      history.length > 0
        ? `\n\n## Riwayat Tanya Jawab Simulasi Sidang\n` +
          history
            .map(
              (h, idx) =>
                `### Sesi ${idx + 1} (${h.speakerName})\n- **Pertanyaan:** ${h.question}\n- **Jawaban Mahasiswa:** ${h.userAnswer}\n- **Evaluasi Penguji:** ${h.feedbackSummary}`
            )
            .join('\n\n')
        : '';

    const markdown = `## Evaluasi Kesiapan Sidang Skripsi & Lembar Q&A Penguji

**Skor Kesiapan Sidang Keseluruhan:** ${scores.overallScore}/100  
Penguasaan Teori: ${scores.penguasaanTeori}/100 · Ketepatan Metodologi: ${scores.ketepatanMetodologi}/100 · Argumentasi & Bukti: ${scores.argumentasiBukti}/100 · Ketenangan & Artikulasi: ${scores.ketenanganArtikulasi}/100

## 5 Pertanyaan Kritis Penguji & Panduan Jawaban
${qaLines}${historyLines}`;

    onAppendToCanvas(markdown);
    showToast('Evaluasi rubrik dan panduan Q&A sidang disisipkan ke Canvas', 'success');
  };

  const scores = currentTurn?.rubricScores || {
    penguasaanTeori: 78,
    ketepatanMetodologi: 76,
    argumentasiBukti: 75,
    ketenanganArtikulasi: 80,
    overallScore: 77,
  };

  const gradeLabel =
    scores.overallScore >= 85
      ? 'A (Sangat Siap Pertahanan Sidang)'
      : scores.overallScore >= 75
      ? 'AB / B+ (Siap dengan Penguatan Bukti)'
      : 'B (Perlu Penajaman Argumen)';

  return (
    <div className="space-y-4">
      {/* Top Examiner Persona Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Simulasi Sidang Skripsi Interaktif (Suara & Rubrik Dewan Penguji)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pilih persona dosen penguji, dengarkan pertanyaan lisan, dan jawab via mikrofon atau teks untuk dinilai secara real-time.
          </p>
        </div>

        {onAppendToCanvas && (
          <button
            type="button"
            onClick={handleInsertDefenseSummaryToCanvas}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sematkan Rubrik & Q&A ke Canvas</span>
          </button>
        )}
      </div>

      {/* Examiner Selector Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {EXAMINER_PERSONA_META.map(persona => {
          const isSelected = selectedRole === persona.key;
          return (
            <button
              key={persona.key}
              type="button"
              onClick={() => setSelectedRole(persona.key)}
              className={`rounded-xl border p-3.5 text-left transition cursor-pointer ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <span>{persona.shortLabel}</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  Suara {persona.voiceName}
                </span>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                {persona.speakerName}
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {persona.focusDesc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Two-Zone Sandbox Layout: 65% Stage & Voice Answer Console / 35% 4D Rubric & Cheat-Sheet */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT 7 COLS (~60-65%): Active Examiner Stage & Student Response Console */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/50 space-y-4">
            {isLoading && !currentTurn ? (
              <div className="py-10 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Dewan penguji sedang membedah naskah Anda…
                </p>
              </div>
            ) : (
              currentTurn && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3 dark:border-slate-800">
                    <div>
                      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {currentTurn.speakerName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {currentTurn.roleTitle} · Sesi Tanya Jawab #{history.length + 1}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSpeakExaminerPrompt}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition cursor-pointer ${
                        speechStatus !== 'idle'
                          ? 'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/60 dark:text-teal-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {speechStatus === 'loading' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : speechStatus === 'playing' ? (
                        <VolumeX className="h-3.5 w-3.5" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      )}
                      <span>
                        {speechStatus === 'playing' ? 'Hentikan Suara Penguji' : 'Dengarkan Suara Penguji'}
                      </span>
                    </button>
                  </div>

                  {/* Examiner Feedback on Previous Answer */}
                  <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Catatan Evaluasi Penguji:{' '}
                    </span>
                    {currentTurn.feedbackSummary}
                  </div>

                  {/* Active Examiner Question */}
                  <div className="rounded-xl border-l-4 border-l-indigo-600 border border-slate-200 bg-white p-4 dark:border-slate-800 dark:border-l-indigo-500 dark:bg-slate-900">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                      Pertanyaan Lisan Dewan Penguji
                    </div>
                    <p className="mt-1.5 text-sm sm:text-base font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                      &ldquo;{currentTurn.nextQuestion}&rdquo;
                    </p>
                  </div>

                  {/* Ideal Answer Hint Accordion */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowIdealKey(v => !v)}
                      className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                    >
                      {showIdealKey
                        ? 'Sembunyikan Kisi-Kisi Jawaban Ideal'
                        : 'Lihat Kisi-Kisi Jawaban Ideal (Nilai A)'}
                    </button>
                  </div>

                  {showIdealKey && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs leading-relaxed text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                      {currentTurn.idealAnswerKey}
                    </div>
                  )}

                  {/* Student Voice & Text Answer Form */}
                  <form onSubmit={handleSubmitAnswer} className="space-y-2.5 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Jawaban Pertahanan Anda (Ketik atau Rekam Suara):
                    </label>
                    <textarea
                      rows={3}
                      value={answerDraft}
                      onChange={e => setAnswerDraft(e.target.value)}
                      placeholder="Sampaikan argumen ilmiah, bukti Bab IV, atau sitasi pendukung untuk menjawab pertanyaan penguji…"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    {isListening && interimTranscript && (
                      <p className="text-[11px] italic text-teal-600 dark:text-teal-400">
                        Mendengarkan: &ldquo;{interimTranscript}&rdquo;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition cursor-pointer ${
                          isListening
                            ? 'border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-200'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="h-3.5 w-3.5 text-rose-600" />
                            <span>Hentikan Rekaman Suara</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Jawab dengan Suara (Mikrofon)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="submit"
                        disabled={!answerDraft.trim() || isLoading}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span>Kirim Jawaban & Evaluasi Rubrik</span>
                      </button>
                    </div>
                  </form>
                </>
              )
            )}
          </div>

          {/* Previous Q&A Turn History */}
          {history.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Riwayat Giliran Tanya Jawab Sidang ({history.length} Sesi)
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {history.map((turn, idx) => (
                  <div
                    key={turn.id}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Giliran #{idx + 1} · {turn.speakerName}
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                        Skor Sesi: {turn.rubricScores.overallScore}/100 · {turn.timestamp}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      P: {turn.question}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      J: {turn.userAnswer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 5 COLS (~35-40%): Live 4D Rubric Scorecard & Critical Q&A Bank */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Rubrik Penilaian Sidang (Real-Time)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Predikat: {gradeLabel}
                </div>
              </div>
              <div className="text-right font-mono tabular-nums">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {scores.overallScore}
                </span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Penguasaan Landasan Teori (Bab II)', val: scores.penguasaanTeori },
                { label: 'Ketepatan Metodologi & Validitas (Bab III)', val: scores.ketepatanMetodologi },
                { label: 'Ketajaman Bukti & Sitasi (Bab IV)', val: scores.argumentasiBukti },
                { label: 'Struktur & Ketenangan Artikulasi', val: scores.ketenanganArtikulasi },
              ].map(metric => (
                <div key={metric.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300">{metric.label}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {metric.val}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
                      style={{ width: `${metric.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Critical Defense Questions & Model Answers */}
          {currentTurn?.defenseQaSheet && currentTurn.defenseQaSheet.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  5 Prediksi Pertanyaan Kritis Sidang
                </span>
                <span className="text-[11px] text-slate-500">Klik untuk buka kunci jawaban</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {currentTurn.defenseQaSheet.map((item, i) => (
                  <details
                    key={i}
                    className="group rounded-lg border border-slate-200/80 bg-slate-50/60 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200 select-none">
                      {i + 1}. {item.question}
                    </summary>
                    <div className="mt-2 space-y-1 border-t border-slate-200/60 pt-2 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      <div>
                        <strong className="text-indigo-600 dark:text-indigo-400">Fokus:</strong>{' '}
                        {item.examinerFocus}
                      </div>
                      <div>
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          Jawaban Model:
                        </strong>{' '}
                        {item.modelAnswer}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. PEMERIKSA ORISINALITAS, KOHESI PUEBI & SITASI KLAIM OTOMATIS
// ============================================================================

export type AuditFindingCategory =
  | 'uncited_claim'
  | 'cohesion_issue'
  | 'repetition'
  | 'strong_argument';

export interface ManuscriptAuditFinding {
  id: string;
  category: AuditFindingCategory;
  severity: 'high' | 'medium' | 'low';
  originalExcerpt: string;
  explanation: string;
  suggestedFix: string;
  suggestedCitationHint: string;
}

export interface ManuscriptAuditPayload {
  title: string;
  updatedAt: string;
  overallIntegrityScore: number;
  citationCoverageScore: number;
  cohesionScore: number;
  lexicalDiversityScore: number;
  summaryVerdict: string;
  findings: ManuscriptAuditFinding[];
}

export const OriginalityClaimAuditor: React.FC<{
  title: string;
  sourceContent: string;
  onReplaceCanvasContent?: (nextContent: string) => void;
  onAppendToCanvas?: (markdown: string) => void;
}> = ({ title, sourceContent, onReplaceCanvasContent, onAppendToCanvas }) => {
  const { showToast } = useToast();
  const [auditData, setAuditData] = useState<ManuscriptAuditPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditFindingCategory>('all');
  const [appliedIds, setAppliedIds] = useState<Record<string, boolean>>({});

  const runManuscriptAudit = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.fetchJson<{
        success: boolean;
        data: ManuscriptAuditPayload;
      }>('/api/v1/ai/manuscript-audit', {
        method: 'POST',
        body: JSON.stringify({
          title: title || 'Naskah Akademik',
          sourceText: sourceContent.slice(0, 18000) || title || 'Draf Skripsi Mahasiswa',
        }),
      });
      if (res.success && res.data) {
        setAuditData(res.data);
      }
    } catch {
      showToast('Gagal menjalankan audit naskah. Silakan coba lagi.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [title, sourceContent, showToast]);

  useEffect(() => {
    void runManuscriptAudit();
  }, [runManuscriptAudit]);

  const filteredFindings = useMemo(() => {
    if (!auditData) return [];
    if (categoryFilter === 'all') return auditData.findings;
    return auditData.findings.filter(f => f.category === categoryFilter);
  }, [auditData, categoryFilter]);

  const handleApplyFixToManuscript = (finding: ManuscriptAuditFinding) => {
    if (!finding.suggestedFix) return;
    if (onReplaceCanvasContent && sourceContent.includes(finding.originalExcerpt)) {
      const updated = sourceContent.replace(finding.originalExcerpt, finding.suggestedFix);
      onReplaceCanvasContent(updated);
      setAppliedIds(prev => ({ ...prev, [finding.id]: true }));
      showToast('Kalimat pada naskah Canvas berhasil diperbarui otomatis', 'success');
      return;
    }
    if (onAppendToCanvas) {
      onAppendToCanvas(
        `### Revisi Kalimat Terverifikasi (${finding.suggestedCitationHint})\n${finding.suggestedFix}`
      );
      setAppliedIds(prev => ({ ...prev, [finding.id]: true }));
      showToast('Perbaikan kalimat ditambahkan ke bagian bawah naskah Canvas', 'success');
    }
  };

  const categoryMeta: Record<
    AuditFindingCategory,
    { label: string; colorClass: string; icon: React.FC<{ className?: string }> }
  > = {
    uncited_claim: {
      label: 'Klaim Tanpa Sitasi',
      colorClass:
        'border-amber-300 bg-amber-50/70 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
      icon: AlertTriangle,
    },
    cohesion_issue: {
      label: 'Kohesi & Kebakuan PUEBI',
      colorClass:
        'border-indigo-300 bg-indigo-50/70 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200',
      icon: BookOpen,
    },
    repetition: {
      label: 'Repetisi & Variasi Leksikal',
      colorClass:
        'border-rose-300 bg-rose-50/70 text-rose-950 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200',
      icon: RotateCcw,
    },
    strong_argument: {
      label: 'Argumen Ilmiah Kuat',
      colorClass:
        'border-emerald-300 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
      icon: CheckCircle2,
    },
  };

  if (isLoading && !auditData) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          Memindai klaim tanpa sitasi, kohesi paragraf PUEBI, dan keragaman leksikal naskah…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Pemeriksa Orisinalitas, Kohesi PUEBI & Sitasi Klaim Otomatis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Deteksi kalimat klaim yang belum bersitasi APA 7th dan terapkan perbaikan langsung ke naskah Canvas dalam 1 klik.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void runManuscriptAudit()}
          disabled={isLoading}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Pindai Ulang Naskah</span>
        </button>
      </div>

      {auditData && (
        <>
          {/* 4-Metric Integrity Readout Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Indeks Integritas Naskah', score: auditData.overallIntegrityScore },
              { label: 'Kepatuhan Sitasi Klaim', score: auditData.citationCoverageScore },
              { label: 'Kohesi & Kebakuan PUEBI', score: auditData.cohesionScore },
              { label: 'Keragaman Leksikal', score: auditData.lexicalDiversityScore },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.label}</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-slate-100">
                  {item.score}
                  <span className="text-xs font-normal text-slate-400">/100</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100">Ringkasan Audit: </strong>
            {auditData.summaryVerdict}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `Semua Temuan (${auditData.findings.length})` },
                { id: 'uncited_claim', label: 'Klaim Tanpa Sitasi' },
                { id: 'cohesion_issue', label: 'Kohesi & PUEBI' },
                { id: 'repetition', label: 'Repetisi Leksikal' },
                { id: 'strong_argument', label: 'Argumen Kuat' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  categoryFilter === tab.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            {filteredFindings.map(finding => {
              const meta = categoryMeta[finding.category] || categoryMeta.uncited_claim;
              const IconComp = meta.icon;
              const isApplied = Boolean(appliedIds[finding.id]);

              return (
                <div
                  key={finding.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                      <IconComp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{meta.label}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        Prioritas {finding.severity === 'high' ? 'Tinggi' : finding.severity === 'medium' ? 'Sedang' : 'Rendah'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {finding.suggestedCitationHint}
                    </span>
                  </div>

                  <div className={`rounded-lg border p-3 text-xs leading-relaxed ${meta.colorClass}`}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
                      Kutipan Asli di Naskah:
                    </div>
                    <p className="mt-1 font-medium">&ldquo;{finding.originalExcerpt}&rdquo;</p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">Analisis Auditor: </strong>
                    {finding.explanation}
                  </p>

                  {finding.category !== 'strong_argument' && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/20 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                          Rekomendasi Perbaikan Ilmiah & Sitasi:
                        </span>
                        <button
                          type="button"
                          disabled={isApplied}
                          onClick={() => handleApplyFixToManuscript(finding)}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer ${
                            isApplied
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Sudah Diterapkan</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Terapkan Perbaikan ke Naskah</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="leading-relaxed text-slate-800 dark:text-slate-200">
                        {finding.suggestedFix}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// 3. LITERATUR GRAPH & PETA KONSEP INTERAKTIF DARI DOKUMEN PDF/CANVAS
// ============================================================================

export type GraphNodeCategory =
  | 'theory'
  | 'author_study'
  | 'variable'
  | 'methodology'
  | 'research_gap';

export interface LiteratureGraphNode {
  id: string;
  label: string;
  category: GraphNodeCategory;
  summary: string;
  citationRef: string;
  impactWeight: number;
}

export interface LiteratureGraphEdge {
  id: string;
  source: string;
  target: string;
  relationLabel: string;
}

export interface LiteratureGraphPayload {
  title: string;
  updatedAt: string;
  nodes: LiteratureGraphNode[];
  edges: LiteratureGraphEdge[];
  synthesisParagraph: string;
}

const NODE_CATEGORY_STYLE: Record<
  GraphNodeCategory,
  { label: string; fill: string; stroke: string; textClass: string }
> = {
  theory: {
    label: 'Teori Utama',
    fill: '#4f46e5',
    stroke: '#312e81',
    textClass: 'text-indigo-600 dark:text-indigo-400',
  },
  variable: {
    label: 'Variabel Riset',
    fill: '#0d9488',
    stroke: '#115e59',
    textClass: 'text-teal-600 dark:text-teal-400',
  },
  author_study: {
    label: 'Studi Terdahulu',
    fill: '#0284c7',
    stroke: '#0c4a6e',
    textClass: 'text-sky-600 dark:text-sky-400',
  },
  methodology: {
    label: 'Metodologi',
    fill: '#7c3aed',
    stroke: '#4c1d95',
    textClass: 'text-violet-600 dark:text-violet-400',
  },
  research_gap: {
    label: 'Celah Riset (Novelty)',
    fill: '#e11d48',
    stroke: '#881337',
    textClass: 'text-rose-600 dark:text-rose-400',
  },
};

export const LiteratureGraphCanvas: React.FC<{
  title: string;
  sourceContent: string;
  onAppendToCanvas?: (markdown: string) => void;
}> = ({ title, sourceContent, onAppendToCanvas }) => {
  const { showToast } = useToast();
  const [graphData, setGraphData] = useState<LiteratureGraphPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [activeCategory, setActiveCategory] = useState<'all' | GraphNodeCategory>('all');

  const fetchGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.fetchJson<{
        success: boolean;
        data: LiteratureGraphPayload;
      }>('/api/v1/ai/literature-graph', {
        method: 'POST',
        body: JSON.stringify({
          title: title || 'Naskah Skripsi',
          sourceText: sourceContent.slice(0, 16000) || title || 'Kajian Literatur Ilmiah',
        }),
      });
      if (res.success && res.data) {
        setGraphData(res.data);
        setSelectedNodeId(res.data.nodes[0]?.id || null);
      }
    } catch {
      showToast('Gagal mengekstrak peta konsep literatur.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [title, sourceContent, showToast]);

  useEffect(() => {
    void fetchGraph();
  }, [fetchGraph]);

  // Compute deterministic radial/layered layout coordinates for SVG (760 x 440)
  const positionedNodes = useMemo(() => {
    if (!graphData) return [];
    const filtered =
      activeCategory === 'all'
        ? graphData.nodes
        : graphData.nodes.filter(n => n.category === activeCategory);
    const total = filtered.length || 1;
    const cx = 380;
    const cy = 220;
    return filtered.map((node, index) => {
      if (index === 0) {
        return { ...node, x: cx, y: cy };
      }
      const angle = ((index - 1) / Math.max(1, total - 1)) * 2 * Math.PI - Math.PI / 2;
      const rx = index % 2 === 0 ? 245 : 210;
      const ry = index % 2 === 0 ? 150 : 135;
      return {
        ...node,
        x: Math.round(cx + rx * Math.cos(angle)),
        y: Math.round(cy + ry * Math.sin(angle)),
      };
    });
  }, [graphData, activeCategory]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, (typeof positionedNodes)[number]>();
    for (const n of positionedNodes) {
      map.set(n.id, n);
    }
    return map;
  }, [positionedNodes]);

  const selectedNode = useMemo(() => {
    if (!positionedNodes.length) return null;
    return positionedNodes.find(n => n.id === selectedNodeId) || positionedNodes[0];
  }, [positionedNodes, selectedNodeId]);

  const connectedEdges = useMemo(() => {
    if (!graphData || !selectedNode) return [];
    return graphData.edges.filter(
      e => e.source === selectedNode.id || e.target === selectedNode.id
    );
  }, [graphData, selectedNode]);

  if (isLoading && !graphData) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Memetakan jaringan teori, studi terdahulu, variabel, dan celah riset…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Literatur Graph & Peta Konsep Interaktif
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Eksplorasi keterkaitan antara Grand Theory, penulis jurnal, variabel, dan Research Gap secara visual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchGraph()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Segarkan Peta</span>
          </button>
          {onAppendToCanvas && graphData && (
            <button
              type="button"
              onClick={() => {
                onAppendToCanvas(
                  `## Sintesis Jaringan Literatur & Kerangka Konseptual\n\n${graphData.synthesisParagraph}`
                );
                showToast('Paragraf sintesis jaringan literatur disisipkan ke Canvas', 'success');
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sisipkan Paragraf Sintesis ke Canvas</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter + Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Semua Simpul ({graphData?.nodes.length || 0})
          </button>
          {(Object.keys(NODE_CATEGORY_STYLE) as GraphNodeCategory[]).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {NODE_CATEGORY_STYLE[cat].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 font-mono tabular-nums text-xs">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.75, +(z - 0.15).toFixed(2)))}
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            title="Perkecil"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="px-1.5 text-slate-600 dark:text-slate-400">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(1.45, +(z + 0.15).toFixed(2)))}
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            title="Perbesar"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Two-Zone Sandbox Layout: 65% Interactive SVG Graph / 35% Node Inspector & Synthesis */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 p-2 dark:border-slate-800">
          <svg
            viewBox="0 0 760 440"
            className="h-88 w-full select-none"
            role="img"
            aria-label="Peta Konsep dan Jaringan Literatur Skripsi"
          >
            <defs>
              <marker
                id="arrow-head"
                viewBox="0 0 10 10"
                refX="26"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
              </marker>
            </defs>

            <g
              transform={`translate(${380 * (1 - zoom)}, ${220 * (1 - zoom)}) scale(${zoom})`}
            >
              {/* Edges */}
              {graphData?.edges.map(edge => {
                const src = nodeMap.get(edge.source);
                const tgt = nodeMap.get(edge.target);
                if (!src || !tgt) return null;
                const isHighlighted =
                  selectedNode?.id === src.id || selectedNode?.id === tgt.id;
                const midX = (src.x + tgt.x) / 2;
                const midY = (src.y + tgt.y) / 2;

                return (
                  <g key={edge.id}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={isHighlighted ? '#38bdf8' : '#475569'}
                      strokeWidth={isHighlighted ? 2.4 : 1.4}
                      strokeDasharray={isHighlighted ? undefined : '4 3'}
                      markerEnd="url(#arrow-head)"
                    />
                    <rect
                      x={midX - 52}
                      y={midY - 9}
                      width={104}
                      height={18}
                      rx={4}
                      fill="#0f172a"
                      stroke="#334155"
                      strokeWidth={0.8}
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      textAnchor="middle"
                      fill={isHighlighted ? '#bae6fd' : '#94a3b8'}
                      fontSize="9.5"
                      fontFamily="sans-serif"
                    >
                      {edge.relationLabel.slice(0, 20)}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {positionedNodes.map(node => {
                const style = NODE_CATEGORY_STYLE[node.category] || NODE_CATEGORY_STYLE.variable;
                const isSelected = selectedNode?.id === node.id;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle
                        r={31}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        strokeDasharray="4 2"
                      />
                    )}
                    <circle
                      r={24}
                      fill={style.fill}
                      stroke={isSelected ? '#ffffff' : style.stroke}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      y={3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {node.impactWeight}%
                    </text>
                    <rect
                      x={-76}
                      y={28}
                      width={152}
                      height={22}
                      rx={5}
                      fill="#0f172a"
                      fillOpacity={0.92}
                      stroke={isSelected ? '#38bdf8' : '#334155'}
                      strokeWidth={1}
                    />
                    <text
                      y={42}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="10.5"
                      fontWeight="600"
                    >
                      {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Right Inspector Panel */}
        <div className="lg:col-span-4 space-y-3">
          {selectedNode && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${NODE_CATEGORY_STYLE[selectedNode.category].textClass}`}>
                  {NODE_CATEGORY_STYLE[selectedNode.category].label}
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  Bobot Bukti: {selectedNode.impactWeight}%
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {selectedNode.label}
              </h4>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {selectedNode.summary}
              </p>
              <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                <strong>Rujukan / Jangkar:</strong> {selectedNode.citationRef}
              </div>

              {connectedEdges.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Keterkaitan Konseptual ({connectedEdges.length}):
                  </div>
                  {connectedEdges.map(edge => {
                    const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                    const otherNode = graphData?.nodes.find(n => n.id === otherId);
                    return (
                      <div
                        key={edge.id}
                        className="flex items-center justify-between rounded border border-slate-200/70 px-2.5 py-1.5 text-[11px] dark:border-slate-800"
                      >
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {edge.relationLabel}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200 max-w-36">
                          {otherNode?.label || otherId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {graphData?.synthesisParagraph && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Sintesis Otomatis Bab II:
              </div>
              <p>{graphData.synthesisParagraph}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. JURNAL REFLEKSI & ANALITIK KORELASI MOOD VS PROGRES BAB SKRIPSI
// ============================================================================

interface ChapterMilestone {
  chapter: string;
  label: string;
  progress: number;
}

interface ReflectionLogEntry {
  id: string;
  dateLabel: string;
  chapter: string;
  moodScore: number; // 1-5
  focusScore: number; // 1-5
  progressSnapshot: number; // 0-100
  note: string;
}

const CHAPTER_STORAGE_KEY = 'rk_thesis_chapter_milestones_v1';
const REFLECTION_STORAGE_KEY = 'rk_thesis_reflection_logs_v1';

const DEFAULT_CHAPTERS: ChapterMilestone[] = [
  { chapter: 'Bab I', label: 'Pendahuluan & Rumusan Masalah', progress: 85 },
  { chapter: 'Bab II', label: 'Tinjauan Pustaka & Kerangka Teori', progress: 70 },
  { chapter: 'Bab III', label: 'Metodologi & Instrumen Riset', progress: 60 },
  { chapter: 'Bab IV', label: 'Hasil Penelitian & Pembahasan', progress: 35 },
  { chapter: 'Bab V', label: 'Kesimpulan, Implikasi & Sidang', progress: 20 },
];

const DEFAULT_LOGS: ReflectionLogEntry[] = [
  {
    id: 'log-1',
    dateLabel: 'Sen',
    chapter: 'Bab I',
    moodScore: 4,
    focusScore: 4,
    progressSnapshot: 42,
    note: 'Merumuskan latar belakang masalah dan ruang lingkup studi.',
  },
  {
    id: 'log-2',
    dateLabel: 'Sel',
    chapter: 'Bab II',
    moodScore: 3,
    focusScore: 4,
    progressSnapshot: 48,
    note: 'Menyusun matriks perbandingan 12 jurnal internasional.',
  },
  {
    id: 'log-3',
    dateLabel: 'Rab',
    chapter: 'Bab III',
    moodScore: 4,
    focusScore: 5,
    progressSnapshot: 54,
    note: 'Finalisasi definisi operasional variabel dan uji validitas.',
  },
];

export const MoodChapterCorrelationPanel: React.FC<{
  title: string;
  onAppendToCanvas?: (markdown: string) => void;
}> = ({ title, onAppendToCanvas }) => {
  const { showToast } = useToast();

  const [chapters, setChapters] = useState<ChapterMilestone[]>(() => {
    try {
      const raw = safeLocalStorage.getItem(CHAPTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 5) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_CHAPTERS;
  });

  const [logs, setLogs] = useState<ReflectionLogEntry[]>(() => {
    try {
      const raw = safeLocalStorage.getItem(REFLECTION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_LOGS;
  });

  const [selectedChapter, setSelectedChapter] = useState('Bab IV');
  const [moodScore, setMoodScore] = useState(4);
  const [focusScore, setFocusScore] = useState(4);
  const [noteDraft, setNoteDraft] = useState('');

  const overallCompletion = useMemo(() => {
    const sum = chapters.reduce((acc, c) => acc + c.progress, 0);
    return Math.round(sum / chapters.length);
  }, [chapters]);

  const handleUpdateChapterProgress = (chapterName: string, nextVal: number) => {
    const updated = chapters.map(c =>
      c.chapter === chapterName ? { ...c, progress: nextVal } : c
    );
    setChapters(updated);
    safeLocalStorage.setItem(CHAPTER_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAddReflectionLog = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: ReflectionLogEntry = {
      id: `log-${Date.now()}`,
      dateLabel: new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      chapter: selectedChapter,
      moodScore,
      focusScore,
      progressSnapshot: overallCompletion,
      note:
        noteDraft.trim() ||
        `Mengerjakan ${selectedChapter} dengan tingkat fokus ${focusScore}/5 dan suasana hati ${moodScore}/5.`,
    };
    const nextLogs = [...logs.slice(-9), newEntry];
    setLogs(nextLogs);
    safeLocalStorage.setItem(REFLECTION_STORAGE_KEY, JSON.stringify(nextLogs));
    setNoteDraft('');
    showToast('Jurnal refleksi & korelasi progres bab berhasil disimpan', 'success');
  };

  const avgMood = useMemo(() => {
    if (!logs.length) return 4;
    return +(logs.reduce((acc, l) => acc + l.moodScore, 0) / logs.length).toFixed(1);
  }, [logs]);

  const adaptiveAdvice = useMemo(() => {
    if (avgMood < 3) {
      return 'Analitik menunjukkan energi emosional Anda sedang menurun saat menyusun bab analisis. Gunakan teknik Micro-Stepping (target 1 paragraf 15 menit) dan ambil jeda napas 4-7-8 sebelum melanjutkan Bab IV.';
    }
    if (overallCompletion >= 70) {
      return 'Momentum pengerjaan skripsi sangat stabil! Fokuskan sesi berikutnya pada Simulasi Sidang Lisan dan Audit Sitasi Klaim untuk mematangkan naskah akhir.';
    }
    return 'Korelasi positif terlihat antara sesi fokus pagi/sore dengan kenaikan progres Bab II & III. Pertahankan ritme kerja 45 menit fokus diikuti 10 menit istirahat.';
  }, [avgMood, overallCompletion]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Jurnal Refleksi & Analitik Korelasi Mood vs. Progres Bab: {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pantau keseimbangan kesehatan mental (RuangTenang) dan capaian penulisan Bab I–V (RuangKerja) secara berdampingan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-xs">
          <span>
            Total Progres Skripsi: <strong className="text-indigo-600 dark:text-indigo-400">{overallCompletion}%</strong>
          </span>
          <span>·</span>
          <span>
            Rata-rata Mood: <strong className="text-teal-600 dark:text-teal-400">{avgMood}/5.0</strong>
          </span>
          {onAppendToCanvas && (
            <button
              type="button"
              onClick={() => {
                const chapterSummary = chapters.map(c => `- **${c.chapter} (${c.label}):** ${c.progress}%`).join('\n');
                onAppendToCanvas(`## Laporan Progres Bab Skripsi & Refleksi Mandiri\n\n**Total Penyelesaian:** ${overallCompletion}% · **Rata-rata Kesejahteraan & Fokus:** ${avgMood}/5.0\n\n${chapterSummary}\n\n> **Rekomendasi Adaptif:** ${adaptiveAdvice}`);
                showToast('Ringkasan progres Bab I–V berhasil disisipkan ke Canvas', 'success');
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 font-sans text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sematkan ke Canvas</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Bab I - V Milestone Trackers & Journal Logger */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Progres Penyelesaian Bab I – Bab V
            </div>
            {chapters.map(ch => (
              <div key={ch.chapter} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    <strong>{ch.chapter}</strong> · {ch.label}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                    {ch.progress}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={ch.progress}
                  onChange={e => handleUpdateChapterProgress(ch.chapter, Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-indigo-600"
                />
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddReflectionLog}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Catat Jurnal Refleksi Sesi Penulisan Hari Ini
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500">Bab Aktif</label>
                <select
                  value={selectedChapter}
                  onChange={e => setSelectedChapter(e.target.value)}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {chapters.map(c => (
                    <option key={c.chapter} value={c.chapter}>
                      {c.chapter}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">Suasana Hati (1-5)</label>
                <select
                  value={moodScore}
                  onChange={e => setMoodScore(Number(e.target.value))}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {[5, 4, 3, 2, 1].map(n => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">Energi Fokus (1-5)</label>
                <select
                  value={focusScore}
                  onChange={e => setFocusScore(Number(e.target.value))}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {[5, 4, 3, 2, 1].map(n => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input
              type="text"
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder="Catatan refleksi singkat (mis. Berhasil menyelesaikan subbab 4.2 tanpa terdistraksi)…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700 cursor-pointer"
            >
              <HeartPulse className="h-3.5 w-3.5" />
              <span>Simpan Refleksi & Perbarui Grafik Korelasi</span>
            </button>
          </form>
        </div>

        {/* Right: Dual-Axis Recharts Correlation & Adaptive Recommendation */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Grafik Korelasi Suasana Hati, Fokus & Progres Skripsi
              </span>
              <span className="text-[11px] text-slate-500">Sumbu Kiri: Progres (%) · Sumbu Kanan: Skor (1–5)</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={logs} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[1, 5]}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="progressSnapshot"
                    name="Progres Skripsi (%)"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="moodScore"
                    name="Mood (1-5)"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="focusScore"
                    name="Energi Fokus (1-5)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-xs leading-relaxed text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-200">
            <div className="font-semibold">Rekomendasi Ritme Belajar Adaptif (RuangTenang × RuangKerja):</div>
            <p className="mt-1">{adaptiveAdvice}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Catatan Jurnal Refleksi Terakhir
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {logs
                .slice()
                .reverse()
                .map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {entry.chapter}
                      </span>{' '}
                      · <span className="text-slate-700 dark:text-slate-300">{entry.note}</span>
                    </div>
                    <span className="shrink-0 font-mono tabular-nums text-[11px] text-slate-500">
                      Mood {entry.moodScore}/5 · Fokus {entry.focusScore}/5 · {entry.dateLabel}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. EKSPOR PAKET SIDANG LENGKAP (SLIDE PPTX + NASKAH SKRIPSI + Q&A PENGUJI)
// ============================================================================

export function buildThesisDefensePresentationDeck(title: string, sourceContent: string) {
  const cleanTitle = title.trim() || 'Sidang Skripsi & Pertahanan Karya Ilmiah';
  const paragraphs = sourceContent
    .split(/\n{2,}/)
    .map(p => p.replace(/[#*`>|_-]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 35);

  const p1 =
    paragraphs[0]?.slice(0, 260) ||
    `Fenomena dan urgensi penelitian "${cleanTitle}" berangkat dari kebutuhan empiris serta celah literatur pada studi 5 tahun terakhir.`;
  const p2 =
    paragraphs[1]?.slice(0, 260) ||
    'Kerangka teoretis memadukan Grand Theory dengan kajian studi terdahulu untuk memetakan hubungan antarvariabel secara sistematis.';
  const p3 =
    paragraphs[2]?.slice(0, 260) ||
    'Desain metodologi dirancang secara terukur menggunakan instrumen tervalidasi guna menjamin objektivitas dan reliabilitas temuan.';
  const p4 =
    paragraphs[3]?.slice(0, 260) ||
    'Hasil pengujian dan pembahasan membuktikan kontribusi signifikan yang menjawab rumusan masalah penelitian.';

  return {
    format: 'ruangtenang-presentation-v1' as const,
    theme: 'academic_minimal' as const,
    slides: [
      {
        title: `SIDANG SKRIPSI: ${cleanTitle.toUpperCase()}`,
        body: `Presentasi Pertahanan Karya Ilmiah\n\n• Fokus Kajian: ${cleanTitle}\n• Struktur Presentasi: Bab I (Urgensi) – Bab V (Kesimpulan & Implikasi)\n• Disusun melalui Academic Defense & Thesis Mastery Suite`,
        notes:
          'Ucapkan salam kepada Ketua Sidang dan Dewan Penguji. Sampaikan judul secara tenang dan tegas dalam 30 detik pertama.',
      },
      {
        title: 'BAB I · Latar Belakang, Urgensi & Rumusan Masalah',
        body: `• Fenomena & Urgensi:\n  ${p1}\n• Fokus Masalah: Menjawab kesenjangan antara teori dan bukti empiris di lapangan.\n• Tujuan Utama: Menguji dan membuktikan kontribusi ilmiah secara terukur.`,
        notes:
          'Tekankan mengapa topik ini mendesak untuk diteliti sekarang dan sebutkan data pendukung utama di kalimat pembuka.',
      },
      {
        title: 'BAB II · Landasan Teori & Celah Riset (Novelty)',
        body: `• Sintesis Literatur:\n  ${p2}\n• Research Gap: Minimnya evaluasi komprehensif pada konteks populasi lokal.\n• Kebaruan (Novelty): Integrasi kerangka konseptual dan verifikasi empiris terkini.`,
        notes:
          'Saat membahas slide ini, sebutkan minimal 2 nama peneliti terdahulu untuk menunjukkan penguasaan literatur.',
      },
      {
        title: 'BAB III · Desain Metodologi & Validitas Instrumen',
        body: `• Pendekatan & Desain:\n  ${p3}\n• Pengukuran & Instrumen: Telah melalui pemeriksaan validitas isi dan reliabilitas.\n• Prosedur Analisis: Sistematis, objektif, dan bebas bias pengukuran.`,
        notes:
          'Penguji Metodologi biasanya menanyakan alasan pemilihan metode ini. Jelaskan kesesuaiannya dengan rumusan masalah.',
      },
      {
        title: 'BAB IV · Temuan Utama & Sintesis Pembahasan',
        body: `• Hasil Utama Penelitian:\n  ${p4}\n• Konfirmasi Hipotesis / Proposisi: Selaras dengan kerangka berpikir di Bab II.\n• Implikasi Empiris: Memberikan bukti terukur yang menjawab tujuan studi.`,
        notes:
          'Tunjukkan benang merah langsung antara rumusan masalah di Slide 2 dengan hasil temuan di Slide 5 ini.',
      },
      {
        title: 'BAB V · Kesimpulan, Keterbatasan & Rekomendasi',
        body: `• Kesimpulan Kunci: Seluruh rumusan masalah terjawab secara valid dan sistematis.\n• Keterbatasan Studi: Ruang lingkup sampel dan durasi pengamatan.\n• Saran Penelitian Lanjutan: Pengujian longitudinal dan perluasan variabel moderator.`,
        notes:
          'Tutup presentasi dengan sikap terbuka terhadap masukan Dewan Penguji dan ucapkan terima kasih.',
      },
    ],
  };
}

export const DefensePackageExporter: React.FC<{
  title: string;
  sourceContent: string;
  onAppendToCanvas?: (markdown: string) => void;
}> = ({ title, sourceContent, onAppendToCanvas }) => {
  const { showToast } = useToast();
  const [isExportingBundle, setIsExportingBundle] = useState(false);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const deckPreview = useMemo(
    () => buildThesisDefensePresentationDeck(title, sourceContent),
    [title, sourceContent]
  );

  const handleExportDefensePptx = () => {
    setIsExportingPptx(true);
    try {
      exportEditablePptx({
        title: `Sidang_${title || 'Skripsi'}`,
        content: JSON.stringify(deckPreview),
      });
      showToast('Slide Presentasi Sidang (.pptx) lengkap dengan Speaker Notes berhasil diunduh', 'success');
    } catch {
      showToast('Gagal mengekspor slide PPTX.', 'error');
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleExportDefenseDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportToAcademicDocx({
        title: title || 'Naskah Skripsi',
        content: sourceContent || `# ${title}\n\nNaskah akademik.`,
        templateType: 'skripsi',
      });
      showToast('Naskah Skripsi Word (.docx Margin 4-4-3-3) berhasil diunduh', 'success');
    } catch {
      showToast('Gagal mengekspor dokumen Word.', 'error');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleDownloadQaCheatSheet = () => {
    const cleanTitle = title.trim() || 'Skripsi';
    const qaMarkdown = `# Lembar Panduan Pertahanan Sidang & Q&A Penguji: ${cleanTitle}

## Struktur Ringkasan Presentasi (7–10 Menit)
${deckPreview.slides
  .map(
    (s, idx) =>
      `### Slide ${idx + 1}: ${s.title}\n${s.body}\n\n> **Catatan Pembicara (Speaker Notes):** ${s.notes}`
  )
  .join('\n\n')}

## Daftar Pertanyaan Kritis Dewan Penguji & Kunci Jawaban
1. **Urgensi & Latar Belakang (Bab I):** Mengapa topik "${cleanTitle}" krusial untuk diteliti saat ini?
   - *Strategi Jawaban:* Tunjukkan kesenjangan fenomena empiris dan rujuk minimal 2 studi terbaru (5 tahun terakhir).
2. **Kebaruan / Novelty (Bab II):** Apa pembeda utama penelitian ini dibanding jurnal terdahulu?
   - *Strategi Jawaban:* Fokuskan pada konteks populasi, pemodelan variabel, atau instrumen evaluasi yang belum diuji sebelumnya.
3. **Justifikasi Metodologi (Bab III):** Bagaimana Anda menjamin validitas data dan meminimalkan bias?
   - *Strategi Jawaban:* Rinci prosedur pemilihan sampel, uji validitas/reliabilitas instrumen, dan keterlacakan analisis data.
4. **Ketajaman Pembahasan (Bab IV):** Mengapa hasil penelitian Anda mendukung atau berbeda dari hipotesis awal?
   - *Strategi Jawaban:* Kaitkan temuan langsung dengan karakteristik responden dan bandingkan dengan teori utama di Bab II.
`;

    const blob = new Blob([qaMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panduan-qa-sidang-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 36)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Lembar Q&A Penguji & Speaker Notes (.md) berhasil diunduh', 'success');
  };

  const handleExportFullDefenseKit = async () => {
    if (isExportingBundle) return;
    setIsExportingBundle(true);
    try {
      exportEditablePptx({
        title: `Slide_Sidang_${title || 'Skripsi'}`,
        content: JSON.stringify(deckPreview),
      });
      await exportToAcademicDocx({
        title: title || 'Naskah Skripsi',
        content: sourceContent || `# ${title}\n\nNaskah akademik.`,
        templateType: 'skripsi',
      });
      handleDownloadQaCheatSheet();
      showToast('Paket Sidang Lengkap (Slide PPTX + Word Skripsi + Lembar Q&A) berhasil diunduh!', 'success');
    } catch {
      showToast('Sebagian berkas paket sidang gagal diekspor.', 'error');
    } finally {
      setIsExportingBundle(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Ekspor Paket Sidang Lengkap (1-Click Defense Kit)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unduh sekaligus Slide Presentasi Sidang (.pptx dengan Speaker Notes), Naskah Skripsi (.docx 4-4-3-3), dan Lembar Q&A Penguji.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleExportFullDefenseKit()}
          disabled={isExportingBundle}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
        >
          {isExportingBundle ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Award className="h-4 w-4" />
          )}
          <span>Unduh Paket Sidang Lengkap (3 Berkas Sekaligus)</span>
        </button>
      </div>

      {/* Individual Export Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Presentation className="h-4 w-4" />
              <span>1. Slide Presentasi Sidang (.pptx)</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
              6 slide terstruktur (Bab I–V) siap edit di PowerPoint/Google Slides lengkap dengan catatan pembicara (Speaker Notes).
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportDefensePptx}
            disabled={isExportingPptx}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Unduh Slide .PPTX</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
              <FileText className="h-4 w-4" />
              <span>2. Naskah Skripsi Standar (.docx)</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
              Format kertas A4, margin kampus 4-4-3-3 cm, Times New Roman 12pt, spasi 1.5, dan Daftar Pustaka APA 7th.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleExportDefenseDocx()}
            disabled={isExportingDocx}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-white text-xs font-semibold text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-300 cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Unduh Word .DOCX</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <ShieldCheck className="h-4 w-4" />
              <span>3. Lembar Contekan Q&A Sidang (.md)</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
              Rangkuman naskah bicara per slide dan 5 strategi menjawab pertanyaan menjebak dari dosen penguji.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadQaCheatSheet}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-white text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Unduh Lembar Q&A</span>
          </button>
        </div>
      </div>

      {/* Preview of Generated Defense Slides + Speaker Notes */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Pratinjau Kerangka Slide Sidang & Speaker Notes ({deckPreview.slides.length} Slide)
          </span>
          {onAppendToCanvas && (
            <button
              type="button"
              onClick={() => {
                const md = deckPreview.slides
                  .map(
                    (s, idx) =>
                      `### Slide ${idx + 1}: ${s.title}\n${s.body}\n\n*Speaker Notes:* ${s.notes}`
                  )
                  .join('\n\n');
                onAppendToCanvas(`## Kerangka Slide Presentasi Sidang Skripsi\n\n${md}`);
                showToast('Kerangka slide presentasi sidang disisipkan ke Canvas', 'success');
              }}
              className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
            >
              + Sisipkan Kerangka Slide ke Dokumen Canvas
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {deckPreview.slides.map((slide, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs dark:border-slate-800 dark:bg-slate-900 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                <span>SLIDE 0{idx + 1}</span>
                <span>BAB {idx === 0 ? 'PEMBUKA' : idx}</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100">{slide.title}</div>
              <p className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                {slide.body}
              </p>
              <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <strong>Speaker Notes:</strong> {slide.notes}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
