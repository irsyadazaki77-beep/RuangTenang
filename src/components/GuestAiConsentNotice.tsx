import React from 'react';

interface GuestAiConsentNoticeProps {
  checked: boolean;
  onChange: (granted: boolean) => void;
}

export const GuestAiConsentNotice: React.FC<GuestAiConsentNoticeProps> = ({ checked, onChange }) => {
  const consentId = React.useId();

  if (checked) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className="mx-auto mb-2 w-full max-w-4xl rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs text-teal-950 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
      <div className="flex items-start gap-2.5">
        <input
          id={`${consentId}-checkbox`}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-teal-400 text-teal-700 focus:ring-teal-600"
          aria-describedby={`${consentId}-description`}
        />
        <div className="min-w-0 flex-1">
          <label htmlFor={`${consentId}-checkbox`} className="cursor-pointer font-semibold">
            Izinkan AI memproses pesan untuk sesi ini
          </label>
          <p id={`${consentId}-description`} className="mt-0.5 leading-relaxed text-teal-800 dark:text-teal-200">
            Pesan dan file konteks yang kamu pilih dikirim ke penyedia AI setelah kamu menyetujui izin. Hindari informasi sangat sensitif.
          </p>
          <details className="mt-1 text-[11px] leading-relaxed text-teal-800 dark:text-teal-200">
            <summary className="min-h-7 w-fit cursor-pointer rounded font-medium text-teal-900 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-100">
              Pelajari cakupan dan privasi
            </summary>
            <div className="space-y-1 pt-1">
              <p>Model mengikuti profil dan konfigurasi server. Jika memakai Ollama, pesan dikirim ke endpoint yang dikonfigurasi; endpoint itu belum tentu berada di perangkatmu.</p>
              <p>Percakapan tamu dapat disimpan sementara oleh aplikasi sesuai retensinya. Izin berlaku selama sesi browser ini; tanpa izin, pesan tidak dikirim ke penyedia AI.</p>
              <p>Percakapan tidak dipantau langsung oleh konselor. Jika pencarian web diaktifkan dan digunakan, kueri yang disaring dapat dikirim ke layanan eksternal; penyaringan pola bukan anonimisasi yang terjamin.</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};
