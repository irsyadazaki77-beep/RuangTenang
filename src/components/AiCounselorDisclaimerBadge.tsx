import React from 'react';
import { Bot, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';

interface DisclaimerProps {
  type: 'ai_simulation' | 'human_professional';
  className?: string;
  showDetails?: boolean;
}

export const CounselorBadge: React.FC<DisclaimerProps> = ({ type, className = '', showDetails = false }) => {
  if (type === 'ai_simulation') {
    return (
      <div className={`flex flex-col items-start gap-1.5 px-[14px] py-[12px] rounded-[14px] bg-teal-50/60 border border-teal-200/80 text-left w-full max-w-sm ${className}`}>
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-teal-600 shrink-0" />
          <span className="font-semibold text-[14px] text-slate-800 leading-none flex items-center gap-1.5">
            Teman RuangTenang AI 🌿
          </span>
        </div>
        {showDetails && (
          <span className="text-slate-600 text-[12px] leading-[1.4]">
            Ruang refleksi & teman cerita hangat (non-klinis). Privasi & keamanan ceritamu dijaga sesuai kebijakan privasi 🔐✨
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-xs">
        <UserCheck size={13} className="text-blue-600 shrink-0" />
        <span>👨‍⚕️ Konselor Profesional Kampus (Tenaga Manusia)</span>
      </div>
      {showDetails && (
        <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
          <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-950">Layanan Konseling Tatap Muka / Tele-Konseling Resmi:</p>
            <p>
              Konseling langsung bersama konselor kampus. Kerahasiaan data dan identitas Anda dilindungi secara profesional.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
