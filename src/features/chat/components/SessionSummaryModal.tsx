import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/apiClient';
import { useToast } from '../../../components/Toast';
import { StructuredSessionSummary } from '../types';
import { Sparkles, RefreshCw, Copy, Check, AlertCircle, Calendar, MessageSquareQuote, Target, ShieldCheck } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';

interface SessionSummaryModalProps {
  chatId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SessionSummaryModal({ chatId, isOpen, onClose }: SessionSummaryModalProps) {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<StructuredSessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && chatId) {
      fetchExistingSummary();
    }
  }, [isOpen, chatId]);

  const fetchExistingSummary = async () => {
    if (!chatId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; summary: StructuredSessionSummary | null }>(
        `/api/chat/${chatId}/summary`
      );
      if (res.success && res.data?.summary) {
        setSummary(res.data.summary);
      } else {
        // Automatically generate if none exists yet
        handleGenerate(false);
      }
    } catch {
      setError('Gagal memuat ringkasan sesi.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (force = false) => {
    if (!chatId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ success: boolean; summary: StructuredSessionSummary }>(
        `/api/chat/${chatId}/summary`,
        { force }
      );
      if (res.success && res.data?.summary) {
        setSummary(res.data.summary);
        showToast(force ? 'Ringkasan berhasil diperbarui' : 'Ringkasan sesi berhasil dibuat', 'success');
      } else {
        setError(res.error || 'Gagal menghasilkan ringkasan sesi.');
      }
    } catch {
      setError('Terjadi kendala saat menghubungi layanan ringkasan AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = [
      `📋 RINGKASAN SESI RUANGTENANG`,
      `Tanggal: ${new Date(summary.generatedAt).toLocaleDateString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`,
      ``,
      `🎯 Masalah Utama:`,
      summary.masalahUtama,
      ``,
      `💭 Emosi yang Muncul:`,
      summary.emosi.map(e => `• ${e}`).join('\n') || '-',
      ``,
      `⚡ Pola & Pemicu:`,
      summary.polaPemicu.map(p => `• ${p}`).join('\n') || '-',
      ``,
      `💡 Poin Penting Diskusi:`,
      summary.poinPenting.map(p => `• ${p}`).join('\n') || '-',
      ``,
      `🌱 Hal yang Sudah Dicoba:`,
      summary.sudahDicoba.map(s => `• ${s}`).join('\n') || '-',
      ``,
      `👣 Langkah Kecil Berikutnya:`,
      summary.langkahBerikutnya.map(l => `• ${l}`).join('\n') || '-',
      ``,
      `⚠️ Catatan: ${summary.disclaimer}`
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Ringkasan berhasil disalin', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Ringkasan Sesi Obrolan"
      subtitle="Refleksi terstruktur untuk membantumu melihat kemajuan dan langkah kecil berikutnya"
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {loading && !summary ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Menganalisis poin refleksi sesi ini...</p>
          </div>
        ) : error && !summary ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleGenerate(true)}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : summary ? (
          <>
            {/* Header meta & copy button */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Dibuat: {new Date(summary.generatedAt).toLocaleDateString('id-ID')}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
                  title="Salin Ringkasan"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={() => handleGenerate(true)}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Perbarui Ringkasan"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
                  <span>Perbarui</span>
                </button>
              </div>
            </div>

            {/* Masalah Utama */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Target className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Masalah Utama</span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed bg-teal-50/40 dark:bg-teal-950/20 p-3 rounded-xl border border-teal-100 dark:border-teal-900/40">
                {summary.masalahUtama}
              </p>
            </div>

            {/* Emosi yang Muncul */}
            {summary.emosi && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Emosi yang Teridentifikasi
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(summary.emosi) ? summary.emosi : [summary.emosi]).map((emo, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      {emo}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pola / Pemicu */}
            {summary.polaPemicu && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Pola & Pemicu
                </div>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 pl-4 list-disc">
                  {(Array.isArray(summary.polaPemicu) ? summary.polaPemicu : [summary.polaPemicu]).map((p, i) => (
                    <li key={i} className="leading-relaxed">{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Poin Penting */}
            {summary.poinPenting && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-slate-500" />
                  <span>Poin Penting Percakapan</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 pl-4 list-disc">
                  {(Array.isArray(summary.poinPenting) ? summary.poinPenting : [summary.poinPenting]).map((p, i) => (
                    <li key={i} className="leading-relaxed">{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hal yang Sudah Dicoba */}
            {summary.sudahDicoba && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Hal yang Sudah Diupayakan
                </div>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 pl-4 list-disc">
                  {(Array.isArray(summary.sudahDicoba) ? summary.sudahDicoba : [summary.sudahDicoba]).map((s, i) => (
                    <li key={i} className="leading-relaxed">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Langkah Kecil Berikutnya */}
            {summary.langkahBerikutnya && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Langkah Kecil Berikutnya</span>
                </div>
                <div className="space-y-1.5">
                  {(Array.isArray(summary.langkahBerikutnya) ? summary.langkahBerikutnya : [summary.langkahBerikutnya]).map((l, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 font-medium text-[10px]">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Non-clinical disclaimer */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>{summary.disclaimer}</span>
            </div>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}
