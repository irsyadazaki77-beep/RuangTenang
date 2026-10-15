import React from 'react';

interface GuestAiConsentNoticeProps {
  checked: boolean;
  onChange: (granted: boolean) => void;
}

export const GuestAiConsentNotice: React.FC<GuestAiConsentNoticeProps> = ({ checked, onChange }) => {
  if (checked) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className="mx-auto mb-2 w-full max-w-4xl rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2.5 text-xs text-teal-950 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
      <div className="flex items-start justify-between gap-2.5">
        <label className="flex cursor-pointer items-start gap-2.5 flex-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-teal-400 text-teal-700 focus:ring-teal-600"
            aria-describedby="guest-ai-consent-description"
          />
          <span>
            <span className="font-semibold">Izinkan pemrosesan pesan oleh AI untuk sesi ini</span>
            <span id="guest-ai-consent-description" className="mt-0.5 block leading-relaxed text-teal-800 dark:text-teal-200">
              Pesan dapat diproses oleh penyedia AI yang dikonfigurasi. Percakapan tidak dipantau langsung; hindari membagikan data sensitif. Pilihan ini hanya berlaku selama sesi browser ini. Jika tidak dicentang, pesan tidak dikirim ke penyedia AI.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
};
