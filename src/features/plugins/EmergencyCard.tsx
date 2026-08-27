import React from 'react';
import { AlertCircle, Phone } from 'lucide-react';

export default function EmergencyCard({ onAction }: { onAction?: () => void }) {
  return (
    <div className="my-3 border border-red-200 rounded-2xl p-4 bg-red-50 shadow-sm flex items-start gap-4">
      <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-red-900">Bantuan Darurat (SOS)</h3>
        <p className="text-sm text-red-700 mt-1 mb-3">Jika Anda merasa dalam bahaya atau berpikir untuk menyakiti diri sendiri, mohon segera hubungi bantuan profesional.</p>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Phone className="w-4 h-4" /> 119 (Kemenkes)
          </button>
          <button className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-sm font-medium transition-colors">
            Hotline Kampus
          </button>
        </div>
      </div>
    </div>
  );
}
