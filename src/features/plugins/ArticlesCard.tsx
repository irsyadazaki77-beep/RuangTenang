import React from 'react';
import { BookOpen } from 'lucide-react';

export default function ArticlesCard({ onAction }: { onAction: () => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Perpustakaan Edukasi</h4>
          <p className="text-xs text-slate-500 mt-1 mb-3">Baca artikel kesehatan mental, tips mengatasi stres, dan informasi edukatif lainnya.</p>
          <button
            onClick={onAction}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Buka Artikel
          </button>
        </div>
      </div>
    </div>
  );
}
