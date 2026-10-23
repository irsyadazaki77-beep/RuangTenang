import React from 'react';
import { Brain, Check, X } from 'lucide-react';

export interface WorkspaceMemorySuggestionItem {
  category: 'goal' | 'decision' | 'preference' | 'constraint' | 'progress';
  content: string;
}

const CATEGORY_LABEL: Record<WorkspaceMemorySuggestionItem['category'], string> = {
  goal: 'Tujuan',
  decision: 'Keputusan',
  preference: 'Preferensi',
  constraint: 'Batasan',
  progress: 'Progres'
};

interface WorkspaceMemorySuggestionBarProps {
  suggestions: WorkspaceMemorySuggestionItem[];
  savingContent: string | null;
  onAccept: (suggestion: WorkspaceMemorySuggestionItem) => void;
  onDismiss: (suggestion: WorkspaceMemorySuggestionItem) => void;
  onDismissAll: () => void;
}

export function WorkspaceMemorySuggestionBar({ suggestions, savingContent, onAccept, onDismiss, onDismissAll }: WorkspaceMemorySuggestionBarProps) {
  if (suggestions.length === 0) return null;
  return (
    <section aria-label="Saran memori proyek" className="mx-3 mb-2 rounded-xl border border-indigo-200/80 bg-indigo-50/70 p-2.5 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/30">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-indigo-900 dark:text-indigo-200"><Brain className="h-3.5 w-3.5" aria-hidden="true" />Simpan ke memori proyek?</span>
        <button type="button" onClick={onDismissAll} className="rounded-md px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:hover:bg-slate-800">Abaikan semua</button>
      </div>
      <ul className="space-y-1">
        {suggestions.map(item => (
          <li key={`${item.category}:${item.content}`} className="flex items-start justify-between gap-2 rounded-lg bg-white/80 px-2 py-1.5 dark:bg-slate-900/60">
            <span className="min-w-0 text-slate-800 dark:text-slate-200"><span className="mr-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">{CATEGORY_LABEL[item.category]}</span>{item.content}</span>
            <span className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={() => onAccept(item)} disabled={savingContent === item.content} aria-label={`Simpan memori: ${item.content}`} title="Simpan" className="rounded-md p-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"><Check className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => onDismiss(item)} aria-label={`Abaikan saran: ${item.content}`} title="Abaikan" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-3.5 w-3.5" /></button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
