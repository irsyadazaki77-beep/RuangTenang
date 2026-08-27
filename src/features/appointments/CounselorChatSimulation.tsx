import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect } from 'react';
import { Send, Bot, AlertCircle, XCircle, Check } from 'lucide-react';
import { Appointment } from '../../types';
import { useCounselors } from '../../hooks/useCounselors';
import { apiClient } from '../../lib/apiClient';

interface CounselorChatSimulationProps {
  appointment: Appointment | null;
  onClose: () => void;
  onCompleteSession: (appointmentId: string, summaryNotes: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CounselorChatSimulation: React.FC<CounselorChatSimulationProps> = ({
  appointment,
  onClose,
  onCompleteSession,
  showToast
}) => {
  const { counselors } = useCounselors();
  useEscapeKey(onClose, true);

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    if (appointment) {
      const savedChatKey = `ruangtenang_chat_${appointment.id}`;
      const savedChat = null;
      if (savedChat) {
        try {
          setChatMessages(JSON.parse(savedChat));
        } catch (e) {
          initializeNewChat(appointment);
        }
      } else {
        initializeNewChat(appointment);
      }
    }
  }, [appointment]);

  const initializeNewChat = (apt: Appointment) => {
    if (counselors.length === 0) return;
    const counselor = counselors.find(c => c.id === apt.counselorId) || counselors[0];
    const initialGreeting = `Halo ${apt.studentName}! Selamat datang di Sesi Konseling Virtual RuangTenang Kampus 🤍. Saya ${counselor.name} 👋. Saya di sini siap merangkul, mendengarkan ceritamu, dan mendampingimu terkait masalah "${apt.primaryConcern}". Jangan ragu atau takut bercerita yaa, sesi ini sepenuhnya privat, aman, & rahasia 🔐✨. Apa yang paling berat atau sedang mengganjal di hatimu saat ini, kawan?`;
    
    const initialMsg = {
      role: 'assistant' as const,
      content: initialGreeting,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages([initialMsg]);
    
  };

  if (!appointment) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGeneratingResponse) return;

