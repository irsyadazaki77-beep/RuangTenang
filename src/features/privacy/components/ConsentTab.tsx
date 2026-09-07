import React from 'react';
import { Sparkles, BookOpen } from 'lucide-react';

interface ConsentTabProps {
  loading: boolean;
  consentVersion: string;
  consentTimestamp: string | null;
  consentForAI: boolean;
  setConsentForAI: (val: boolean) => void;
  consentForAIMood: boolean;
  setConsentForAIMood: (val: boolean) => void;
  consentForAIScreening: boolean;
  setConsentForAIScreening: (val: boolean) => void;
  consentForAIMemory: boolean;
  setConsentForAIMemory: (val: boolean) => void;
  consentForAIJournal: boolean;
  setConsentForAIJournal: (val: boolean) => void;
  consentForEmergencySOS: boolean;
  setConsentForEmergencySOS: (val: boolean) => void;
  consentForCounselorSharing: boolean;
  setConsentForCounselorSharing: (val: boolean) => void;
  consentForCounselorSummary: boolean;
  setConsentForCounselorSummary: (val: boolean) => void;
  consentForTelemetry: boolean;
  setConsentForTelemetry: (val: boolean) => void;
  consentForAnalytics: boolean;
  setConsentForAnalytics: (val: boolean) => void;
  handleSaveConsent: () => void;
  handleRevokeAll: () => void;
}

