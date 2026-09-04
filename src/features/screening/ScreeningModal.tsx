import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { ScreeningResult } from '../../types';
import { getPhq9Severity, getGad7Severity } from '../../lib/clinicalScoring';
import { apiClient } from '../../lib/apiClient';
import { PHQ9_QUESTIONS, GAD7_QUESTIONS, OPTIONS } from './constants';
import { SafetyCheckModal } from './components/SafetyCheckModal';
import { useAuth } from '../../contexts/AuthContext';
import { addNotification } from '../../lib/notificationStore';

interface ScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (result: ScreeningResult) => void;
  onPersisted?: (result: ScreeningResult) => void;
  isPageMode?: boolean;
}

export const ScreeningModal: React.FC<ScreeningModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onPersisted,
  isPageMode = false
}) => {
  const { user } = useAuth();
  let navigate: (to: string) => void;
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    // Set initial focus
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const [step, setStep] = useState<'intro' | 'phq9' | 'gad7' | 'result'>('intro');
  const [phq9Answers, setPhq9Answers] = useState<number[]>(Array(9).fill(-1));
  const [gad7Answers, setGad7Answers] = useState<number[]>(Array(7).fill(-1));
  const [finalResult, setFinalResult] = useState<ScreeningResult | null>(null);

  const [historyList, setHistoryList] = useState<ScreeningResult[]>([]);

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

  useEffect(() => {
    if (!isOpen && !isPageMode) return;
    
    apiClient.get<any[]>('/api/v1/screenings')
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const mapped: ScreeningResult[] = res.data.map((s: any) => ({
            phq9: {
              score: s.phq9Score,
              severity: s.phq9Severity || getPhq9Severity(s.phq9Score),
              date: s.timestamp,
              item9Score: s.item9Score ?? 0,
              hasSelfHarmRisk: s.hasSelfHarmRisk ?? false
            },
            gad7: {
              score: s.gad7Score,
              severity: s.gad7Severity || getGad7Severity(s.gad7Score),
              date: s.timestamp
            },
            riskIndicators: s.riskIndicators || null
          }));
          setHistoryList(mapped);
        }
      })
      .catch(e => {
        console.warn('Failed to fetch screenings from server:', e);
      });
  }, [isOpen, isPageMode]);

  if (!isOpen && !isPageMode) return null;

  const handleSelectPhq9 = (index: number, val: number) => {
    const updated = [...phq9Answers];
    updated[index] = val;
    setPhq9Answers(updated);

    // PHQ-9 Question 9 (index 8): Positive response (> 0) triggers immediate safety check
    if (index === 8 && val > 0) {
      setShowSafetyCheckModal(true);
    }
  };

  const handleSelectGad7 = (index: number, val: number) => {
    const updated = [...gad7Answers];
    updated[index] = val;
    setGad7Answers(updated);
  };

  const isPhq9Complete = phq9Answers.every(v => v !== -1);
  const isGad7Complete = gad7Answers.every(v => v !== -1);

  const calculateResults = async () => {
    const phqScore = phq9Answers.reduce((a, b) => a + b, 0);
    const gadScore = gad7Answers.reduce((a, b) => a + b, 0);
    const item9Score = phq9Answers[8] !== -1 ? phq9Answers[8] : 0;
    const hasSelfHarmRisk = item9Score > 0;

    const getPhqSeverity = getPhq9Severity;
    const getGadSeverity = getGad7Severity;

    const riskCategory: 'KRISIS_SANGAT_TINGGI' | 'RISIKO_MENYAKITI_DIRI' | 'STANDAR' = (safetyAssessment.immediateDanger || safetyAssessment.planOrIntent)
      ? 'KRISIS_SANGAT_TINGGI'
      : (hasSelfHarmRisk ? 'RISIKO_MENYAKITI_DIRI' : 'STANDAR');

    const riskIndicators = {
      item9Score,
      hasSelfHarmRisk,
      immediateDanger: safetyAssessment.immediateDanger ?? false,
      planOrIntent: safetyAssessment.planOrIntent ?? false,
      contactedTrustedPerson: safetyAssessment.wantsTrustedContact ?? false,
      riskCategory,
      flaggedAt: new Date().toISOString()
    };

    const res: ScreeningResult = {
      phq9: {
        score: phqScore,
        severity: getPhqSeverity(phqScore),
        date: new Date().toISOString(),
        item9Score,
        hasSelfHarmRisk
      },
      gad7: {
        score: gadScore,
        severity: getGadSeverity(gadScore),
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

    // Signal local calculation completion
    onComplete?.(res);

    const isGuest = !user || user.role === 'guest';
    if (isGuest) {
      setPersistenceStatus('local-only');
      return;
    }

    if (!navigator.onLine) {
      setPersistenceStatus('failed');
      setPersistenceError('Perangkat sedang luring. Pengecekan selesai, tetapi penyimpanan ke server gagal.');
      return;
    }

    setPersistenceStatus('pending');
    try {
      const response = await apiClient.post<any>('/api/v1/screenings', {
        phq9Score: phqScore,
        gad7Score: gadScore,
        phq9Severity: getPhqSeverity(phqScore),
        gad7Severity: getGadSeverity(gadScore),
        item9Score,
        hasSelfHarmRisk,
        riskIndicators
      });

      if (response && (response.success || response.data?.id || (response as any).id)) {
        setPersistenceStatus('saved');
        onPersisted?.(res);
      } else {
        setPersistenceStatus('failed');
        setPersistenceError(response?.error || 'Pengecekan selesai, tetapi penyimpanan ke server gagal.');
      }
    } catch (err: any) {
      console.warn('Backend screening save failed:', err);
      setPersistenceStatus('failed');
      const errorMessage = err instanceof Error ? err.message : 'Pengecekan selesai, tetapi penyimpanan ke server gagal.';
      setPersistenceError(errorMessage);
    }
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
    text += `- Bila skor Depresi / Kecemasan kategori Sedang atau Berat, sangat disarankan membuat jadwal konseling dengan Psikolog Perguruan Tinggi melalui menu Direktori RuangTenang.\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hasil_Cek_Kondisi_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className={isPageMode ? "w-full max-w-3xl mx-auto px-3.5 sm:px-4 md:px-5 py-3.5 sm:py-4 md:py-5 font-sans" : "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center max-sm:items-end p-3 sm:p-4 max-sm:p-0 overflow-y-auto animate-fade-in font-sans"}>
      <div
        ref={modalRef}
        role={isPageMode ? undefined : "dialog"}
        aria-modal={isPageMode ? undefined : "true"}
        aria-labelledby="screening-modal-title"
        className={isPageMode
          ? "surface-card border border-default text-primary rounded-xl w-full p-4 sm:p-5 shadow-3xs relative overflow-hidden"
          : "surface-card border border-default text-primary rounded-xl max-w-2xl w-full p-4 sm:p-5 shadow-xl relative max-h-[88dvh] max-sm:max-h-[92dvh] max-sm:rounded-b-none max-sm:w-full overflow-y-auto transition-transform duration-300 animate-scale-up max-sm:animate-slide-up"
        }
      >
        {/* Drag handle for mobile bottom sheet */}
        {!isPageMode && <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />}

        {!isPageMode && (
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all z-10 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4 border-b border-default pb-3.5">
          <div className="p-2 surface-muted text-primary rounded-lg border border-default">
            <HeartPulse className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 id="screening-modal-title" className="text-base sm:text-lg font-semibold tracking-tight text-primary">Cek Kondisi Mental Mahasiswa</h2>
            <p className="text-xs text-secondary mt-0.5">Jawab pertanyaan singkat untuk memahami kondisi emosional Anda dalam dua minggu terakhir.</p>
          </div>
        </div>

        {/* STEP 1: INTRO */}
        {step === 'intro' && (
          <div className="space-y-3.5">
            <div className="surface-muted p-3.5 rounded-lg text-xs text-secondary space-y-1.5">
              <p className="font-semibold text-primary text-xs sm:text-sm">Tentang Pengecekan Ini</p>
              <ul className="list-disc pl-4 space-y-1 mt-1 leading-relaxed">
                <li><strong className="text-primary font-medium">Tujuan:</strong> Membantu memetakan tingkat stres, kecemasan, dan depresi ringan.</li>
                <li><strong className="text-primary font-medium">Durasi:</strong> Sekitar 2-3 menit.</li>
                <li><strong className="text-primary font-medium">Privasi:</strong> {user && user.role !== 'guest' ? 'Hasil dapat disimpan ke akun Anda untuk membantu melihat riwayat.' : 'Hasil tidak disimpan ke akun. Hasil hanya tersedia selama sesi ini.'}</li>
                <li><strong className="text-primary font-medium">Bukan Diagnosis:</strong> Alat ini adalah skrining awal mandiri, bukan pengganti diagnosis medis profesional.</li>
              </ul>
            </div>

            {historyList.length > 0 && (
              <div className="surface-card p-3.5 rounded-lg space-y-2.5 border border-default">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-secondary" /> Riwayat Tes Terakhir ({historyList.length})
                  </span>
                  <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">Riwayat Pribadi</span>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
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
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-default">
              <button
                onClick={() => setStep('phq9')}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 min-h-[38px] sm:min-h-[36px] rounded-lg text-xs sm:text-sm cursor-pointer"
              >
                <span>Mulai Cek Kondisi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PHQ-9 */}
        {step === 'phq9' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Bagian 1/2: PHQ-9 (Depresi)</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                Terisi: {phq9Answers.filter(v => v !== -1).length}/9
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg leading-relaxed">
              Dalam <strong className="text-slate-900 dark:text-slate-100 font-medium">2 minggu terakhir</strong>, seberapa sering kamu terganggu oleh masalah-masalah berikut?
            </p>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1.5 custom-scrollbar">
              {PHQ9_QUESTIONS.map((q, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 shadow-3xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectPhq9(idx, opt.value)}
                        className={`px-2 py-1.5 min-h-[38px] sm:min-h-[36px] rounded-lg text-[11px] sm:text-xs font-medium border text-center transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${
                          phq9Answers[idx] === opt.value
                            ? 'bg-teal-600 text-white border-teal-600 shadow-3xs'
                            : 'bg-stone-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-stone-100 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setStep('intro')}
                className="px-3.5 py-1.5 min-h-[38px] sm:min-h-[36px] text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                Kembali
              </button>
              <button
                disabled={!isPhq9Complete}
                onClick={() => setStep('gad7')}
                className={`flex items-center gap-1.5 px-4 py-2 min-h-[38px] sm:min-h-[36px] rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer ${
                  isPhq9Complete
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-3xs'
                    : 'bg-stone-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed'
                }`}
              >
                <span>Lanjut ke GAD-7</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: GAD-7 */}
        {step === 'gad7' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Bagian 2/2: GAD-7 (Kecemasan)</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                Terisi: {gad7Answers.filter(v => v !== -1).length}/7
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg leading-relaxed">
              Dalam <strong className="text-slate-900 dark:text-slate-100 font-medium">2 minggu terakhir</strong>, seberapa sering kamu terganggu oleh perasaan gelisah/cemas berikut?
            </p>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1.5 custom-scrollbar">
              {GAD7_QUESTIONS.map((q, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 shadow-3xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectGad7(idx, opt.value)}
                        className={`px-2 py-1.5 min-h-[38px] sm:min-h-[36px] rounded-lg text-[11px] sm:text-xs font-medium border text-center transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${
                          gad7Answers[idx] === opt.value
                            ? 'bg-teal-600 text-white border-teal-600 shadow-3xs'
                            : 'bg-stone-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-stone-100 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setStep('phq9')}
                className="px-3.5 py-1.5 min-h-[38px] sm:min-h-[36px] text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={calculateResults}
                disabled={!isGad7Complete}
                className={`flex items-center gap-1.5 px-4 py-2 min-h-[38px] sm:min-h-[36px] rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer ${
                  isGad7Complete
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-3xs'
                    : 'bg-stone-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lihat Hasil</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RESULT */}
        {step === 'result' && finalResult && (
          <div className="space-y-3.5">
            <div className="text-center py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <h3 className="text-base sm:text-lg font-sans font-semibold tracking-tight text-slate-900 dark:text-slate-100">Hasil Cek Kondisi Mental</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Hasil evaluasi mandiri awal untuk PHQ-9 & GAD-7.</p>
            </div>

            {/* Persistence Status Banner */}
            {persistenceStatus === 'pending' && (
              <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                <span>Sedang menyimpan hasil skrining ke akun Anda...</span>
              </div>
            )}
            {persistenceStatus === 'saved' && (
              <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Hasil berhasil disimpan ke akun Anda.</span>
              </div>
            )}
            {persistenceStatus === 'local-only' && (
              <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Mode Tamu: Hasil tidak disimpan ke akun. Hasil hanya tersedia selama sesi ini.</span>
              </div>
            )}
            {persistenceStatus === 'failed' && (
              <div className="p-2.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{persistenceError || 'Pengecekan selesai, tetapi penyimpanan ke server gagal.'}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* PHQ-9 Card */}
              <div className="p-3.5 sm:p-4 surface-card rounded-xl border border-default shadow-3xs flex flex-col h-full">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-secondary">Skor PHQ-9 (Depresi)</span>
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${
                    finalResult.phq9.severity === 'Minimal' ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-900' :
                    finalResult.phq9.severity === 'Ringan' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' :
                    finalResult.phq9.severity === 'Sedang' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                  }`}>
                    Tingkat {finalResult.phq9.severity}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2.5">
                   <p className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-primary">{finalResult.phq9.score}</p>
                   <span className="text-xs font-medium text-secondary">/ 27</span>
                </div>
                <p className="text-[11px] text-secondary leading-relaxed mt-auto border-t border-default pt-2.5">
                  {finalResult.phq9.severity === 'Minimal' && 'Skor menunjukkan kondisi emosional relatif stabil. Pertahankan pola istirahat dan aktivitas positif.'}
                  {finalResult.phq9.severity === 'Ringan' && 'Skor menunjukkan indikasi gejala stres/kelelahan emosional ringan. Disarankan latihan relaksasi & bimbingan AI.'}
                  {finalResult.phq9.severity === 'Sedang' && 'Skor menunjukkan indikasi gejala depresi sedang. Sangat disarankan berkonsultasi dengan konselor kampus.'}
                  {finalResult.phq9.severity === 'Berat' && 'Skor menunjukkan indikasi gejala depresi berat. Segera jadwalkan konseling profesional atau hubungi hotline darurat.'}
                </p>
              </div>

              {/* GAD-7 Card */}
              <div className="p-3.5 sm:p-4 surface-card rounded-xl border border-default shadow-3xs flex flex-col h-full">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-secondary">Skor GAD-7 (Kecemasan)</span>
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${
                    finalResult.gad7.severity === 'Minimal' ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-900' :
                    finalResult.gad7.severity === 'Ringan' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' :
                    finalResult.gad7.severity === 'Sedang' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                  }`}>
                    Tingkat {finalResult.gad7.severity}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2.5">
                  <p className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-primary">{finalResult.gad7.score}</p>
                  <span className="text-xs font-medium text-secondary">/ 21</span>
                </div>
                <p className="text-[11px] text-secondary leading-relaxed mt-auto border-t border-default pt-2.5">
                  {finalResult.gad7.severity === 'Minimal' && 'Skor menunjukkan tingkat kecemasan dalam batas wajar.'}
                  {finalResult.gad7.severity === 'Ringan' && 'Skor menunjukkan indikasi kecemasan ringan terkait rutinitas. Baik untuk melatih pernapasan rutin.'}
                  {finalResult.gad7.severity === 'Sedang' && 'Skor menunjukkan indikasi kecemasan sedang yang mengganggu konsentrasi belajar & tidur.'}
                  {finalResult.gad7.severity === 'Berat' && 'Skor menunjukkan indikasi kecemasan signifikan. Disarankan pendampingan psikolog untuk manajemen pemicu.'}
                </p>
              </div>
            </div>

            {/* Risk Indicator Summary Banner */}
            {finalResult.riskIndicators?.hasSelfHarmRisk && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1 text-xs text-rose-900 dark:text-rose-200">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Catatan Keselamatan Khusus (Pertanyaan #9 PHQ-9)</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Skor pertanyaan ke-9 menunjukkan adanya respon positif terkait pikiran menyakiti diri. Indikator risiko ini dicatat secara terpisah & aman untuk penanganan darurat. Jika kamu butuh teman bicara saat ini, kontak bantuan darurat selalu aktif.
                </p>
              </div>
            )}

            {/* Next Best Action Section */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🚀</span> Langkah Rekomendasi Selanjutnya
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Berdasarkan skor evaluasi awal Anda, berikut langkah terbaik yang disarankan untuk menjaga kesehatan emosional Anda:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/');
                  }}
                  className="p-3 rounded-lg border border-teal-200/60 dark:border-teal-900 hover:border-teal-300 dark:hover:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-left transition-all group flex items-start gap-2.5 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-xs font-bold text-teal-800 dark:text-teal-300 block mb-0.5">Diskusikan Hasil di Chat</span>
                    <span className="text-[10.5px] text-teal-600 dark:text-teal-400/80 leading-snug block">Bimbing asisten AI untuk mengurai perasaan Anda secara aman dan personal.</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate('/counselors');
                  }}
                  className="p-3 rounded-lg border border-indigo-200/60 dark:border-indigo-900 hover:border-indigo-300 dark:hover:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-all group flex items-start gap-2.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-0.5">Jadwalkan Sesi Konseling</span>
                    <span className="text-[10.5px] text-indigo-600 dark:text-indigo-400/80 leading-snug block">Temui psikolog profesional kampus berlisensi untuk penanganan terarah.</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 rounded-lg p-2.5">
              <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
                ⚠️ Skor ini hanya alat skrining awal, bukan diagnosis medis.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => downloadReportTxt(finalResult)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[38px] sm:min-h-[36px] bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan (.txt)</span>
              </button>

              <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-2">
                <button
                  onClick={() => setStep('intro')}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[38px] sm:min-h-[36px] bg-stone-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tes Ulang</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-1.5 min-h-[38px] sm:min-h-[36px] bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-3xs transition-all cursor-pointer"
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
      </div>
    </div>
  );
};
