import { ShieldCheck } from 'lucide-react';

interface CounselorConsentProps {
  onOpenPrivacyCenter?: () => void;
}

export const CounselorConsent = ({ onOpenPrivacyCenter }: CounselorConsentProps) => {
  return (
    <div className="p-4 surface-muted rounded-xl space-y-3 border border-default">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <p className="text-xs text-secondary leading-relaxed">
          Atur apakah ringkasan skrining atau catatan yang dipilih dapat dibagikan kepada konselor melalui Pusat Privasi. Pengaturan ini tersimpan pada akun.
        </p>
      </div>
      {onOpenPrivacyCenter && (
        <button
          type="button"
          onClick={onOpenPrivacyCenter}
          className="min-h-10 rounded-lg border border-default bg-white px-3 text-xs font-semibold text-primary hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          Buka Pusat Privasi
        </button>
      )}
    </div>
  );
};
