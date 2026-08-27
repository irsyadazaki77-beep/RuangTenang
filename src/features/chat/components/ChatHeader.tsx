import React, { useState } from 'react';
import { Menu, Ghost, Settings, ChevronDown, Check, Sparkles } from 'lucide-react';
import { ChatMode, ResponseStyle } from '../types';
import { AiQuotaBadge } from '../../../components/AiQuotaBadge';
import { AVAILABLE_AI_MODELS } from '../../../lib/aiModels';
import { UserSession } from '../../../types';

interface ChatHeaderProps {
  user: UserSession | null;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  responseStyle: ResponseStyle;
  setResponseStyle: (style: ResponseStyle) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  isTemporary: boolean;
  setIsTemporary: (val: boolean) => void;
  activePlugin: string | null;
  setActivePlugin: (plugin: string | null) => void;
}

export function ChatHeader({
  user, onOpenSidebar, onOpenSettings,
  chatMode, setChatMode, responseStyle, setResponseStyle,
  aiModel, setAiModel, isTemporary, setIsTemporary,
  activePlugin, setActivePlugin
}: ChatHeaderProps) {
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  return (
    <div className="flex flex-col border-b border-stone-200/60 bg-white/90 backdrop-blur-md sticky top-0 z-10 w-full shrink-0">
      <div className="h-14 flex items-center justify-between px-3 sm:px-4 w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {onOpenSidebar && (
            <button onClick={onOpenSidebar} className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg shrink-0 transition-colors" aria-label="Buka Menu">
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center gap-2 pr-0 sm:pr-2 sm:border-r border-slate-200/80 shrink-0">
            <img src="/favicon.svg" alt="RuangTenang" className="w-6 h-6 object-contain" />
          </div>
          
          <div className="relative">
            <button onClick={() => setShowModeDropdown(!showModeDropdown)} className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-700 font-medium text-[13px] sm:text-sm">
              <span>{chatMode}</span> <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </button>
            {showModeDropdown && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden z-50">
                {['Teman Cerita', 'Refleksi Diri', 'Fokus Solusi', 'Produktivitas', 'Persiapan Konseling'].map((mode) => (
                  <button key={mode} onClick={() => { setChatMode(mode as ChatMode); setShowModeDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs sm:text-sm flex justify-between items-center text-slate-700">
                    {mode} {chatMode === mode && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="hidden sm:flex items-center">
            {user?.role === 'guest' ? (
              <div className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/80 flex items-center gap-1 shrink-0 ml-1">
                <Ghost className="w-3 h-3 shrink-0" />
                <span>Sesi Tamu</span>
              </div>
            ) : (
              <button onClick={() => setIsTemporary(!isTemporary)} className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors shrink-0 ml-1 ${isTemporary ? 'bg-amber-50 text-amber-800 border-amber-200' : 'text-slate-500 border-slate-200/80 hover:bg-slate-100'}`} aria-label={isTemporary ? "Mode Privat Aktif" : "Aktifkan Mode Privat"}>
                <Ghost className="w-3.5 h-3.5 shrink-0" /> <span>{isTemporary ? 'Mode Privat' : 'Sesi Biasa'}</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
           <AiQuotaBadge userId={user?.id} userTier={user?.tier} variant="compact" onOpenSettings={onOpenSettings} />
           <button onClick={() => setActivePlugin(activePlugin === 'chat_settings' ? null : 'chat_settings')} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Pengaturan Chat">
             <Settings className="w-5 h-5" />
           </button>
           {activePlugin === 'chat_settings' && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-xl p-4 z-50 space-y-4">
              <h3 className="font-semibold text-slate-800 text-sm">Pengaturan Chat</h3>
              
              <div className="space-y-1 block md:hidden">
                <label className="text-xs text-slate-500 font-medium">Mode Percakapan</label>
                <select value={chatMode} onChange={e => setChatMode(e.target.value as ChatMode)} className="w-full text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:ring-2 focus:ring-teal-500/20">
                  <option value="Teman Cerita">Teman Cerita</option>
                  <option value="Refleksi Diri">Refleksi Diri</option>
                  <option value="Fokus Solusi">Fokus Solusi</option>
                  <option value="Produktivitas">Produktivitas</option>
                  <option value="Persiapan Konseling">Persiapan Konseling</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Gaya Respons</label>
                <select value={responseStyle} onChange={e => setResponseStyle(e.target.value as ResponseStyle)} className="w-full text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:ring-2 focus:ring-teal-500/20">
                  <option value="Singkat">Singkat</option>
                  <option value="Seimbang">Seimbang</option>
                  <option value="Mendalam">Mendalam</option>
                  <option value="Fokus mendengarkan">Fokus Mendengarkan</option>
                  <option value="Fokus solusi">Fokus Solusi</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    Model AI
                  </label>
                  <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-medium border border-teal-100">
                    {AVAILABLE_AI_MODELS.find(m => m.id === aiModel)?.tag || 'Pilihan'}
                  </span>
                </div>
                <select 
                   value={aiModel} 
                   onChange={e => setAiModel(e.target.value)} 
                   className="w-full text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
                >
                  <optgroup label="✨ Gemini 3.x Series (Terbaru)">
                    {AVAILABLE_AI_MODELS.filter(m => m.category === 'Gemini 3.x Series' && m.allowedTiers.includes(user?.tier || 'Free')).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.isDefault ? '(Default)' : ''} — {m.tag}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="⚡ Gemini 2.5 Series (Stabil)">
                    {AVAILABLE_AI_MODELS.filter(m => m.category === 'Gemini 2.5 Series' && m.allowedTiers.includes(user?.tier || 'Free')).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
           )}
        </div>
      </div>
    </div>
  );
}
