import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  X,
  HeartPulse,
  Download,
  History,
  Calendar,
  ShieldAlert,
  PhoneCall,
  Send,
  AlertTriangle,
  Phone,
  MessageSquare,
  UserCheck
} from 'lucide-react';
import { ScreeningResult } from '../../types';
import { getPhq9Severity, getGad7Severity, CLINICAL_DISCLAIMER } from '../../lib/clinicalScoring';
import { EMERGENCY_CONTACTS } from '../../lib/emergencyResources';
import { apiClient } from '../../lib/apiClient';
import { PHQ9_QUESTIONS, GAD7_QUESTIONS, OPTIONS } from './constants';
import { SafetyCheckModal } from './components/SafetyCheckModal';

interface ScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: ScreeningResult) => void;
  isPageMode?: boolean;
}

const SCREENING_HISTORY_KEY = 'ruangtenang_screening_history';
const EMERGENCY_CONTACT_KEY = 'ruangtenang_emergency_contact';

export const ScreeningModal: React.FC<ScreeningModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  isPageMode = false
}) => {
  useEscapeKey(onClose, !isPageMode && isOpen);

  
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

  const calculateResults = () => {
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
    onComplete(res);
    setStep('result');

    if (navigator.onLine) {
      // Post to persistent backend database with separate risk indicators
      apiClient.post('/api/v1/screenings', {
        phq9Score: phqScore,
        gad7Score: gadScore,
        phq9Severity: getPhqSeverity(phqScore),
        gad7Severity: getGadSeverity(gadScore),
        item9Score,
        hasSelfHarmRisk,
        riskIndicators,
        userId: 'mahasiswa-anon'
      }).catch(err => {
        console.warn('Backend screening save failed:', err);
      });
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

    let text = `=== RUANGTENANG - LAPORAN HASIL SKRINING KESEHATAN MENTAL MAHASISWA ===\n`;
    text += `Tanggal Pemeriksaan: ${dateStr}\n`;
    text += `Penyimpanan Data: Tersimpan secara aman di sistem (Private)\n\n`;
    text += `1. HASIL PHQ-9 (SKOR DEPRESI AKADEMIS):\n`;
    text += `   - Skor Total: ${res.phq9.score} / 27\n`;
    text += `   - Tingkat Keparahan: ${res.phq9.severity}\n\n`;
    text += `2. HASIL GAD-7 (SKOR KECEMASAN AKADEMIS):\n`;
    text += `   - Skor Total: ${res.gad7.score} / 21\n`;
    text += `   - Tingkat Keparahan: ${res.gad7.severity}\n\n`;
    text += `REKOMENDASI RUANGTENANG:\n`;
    text += `- Bila skor Depresi / Kecemasan kategori Sedang atau Berat, sangat disarankan membuat jadwal konseling dengan Psikolog Perguruan Tinggi melalui menu Direktori RuangTenang.\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hasil_Skrining_PHQ9_GAD7_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className={isPageMode ? "w-full max-w-3xl mx-auto p-3 sm:p-6 my-2" : "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center max-sm:items-end p-4 max-sm:p-0 overflow-y-auto animate-fade-in"}>
      <div
        ref={modalRef}
        role={isPageMode ? undefined : "dialog"}
        aria-modal={isPageMode ? undefined : "true"}
        aria-labelledby="screening-modal-title"
        className={isPageMode
          ? "bg-white border border-slate-200/80 text-slate-900 rounded-3xl w-full p-6 md:p-8 shadow-sm relative overflow-hidden"
          : "bg-white border border-teal-50/50 text-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative max-h-[88dvh] max-sm:max-h-[92dvh] max-sm:rounded-b-none max-sm:w-full overflow-y-auto transition-transform duration-300 animate-scale-up max-sm:animate-slide-up"
        }
      >
        {/* Drag handle for mobile bottom sheet */}
        {!isPageMode && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden shrink-0" />}

        {!isPageMode && (
          <button
            onClick={onClose}
            aria-label="Tutup Skrining"
            className="absolute top-4 right-4 p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-5">
          <div className="p-2.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-300">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h2 id="screening-modal-title" className="text-xl font-sans font-semibold tracking-tight text-slate-900">Skrining Kesehatan Mental Mahasiswa (PHQ-9 & GAD-7)</h2>
            <p className="text-sm text-slate-600 mt-0.5">Instrumen evaluasi psikologis untuk menilai tingkat depresi & kecemasan.</p>
          </div>
        </div>

        {/* STEP 1: INTRO */}
        {step === 'intro' && (
          <div className="space-y-5">
            <div className="bg-teal-50 p-5 rounded-xl border border-teal-200 text-sm text-slate-600 space-y-2">
              <p className="font-medium text-teal-600 text-base">Mengapa Tes Ini Sangat Penting?</p>
              <p className="leading-relaxed">
                Tekanan skripsi, beban UKT, dan adaptasi kuliah sering kali memicu stres yang tidak terlihat.
                Hasil tes akan <strong className="text-teal-800 font-medium">disimpan secara aman di sistem</strong> untuk memantau perkembangan Anda. Konselor hanya dapat melihat hasil tes ini jika Anda telah memberikan izin akses.
              </p>
              <p className="text-xs text-amber-800 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/80 mt-2">
                <strong>Catatan Penting:</strong> Instrumen ini adalah alat evaluasi mandiri awal dan bukan diagnosis medis pengganti konsultasi profesional.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="font-medium text-slate-900 mb-1.5">PHQ-9 (9 Pertanyaan)</p>
                <p className="text-slate-600 text-xs">Mengukur indikator depresi & tingkat kelelahan emosional selama 2 minggu terakhir.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="font-medium text-slate-900 mb-1.5">GAD-7 (7 Pertanyaan)</p>
                <p className="text-slate-600 text-xs">Mengukur tingkat kecemasan, kegelisahan, dan rasa khawatir berlebihan.</p>
              </div>
            </div>

            {historyList.length > 0 && (
              <div className="bg-slate-50 p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-800" /> Riwayat Tes Terakhir ({historyList.length})
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Tersimpan di Sistem</span>
                </div>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                  {historyList.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-300 text-sm shadow-sm">
                      <div>
                        <p className="font-medium text-slate-900">
                          PHQ-9: <span className="text-teal-600">{item.phq9.severity} ({item.phq9.score})</span> • GAD-7: <span className="text-amber-500">{item.gad7.severity} ({item.gad7.score})</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {new Date(item.phq9.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadReportTxt(item)}
                        className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-[#E6E4DD] rounded-lg transition-colors border border-transparent hover:border-slate-300"
                        title="Unduh Laporan"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-5 border-t border-slate-100">
              <button
                onClick={() => setStep('phq9')}
                className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl text-sm transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <span>Mulai Skrining Mandiri</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PHQ-9 */}
        {step === 'phq9' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800 uppercase tracking-widest">Bagian 1/2: PHQ-9 (Depresi)</span>
              <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-md border border-slate-300">
                Terisi: {phq9Answers.filter(v => v !== -1).length}/9
              </span>
            </div>

            <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
              Dalam <strong className="text-slate-900 font-medium">2 minggu terakhir</strong>, seberapa sering kamu terganggu oleh masalah-masalah berikut?
            </p>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
              {PHQ9_QUESTIONS.map((q, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-300 space-y-3 shadow-sm hover:border-slate-200 transition-colors">
                  <p className="text-sm font-medium text-slate-900">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectPhq9(idx, opt.value)}
                        className={`px-3 py-2 min-h-[44px] rounded-xl text-[11px] sm:text-xs font-medium border text-center transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${
                          phq9Answers[idx] === opt.value
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-stone-50 text-slate-600 border-slate-200/60 hover:text-slate-900 hover:bg-stone-100 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-5 border-t border-slate-100">
              <button
                onClick={() => setStep('intro')}
                className="px-5 py-2.5 min-h-[44px] text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
              >
                Kembali
              </button>
              <button
                disabled={!isPhq9Complete}
                onClick={() => setStep('gad7')}
                className={`flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all active:scale-95 cursor-pointer ${
                  isPhq9Complete
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                    : 'bg-stone-50 text-slate-400 border border-slate-200/60 cursor-not-allowed'
                }`}
              >
                <span>Lanjut ke GAD-7</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: GAD-7 */}
        {step === 'gad7' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800 uppercase tracking-widest">Bagian 2/2: GAD-7 (Kecemasan)</span>
              <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-md border border-slate-300">
                Terisi: {gad7Answers.filter(v => v !== -1).length}/7
              </span>
            </div>

            <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
              Dalam <strong className="text-slate-900 font-medium">2 minggu terakhir</strong>, seberapa sering kamu terganggu oleh perasaan gelisah/cemas berikut?
            </p>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
              {GAD7_QUESTIONS.map((q, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-300 space-y-3 shadow-sm hover:border-slate-200 transition-colors">
                  <p className="text-sm font-medium text-slate-900">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectGad7(idx, opt.value)}
                        className={`px-3 py-2 min-h-[44px] rounded-xl text-[11px] sm:text-xs font-medium border text-center transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer ${
                          gad7Answers[idx] === opt.value
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-stone-50 text-slate-600 border-slate-200/60 hover:text-slate-900 hover:bg-stone-100 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-5 border-t border-slate-100">
              <button
                onClick={() => setStep('phq9')}
                className="px-5 py-2.5 min-h-[44px] text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={calculateResults}
                disabled={!isGad7Complete}
                className={`flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all active:scale-95 cursor-pointer ${
                  isGad7Complete
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                    : 'bg-stone-50 text-slate-400 border border-slate-200/60 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Lihat Hasil Skrining</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RESULT */}
        {step === 'result' && finalResult && (
          <div className="space-y-6">
            <div className="text-center py-4 bg-slate-50 rounded-xl">
              <h3 className="text-xl font-sans font-semibold tracking-tight text-slate-900">Hasil Analisis Skrining Kesehatan Mental</h3>
              <p className="text-sm text-slate-600 mt-1">Hasil ini telah diintegrasikan dengan sesi AI Konselormu.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* PHQ-9 Card */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-700">Skor PHQ-9 (Depresi)</span>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                    finalResult.phq9.severity === 'Minimal' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                    finalResult.phq9.severity === 'Ringan' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    finalResult.phq9.severity === 'Sedang' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                  }`}>
                    Tingkat {finalResult.phq9.severity}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                   <p className="text-5xl font-sans font-bold tracking-tight text-slate-900">{finalResult.phq9.score}</p>
                   <span className="text-sm font-medium text-slate-500">/ 27</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-auto border-t border-slate-100 pt-4">
                  {finalResult.phq9.severity === 'Minimal' && 'Skor menunjukkan kondisi emosional relatif stabil. Pertahankan pola istirahat dan aktivitas positif.'}
                  {finalResult.phq9.severity === 'Ringan' && 'Skor menunjukkan indikasi gejala stres/kelelahan emosional ringan. Disarankan latihan relaksasi & bimbingan AI.'}
                  {finalResult.phq9.severity === 'Sedang' && 'Skor menunjukkan indikasi gejala depresi sedang. Sangat disarankan berkonsultasi dengan konselor kampus.'}
                  {finalResult.phq9.severity === 'Berat' && 'Skor menunjukkan indikasi gejala depresi berat. Segera jadwalkan konseling profesional atau hubungi hotline darurat.'}
                </p>
              </div>

              {/* GAD-7 Card */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-700">Skor GAD-7 (Kecemasan)</span>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                    finalResult.gad7.severity === 'Minimal' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                    finalResult.gad7.severity === 'Ringan' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    finalResult.gad7.severity === 'Sedang' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                  }`}>
                    Tingkat {finalResult.gad7.severity}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <p className="text-5xl font-sans font-bold tracking-tight text-slate-900">{finalResult.gad7.score}</p>
                  <span className="text-sm font-medium text-slate-500">/ 21</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-auto border-t border-slate-100 pt-4">
                  {finalResult.gad7.severity === 'Minimal' && 'Skor menunjukkan tingkat kecemasan dalam batas wajar.'}
                  {finalResult.gad7.severity === 'Ringan' && 'Skor menunjukkan indikasi kecemasan ringan terkait rutinitas. Baik untuk melatih pernapasan rutin.'}
                  {finalResult.gad7.severity === 'Sedang' && 'Skor menunjukkan indikasi kecemasan sedang yang mengganggu konsentrasi belajar & tidur.'}
                  {finalResult.gad7.severity === 'Berat' && 'Skor menunjukkan indikasi kecemasan signifikan. Disarankan pendampingan psikolog untuk manajemen pemicu.'}
                </p>
              </div>
            </div>

            {/* Risk Indicator Summary Banner */}
            {finalResult.riskIndicators?.hasSelfHarmRisk && (
              <div className="p-5 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-2 text-xs text-rose-900">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Catatan Keselamatan Khusus (Pertanyaan #9 PHQ-9)</span>
                </div>
                <p className="leading-relaxed">
                  Skor pertanyaan ke-9 menunjukkan adanya respon positif terkait pikiran menyakiti diri. Indikator risiko ini dicatat secara terpisah & aman untuk penanganan darurat. Jika kamu butuh teman bicara saat ini, kontak bantuan darurat selalu aktif.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100">
              <button
                onClick={() => downloadReportTxt(finalResult)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-white hover:bg-stone-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200/60 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Laporan (.txt)</span>
              </button>

              <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-3">
                <button
                  onClick={() => setStep('intro')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-stone-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Tes Ulang</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer"
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
