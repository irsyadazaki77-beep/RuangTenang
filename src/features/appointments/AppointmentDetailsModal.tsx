import { useEscapeKey } from '../../hooks/useEscapeKey';
import React from 'react';
import { XCircle, FileText, Download, GraduationCap } from 'lucide-react';
import { Appointment } from '../../types';

interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  onClose: () => void;
}

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  appointment,
  onClose,
}) => {
  useEscapeKey(onClose, true);

  if (!appointment) return null;

  const handleDownload = () => {
    const blob = new Blob([appointment.notes || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ringkasan_Konseling_${appointment.studentName}_${appointment.date}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 text-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl relative overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-800 border border-slate-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-semibold tracking-tight text-slate-900 text-sm sm:text-base leading-tight">
                Laporan Ringkasan Hasil Konseling
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                ID Sesi: {appointment.id} | Tanggal: {appointment.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Doctor Info Block */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3.5">
              <img
                src={appointment.counselorAvatar}
                alt={appointment.counselorName}
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
              />
              <div>
                <h4 className="font-sans font-semibold tracking-tight font-semibold text-slate-900 text-sm sm:text-base">{appointment.counselorName}</h4>
                <p className="text-xs text-slate-600 font-medium">{appointment.counselorTitle}</p>
                <p className="text-[11px] text-slate-600 font-medium">Status: Simulasi Penjadwalan</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-semibold shrink-0">
              Sesi Selesai (Hadir)
            </div>
          </div>

          {/* Student Metadata Card */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-100 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="block text-slate-600 font-medium mb-1">Nama Mahasiswa:</span>
              <span className="font-semibold text-slate-900">{appointment.studentName}</span>
            </div>
            <div>
              <span className="block text-slate-600 font-medium mb-1">NIM / ID Mahasiswa:</span>
              <span className="font-mono font-semibold text-slate-900">{appointment.studentNIM || 'N/A'}</span>
            </div>
            <div className="col-span-2 pt-2.5 border-t border-slate-200/60">
              <span className="block text-slate-600 font-medium mb-1">Keluhan / Konsentrasi Utama:</span>
              <span className="font-medium text-slate-800">{appointment.primaryConcern}</span>
            </div>
          </div>

          {/* Medical Summary Text */}
          <div className="space-y-4 text-sm text-slate-800 leading-relaxed">
            <h4 className="font-sans font-semibold tracking-tight font-semibold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-slate-600" />
              <span>Catatan Ringkasan & Tindakan Psikologis</span>
            </h4>
            <div className="p-4 bg-white border border-slate-200 rounded-xl whitespace-pre-wrap font-sans text-slate-700 text-xs sm:text-sm shadow-xs leading-relaxed max-h-[300px] overflow-y-auto">
              {appointment.notes || "Belum ada ringkasan yang ditulis untuk sesi ini."}
            </div>
          </div>

          {/* Professional Legal Disclaimer */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-600 leading-relaxed">
            <strong>Pernyataan Hukum (Simulasi):</strong> Ini adalah dokumen ringkasan bimbingan konseling simulasi yang diterbitkan oleh sistem RuangTenang Kampus untuk demonstrasi/proyek akademik. Tidak mengandung resep medis nyata, rujukan hukum, atau diagnosis berhak hukum fisik yang mengikat.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Berkas (.txt)</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-medium transition-all"
          >
            Tutup Dokumen
          </button>
        </div>
      </div>
    </div>
  );
};
