import React from 'react';
import { Calendar } from 'lucide-react';

export default function CounselorCard({ onAction }: { onAction?: () => void }) {
  return (
    <div className="my-3 border border-slate-200 rounded-2xl p-4 bg-white shadow-sm flex items-start gap-4">
      <div className="p-3 bg-teal-50 text-teal-600 rounded-xl shrink-0">
        <Calendar className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-800">Cari & Jadwalkan Konselor</h3>
        <p className="text-sm text-slate-500 mt-1 mb-3">Temukan psikolog atau konselor kampus yang sesuai dengan kebutuhan Anda.</p>
        <button onClick={onAction} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
          Lihat Direktori
        </button>
      </div>
    </div>
  );
}
