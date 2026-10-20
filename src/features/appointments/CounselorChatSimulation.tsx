import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect, useCallback } from 'react';
import { Send, Bot, AlertCircle, XCircle } from 'lucide-react';
import { Appointment } from '../../types';
import { apiClient } from '../../lib/apiClient';

interface CounselorChatSimulationProps {
  appointment: Appointment | null;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CounselorChatSimulation: React.FC<CounselorChatSimulationProps> = ({
  appointment,
  onClose,
  showToast
}) => {
  useEscapeKey(onClose, true);

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  const initializeNewChat = useCallback(() => {
    const initialGreeting = 'Ini simulasi percakapan dengan asisten AI, bukan layanan konseling manusia. Jika kamu ingin mencoba, ceritakan hal yang ingin dibahas tanpa menyertakan informasi yang tidak perlu.';
    
    const initialMsg = {
      role: 'assistant' as const,
      content: initialGreeting,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages([initialMsg]);
  }, []);

  useEffect(() => {
    if (appointment) {
      initializeNewChat();
    }
  }, [appointment, initializeNewChat]);

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


    

    try {
      const res = await apiClient.post<any>('/api/v1/counselor-chat', {
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
      });

      const data = res.data;
      const botMsg = {
        role: 'assistant' as const,
        content: (data && data.reply) || 'Asisten simulasi belum dapat menjawab. Coba kirim pesan lagi atau hubungi konselor melalui layanan yang tersedia.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...updatedMessages, botMsg];
      setChatMessages(finalMessages);
      
    } catch (err) {
      console.warn('Counselor simulation API error:', err);
      const fallbackMsg = {
        role: 'assistant' as const,
        content: 'Simulasi tidak dapat terhubung saat ini. Coba lagi nanti atau hubungi konselor melalui layanan yang tersedia.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      const finalMessages = [...updatedMessages, fallbackMsg];
      setChatMessages(finalMessages);
      
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const handleCompleteClick = () => {
    showToast('Simulasi diakhiri. Status janji temu dan catatan konseling tidak diubah.', 'info');
    onClose();
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
                Simulasi AI
              </h3>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Profil: {appointment.counselorName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCompleteClick}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
              title="Akhiri simulasi tanpa mengubah janji temu atau catatan konseling"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Akhiri Simulasi</span>
            </button>
            <button
              onClick={onClose}
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
            <p className="font-semibold">Simulasi AI — bukan konseling manusia</p>
            <p className="opacity-90">Pesan diproses melalui model AI dan endpoint yang dikonfigurasi. Percakapan ini tidak disimpan sebagai catatan janji temu; pengelolaan data lain mengikuti kebijakan layanan.</p>
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
                    {isUser ? 'Anda' : 'Asisten simulasi AI'}
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
                <span className="text-[10px] font-medium text-slate-600 mb-1">Asisten simulasi AI</span>
                <div className="surface-card rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-calm-pulse [animation-delay:0ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-calm-pulse [animation-delay:200ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-calm-pulse [animation-delay:400ms]"></span>
                  <span className="font-medium text-xs text-slate-600 ml-1">Menyiapkan tanggapan simulasi...</span>
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
            disabled={isGeneratingResponse}
            placeholder={isGeneratingResponse ? "Menunggu tanggapan simulasi..." : "Ketik pesan Anda untuk mencoba simulasi..."}
            className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-slate-800 focus:bg-white text-slate-800 transition-colors"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isGeneratingResponse}
            className="p-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-600 text-white rounded-xl transition-all shadow-xs shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
