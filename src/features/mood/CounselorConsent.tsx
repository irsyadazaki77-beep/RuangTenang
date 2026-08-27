import React from 'react';
import { ShieldCheck, AlertCircle, FileText, Lock } from 'lucide-react';
import { TriageCategory } from '../../types';

interface CounselorConsentProps {
  shareConsent: boolean;
  setShareConsent: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (msg: string) => void;
  currentTriage: TriageCategory;
  currentPhq9: number;
  currentGad7: number;
  averageMood: string;
  moodSummary: { emoji: string; label: string };
}

export const CounselorConsent: React.FC<CounselorConsentProps> = ({
  shareConsent,
  setShareConsent,
  showToast,
  currentTriage,
  currentPhq9,
  currentGad7,
  averageMood,
  moodSummary
}) => {
  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-5 bg-slate-50 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5.5 h-5.5 text-slate-900" />
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider">Izin Berbagi Ringkasan Kepada Konselor Kampus</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              Dengan mengaktifkan persetujuan ini, konselor terdaftar yang Anda hubungi dapat melihat ringkasan klinis yang tersimpan di perangkat Anda. Ini termasuk riwayat skrining (PHQ-9/GAD-7), artikel edukasi yang telah dibaca, serta grafik mood harian Anda untuk membantu proses konseling.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1 md:mt-0">
            <input
              type="checkbox"
              checked={shareConsent}
              onChange={(e) => {
                setShareConsent(e.target.checked);
                showToast(e.target.checked ? 'Izin berbagi data diaktifkan!' : 'Izin berbagi data dinonaktifkan.');
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
          </label>
        </div>

        <div className="text-xs sm:text-sm text-slate-600 bg-white p-4 rounded-lg border border-slate-200 space-y-3 shadow-3xs">
          <div className="flex items-center justify-between font-semibold text-slate-900 border-b border-slate-100 pb-2">
            <span>Status Izin Saat Ini:</span>
            <span className={shareConsent ? 'text-teal-600' : 'text-slate-600'}>
              {shareConsent ? 'DISETUJUI (Aktif Berbagi)' : 'DIBATASI (Rahasia/Privat)'}
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 ml-1">
            <li className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${shareConsent ? 'bg-teal-500' : 'bg-slate-300'}`} />
              <span>Tren Grafik Skor PHQ-9 & GAD-7: <strong className="text-slate-700">{shareConsent ? 'Dapat Diakses Konselor' : 'Disembunyikan'}</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${shareConsent ? 'bg-teal-500' : 'bg-slate-300'}`} />
              <span>Daftar Artikel & Edukasi Selesai Dibaca: <strong className="text-slate-700">{shareConsent ? 'Dapat Diakses Konselor' : 'Disembunyikan'}</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${shareConsent ? 'bg-teal-500' : 'bg-slate-300'}`} />
              <span>Riwayat Mood & Jurnal Harian: <strong className="text-slate-700">{shareConsent ? 'Dapat Diakses Konselor' : 'Disembunyikan'}</strong></span>
            </li>
            <li className="flex items-center gap-2 text-rose-600 bg-rose-50/50 p-2 rounded border border-rose-100 mt-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] leading-tight">Detail transkrip Chat AI Anda <strong className="font-bold">tersimpan secara aman di sistem</strong> dan tidak dibagikan kepada konselor tanpa persetujuan eksplisit Anda.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Preview of Summary Sheet that Counselor sees */}
      <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white space-y-4 shadow-3xs relative">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <span className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            Pratinjau Lembar Ringkasan Konselor (Bila Izin Aktif)
          </span>
          <span className="text-[10px] text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ID: MHS-101-ANON</span>
        </div>

        {shareConsent ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-600 block mb-0.5">Triase Klinis</span>
              <span className="font-semibold text-slate-900">{currentTriage}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-600 block mb-0.5">Terbaru PHQ-9</span>
              <span className="font-semibold text-slate-900">{currentPhq9} / 27 ({currentPhq9 <= 9 ? 'Stabil/Ringan' : 'Perlu Atensi'})</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-600 block mb-0.5">Terbaru GAD-7</span>
              <span className="font-semibold text-slate-900">{currentGad7} / 21</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-600 block mb-0.5">Rata-rata Mood</span>
              <span className="font-semibold text-teal-600">{averageMood} ({moodSummary.label})</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/70 p-6 rounded-lg text-center border border-dashed border-slate-300">
            <Lock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Data Dibatasi (Privat)</p>
            <p className="text-[10px] text-slate-600 mt-1">Konselor Anda hanya akan melihat ID mahasiswa anonim dan tidak dapat mengakses status triase atau grafik riwayat Anda.</p>
          </div>
        )}
      </div>
    </div>
  );
};
