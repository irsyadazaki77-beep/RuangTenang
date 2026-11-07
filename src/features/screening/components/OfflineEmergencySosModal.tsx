import React, { useState } from 'react';
import {
  PhoneCall,
  WifiOff,
  ShieldAlert,
  HeartHandshake,
  Check,
  Wind
} from 'lucide-react';

interface OfflineEmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  severityCategory?: string;
}

export const OfflineEmergencySosModal: React.FC<OfflineEmergencySosModalProps> = ({
  isOpen,
  onClose,
  severityCategory = 'Krisis Berat'
}) => {
  const [groundingCheck, setGroundingCheck] = useState<Record<number, boolean>>({});

  if (!isOpen) return null;

  const toggleCheck = (idx: number) => {
    setGroundingCheck(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-[#090d16] border-2 border-rose-500/60 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Banner Alert Top */}
        <div className="bg-gradient-to-r from-rose-900/90 via-red-900/80 to-rose-950 p-4 border-b border-rose-500/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Protokol Bantuan Krisis & SOS Luring (Offline)
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline Ready</span>
                </span>
              </div>
              <p className="text-xs text-rose-200 mt-0.5">
                Kategori {severityCategory}: Bantuan darurat tetap tersedia tanpa koneksi internet.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs leading-relaxed">
          {/* Hotline Darurat Offline */}
          <div className="space-y-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-rose-400 block">
              1. Panggilan Telepon Darurat Gratis (Bisa Tanpa Kuota Internet):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href="tel:119"
                className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 hover:border-rose-400 hover:bg-rose-900/40 transition flex items-center justify-between group"
              >
                <div>
                  <span className="font-mono text-base font-extrabold text-rose-300 group-hover:text-white block">
                    119 ext. 8
                  </span>
                  <span className="text-[11px] text-slate-400">Layanan Sejiwa Kemenkes RI</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </a>

              <a
                href="tel:112"
                className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 hover:border-rose-400 hover:bg-rose-900/40 transition flex items-center justify-between group"
              >
                <div>
                  <span className="font-mono text-base font-extrabold text-rose-300 group-hover:text-white block">
                    112
                  </span>
                  <span className="text-[11px] text-slate-400">Panggilan Darurat Terpadu Nasional</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </a>
            </div>
          </div>

          {/* Protokol De-eskalasi & Grounding Segera */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-teal-400 text-xs">
              <Wind className="w-4 h-4" />
              <span>2. Langkah Grounding Mandiri Saat Ini (Teknik 5-4-3-2-1):</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Tarik napas dalam 4 detik, tahan 4 detik, hembuskan perlahan 6 detik. Berikan centang saat kamu menyadari lingkunganmu:
            </p>

            <div className="space-y-1.5">
              {[
                '👀 Lihat 5 benda di sekitarmu (misal: meja, lampu, buku, botol, pintu)',
                '✋ Sentuh 4 tekstur berbeda (misal: kain baju, dinginnya meja, jari tanganmu)',
                '👂 Dengarkan 3 suara di sekitarmu (misal: angin, jam dinding, hembusan napasmu)',
                '👃 Cium 2 aroma di sekitarmu (misal: aroma ruangan, minyak angin)',
                '👅 Rasakan 1 rasa di lidahmu atau teguk segelas air hangat'
              ].map((stepText, idx) => {
                const checked = Boolean(groundingCheck[idx]);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                      checked
                        ? 'bg-teal-950/40 border-teal-500/40 text-teal-200'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                        checked ? 'bg-teal-500 text-slate-950 border-teal-400' : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 stroke-3" />}
                    </div>
                    <span className="text-[11px] leading-tight select-none">{stepText}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kontak Kampus & Peer Safety */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs flex items-start gap-2.5">
            <HeartHandshake className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">Ingat: Kamu Tidak Sendirian</span>
              <span>
                Jika ada teman sekamar, keluarga, atau rekan terpercaya di dekatmu saat ini, sampaikan bahwa kamu sedang butuh ditemani. Kamu berharga dan badai ini bisa dilewati bersama.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Data bantuan disimpan secara luring di perangkat Anda.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Tutup Panduan SOS
          </button>
        </div>
      </div>
    </div>
  );
};
