import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface CounselorConsentProps {
  shareConsent: boolean;
  setShareConsent: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (msg: string) => void;
}

export const CounselorConsent: React.FC<CounselorConsentProps> = ({
  shareConsent,
  setShareConsent,
  showToast
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 surface-muted rounded-xl space-y-3 border border-default">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Izin Data Konselor</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Izinkan konselor terdaftar melihat ringkasan perkembangan klinis Anda untuk kebutuhan sesi konsultasi.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={shareConsent}
              onChange={(e) => {
                setShareConsent(e.target.checked);
                showToast(e.target.checked ? 'Izin berbagi data diaktifkan!' : 'Izin berbagi data dinonaktifkan.');
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        <div className="text-xs text-secondary surface-card p-3 rounded-lg border border-default space-y-2">
          <div className="flex items-center justify-between font-semibold text-primary border-b border-default pb-1.5">
            <span>Status:</span>
            <span className={shareConsent ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-secondary'}>
              {shareConsent ? 'Aktif Berbagi' : 'Dibatasi (Privat)'}
            </span>
          </div>
          <ul className="space-y-1 text-[11px] text-secondary">
            <li>• Riwayat skrining PHQ-9 & GAD-7</li>
            <li>• Tren & trajektori mood harian</li>
            <li>• Rekomendasi triase berkala</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
