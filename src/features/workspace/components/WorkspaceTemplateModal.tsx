import React, { useState, useMemo } from 'react';
import { Sparkles, BookOpen, Quote, Code2, FileText, Pencil, Search, X, ChevronRight } from 'lucide-react';
import { AcademicTaskTemplate } from '../types';
import { ACADEMIC_TEMPLATES } from './AcademicToolsBar';

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
  const [selectedTemplate, setSelectedTemplate] = useState<AcademicTaskTemplate | null>(template);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Keep local state in sync if prop changes
  React.useEffect(() => {
    if (template) {
      setSelectedTemplate(template);
    }
  }, [template]);

  const filteredTemplates = useMemo(() => {
    return ACADEMIC_TEMPLATES.filter(tpl => {
      const matchesSearch = searchQuery === '' || 
        tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesCategory = true;
      if (activeCategory === 'WRITING') matchesCategory = tpl.targetArtifact === 'DOCUMENT' || tpl.targetArtifact === 'OUTLINE';
      if (activeCategory === 'RESEARCH') matchesCategory = tpl.id.includes('jurnal') || tpl.id.includes('bab1') || tpl.id.includes('proposal');
      if (activeCategory === 'CITATION') matchesCategory = tpl.targetArtifact === 'CITATION';
      if (activeCategory === 'CODING') matchesCategory = tpl.targetArtifact === 'CODE';

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  if (!template) {
    return null;
  }

  const currentTemplate = selectedTemplate || ACADEMIC_TEMPLATES[0];

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug">
                Galeri Template Akademik
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih format standar untuk riset, skripsi, sitasi, atau kode
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="px-4 py-2.5 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-200/70 dark:border-slate-800 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari template (cth: Bab 1, APA 7th, debug, proposal)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body: Template List + Selected Snippet Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Template Selection Chips / Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredTemplates.map((tpl) => {
              const isSelected = currentTemplate.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`p-3 rounded-xl text-left border transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/30'
                      : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {renderTemplateIcon(tpl.icon, "w-3.5 h-3.5")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {tpl.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {tpl.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Template Input Section */}
          {currentTemplate && (
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Instruksi Khusus untuk "{currentTemplate.title}":
                </span>
                <span className="text-[11px] text-slate-500">
                  Output: <span className="font-semibold text-emerald-700 dark:text-emerald-300 uppercase">{currentTemplate.targetArtifact}</span>
                </span>
              </div>
              <textarea
                value={snippet}
                onChange={(e) => onSnippetChange(e.target.value)}
                placeholder="Tempelkan abstrak paper, DOI, draf bab, atau kode yang ingin diproses..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onSubmit(currentTemplate, snippet);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span>Jalankan Template</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
