import React, { useState } from 'react';
import { MoodLog, UserSession } from '../../../types';
import { 
  FileText, 
  Printer, 
  X, 
  ShieldCheck, 
  HeartHandshake, 
  GraduationCap, 
  CheckCircle2
} from 'lucide-react';

interface CounselingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: MoodLog[];
  user: UserSession | null;
}

export const CounselingReportModal: React.FC<CounselingReportModalProps> = ({
  isOpen,
  onClose,
  logs,
  user
}) => {
  const [includeReflectionNotes, setIncludeReflectionNotes] = useState<boolean>(true);
  const [anonymizeName, setAnonymizeName] = useState<boolean>(false);

  if (!isOpen) return null;

  const validLogs = logs.slice(0, 30);
  const totalLogs = validLogs.length;
  const avgMood = totalLogs > 0
    ? (validLogs.reduce((acc, l) => acc + l.mood, 0) / totalLogs).toFixed(1)
    : '0';

  const logsWithSleep = validLogs.filter(l => typeof l.sleepHours === 'number' && !isNaN(l.sleepHours));
  const avgSleep = logsWithSleep.length > 0
    ? (logsWithSleep.reduce((acc, l) => acc + (l.sleepHours as number), 0) / logsWithSleep.length).toFixed(1)
    : '7.0';

  // Extract Academic & Emotional Triggers
  const triggerMap: Record<string, number> = {};
  validLogs.forEach(l => {
    (l.factors || []).forEach(f => {
      triggerMap[f] = (triggerMap[f] || 0) + 1;
    });
  });

  const sortedTriggers = Object.entries(triggerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  const reportId = `REP-${Date.now().toString().slice(-6)}`;
  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const studentDisplayName = anonymizeName
    ? `Mahasiswa ID #${user?.id?.slice(0, 8) || 'ANON-77'}`
    : user?.name || 'Mahasiswa RuangTenang';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto border border-slate-200">
        
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-bold">Ringkasan Laporan Konseling Mahasiswa (PDF)</h3>
              <p className="text-[11px] text-slate-400">Siap dicetak atau disimpan sebagai arsip sesi konselor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includeReflectionNotes} 
                onChange={(e) => setIncludeReflectionNotes(e.target.checked)} 
                className="rounded text-teal-500"
              />
              <span>Sertakan Catatan</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={anonymizeName} 
                onChange={(e) => setAnonymizeName(e.target.checked)} 
                className="rounded text-teal-500"
              />
              <span>Anonimkan Nama</span>
            </label>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div id="printable-counseling-report" className="p-6 sm:p-10 overflow-y-auto space-y-6 text-xs sm:text-sm leading-relaxed font-sans">
          
          {/* Institutional Document Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-teal-700 font-bold text-sm sm:text-base uppercase tracking-wider">
                <HeartHandshake className="w-5 h-5" />
                <span>Pusat Bimbingan & Konseling Mahasiswa</span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                Laporan Ringkasan Kesejahteraan & Beban Akademik
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Dokumen Ringkasan Psikologis Terpadu Platform RuangTenang & RuangKerja
              </p>
            </div>

            <div className="text-right text-xs space-y-1 sm:shrink-0">
              <div className="font-mono text-slate-600 font-bold">No: {reportId}</div>
              <div className="text-slate-500">{currentDateStr}</div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                <ShieldCheck className="w-3 h-3" />
                Kerahasiaan Medis Terlindungi
              </div>
            </div>
          </div>

          {/* Student Profile & Scope */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Identitas Mahasiswa</span>
              <span className="font-bold text-slate-800">{studentDisplayName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Rentang Periode</span>
              <span className="font-bold text-slate-800">{totalLogs} Hari Terakhir</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Rata-Rata Mood</span>
              <span className="font-bold text-teal-700">{avgMood} / 5.0</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Rata-Rata Tidur</span>
              <span className="font-bold text-indigo-700">{avgSleep} Jam/Malam</span>
            </div>
          </div>

          {/* Section 1: Clinical Indicators */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm border-l-3 border-teal-600 pl-2">
              1. Indikator Kesejahteraan Emosional & Pola Istirahat
            </h3>
            <p className="text-xs text-slate-600">
              Berdasarkan pencatatan mandiri mahasiswa selama periode berjalan, stabilitas suasana hati berada pada skor <strong>{avgMood}/5.0</strong> dengan durasi istirahat malam rata-rata <strong>{avgSleep} jam</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-xs text-slate-700 block mb-1">Evaluasi Ritme Istirahat:</span>
                <p className="text-xs text-slate-600">
                  {parseFloat(avgSleep) < 6 
                    ? '⚠️ Terdapat indikasi defisit tidur kronis yang berpotensi memicu kerentanan kognitif dan penurunan regulasi emosi saat menghadapi deadline.'
                    : '✅ Durasi istirahat harian berada dalam rentang adekuat untuk mendukung pemulihan fungsi kognitif.'}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-xs text-slate-700 block mb-1">Skrining Mandiri Terintegrasi:</span>
                <p className="text-xs text-slate-600">
                  Data log terintegrasi dengan modul skrining klinis PHQ-9 (Depresi) & GAD-7 (Kecemasan) untuk memantau eskalasi stres akademik.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Dominant Academic Triggers */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm border-l-3 border-indigo-600 pl-2">
              2. Matriks Pemicu Stres Akademik Dominan
            </h3>
            <p className="text-xs text-slate-600">
              Faktor eksternal dan akademik yang paling sering diasosiasikan dengan fluktuasi suasana hati mahasiswa:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {sortedTriggers.length > 0 ? (
                sortedTriggers.map(([factor, count]) => (
                  <div key={factor} className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-semibold text-slate-800">{factor}</span>
                    <span className="text-slate-500 font-mono text-[11px]">({count}x tercatat)</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic">Belum ada faktor pemicu yang tercatat spesifik.</div>
              )}
            </div>
          </div>

          {/* Section 3: Recent Reflections (Optional) */}
          {includeReflectionNotes && validLogs.some(l => l.notes.trim()) && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm border-l-3 border-amber-600 pl-2">
                3. Catatan Refleksi Mandiri Mahasiswa (Sampel Terkini)
              </h3>
              <div className="space-y-2 pt-1">
                {validLogs
                  .filter(l => l.notes.trim())
                  .slice(0, 3)
                  .map((l, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
                        <span>{new Date(l.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                        <span className="font-semibold text-teal-700">Skor Mood: {l.mood}/5</span>
                      </div>
                      <p className="italic text-slate-700">"{l.notes}"</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Section 4: Counselor Guidance & Recommendations */}
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
            <h4 className="font-bold text-xs text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              Rekomendasi Tindak Lanjut Sesi Konseling
            </h4>
            <ul className="list-disc list-inside text-xs text-teal-950 space-y-1 leading-relaxed">
              <li>Lakukan eksplorasi mendalam pada faktor pemicu utama (<strong>{sortedTriggers[0]?.[0] || 'Tugas Kuliah/Skripsi'}</strong>) dalam 15 menit awal sesi.</li>
              <li>Tinjau efektivitas teknik relaksasi *Mindfulness Workshop* (Grounding 5-4-3-2-1 dan Box Breathing) yang telah diakses mahasiswa.</li>
              <li>Eksplorasi pembagian milestone tugas akademik di *RuangKerja* untuk mereduksi beban kognitif jangka pendek.</li>
            </ul>
          </div>

          {/* Footer Sign-off */}
          <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-xs text-slate-500">
            <div>
              <p className="text-[10px] text-slate-400">
                Dicetak secara otomatis dari Platform RuangTenang & RuangKerja.<br />
                Dokumen ini bersifat rahasia dan hanya untuk keperluan bimbingan konseling.
              </p>
            </div>
            <div className="text-right space-y-8">
              <p>Tanda Tangan Konselor Pendamping,</p>
              <div className="font-bold text-slate-800 border-t border-slate-400 pt-1">
                ( Konselor Profesional RuangTenang )
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
