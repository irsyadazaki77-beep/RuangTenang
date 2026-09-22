import React from 'react';
import { Sparkles, BookOpen, Quote, Code2, FileText, Pencil, X } from 'lucide-react';
import { AcademicTaskTemplate } from '../types';

interface WorkspaceTemplateModalProps {
  template: AcademicTaskTemplate | null;
  snippet: string;
  onSnippetChange: (snippet: string) => void;
  onClose: () => void;
  onSubmit: (template: AcademicTaskTemplate, snippet: string) => void;
}

export const WorkspaceTemplateModal: React.FC<WorkspaceTemplateModalProps> = ({
  template,
  snippet,
  onSnippetChange,
  onClose,
  onSubmit
}) => {
  if (!template) return null;

  const renderTemplateIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className={className} />;
      case 'Quote': return <Quote className={className} />;
      case 'Code2': return <Code2 className={className} />;
      case 'FileText': return <FileText className={className} />;
      case 'Pencil': return <Pencil className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              {renderTemplateIcon(template.icon, "w-5 h-5")}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                {template.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                {template.description}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {template.inputPlaceholder || 'Lampirkan catatan atau draf Anda:'}
          </label>
          <textarea
            value={snippet}
            onChange={(e) => onSnippetChange(e.target.value)}
            placeholder="Tempelkan abstrak jurnal, draf teks, atau potongan kode di sini..."
            rows={4}
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onSubmit(template, snippet);
              onClose();
            }}
            className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Jalankan Template</span>
          </button>
        </div>
      </div>
    </div>
  );
};
