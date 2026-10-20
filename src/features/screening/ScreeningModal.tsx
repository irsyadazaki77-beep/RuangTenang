import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  X,
  HeartPulse,
  Download,
  History,
  AlertTriangle,
  AlertCircle,
  Clock,
  MessageSquare,
  Calendar,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  UserCheck
} from 'lucide-react';
import { ScreeningResult } from '../../types';
import { getPhq9Severity, getGad7Severity } from '../../lib/clinicalScoring';
import { calculatePhq9Total, calculateGad7Total, PHQ9_ITEM9_INDEX } from '../../../shared/clinical/scoring';
import { apiClient } from '../../lib/apiClient';
import { OPTIONS } from './constants';
import { ALL_QUESTIONS, TOTAL_QUESTIONS } from './screeningQuestions';
import { ScoreGaugeMeter } from './components/ScoreGaugeMeter';
import { SafetyCheckModal } from './components/SafetyCheckModal';
import { useAuth } from '../../contexts/AuthContext';
import { addNotification } from '../../lib/notificationStore';
import { modalBackdropVariants, modalPanelVariants, reducedMotionVariants } from '../../lib/motionTokens';

function createScreeningSubmissionId(): string {
  const randomHex = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const value = globalThis.crypto?.randomUUID?.() || `${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
  return `scr_${value}`;
}

interface ScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (result: ScreeningResult) => void;
  onPersisted?: (result: ScreeningResult) => void;
  isPageMode?: boolean;
}

// Card Swiper Animation Variants
const cardVariants = {
  enter: (direction: 'next' | 'prev') => ({
    x: direction === 'next' ? 40 : -40,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: (direction: 'next' | 'prev') => ({
    x: direction === 'next' ? -40 : 40,
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.18,
      ease: 'easeIn' as const,
    },
  }),
};

export const ScreeningModal: React.FC<ScreeningModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onPersisted,
  isPageMode = false
}) => {
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuth();
  let navigate: (to: string, options?: any) => void;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = useNavigate();
  } catch {
    navigate = (to: string) => {
      if (typeof window !== 'undefined') {
        window.location.href = to;
      }
    };
  }

  useEscapeKey(onClose, !isPageMode && isOpen);

  const [persistenceStatus, setPersistenceStatus] = useState<'idle' | 'pending' | 'saved' | 'local-only' | 'failed'>('idle');
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPageMode || !isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusableElements = () => Array.from(modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []).filter((element) => element.getClientRects().length > 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) {
          modalRef.current?.focus();
          e.preventDefault();
          return;
        }
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const focusIsInside = Boolean(modalRef.current?.contains(document.activeElement));

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !focusIsInside) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement || !focusIsInside) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    const focusable = getFocusableElements();
    (focusable[0] || modalRef.current)?.focus();

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, isPageMode, isOpen]);

  // Main Steps: 'intro' | 'questionnaire' | 'result'
  const [step, setStep] = useState<'intro' | 'questionnaire' | 'result'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  // Answers State
  const [phq9Answers, setPhq9Answers] = useState<number[]>(Array(9).fill(-1));
  const [gad7Answers, setGad7Answers] = useState<number[]>(Array(7).fill(-1));
  const [finalResult, setFinalResult] = useState<ScreeningResult | null>(null);

  const phq9AnswersRef = useRef<number[]>(Array(9).fill(-1));
  const gad7AnswersRef = useRef<number[]>(Array(7).fill(-1));

  const [historyList, setHistoryList] = useState<ScreeningResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Safety check state for PHQ-9 Question #9
  const [showSafetyCheckModal, setShowSafetyCheckModal] = useState<boolean>(false);
  const [safetyAssessment, setSafetyAssessment] = useState<{
    immediateDanger: boolean | null;
    planOrIntent: boolean | null;
    wantsTrustedContact: boolean | null;
  }>({
    immediateDanger: null,
    planOrIntent: null,
    wantsTrustedContact: null,
  });
  const screeningUserIdentityRef = useRef(`${user?.id || 'anonymous'}:${user?.role || 'none'}`);
  const screeningIdentityEpochRef = useRef(0);
  const screeningSubmissionIdRef = useRef<string | null>(null);

  const resetAssessmentState = useCallback(() => {
    screeningIdentityEpochRef.current += 1;
    screeningSubmissionIdRef.current = null;
    phq9AnswersRef.current = Array(9).fill(-1);
    gad7AnswersRef.current = Array(7).fill(-1);
    setPhq9Answers(Array(9).fill(-1));
    setGad7Answers(Array(7).fill(-1));
    setFinalResult(null);
    setCurrentQuestionIndex(0);
    setStep('intro');
    setSlideDirection('next');
    setShowSafetyCheckModal(false);
    setSafetyAssessment({ immediateDanger: null, planOrIntent: null, wantsTrustedContact: null });
    setPersistenceStatus('idle');
    setPersistenceError(null);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    const nextIdentity = `${user?.id || 'anonymous'}:${user?.role || 'none'}`;
    if (screeningUserIdentityRef.current === nextIdentity) return;

    screeningUserIdentityRef.current = nextIdentity;
    resetAssessmentState();
    setHistoryList([]);
    setErrorHistory(null);
    setLoadingHistory(false);
  }, [user?.id, user?.role, resetAssessmentState]);



  const fetchHistory = (signal?: AbortSignal) => {
    if (!isOpen && !isPageMode) return;

    if (!user || user.role === 'guest') {
      setHistoryList([]);
      setErrorHistory(null);
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    setErrorHistory(null);
    apiClient.get<any[]>('/api/v1/screenings', { signal })
      .then(res => {
        if (signal?.aborted) return;
        if (res.success && Array.isArray(res.data)) {
          const mapped: ScreeningResult[] = res.data.map((s: any) => ({
            phq9: {
              score: s.phq9Score,
              severity: s.phq9Severity || getPhq9Severity(s.phq9Score),
              date: s.timestamp,
              // Unknown item 9 stays undefined (not 0); server flag can only be raised.
              item9Score: typeof s.item9Score === 'number' ? s.item9Score : undefined,
              hasSelfHarmRisk: s.hasSelfHarmRisk === true || s.safety?.item9Positive === true
            },
            gad7: {
              score: s.gad7Score,
              severity: s.gad7Severity || getGad7Severity(s.gad7Score),
              date: s.timestamp
            },
            riskIndicators: s.riskIndicators || null
          }));
          setHistoryList(mapped);
        } else {
          setErrorHistory(res.error || 'Gagal memuat riwayat skrining.');
        }
      })
      .catch(e => {
        if (signal?.aborted) return;
        console.warn('Failed to fetch screenings from server:', e);
        setErrorHistory(e.message || 'Gagal memuat riwayat skrining.');
      })
      .finally(() => {
        if (!signal?.aborted) setLoadingHistory(false);
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isPageMode, user?.id, user?.role]);

  // Handle single question answer choice
  const handleSelectOption = (value: number) => {
    const currentQ = ALL_QUESTIONS[currentQuestionIndex];

    const newPhq = [...phq9AnswersRef.current];
    const newGad = [...gad7AnswersRef.current];

    if (currentQ.section === 'phq9') {
      newPhq[currentQ.questionIndexInSection] = value;
      phq9AnswersRef.current = newPhq;
      setPhq9Answers(newPhq);

      // Trigger safety check modal if PHQ-9 Item 9 (index 8) > 0
      if (currentQ.questionIndexInSection === 8 && value > 0) {
        setShowSafetyCheckModal(true);
      }
    } else {
      newGad[currentQ.questionIndexInSection] = value;
      gad7AnswersRef.current = newGad;
      setGad7Answers(newGad);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setSlideDirection('prev');
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      setStep('intro');
    }
  };

  const handleNextQuestion = () => {
    const currentQ = ALL_QUESTIONS[currentQuestionIndex];
    const ansVal = currentQ?.section === 'phq9'
      ? phq9AnswersRef.current[currentQ.questionIndexInSection]
      : gad7AnswersRef.current[currentQ.questionIndexInSection];

    if (ansVal === -1) {
      return;
    }

    if (currentQuestionIndex < TOTAL_QUESTIONS - 1) {
      setSlideDirection('next');
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      calculateResultsWithAnswers(phq9AnswersRef.current, gad7AnswersRef.current);
    }
  };

  const calculateResultsWithAnswers = async (latestPhq: number[], latestGad: number[]) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Strict shared engine: an incomplete/invalid questionnaire never yields a final score.
    let phqScore: number;
    let gadScore: number;
    try {
      phqScore = calculatePhq9Total(latestPhq);
      gadScore = calculateGad7Total(latestGad);
    } catch (err) {
      setPersistenceStatus('failed');
      setPersistenceError(err instanceof Error ? err.message : 'Jawaban belum lengkap.');
      setIsSubmitting(false);
      return;
    }
    const item9Score = latestPhq[PHQ9_ITEM9_INDEX];
    const hasSelfHarmRisk = item9Score > 0;

    const riskCategory: 'KRISIS_SANGAT_TINGGI' | 'RISIKO_MENYAKITI_DIRI' | 'STANDAR' = (safetyAssessment.immediateDanger || safetyAssessment.planOrIntent)
      ? 'KRISIS_SANGAT_TINGGI'
      : (hasSelfHarmRisk ? 'RISIKO_MENYAKITI_DIRI' : 'STANDAR');

    const riskIndicators = {
      item9Score,
      hasSelfHarmRisk,
      immediateDanger: safetyAssessment.immediateDanger,
      planOrIntent: safetyAssessment.planOrIntent,
      wantsTrustedContact: safetyAssessment.wantsTrustedContact,
      riskCategory,
      flaggedAt: new Date().toISOString()
    };

    const res: ScreeningResult = {
      phq9: {
        score: phqScore,
        severity: getPhq9Severity(phqScore),
        date: new Date().toISOString(),
        item9Score,
        hasSelfHarmRisk
      },
      gad7: {
        score: gadScore,
        severity: getGad7Severity(gadScore),
        date: new Date().toISOString()
      },
      riskIndicators
    };

    const newHistory = [res, ...historyList];
    setHistoryList(newHistory);

    setFinalResult(res);
    setStep('result');

    addNotification(
      "Skrining Kesehatan Selesai 🧠",
      `Hasil skrining awal Anda telah dianalisis. PHQ-9 (Depresi): ${res.phq9.severity}, GAD-7 (Kecemasan): ${res.gad7.severity}.`,
      "success"
    );

    onComplete?.(res);

    const isGuest = !user || user.role === 'guest';
    if (isGuest) {
      setPersistenceStatus('local-only');
      setIsSubmitting(false);
      return;
    }

    const clientSubmissionId = screeningSubmissionIdRef.current || createScreeningSubmissionId();
    screeningSubmissionIdRef.current = clientSubmissionId;

    if (!navigator.onLine) {
      setPersistenceStatus('failed');
      setPersistenceError('Perangkat sedang luring. Pengecekan selesai, tetapi penyimpanan ke server gagal.');
      setIsSubmitting(false);
      return;
    }

    setPersistenceStatus('pending');
    const submissionIdentityEpoch = screeningIdentityEpochRef.current;
    try {
      const response = await apiClient.post<any>('/api/v1/screenings', {
        clientSubmissionId,
        phq9Score: phqScore,
        gad7Score: gadScore,
        phq9Severity: getPhq9Severity(phqScore),
        gad7Severity: getGad7Severity(gadScore),
        phq9Answers: latestPhq,
        gad7Answers: latestGad,
        item9Score,
        hasSelfHarmRisk,
        riskIndicators
      });

      if (submissionIdentityEpoch !== screeningIdentityEpochRef.current) return;
      if (response && (response.success || response.data?.id || (response as any).id)) {
        setPersistenceStatus('saved');
        onPersisted?.(res);
      } else {
        setPersistenceStatus('failed');
        setPersistenceError(response?.error || 'Pengecekan selesai, tetapi penyimpanan ke server gagal.');
      }
    } catch (err: any) {
      if (submissionIdentityEpoch !== screeningIdentityEpochRef.current) return;
      console.warn('Backend screening save failed:', err);
      setPersistenceStatus('failed');
      const errorMessage = err instanceof Error ? err.message : 'Pengecekan selesai, tetapi penyimpanan ke server gagal.';
      setPersistenceError(errorMessage);
    } finally {
      if (submissionIdentityEpoch === screeningIdentityEpochRef.current) setIsSubmitting(false);
    }
  };

  const handleRetryPersistence = async () => {
    if (!finalResult || !user || user.role === 'guest' || isSubmitting) return;
    if (!navigator.onLine) {
      setPersistenceError('Perangkat masih luring. Hasil tetap tersedia untuk diunduh; coba simpan ulang setelah tersambung.');
      return;
    }

    const clientSubmissionId = screeningSubmissionIdRef.current || createScreeningSubmissionId();
    screeningSubmissionIdRef.current = clientSubmissionId;
    const submissionIdentityEpoch = screeningIdentityEpochRef.current;
    setIsSubmitting(true);
    setPersistenceStatus('pending');
    setPersistenceError(null);

    try {
      const response = await apiClient.post<any>('/api/v1/screenings', {
        clientSubmissionId,
        phq9Score: finalResult.phq9.score,
        gad7Score: finalResult.gad7.score,
        phq9Answers: phq9AnswersRef.current,
        gad7Answers: gad7AnswersRef.current,
        item9Score: finalResult.phq9.item9Score,
        hasSelfHarmRisk: finalResult.phq9.hasSelfHarmRisk,
        riskIndicators: finalResult.riskIndicators
      });

      if (submissionIdentityEpoch !== screeningIdentityEpochRef.current) return;
      if (response && (response.success || response.data?.id || (response as any).id)) {
        setPersistenceStatus('saved');
        onPersisted?.(finalResult);
      } else {
        setPersistenceStatus('failed');
        setPersistenceError(response?.error || 'Pengecekan selesai, tetapi penyimpanan ke server gagal.');
      }
    } catch (err: any) {
      if (submissionIdentityEpoch !== screeningIdentityEpochRef.current) return;
      setPersistenceStatus('failed');
      setPersistenceError(err instanceof Error ? err.message : 'Pengecekan selesai, tetapi penyimpanan ke server gagal.');
    } finally {
      if (submissionIdentityEpoch === screeningIdentityEpochRef.current) setIsSubmitting(false);
    }
  };

  // ONE-CLICK REFERRAL TO COUNSELOR ACTION HANDLER
  const handleOneClickReferral = () => {
    if (!finalResult) return;

    const referralNote = `[Ringkasan Skrining Mandiri]\n- Skor PHQ-9: ${finalResult.phq9.score}/27 (Tingkat ${finalResult.phq9.severity})\n- Skor GAD-7: ${finalResult.gad7.score}/21 (Tingkat ${finalResult.gad7.severity})\nCatatan: Hasil skrining ini bukan diagnosis. Pengguna ingin meninjau pilihan pendampingan konselor.`;

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('rt_screening_referral_notes', referralNote);
        sessionStorage.setItem('rt_auto_open_booking', 'true');
      }
    } catch (e) {
      console.warn('Could not set referral session storage', e);
    }

    addNotification(
      "Mengarahkan ke Konselor Kampus 🌿",
      "Membuka form reservasi. Ringkasan skrining hanya disertakan jika izin berbagi dengan konselor aktif.",
      "info"
    );

    onClose();
    navigate('/counselors', {
      state: {
        autoOpenBooking: true,
        screeningNote: referralNote
      }
    });
  };

  const downloadReportTxt = (res: ScreeningResult) => {
    const dateStr = new Date(res.phq9.date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let storageNotice = 'Hasil tersedia selama sesi ini.';
    if (persistenceStatus === 'saved') {
      storageNotice = 'Hasil berhasil disimpan ke akun Anda.';
    } else if (persistenceStatus === 'local-only') {
      storageNotice = 'Hasil tidak disimpan ke akun. Hasil hanya tersedia selama sesi ini.';
    } else if (persistenceStatus === 'failed') {
      storageNotice = 'Pengecekan selesai, tetapi penyimpanan ke akun mungkin gagal.';
    }

    let text = `=== RUANGTENANG - LAPORAN HASIL SKRINING KESEHATAN MENTAL MAHASISWA ===\n`;
    text += `Tanggal Pemeriksaan: ${dateStr}\n`;
    text += `Penyimpanan Data: ${storageNotice}\n\n`;
    text += `1. HASIL PHQ-9 (Skor Gejala Depresi):\n`;
    text += `   - Skor Total: ${res.phq9.score} / 27\n`;
    text += `   - Tingkat Keparahan: ${res.phq9.severity}\n\n`;
    text += `2. HASIL GAD-7 (Skor Gejala Kecemasan):\n`;
    text += `   - Skor Total: ${res.gad7.score} / 21\n`;
    text += `   - Tingkat Keparahan: ${res.gad7.severity}\n\n`;
    text += `REKOMENDASI RUANGTENANG:\n`;
    text += `- Jika berguna bagi Anda, diskusikan hasil ini dengan konselor atau tenaga kesehatan; ketersediaan dan akses layanan kampus dapat berbeda.\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hasil_Cek_Kondisi_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const currentQ = ALL_QUESTIONS[currentQuestionIndex];
  const currentAnswerValue = currentQ
    ? (currentQ.section === 'phq9'
        ? (phq9Answers[currentQ.questionIndexInSection] !== -1 ? phq9Answers[currentQ.questionIndexInSection] : phq9AnswersRef.current[currentQ.questionIndexInSection])
        : (gad7Answers[currentQ.questionIndexInSection] !== -1 ? gad7Answers[currentQ.questionIndexInSection] : gad7AnswersRef.current[currentQ.questionIndexInSection]))
    : -1;

  const hasCurrentAnswer = currentAnswerValue !== -1;

  const progressPercentage = Math.round(((currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100);

  // Severe or Moderate criteria for actionable referral banner
  const isSevereOrModerate = finalResult ? (
    finalResult.phq9.severity === 'Sedang' ||
    finalResult.phq9.severity === 'Sedang-Berat' ||
    finalResult.phq9.severity === 'Berat' ||
    finalResult.gad7.severity === 'Sedang' ||
    finalResult.gad7.severity === 'Berat' ||
    (finalResult.phq9.item9Score ?? 0) > 0 ||
    finalResult.phq9.score >= 10 ||
    finalResult.gad7.score >= 10
  ) : false;

  const modalContent = (
    <>
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-4 border-b border-default pb-3.5">
          <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-200/80 dark:border-teal-800/80 shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h2 id="screening-modal-title" className="text-base sm:text-lg font-bold tracking-tight text-primary">
              Cek Kondisi Mental Mahasiswa
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Skrining mandiri singkat (PHQ-9 & GAD-7) untuk memantau gejala depresi dan kecemasan; hasilnya bukan diagnosis.
            </p>
          </div>
        </div>

        {/* ========================================================== */}
        {/* STEP 1: INTRO SCREEN */}
        {/* ========================================================== */}
        {step === 'intro' && (
          <div className="space-y-4 animate-fade-in">
            <div className="surface-muted p-4 rounded-xl border border-default space-y-2 text-xs text-secondary">
              <div className="flex items-center gap-1.5 text-primary font-bold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Petunjuk Skrining Interaktif</span>
              </div>
              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed mt-1">
                <li><strong className="text-primary font-medium">Pengalaman Card Swiper:</strong> Tampil 1 pertanyaan per layar agar kamu dapat menjawab tanpa beban berlebih.</li>
                <li><strong className="text-primary font-medium">Estimasi Waktu:</strong> Cukup 2 menit (16 pertanyaan pilihan ganda).</li>
                <li><strong className="text-primary font-medium">Penyimpanan:</strong> {user && user.role !== 'guest' ? 'Jawaban dan skor dikirim ke server untuk disimpan pada akun sesuai masa retensi aplikasi.' : 'Mode tamu: jawaban tidak dikirim ke server dan hasil hanya tersedia selama layar ini terbuka.'}</li>
                <li><strong className="text-primary font-medium">Bukan Diagnosis:</strong> Ini adalah skrining mandiri. Skor tidak menggantikan penilaian konselor atau tenaga kesehatan.</li>
              </ul>
            </div>

            {/* Riwayat Tes Terakhir */}
            <div className="surface-card p-3.5 rounded-xl space-y-2.5 border border-default min-h-20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-secondary" /> Riwayat Skrining Terakhir
                </span>
                <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">Arsip Pribadi</span>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center p-4">
                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : errorHistory ? (
                <div className="p-3 text-center">
                  <p className="text-xs text-rose-600 dark:text-rose-400 mb-2">{errorHistory}</p>
                  <button onClick={() => fetchHistory()} className="text-[10px] font-medium text-teal-600 dark:text-teal-400 hover:underline">Coba Lagi</button>
                </div>
              ) : historyList.length > 0 ? (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {historyList.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between surface-muted p-2.5 rounded-lg border border-default text-xs">
                      <div>
                        <p className="font-medium text-primary text-xs">
                          PHQ-9: <span className="text-teal-600 dark:text-teal-400">{item.phq9.severity}</span> • GAD-7: <span className="text-teal-600 dark:text-teal-400">{item.gad7.severity}</span>
                        </p>
                        <p className="text-[10.5px] text-secondary mt-0.5">
                          {new Date(item.phq9.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center">
                  <p className="text-xs text-secondary">Belum ada riwayat skrining sebelumnya.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-default">
              <button
                onClick={() => {
                  setStep('questionnaire');
                  setCurrentQuestionIndex(0);
                  setSlideDirection('next');
                }}
                aria-label="Mulai Cek Kondisi Mental"
                className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 min-h-11 rounded-xl text-xs sm:text-sm cursor-pointer shadow-md hover:shadow-lg transition-all btn-tactile"
              >
                <span>Mulai Skrining Mandiri</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 2: CARD SWIPER QUESTIONNAIRE (1 PERTANYAAN PER LAYAR) */}
        {/* ========================================================== */}
        {step === 'questionnaire' && currentQ && (
          <div className="space-y-4">
            {/* Top Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-full text-[11px]">
                  {currentQ.sectionTitle}
                </span>
                <span className="font-bold text-primary tracking-tight">
                  Pertanyaan {currentQuestionIndex + 1} dari {TOTAL_QUESTIONS}
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                <div
                  className="bg-linear-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-secondary surface-muted p-2.5 sm:p-3 rounded-xl border border-default leading-relaxed">
              Dalam <strong className="text-primary font-semibold">2 minggu terakhir</strong>, seberapa sering kamu terganggu oleh masalah berikut?
            </p>

            {/* CARD SWIPER CONTAINER */}
            <div className="relative min-h-72.5 sm:min-h-70 overflow-hidden flex flex-col justify-center">
              <AnimatePresence mode="popLayout" custom={slideDirection}>
                <motion.div
                  key={currentQ.id}
                  custom={slideDirection}
                  variants={cardVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="surface-card border border-default p-4 sm:p-5 rounded-2xl shadow-3xs space-y-4 w-full"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-extrabold text-xs flex items-center justify-center border border-teal-200/70 dark:border-teal-800/70">
                      {currentQ.numberDisplay}
                    </span>
                    <h3 aria-live="polite" aria-atomic="true" className="text-sm sm:text-base font-medium text-primary leading-snug pt-0.5">
                      {currentQ.questionText}
                    </h3>
                  </div>

                  {/* FREQUENCY CHOICE BUTTONS (LARGE TOUCH-FRIENDLY TARGETS) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {OPTIONS.map((opt) => {
                      const isSelected = currentAnswerValue === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleSelectOption(opt.value)}
                          aria-pressed={isSelected}
                          className={`p-3.5 sm:p-4 min-h-13 rounded-xl text-xs sm:text-sm font-medium border text-left transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer flex items-center justify-between group chip-tactile ${
                            isSelected
                              ? 'bg-teal-700 text-white border-teal-700 shadow-md scale-[1.01]'
                              : 'surface-card border-default text-primary hover:bg-teal-50/60 dark:hover:bg-teal-950/30 hover:border-teal-300 dark:hover:border-teal-700 shadow-3xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-secondary group-hover:bg-teal-100 dark:group-hover:bg-teal-900 group-hover:text-teal-700 dark:group-hover:text-teal-300'
                            }`}>
                              {opt.value}
                            </span>
                            <span>{opt.label}</span>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0 animate-scale-up" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* QUESTIONNAIRE NAVIGATION FOOTER */}
            <div className="flex items-center justify-between pt-3 border-t border-default">
              <button
                onClick={handlePrevQuestion}
                className="px-4 py-2 min-h-11 sm:min-h-9 text-xs font-semibold text-secondary hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 btn-press"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNextQuestion}
                  disabled={!hasCurrentAnswer || isSubmitting}
                  className={`flex items-center justify-center gap-1.5 px-5 py-2 min-h-11 sm:min-h-9 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer btn-tactile ${
                    hasCurrentAnswer && !isSubmitting
                      ? 'bg-teal-700 text-white hover:bg-teal-800 shadow-3xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-muted border border-default cursor-not-allowed opacity-60'
                  }`}
                >
                  <span>{currentQuestionIndex === TOTAL_QUESTIONS - 1 ? 'Lihat Hasil' : 'Berikutnya'}</span>
                  {currentQuestionIndex === TOTAL_QUESTIONS - 1 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 3: ACTIONABLE RESULTS & ONE-CLICK COUNSELOR REFERRAL */}
        {/* ========================================================== */}
        {step === 'result' && finalResult && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center py-2.5 surface-muted/60 rounded-xl border border-default">
              <h3 className="text-base sm:text-lg font-sans font-bold tracking-tight text-primary">
                Hasil Skrining Mandiri
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Ringkasan skrining mandiri PHQ-9 & GAD-7.
              </p>
            </div>

            {/* Persistence Status Banner */}
            {persistenceStatus === 'pending' && (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                <span>Menyimpan hasil skrining ke profil akun Anda...</span>
              </div>
            )}
            {persistenceStatus === 'saved' && (
              <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hasil skrining tersimpan di akun. Masa retensi dan penghapusan tersedia di Pusat Privasi.</span>
              </div>
            )}
            {persistenceStatus === 'local-only' && (
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Mode Tamu: Hasil tidak disimpan permanen ke akun. Hasil hanya tersedia selama sesi ini.</span>
              </div>
            )}
            {persistenceStatus === 'failed' && (
              <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex flex-wrap items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="flex-1">{persistenceError || 'Pengecekan selesai, tetapi penyimpanan ke server terhambat.'}</span>
                {user && user.role !== 'guest' && (
                  <button
                    type="button"
                    onClick={handleRetryPersistence}
                    disabled={isSubmitting}
                    className="min-h-9 rounded-lg border border-rose-300 dark:border-rose-800 px-2.5 font-semibold hover:bg-rose-100 dark:hover:bg-rose-950 disabled:opacity-60"
                  >
                    Coba simpan ulang
                  </button>
                )}
              </div>
            )}

            {/* VISUAL SCORE CARDS WITH GAUGE METERS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <ScoreGaugeMeter
                score={finalResult.phq9.score}
                maxScore={27}
                severity={finalResult.phq9.severity}
                label="Skor Depresi (PHQ-9)"
              />
              <ScoreGaugeMeter
                score={finalResult.gad7.score}
                maxScore={21}
                severity={finalResult.gad7.severity}
                label="Skor Kecemasan (GAD-7)"
              />
            </div>

            {/* ACTIONABLE ONE-CLICK REFERRAL BANNER TO CAMPUS COUNSELOR */}
            {isSevereOrModerate ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-amber-50 via-teal-50/60 to-emerald-50 dark:from-amber-950/40 dark:via-teal-950/30 dark:to-emerald-950/30 border-2 border-amber-300/80 dark:border-amber-700/80 shadow-md space-y-3 relative overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                    <HeartHandshake className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200 leading-snug">
                      Rekomendasi Utama Pendampingan Konselor
                    </h4>
                    <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed font-medium">
                      &quot;Hasil skrining menunjukkan kamu sedang memikul beban yang cukup berat. Kamu tidak harus menghadapinya sendirian.&quot;
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                      Tinjau profil konselor untuk mengetahui ketersediaan sesi, biaya, dan kebijakan privasi layanan kampus.
                    </p>
                  </div>
                </div>

                {/* ONE-CLICK REFERRAL ACTION BUTTON */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    onClick={handleOneClickReferral}
                    className="w-full sm:w-auto px-5 py-3 min-h-12 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-100" />
                    <span>Lihat Konselor dan Jadwal</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/80 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-teal-800 dark:text-teal-300">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Skor Skrining Berada di Rentang Rendah</span>
                </div>
                <p className="text-xs text-teal-700 dark:text-teal-400 leading-relaxed">
                  Skor skrining ini berada pada rentang rendah. Hasil tersebut bukan jaminan bahwa tidak ada masalah. Jika tetap merasa khawatir, Anda dapat menghubungi konselor atau tenaga kesehatan.
                </p>
                <div className="pt-1">
                  <button
                    onClick={handleOneClickReferral}
                    className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Tetap ingin menjadwalkan konseling? Klik di sini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Risk Indicator Summary Banner (Item 9) */}
            {finalResult.riskIndicators?.hasSelfHarmRisk && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1 text-xs text-rose-900 dark:text-rose-200">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Catatan Keselamatan Khusus (Pertanyaan #9 PHQ-9)</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Jawaban ini perlu ditindaklanjuti bersama konselor atau tenaga kesehatan. Skrining tidak mengirim SOS atau memberi tahu konselor secara otomatis. Jika kamu membutuhkan bantuan sekarang, buka Pusat Bantuan Krisis.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/emergency');
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-950/60"
                >
                  <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
                  Buka Pusat Bantuan Krisis
                </button>
              </div>
            )}

            {/* Next Best Action Cards */}
            <div className="surface-muted p-3.5 rounded-xl border border-default space-y-2.5">
              <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                <span>🚀</span> Pilihan Akses Layanan RuangTenang
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/', { state: { discussScreening: finalResult } });
                  }}
                  className="p-3 rounded-xl border border-teal-200/60 dark:border-teal-900 hover:border-teal-300 dark:hover:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-left transition-all group flex items-start gap-2.5 cursor-pointer shadow-3xs hover:shadow-xs btn-press"
                >
                  <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-xs font-bold text-teal-800 dark:text-teal-300 block mb-0.5">Bahas Hasil Ini Bersama AI</span>
                    <span className="text-[10.5px] text-teal-600 dark:text-teal-400/80 leading-snug block">Gunakan AI untuk refleksi; AI bukan pengganti konselor atau tenaga kesehatan.</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate('/counselors');
                  }}
                  className="p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-900 hover:border-indigo-300 dark:hover:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-all group flex items-start gap-2.5 cursor-pointer btn-press"
                >
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-0.5">Jadwal Sesi Konseling</span>
                    <span className="text-[10.5px] text-indigo-600 dark:text-indigo-400/80 leading-snug block">Lihat konselor yang terdaftar; ketersediaan, layanan, dan kualifikasi dapat berbeda.</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 rounded-xl p-2.5">
              <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
                ⚠️ Skor ini adalah alat skrining awal, bukan diagnosis medis resmi.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-default">
              <button
                onClick={() => downloadReportTxt(finalResult)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-11 sm:min-h-9 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-default transition-all cursor-pointer btn-press"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan (.txt)</span>
              </button>

              <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-2">
                <button
                  onClick={() => {
                    resetAssessmentState();
                    setStep('questionnaire');
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-11 sm:min-h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-secondary text-xs font-semibold rounded-xl transition-all cursor-pointer btn-press"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tes Ulang</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2 min-h-11 sm:min-h-9 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-3xs transition-all cursor-pointer flex items-center justify-center btn-tactile"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SAFETY CHECK MODAL OVERLAY (Triggered when PHQ-9 Item 9 > 0) */}
        <SafetyCheckModal
          isOpen={showSafetyCheckModal}
          onClose={() => setShowSafetyCheckModal(false)}
          safetyAssessment={safetyAssessment}
          setSafetyAssessment={setSafetyAssessment}
        />
    </>
  );

  if (isPageMode) {
    if (!isOpen) return null;
    return (
      <div className="w-full max-w-3xl mx-auto px-3.5 sm:px-4 md:px-5 py-3.5 sm:py-4 md:py-5 font-sans">
        <div
          ref={modalRef}
          className="surface-card border border-default text-primary rounded-2xl w-full p-4 sm:p-6 shadow-3xs relative overflow-hidden"
        >
          {modalContent}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="screening-modal-backdrop"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={shouldReduceMotion ? reducedMotionVariants : modalBackdropVariants}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center max-sm:items-end p-3 sm:p-4 max-sm:p-0 font-sans select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="screening-modal-panel"
            ref={modalRef}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={shouldReduceMotion ? reducedMotionVariants : modalPanelVariants}
            role="dialog"
            aria-modal="true"
            aria-labelledby="screening-modal-title"
            tabIndex={-1}
            className="surface-card border border-default text-primary rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-xl relative max-h-[88dvh] max-sm:max-h-[92dvh] max-sm:rounded-b-none max-sm:w-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile bottom sheet drag handle */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            <button
              onClick={onClose}
              aria-label="Tutup"
              className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all z-10 cursor-pointer min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 flex items-center justify-center btn-press-compact"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>

            {modalContent}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
