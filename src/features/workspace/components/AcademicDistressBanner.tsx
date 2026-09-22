import React from 'react';
import { Wind, Heart, X } from 'lucide-react';
import { DistressDetectionResult } from '../utils/distressDetector';

interface AcademicDistressBannerProps {
  distressResult: DistressDetectionResult;
  onOpenBreathing: () => void;
  onSwitchToRuangTenang?: () => void;
  onDismiss: () => void;
}

export const AcademicDistressBanner: React.FC<AcademicDistressBannerProps> = ({
  distressResult,
  onOpenBreathing,
  onSwitchToRuangTenang,
  onDismiss
}) => {
  if (!distressResult.isDistressed) return null;

  return (
    <div className="mb-2.5 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-teal-950/85 via-slate-900/95 to-emerald-950/85 border border-teal-500/30 shadow-md text-xs text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center shrink-0">
          <Heart className="w-3.5 h-3.5 fill-teal-400/20 text-teal-300 animate-pulse" />
        </div>
        <div className="truncate">
          <p className="font-medium text-slate-100 truncate">
            {distressResult.distressType === 'panic'
              ? 'Terdengar kamu sedang cemas atau panik deadline. Bebanmu valid.'
              : distressResult.distressType === 'overwhelm'
              ? 'Otak terasa penuh atau buntu? Kita selesaikan satu per satu.'
              : 'Kamu terdengar lelah dan butuh jeda hening sejenak.'}
          </p>
          <p className="text-[11px] text-teal-300/80 hidden sm:block">
            RuangTenang hadir untuk memulihkan ketenangan dan fokusmu sebelum melanjutkan tugas.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
        {onSwitchToRuangTenang && (
          <button
            type="button"
            onClick={onSwitchToRuangTenang}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-medium text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Beralih ke RuangTenang untuk relaksasi & konseling"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Ke RuangTenang</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenBreathing}
          className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          title="Latihan pernapasan 1 menit di tempat"
        >
          <Wind className="w-3.5 h-3.5" />
          <span>Ambil Napas 1 Menit</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Tutup pemberitahuan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
