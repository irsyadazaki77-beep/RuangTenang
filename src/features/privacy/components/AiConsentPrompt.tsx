import React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface AiConsentPromptProps {
  isOpen: boolean;
  isSaving?: boolean;
  error?: string | null;
  isGuest?: boolean;
  onApprove: () => void;
  onClose: () => void;
}

export const AiConsentPrompt: React.FC<AiConsentPromptProps> = ({
  isOpen,
  isSaving = false,
  error,
  isGuest = false,
  onApprove,
  onClose
}) => {
  const dialogRef = useFocusTrap<HTMLElement>({
    isOpen,
    onClose: isSaving ? undefined : onClose,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={event => {
      if (event.target === event.currentTarget && !isSaving) onClose();
    }}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-consent-title"
        aria-describedby="ai-consent-description"
        className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xl dark:border-emerald-900/70 dark:bg-slate-900 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="ai-consent-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Persetujuan Pemrosesan AI
            </h2>
            <p id="ai-consent-description" className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Pesan{isGuest ? '' : ' dan lampiran'} yang kamu kirim akan diproses oleh model AI yang kamu pilih. Data sesi dilindungi dan tidak dibagikan ke pihak luar untuk pelatihan model.
            </p>
            <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                Pelajari apa yang diproses & privasi
              </summary>
              <div className="mt-1.5 space-y-1 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <p>• <strong>Cakupan:</strong> Teks obrolan, ringkasan konteks aktif, dan dokumen yang Anda unggah secara eksplisit.</p>
                <p>• <strong>Model:</strong> Diproses melalui penyedia model AI yang aktif sesuai pilihan Anda.</p>
                <p>• <strong>Akses:</strong> Hanya Anda yang dapat melihat hasil Workspace. Percakapan tidak dipantau oleh konselor tanpa persetujuan Anda.</p>
              </div>
            </details>
            {isGuest && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Izin ini hanya berlaku selama sesi browser ini.</p>}
            {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Tutup persetujuan AI" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={isSaving} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Nanti
          </button>
          <button type="button" onClick={onApprove} disabled={isSaving} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70 dark:bg-emerald-600 dark:hover:bg-emerald-500">
            {isSaving ? 'Menyimpan izin…' : 'Setuju dan lanjutkan'}
          </button>
        </div>
      </section>
    </div>
  );
};
