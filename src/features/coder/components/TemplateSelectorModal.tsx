import React, { useState } from 'react';
import {
  FolderPlus,
  X,
  Sparkles,
  FileCode,
  Layout,
  BarChart3,
  Terminal,
  Cpu
} from 'lucide-react';
import { STARTER_TEMPLATES, StarterTemplate } from './starterTemplates';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: StarterTemplate) => void;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTemplateId, setActiveTemplateId] = useState<string>(STARTER_TEMPLATES[0].id);

  if (!isOpen) return null;

  const filteredTemplates = STARTER_TEMPLATES.filter(
    t => selectedCategory === 'all' || t.category === selectedCategory
  );

  const selectedTemplate = STARTER_TEMPLATES.find(t => t.id === activeTemplateId) || STARTER_TEMPLATES[0];

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Layout':
        return <Layout className="w-5 h-5 text-teal-400" />;
      case 'BarChart3':
        return <BarChart3 className="w-5 h-5 text-amber-400" />;
      case 'Terminal':
        return <Terminal className="w-5 h-5 text-emerald-400" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-purple-400" />;
      default:
        return <FileCode className="w-5 h-5 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pilih Starter Template RuangCoder
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30">
                  Baru
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pilih basis proyek untuk memulai coding instan di live sandbox.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/60 bg-slate-900/50 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Semua Template' },
            { id: 'web', label: 'Web & Landing' },
            { id: 'data', label: 'Charts & Dashboard' },
            { id: 'python', label: 'Python (WASM)' },
            { id: 'algorithm', label: 'Algoritma / LeetCode' }
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Modal Body: Left list + Right details */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800/80 overflow-y-auto p-4 gap-4 flex-1">
          {/* Template Cards */}
          <div className="space-y-2.5 overflow-y-auto pr-1">
            {filteredTemplates.map(tpl => {
              const isSelected = activeTemplateId === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setActiveTemplateId(tpl.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-left ${
                    isSelected
                      ? 'border-sky-500/60 bg-sky-500/10 shadow-lg shadow-sky-500/5'
                      : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0">
                    {renderIcon(tpl.iconName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-white truncate">{tpl.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Template Details & Preview Files */}
          <div className="flex flex-col justify-between p-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  {renderIcon(selectedTemplate.iconName)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedTemplate.name}</h3>
                  <span className="text-xs text-sky-400 font-medium">
                    Kategori: {selectedTemplate.category.toUpperCase()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                {selectedTemplate.description}
              </p>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Struktur File Awal ({Object.keys(selectedTemplate.files).length} file)
                </span>
                <div className="space-y-1 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 max-h-36 overflow-y-auto">
                  {Object.entries(selectedTemplate.files).map(([fileName, content]) => (
                    <div
                      key={fileName}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-800/40 text-slate-300 font-mono"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-slate-500">📄</span> {fileName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {(content.length / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(selectedTemplate);
                  onClose();
                }}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-sky-500/20 transition flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gunakan Template Ini
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
