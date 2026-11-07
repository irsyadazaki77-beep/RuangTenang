import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileCode
} from 'lucide-react';

export interface CommandItem {
  id: string;
  label?: string;
  title?: string;
  category: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  files?: string[];
  onOpenFile?: (file: string) => void;
  commands: CommandItem[];
  isDark?: boolean;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  files = [],
  onOpenFile = () => undefined,
  commands,
  isDark: _isDark
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isFileMode = query.startsWith('?') || !query.startsWith('>');
  
  // If query starts with '>', it's strictly command mode, otherwise show files first + commands
  const cleanQuery = query.replace(/^[?>]/, '').trim().toLowerCase();

  const fileResults: CommandItem[] = isFileMode
    ? files
        .filter(f => !cleanQuery || f.toLowerCase().includes(cleanQuery))
        .map(f => ({
          id: `file_${f}`,
          label: f,
          category: 'Files',
          shortcut: 'File',
          icon: <FileCode className="w-4 h-4 text-sky-400" />,
          action: () => {
            onOpenFile(f);
            onClose();
          }
        }))
    : [];

  const commandResults: CommandItem[] = commands.filter(
    c => !cleanQuery || (c.label || c.title || '').toLowerCase().includes(cleanQuery) || c.category.toLowerCase().includes(cleanQuery)
  );

  const combinedResults: CommandItem[] = query.startsWith('>')
    ? commandResults
    : query.startsWith('?')
    ? fileResults
    : [...fileResults.slice(0, 8), ...commandResults.slice(0, 12)];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, combinedResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + combinedResults.length) % Math.max(1, combinedResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = combinedResults[selectedIndex];
      if (item) {
        item.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#0b0f19] border border-slate-700/80 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col font-sans">
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/60">
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ketik nama file atau '>' untuk perintah (misal >format, >test)..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
          />
          <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded border border-slate-800">
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {combinedResults.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Tidak ada file atau perintah yang cocok dengan "{query}".
            </div>
          ) : (
            combinedResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-600/20 text-white border border-sky-500/40'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{item.icon}</span>
                    <span className="font-medium truncate">{item.label || item.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
                      {item.category}
                    </span>
                  </div>
                  {item.shortcut && (
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                      {item.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigasi</span>
            <span>↵ Pilih</span>
            <span>&gt; Mode Perintah</span>
          </div>
          <span>Command Palette • RuangCoder IDE</span>
        </div>
      </div>
    </div>
  );
};