    const userMsg = {
      role: 'user' as const,
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsGeneratingResponse(true);

    const savedChatKey = `ruangtenang_chat_${appointment.id}`;
    

    try {
      const counselor = counselors.find(c => c.id === appointment.counselorId) || counselors[0];
      const res = await apiClient.post<any>('/api/v1/counselor-chat', {
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        counselorName: counselor.name,
        counselorTitle: counselor.title,
        counselorUniversity: counselor.university,
        counselorSpecialties: counselor.specialties,
        studentName: appointment.studentName,
        concern: appointment.primaryConcern
      });

      const data = res.data;
      const botMsg = {
        role: 'assistant' as const,
        content: (data && data.reply) || `Terima kasih atas ceritanya, ${appointment.studentName}. Saya sangat menghargai keberanian Anda berbagi rasa ini. Silakan ceritakan lebih lanjut, saya terus menyimak.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...updatedMessages, botMsg];
      setChatMessages(finalMessages);
      
    } catch (err) {
      console.warn('Counselor simulation API error:', err);
      const fallbackMsg = {
        role: 'assistant' as const,
        content: `Terima kasih sudah berbagi cerita, ${appointment.studentName}. Sebagai konselor Anda, saya sangat mendengarkan kecemasan dan apa yang mengganggu kenyamanan Anda. Kita akan melaluinya pelan-pelan bersama-sama. Silakan utarakan apa lagi yang Anda rasakan.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      const finalMessages = [...updatedMessages, fallbackMsg];
      setChatMessages(finalMessages);
      
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const handleCompleteClick = async () => {
    setIsGeneratingSummary(true);

    try {
      const counselor = counselors.find(c => c.id === appointment.counselorId) || counselors[0];
      
      const summaryPrompt = [
        {
          role: 'user',
          content: `Tolong buatkan Ringkasan Hasil Konseling Klinis yang sangat formal, profesional, dan realistis berdasarkan percakapan bimbingan konseling simulasi berikut ini:
          ${JSON.stringify(chatMessages)}
          
          Ringkasan HARUS mencakup bab-bab berikut dengan gaya penulisan psikolog profesional:
          1. ANALISIS KONDISI EMOSIONAL MAHASISWA (menguraikan mood, tingkat kecemasan, serta distress akademis yang dirasakan).
          2. MASALAH UTAMA YANG TERIDENTIFIKASI (penyebab stres, burnout, bimbingan dosen, atau overthinking).
          3. REKOMENDASI TERAPEUTIK & COPING STRATEGY (teknik grounding, pembagian waktu, restrukturisasi kognitif, dll).
          4. RENCANA TINDAK LANJUT (follow-up plan).
          
          PENTING: Jawab dalam Bahasa Indonesia yang formal dan profesional. Jangan gunakan bahasa gaul.`
        }
      ];

      let summaryTextResult = '';

      try {
        const res = await apiClient.post<any>('/api/v1/counselor-chat', {
          messages: summaryPrompt,
          counselorName: counselor.name,
          counselorTitle: counselor.title,
          counselorUniversity: counselor.university,
          counselorSpecialties: counselor.specialties,
          studentName: appointment.studentName,
          concern: appointment.primaryConcern
        });
        const data = res.data;
        summaryTextResult = data?.reply || '';
      } catch (e) {
        summaryTextResult = `RINGKASAN SESI KONSELING SIMULASI\n` +
          `Konselor: ${counselor.name}\n` +
          `Mahasiswa: ${appointment.studentName} (${appointment.studentNIM || 'N/A'})\n` +
          `Keluhan Utama: ${appointment.primaryConcern}\n\n` +
          `1. ANALISIS EMOSIONAL:\nMahasiswa menunjukkan tingkat kelelahan emosional (burnout) yang dipicu oleh beban akademis dan kecemasan terkait masa depan.\n\n` +
          `2. COPING STRATEGY:\n- Latih teknik pernapasan 4-7-8 untuk menenangkan detak jantung saat panik.\n- Membagi draf pengerjaan skripsi menjadi bagian kecil terstruktur.\n- Mengurangi screen-time gawai sebelum tidur malam.`;
      }

      onCompleteSession(appointment.id, summaryTextResult);
      onClose();
      showToast('Sesi Konseling berhasil diselesaikan! Ringkasan & saran psikologis telah diterbitkan.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyelesaikan sesi secara formal.', 'error');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 text-slate-800 rounded-xl max-w-2xl w-full h-[90vh] sm:h-[80vh] flex flex-col shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={appointment.counselorAvatar}
              alt={appointment.counselorName}
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              className="w-10 h-10 rounded-full object-cover border border-slate-200"
            />
            <div>
              <h3 className="font-sans font-semibold tracking-tight text-slate-900 text-sm sm:text-base leading-tight">
                {appointment.counselorName}
              </h3>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Sesi Konseling Aktif (Simulasi)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCompleteClick}
              disabled={isGeneratingSummary}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Selesaikan sesi ini dan buat Ringkasan & Saran Klinis otomatis"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Selesaikan & Ringkas</span>
            </button>
            <button
              onClick={onClose}
              disabled={isGeneratingSummary}
              className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Tutup jendela chat"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info and Warning Strip */}
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-start gap-2.5 shrink-0 text-[11px] sm:text-xs text-amber-600">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Sesi Simulasi Interaktif Aktif</p>
            <p className="opacity-90">Ini adalah sesi bimbingan konseling simulasi untuk proyek Anda. Seluruh tanggapan psikolog dihasilkan secara virtual oleh AI.</p>
          </div>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/50">
          {chatMessages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-slate-600" />
                  </div>
                )}
                <div className="max-w-[85%] sm:max-w-[75%] flex flex-col">
                  <span className={`text-[10px] font-medium mb-1 ${isUser ? 'text-right text-slate-600' : 'text-slate-600'}`}>
                    {isUser ? 'Anda' : appointment.counselorName}
                  </span>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                      isUser
                        ? 'bg-slate-800 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className={`text-[9px] text-slate-600 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isGeneratingResponse && (
            <div className="flex justify-start items-start gap-2.5 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-slate-600 mb-1">{appointment.counselorName}</span>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"></span>
                  <span className="font-medium text-xs text-slate-600 ml-1">Sedang mengetik tanggapan...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isGeneratingResponse || isGeneratingSummary}
            placeholder={isGeneratingResponse ? "Harap tunggu jawaban konselor..." : "Ketik pesan Anda terkait beban atau kecemasan..."}
            className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-slate-800 focus:bg-white text-slate-800 transition-colors"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isGeneratingResponse || isGeneratingSummary}
            className="p-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-600 text-white rounded-xl transition-all shadow-xs shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Summary Generating Loader Overlay */}
        {isGeneratingSummary && (
          <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 space-y-4 z-50 animate-in fade-in">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="space-y-1">
              <h4 className="text-white font-sans font-semibold tracking-tight text-base">Konselor Sesi Sedang Menyusun Laporan</h4>
              <p className="text-slate-300 text-xs max-w-sm">
                Mohon tunggu sebentar. AI Psikolog sedang menyintesis seluruh percakapan Anda untuk merumuskan lembar Analisis Klinis, Rekomendasi Coping, dan Rencana Tindak Lanjut formal.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
