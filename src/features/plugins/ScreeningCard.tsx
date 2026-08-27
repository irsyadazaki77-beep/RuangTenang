import React from 'react';
import { Stethoscope } from 'lucide-react';

export default function ScreeningCard({ onAction }: { onAction?: () => void }) {
  return (
    <div className="my-3 border border-slate-200 rounded-2xl p-4 bg-white shadow-sm flex items-start gap-4">
      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
        <Stethoscope className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-800">Screening Kondisi (PHQ-9 & GAD-7)</h3>
        <p className="text-sm text-slate-500 mt-1 mb-3">Evaluasi singkat untuk mengukur tingkat stres atau kecemasan Anda saat ini.</p>
        <button onClick={onAction} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          Mulai Screening
        </button>
      </div>
    </div>
  );
}