export const ConsentTab: React.FC<ConsentTabProps> = ({
  loading,
  consentVersion,
  consentTimestamp,
  consentForAI,
  setConsentForAI,
  consentForAIMood,
  setConsentForAIMood,
  consentForAIScreening,
  setConsentForAIScreening,
  consentForAIMemory,
  setConsentForAIMemory,
  consentForAIJournal,
  setConsentForAIJournal,
  consentForEmergencySOS,
  setConsentForEmergencySOS,
  consentForCounselorSharing,
  setConsentForCounselorSharing,
  consentForCounselorSummary,
  setConsentForCounselorSummary,
  consentForTelemetry,
  setConsentForTelemetry,
  consentForAnalytics,
  setConsentForAnalytics,
  handleSaveConsent,
  handleRevokeAll
}) => {
  return (
    <div className="space-y-4 text-xs sm:text-sm">
      <div className="surface-muted p-3.5 rounded-xl space-y-2 border border-default">
        <h3 className="text-xs sm:text-sm font-bold text-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Transparansi Pemrosesan Data & Vendor AI
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-secondary pt-1">
          <div className="p-2.5 surface-card border border-default rounded-xl">
            <strong className="text-primary block mb-0.5 font-semibold">Data Yang Dikirim:</strong>
            Teks percakapan konseling, hasil tes PHQ-9/GAD-7. Data sensitif PII (NIM, Nama) di-anonymize otomatis sebelum diproses.
          </div>
          <div className="p-2.5 surface-card border border-default rounded-xl">
            <strong className="text-primary block mb-0.5 font-semibold">Vendor Pemroses AI:</strong>
            Google Gemini API via Server-Side Proxy Enclave (Tanpa Key Client-Side).
          </div>
          <div className="p-2.5 surface-card border border-default rounded-xl">
            <strong className="text-primary block mb-0.5 font-semibold">Kebijakan Penyimpanan Vendor:</strong>
            Efemeral (Transient in RAM during request execution). Data tidak disimpan oleh Google untuk pelatihan model umum.
          </div>
          <div className="p-2.5 surface-card border border-default rounded-xl">
            <strong className="text-primary block mb-0.5 font-semibold">Versi & Timestamp:</strong>
            Versi Aktif: <strong>{consentVersion}</strong> • Terakhir Diperbarui: {consentTimestamp ? new Date(consentTimestamp).toLocaleString('id-ID') : 'Belum Pernah'}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
          Pilih Persetujuan Eksplisit Anda:
        </h4>

        {/* Toggle 1: Master AI Processing */}
        <label className="flex items-start gap-3 p-3 surface-card border border-default rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition">
          <input
            type="checkbox"
            checked={consentForAI}
            onChange={(e) => setConsentForAI(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-default"
          />
          <div>
            <span className="text-xs font-bold text-primary block">
              Izin Pemrosesan AI Teman Bicara (Google Gemini API)
            </span>
            <span className="text-[11px] text-secondary block mt-0.5">
              Master switch untuk mengaktifkan pendampingan AI, refleksi emosi, dan analisis jurnal interaktif.
            </span>
          </div>
        </label>

        {/* Sub-toggles for Granular AI Personalization */}
        {consentForAI && (
          <div className="pl-5 border-l-2 border-teal-500/40 ml-4 space-y-2 my-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentForAIMood}
                onChange={(e) => setConsentForAIMood(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-default"
              />
              <div>
                <span className="text-[11.5px] font-semibold text-primary block">Personalisasi Tren Mood Harian</span>
                <span className="text-[10.5px] text-secondary block">AI membaca riwayat mood 3 hari terakhir untuk menyesuaikan nada empati.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentForAIScreening}
                onChange={(e) => setConsentForAIScreening(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-default"
              />
              <div>
                <span className="text-[11.5px] font-semibold text-primary block">Konteks Skrining Mandiri (PHQ-9 & GAD-7)</span>
                <span className="text-[10.5px] text-secondary block">AI memahami tingkat stres/kecemasan terkini tanpa mendiagnosis secara medis.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentForAIMemory}
                onChange={(e) => setConsentForAIMemory(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-default"
              />
              <div>
                <span className="text-[11.5px] font-semibold text-primary block">Memori Jangka Panjang AI</span>
                <span className="text-[10.5px] text-secondary block">AI mengingat poin penting yang Anda izinkan untuk sesi berikutnya.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentForAIJournal}
                onChange={(e) => setConsentForAIJournal(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-default"
              />
              <div>
                <span className="text-[11.5px] font-semibold text-primary block">Konteks Modul Latihan Mandiri</span>
                <span className="text-[10.5px] text-secondary block">AI menghubungkan saran dengan modul pernapasan atau self-care yang sedang Anda ikuti.</span>
              </div>
            </label>
          </div>
        )}

        {/* Toggle 2: Emergency SOS */}
        <label className="flex items-start gap-3 p-3 surface-card border border-default rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition">
          <input
            type="checkbox"
            checked={consentForEmergencySOS}
            onChange={(e) => setConsentForEmergencySOS(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-default"
          />
          <div>
            <span className="text-xs font-bold text-primary block">
              Izin Pengaktifan Notifikasi SOS Darurat Kritis
            </span>
            <span className="text-[11px] text-secondary block mt-0.5">
              Memungkinkan sistem meneruskan indikator risiko tinggi kepada kontak darurat atau Tim Psikologi Kampus saat terjadi krisis.
            </span>
          </div>
        </label>

        {/* Toggle 3: Counselor Sharing */}
        <label className="flex items-start gap-3 p-3 surface-card border border-default rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition">
          <input
            type="checkbox"
            checked={consentForCounselorSharing || consentForCounselorSummary}
            onChange={(e) => {
              setConsentForCounselorSharing(e.target.checked);
              setConsentForCounselorSummary(e.target.checked);
            }}
            className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-default"
          />
          <div>
            <span className="text-xs font-bold text-primary block">
              Izin Pembagian Data Skrining & Refleksi ke Konselor Kampus
            </span>
            <span className="text-[11px] text-secondary block mt-0.5">
              Membantu konselor kampus melihat catatan skrining dan perkembangan emosi saat Anda berkonsultasi.
            </span>
          </div>
        </label>

        {/* Toggle 4: Telemetry & Analytics */}
        <label className="flex items-start gap-3 p-3 surface-card border border-default rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition">
          <input
            type="checkbox"
            checked={consentForTelemetry || consentForAnalytics}
            onChange={(e) => {
              setConsentForTelemetry(e.target.checked);
              setConsentForAnalytics(e.target.checked);
            }}
            className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-default"
          />
          <div>
            <span className="text-xs font-bold text-primary block">
              Izin Pengumpulan Analitik & Telemetri Anonim
            </span>
            <span className="text-[11px] text-secondary block mt-0.5">
              Mengirimkan metrik latensi dan kestabilan sistem tanpa memuat teks percakapan atau data pribadi.
            </span>
          </div>
        </label>
      </div>

      {/* Non-AI Alternative Banner */}
      {!consentForAI && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-300 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Alternatif Non-AI Tersedia:</span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
            Jika Anda tidak memberikan persetujuan AI, Anda dapat menggunakan modul <strong>Refleksi Mandiri Terstruktur (Non-AI Journaling)</strong>, latihan pernapasan guided, serta menjadwalkan konseling langsung dengan psikolog kampus.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 pt-2">
        <button
          type="button"
          disabled={loading}
          onClick={handleSaveConsent}
          className="px-4 py-2 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-3xs cursor-pointer active:scale-[0.98]"
        >
          {loading ? 'Menyimpan...' : 'Simpan Persetujuan (Consent)'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleRevokeAll}
          className="px-4 py-2 min-h-[44px] surface-card hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 border border-default text-secondary rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer active:scale-[0.98]"
        >
          Cabut Seluruh Persetujuan
        </button>
      </div>
    </div>
  );
};
