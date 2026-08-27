import React from 'react';
import { CounselorBadge } from '../../../components/AiCounselorDisclaimerBadge';

interface EmptyChatStateProps {
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyChatState({ userName, onSelectPrompt }: EmptyChatStateProps) {
  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col items-center text-center px-4 pt-4 pb-4 md:pt-8 md:pb-6">
      <div className="w-12 h-12 bg-teal-50/80 rounded-2xl flex items-center justify-center border border-teal-200/80 shadow-3xs p-1 mb-4 ring-4 ring-teal-500/10">
        <img src="/favicon.svg" alt="RuangTenang Logo" className="w-8 h-8 object-contain" />
      </div>
      <h2 className="text-2xl md:text-[28px] leading-tight font-bold text-slate-800 mb-2 tracking-tight">
        Halo, {userName || "Kawan"}! 🤗 Mau cerita apa hari ini?
      </h2>
      <p className="text-[14px] leading-[1.6] text-slate-600 mb-4 max-w-md">
        Selamat datang di ruang amanmu 🤍. Jangan ragu atau takut bercerita yaa... Privasimu rahasia & terjaga 🔐. RuangTenang di sini siap merangkul dan mendengarkanmu tanpa menghakimi 🌿✨
      </p>
      
      {/* Reassurance Banner */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50/80 border border-teal-200/80 text-teal-800 text-xs font-medium mb-5 shadow-3xs">
        <span>🛡️ Ruang Rahasia & Privat</span>
        <span>•</span>
        <span>Bebas Dari Penghakiman 🤍</span>
      </div>

      <CounselorBadge type="ai_simulation" showDetails={true} className="mb-6" />
      <div className="flex flex-col gap-2.5 w-full max-w-sm text-left mt-1">
        {[
          { title: 'Mau menceritakan hariku...', icon: '☕', query: 'Aku mau menceritakan hariku hari ini...' },
          { title: 'Lagi merasa cemas & butuh ketenangan', icon: '🌿', query: 'Aku sedang merasa sangat cemas & butuh saran penenang...' },
          { title: 'Bantu merapikan pikiran & perasaan', icon: '✨', query: 'Bantu aku merefleksikan dan merapikan perasaanku minggu ini...' },
          { title: 'Cuma butuh teman cerita yang mau dengar', icon: '🫂', query: 'Bolehkah kamu temani aku mengobrol sejenak tanpa menghakimi?' },
          { title: 'Mulai latihan relaksasi & pernapasan', icon: '🤍', query: 'Tolong pandu aku latihan pernapasan untuk meredakan ketegangan...' }
        ].map(prompt => (
          <button
            key={prompt.title}
            onClick={() => onSelectPrompt(prompt.query)}
            className="min-h-[52px] px-[14px] py-[12px] rounded-[14px] border border-stone-200/80 hover:border-teal-400 hover:bg-teal-50/40 active:scale-[0.98] transition-all text-[14px] sm:text-[15px] font-medium text-slate-700 bg-white shadow-3xs flex items-center gap-[12px] w-full text-left cursor-pointer group"
          >
            <span className="w-6 h-6 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">{prompt.icon}</span>
            <span className="flex-1 leading-snug">{prompt.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
