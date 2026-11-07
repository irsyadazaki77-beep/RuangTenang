import React, { useEffect, useRef } from 'react';
import { FileText, FileCode, Table2, ListTree, Paperclip, BarChart3, Presentation, Layers } from 'lucide-react';
import { WorkspaceArtifact } from '../types';
import { WorkspaceFileAttachment } from '../types';

export interface MentionItem {
  id: string;
  kind: 'artifact' | 'attachment';
  title: string;
  subtitle: string;
  typeBadge: string;
  icon: React.ReactNode;
}

/**
 * Extracts mention query from cursor position in text.
 * Triggers when cursor is right after '@' or '@word'.
 */
export function getMentionQuery(text: string, cursorIndex: number): { query: string; mentionStartIndex: number } | null {
  if (cursorIndex < 1) return null;
  const textBeforeCursor = text.slice(0, cursorIndex);
  
  // Match '@' preceded by start of line or whitespace
  const match = /(?:^|\s)@([a-zA-Z0-9_\-.\s]*)$/.exec(textBeforeCursor);
  if (!match) return null;
  
  const query = match[1];
  // Abort if multiline or excessively long
  if (query.includes('\n') || query.length > 40) return null;
  
  const mentionStartIndex = textBeforeCursor.lastIndexOf('@');
  return { query: query.toLowerCase(), mentionStartIndex };
}

/**
 * Builds mentionable items from artifacts and attachments.
 */
export function buildMentionItems(
  artifacts: WorkspaceArtifact[] = [],
  attachments: WorkspaceFileAttachment[] = []
): MentionItem[] {
  const items: MentionItem[] = [];

  // Canvas Artifacts
  artifacts.forEach(art => {
    let icon = <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
    if (art.type === 'CODE') icon = <FileCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
    else if (art.type === 'TABLE') icon = <Table2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />;
    else if (art.type === 'OUTLINE') icon = <ListTree className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
    else if (art.type === 'CHART') icon = <BarChart3 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />;
    else if (art.language === 'presentation') icon = <Presentation className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;

    items.push({
      id: `art_${art.id}`,
      kind: 'artifact',
      title: art.title || 'Dokumen Tanpa Judul',
      subtitle: `Canvas · ${art.type} (v${art.version || 1})`,
      typeBadge: art.type,
      icon
    });
  });

  // Attachments
  attachments.forEach(att => {
    items.push({
      id: `att_${att.id || att.name}`,
      kind: 'attachment',
      title: att.name,
      subtitle: `Lampiran · ${att.size ? `${(att.size / 1024).toFixed(0)} KB` : 'Berkas'}`,
      typeBadge: 'FILE',
      icon: <Paperclip className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
    });
  });

  return items;
}

export function filterMentionItems(items: MentionItem[], query: string): MentionItem[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return items.slice(0, 10);
  return items.filter(
    item =>
      item.title.toLowerCase().includes(cleanQuery) ||
      item.subtitle.toLowerCase().includes(cleanQuery)
  ).slice(0, 10);
}

interface WorkspaceMentionMenuProps {
  items: MentionItem[];
  activeIndex: number;
  onSelect: (item: MentionItem) => void;
  onHover: (index: number) => void;
}

export const WorkspaceMentionMenu: React.FC<WorkspaceMentionMenuProps> = ({
  items,
  activeIndex,
  onSelect,
  onHover
}) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  if (!items.length) return null;

  return (
    <div
      role="listbox"
      aria-label="Sebut dokumen atau artefak"
      className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-60 overflow-y-auto rounded-2xl border border-indigo-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md dark:border-indigo-800/80 dark:bg-slate-900/95 animate-in fade-in slide-in-from-bottom-1"
    >
      <div className="flex items-center justify-between px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        <span className="flex items-center gap-1.5">
          <Layers className="h-3 w-3" />
          Sebut Konteks (@mention)
        </span>
        <span className="text-slate-400 font-normal">Gunakan panah & enter</span>
      </div>

      <div className="space-y-0.5">
        {items.map((item, index) => {
          const isSelected = index === activeIndex;
          return (
            <button
              key={item.id}
              ref={isSelected ? activeRef : undefined}
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(item)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                isSelected
                  ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100 font-medium'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className="shrink-0 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {item.title}
                </p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {item.subtitle}
                </p>
              </div>
              <span className="shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {item.typeBadge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
