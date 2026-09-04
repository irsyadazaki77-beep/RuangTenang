import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Square, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { safeLocalStorage } from '../../../lib/storage';
import { CHAT_COMMANDS, CHAT_PLUGINS } from '../constants/commands';

interface Props {
  onSend: (msg: string, plugin?: string) => void;
  isTyping: boolean;
  onStop: () => void;
  chatId?: string;
  onCommand?: (cmd: string) => void;
  onOpenPlugin?: (pluginId: string) => void;
}

export function ChatComposer({ onSend, isTyping, onStop, chatId, onCommand, onOpenPlugin }: Props) {
  const [input, setInput] = useState('');
  const [showPlugins, setShowPlugins] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const draft = safeLocalStorage.getItem(`draft_${chatId || 'new'}`);
    if (draft) setInput(draft);
  }, [chatId]);

  useEffect(() => {
    if (input.trim()) {
      safeLocalStorage.setItem(`draft_${chatId || 'new'}`, input);
    } else {
      safeLocalStorage.removeItem(`draft_${chatId || 'new'}`);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 128);
      textareaRef.current.style.height = `${newHeight}px`;
    }

    const isSlash = input.startsWith('/');
    setShowCommands(isSlash);
    if (isSlash) {
      setSelectedCmdIndex(0);
    }
  }, [input, chatId]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        setShowPlugins(false);
        setShowCommands(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCommands = CHAT_COMMANDS.filter(c => 
    c.cmd.toLowerCase().startsWith(input.toLowerCase()) ||
    c.label.toLowerCase().includes(input.slice(1).toLowerCase())
  );

  const handleExecuteCommand = (cmdStr: string) => {
    setInput('');
    safeLocalStorage.removeItem(`draft_${chatId || 'new'}`);
    setShowCommands(false);
    setShowPlugins(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const commandObj = CHAT_COMMANDS.find(c => c.cmd.toLowerCase() === cmdStr.toLowerCase());
    if (commandObj?.actionType === 'plugin' && commandObj.pluginId && onOpenPlugin) {
      onOpenPlugin(commandObj.pluginId);
      return;
    }

    if (onCommand) {
      onCommand(cmdStr);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    
    if (input.startsWith('/')) {
      handleExecuteCommand(input.trim());
      return;
    }
    
    onSend(input);
    setInput('');
    safeLocalStorage.removeItem(`draft_${chatId || 'new'}`);
    setShowCommands(false);
    setShowPlugins(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handlePluginClick = (pluginId: string) => {
    setShowPlugins(false);
    if (onOpenPlugin) {
      onOpenPlugin(pluginId);
    }
  };

  return (
    <div 
      ref={composerRef}
      className="w-full bg-white/95 dark:bg-slate-950/95 border-t border-slate-200/80 dark:border-slate-800/80 px-2.5 sm:px-4 pt-2 pb-[max(env(safe-area-inset-bottom),_0.5rem)] sticky bottom-0 z-20 shrink-0 backdrop-blur-md"
    >
      <div className="max-w-3xl mx-auto w-full relative">
        <AnimatePresence>
          {/* Quick Command Suggestions Popup */}
          {showCommands && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-1.5 w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-lg rounded-xl p-1 z-30 overflow-hidden"
              role="listbox"
              aria-label="Daftar Perintah Cepat"
            >
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1 mb-0.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  Perintah Cepat
                </div>
                <span className="text-[9.5px] text-slate-400">Esc / Tab / Enter</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredCommands.map((c, index) => {
                  const Icon = c.icon;
                  const isSelected = index === selectedCmdIndex;
                  return (
                    <button
                      key={c.cmd}
                      type="button"
                      onClick={() => handleExecuteCommand(c.cmd)}
                      onMouseEnter={() => setSelectedCmdIndex(index)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer text-xs ${
                        isSelected 
                          ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-950 dark:text-teal-200' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Icon className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{c.cmd}</span>
                          <span className="text-[10.5px] text-slate-600 dark:text-slate-300 font-medium truncate ml-2">{c.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{c.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Plus Actions Popup */}
          {showPlugins && !showCommands && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-1.5 w-full max-w-[270px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-lg rounded-xl p-1.5 z-30 space-y-0.5"
              role="menu"
              aria-label="Menu Layanan Cepat"
            >
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-0.5 flex items-center justify-between">
                <span>Layanan Cepat</span>
                <span className="text-[9.5px] text-slate-400">1-Klik</span>
              </div>
              {CHAT_PLUGINS.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePluginClick(p.id)}
                    className="w-full flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left transition-colors text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer min-h-[38px]"
                    role="menuitem"
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${p.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[12px] text-slate-900 dark:text-slate-100">{p.label}</div>
                      <div className="text-[9.5px] text-slate-600 dark:text-slate-300 truncate">{p.desc}</div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <div className="relative flex items-end gap-1 sm:gap-1.5 bg-slate-100/90 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-1 sm:p-1.5 min-h-[44px] sm:min-h-[46px] focus-within:border-teal-500/60 dark:focus-within:border-teal-500/60 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-teal-500/15 transition-all shadow-3xs">
          {/* Plus Button */}
          <button
            type="button"
            onClick={() => {
              setShowPlugins(!showPlugins);
              setShowCommands(false);
            }}
            className={`w-9 h-9 min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center rounded-lg transition-colors shrink-0 cursor-pointer ${
              showPlugins
                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-label="Aksi tambahan"
            title="Buka menu aksi fitur"
            aria-expanded={showPlugins}
          >
            <Plus className={`w-4 h-4 transition-transform duration-200 ${showPlugins ? 'rotate-45' : ''}`} />
          </button>
          
          {/* Auto-growing Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (showCommands && filteredCommands.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedCmdIndex(prev => (prev + 1) % filteredCommands.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedCmdIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
                  return;
                }
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const selected = filteredCommands[selectedCmdIndex];
                  if (selected) {
                    setInput(selected.cmd);
                  }
                  return;
                }
                if (e.key === 'Escape') {
                  setShowCommands(false);
                  return;
                }
              }

              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (showCommands && filteredCommands.length > 0) {
                  const selected = filteredCommands[selectedCmdIndex];
                  if (selected) {
                    handleExecuteCommand(selected.cmd);
                    return;
                  }
                }
                handleSend();
              }
            }}
            placeholder="Tulis pesan..."
            className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 resize-none py-1.5 px-1 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed outline-none min-w-0"
            rows={1}
            disabled={isTyping}
            aria-label="Ketik pesan konsultasi atau perintah"
          />
          
          {/* Send / Stop Button */}
          {isTyping ? (
            <button
              type="button"
              onClick={onStop}
              className="w-9 h-9 min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              aria-label="Hentikan Jawaban"
              title="Hentikan respons AI"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className={`w-9 h-9 min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] rounded-lg flex items-center justify-center shrink-0 transition-all ${
                input.trim()
                  ? 'bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-2xs cursor-pointer'
                  : 'bg-slate-200/80 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
              aria-label="Kirim Pesan"
              title="Kirim pesan (Enter)"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>
        
        {/* Subtle Disclaimer */}
        <div className="flex justify-center mt-1 px-2 text-[10px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 select-none">
          <span className="truncate text-center">RuangTenang didukung AI untuk pendampingan. Privasi Anda terlindungi.</span>
        </div>
      </div>
    </div>
  );
}

