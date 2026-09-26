import React, { useState } from 'react';
import { Search, Lock, GraduationCap } from 'lucide-react';
import { usePrivacyVault } from '../../contexts/PrivacyVaultContext';
import { VaultPinModal } from './VaultPinModal';

export const PanicScreen: React.FC = () => {
  const { isPanicScreenActive, dismissPanicScreen, isVaultConfigured } = usePrivacyVault();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  if (!isPanicScreenActive) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[9999] bg-stone-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none overflow-y-auto animate-fade-in"
      >
        {/* Top Decoy Academic Portal Header */}
        <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                Portal Jurnal & Repositori Ilmiah Terpadu
              </div>
              <div className="text-[10.5px] text-slate-500">
                Indeksasi Scopus, Sinta & ScienceDirect • Akses Sivitas Akademika
              </div>
            </div>
          </div>

          {/* Discrete Unlock Trigger in corner */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isVaultConfigured) {
                  setIsPinModalOpen(true);
                } else {
                  dismissPanicScreen();
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Kembali ke RuangTenang (Shortcut: Tekan Escape atau Alt+X)"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Buka Layar</span>
            </button>
          </div>
        </header>

        {/* Decoy Academic Content */}
        <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          {/* Search bar simulation */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pencarian Dokumen & Karya Tulis Ilmiah
            </h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value="Analisis Komparatif Algoritma Optimasi pada Jaringan Neural Terdistribusi"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
              <button className="px-5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors">
                Cari Artikel
              </button>
            </div>
          </div>

          {/* Academic Paper Preview */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Artikel Jurnal Terakreditasi • Sinta 1
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
              Evaluasi Kinerja Arsitektur Mikrokomputer dan Penjadwalan Thread Paralel pada Lingkungan Cloud Computing
            </h1>

            <div className="text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3">
              Penulis: Dr. Ir. Hendra Setiawan, M.T., et al. • Dipublikasikan: Oktober 2025 • DOI: 10.1016/j.syscomp.2025.109281
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Abstrak</h3>
              <p>
                Penelitian ini menginvestigasi throughput dan latensi pemrosesan data paralel pada sistem heterogen multi-core.
                Berdasarkan evaluasi empiris terhadap 500 iterasi beban kerja intensif komputasi, model penjadwalan dinamis
                mampu mereduksi latency tail hingga 34.2% dibandingkan algoritma round-robin standar. Implikasi dari temuan
                ini memberikan landasan perancangan infrastruktur klaster komputasi berskala tinggi.
              </p>

              <h3 className="font-bold text-slate-900 dark:text-slate-100 pt-2">Metodologi & Desain Eksperimen</h3>
              <p>
                Metode yang diaplikasikan dalam kajian ini mencakup benchmarking sintetis menggunakan dataset throughput
                standar industri, diikuti oleh uji validitas signifikansi statistik (ANOVA p &lt; 0.01).
              </p>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 pt-4">
            Tekan <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[11px]">Esc</kbd> dua kali atau klik tombol "Buka Layar" untuk kembali ke sesi konsultasi.
          </div>
        </main>
      </div>

      <VaultPinModal
        isOpen={isPinModalOpen}
        mode="unlock"
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setIsPinModalOpen(false);
          dismissPanicScreen();
        }}
      />
    </>
  );
};
