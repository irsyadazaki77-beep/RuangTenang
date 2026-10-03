import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  ChevronDown, 
  CheckCheck, 
  GraduationCap, 
  Maximize2, 
  Scissors, 
  Pencil, 
  FileSpreadsheet, 
  HelpCircle, 
  Zap, 
  ShieldCheck, 
  FileCode, 
  Terminal, 
  BookMarked, 
  BookOpen, 
  ListOrdered, 
  Download, 
  ListTree, 
  Crosshair,
  Sparkles
} from 'lucide-react';
import { WorkspaceToolDefinition, WorkspaceToolCategory } from '../tools/toolTypes';
import { WorkspaceToolRegistry } from '../tools/toolRegistry';
import { ArtifactType } from '../types';

interface WorkspaceToolSelectorProps {
  artifactType?: ArtifactType | null;
  hasArtifact?: boolean;
  disabled?: boolean;
  onSelectTool: (tool: WorkspaceToolDefinition) => void;
  className?: string;
  triggerVariant?: 'header' | 'composer' | 'chip';
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  CheckCheck: <CheckCheck className="w-3.5 h-3.5" />,
  GraduationCap: <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />,
  Maximize2: <Maximize2 className="w-3.5 h-3.5" />,
  Scissors: <Scissors className="w-3.5 h-3.5" />,
  Pencil: <Pencil className="w-3.5 h-3.5 text-indigo-500" />,
  FileSpreadsheet: <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />,
  HelpCircle: <HelpCircle className="w-3.5 h-3.5 text-amber-500" />,
  Zap: <Zap className="w-3.5 h-3.5 text-amber-500" />,
  ShieldCheck: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />,
  FileCode: <FileCode className="w-3.5 h-3.5 text-teal-500" />,
  Terminal: <Terminal className="w-3.5 h-3.5 text-slate-400" />,
  BookMarked: <BookMarked className="w-3.5 h-3.5 text-amber-500" />,
  BookOpen: <BookOpen className="w-3.5 h-3.5 text-teal-500" />,
  ListOrdered: <ListOrdered className="w-3.5 h-3.5 text-purple-500" />,
  Download: <Download className="w-3.5 h-3.5 text-slate-500" />,
  ListTree: <ListTree className="w-3.5 h-3.5 text-teal-500" />,
  Crosshair: <Crosshair className="w-3.5 h-3.5 text-rose-500" />
};

export const WorkspaceToolSelector: React.FC<WorkspaceToolSelectorProps> = ({
  artifactType,
  hasArtifact,
  disabled = false,
  onSelectTool,
  className = '',
  triggerVariant = 'header'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WorkspaceToolCategory | 'ALL'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter tools based on active artifact context and category
  const availableTools = useMemo(() => {
  const contextTools = WorkspaceToolRegistry.getToolsForArtifact(artifactType);
    const artifactAwareTools = hasArtifact === false ? contextTools.filter(tool => !tool.requiresArtifact) : contextTools;
    if (selectedCategory === 'ALL') return artifactAwareTools;
    return artifactAwareTools.filter(t => t.category === selectedCategory);
  }, [artifactType, hasArtifact, selectedCategory]);

  const categories = useMemo(() => {
    const contextTools = WorkspaceToolRegistry.getToolsForArtifact(artifactType)
      .filter(tool => hasArtifact !== false || !tool.requiresArtifact);
    const catSet = new Set<WorkspaceToolCategory>();
    contextTools.forEach(t => catSet.add(t.category));
    return Array.from(catSet);
  }, [artifactType, hasArtifact]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      {triggerVariant === 'header' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="h-[32px] px-2.5 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100/90 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 border border-emerald-200/80 dark:border-emerald-800/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs disabled:opacity-50"
          title="Buka Alat Bantu Workspace (AI Tools)"
          aria-expanded={isOpen}
          aria-label="Alat Bantu Workspace"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">AI Tools</span>
          <ChevronDown className="w-3 h-3 text-emerald-600/70" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="h-7 px-2 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-xs font-medium cursor-pointer flex items-center gap-1 disabled:opacity-50"
          title="Menu Aksi Workspace Tools"
          aria-label="Tools"
          aria-expanded={isOpen}
        >
          <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Tools</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
      )}

      {/* Dropdown Menu with Progressive Disclosure */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-scale-up space-y-1.5">
          {/* Header & Category Pills */}
          <div className="px-2 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Workspace Tools
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {availableTools.length} tool tersedia
            </span>
          </div>

          {/* Category Filter Pills (if > 1 categories exist) */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 px-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === 'ALL'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Semua
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-medium transition-colors cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Tools List */}
          <div className="max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
            {availableTools.length > 0 ? (
              availableTools.map(tool => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSelectTool(tool);
                  }}
                  className="w-full text-left p-2 rounded-xl text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 transition-colors flex items-start gap-2.5 cursor-pointer group"
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100/70 dark:group-hover:bg-emerald-900/60 shrink-0 mt-0.5">
                    {TOOL_ICONS[tool.icon] || <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span className="truncate">{tool.name}</span>
                      <span className="text-[9.5px] font-mono text-slate-400 ml-1 shrink-0">{tool.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {tool.description}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                Tidak ada tool yang cocok untuk konteks saat ini.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
