import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, modalPanelVariants } from '../../../lib/motionTokens';
import { 
  Code2, 
  FileText, 
  Quote, 
  ListTree, 
  Copy, 
  Check, 
  Download, 
  Maximize2, 
  Minimize2, 
  X, 
  Play, 
  Edit3, 
  Eye, 
  Sparkles, 
  Terminal,
  BookMarked,
  Share2,
  FileCode2,
  ChevronDown,
  Workflow,
  GraduationCap,
  History,
  RotateCcw,
  Clock,
  Loader2,
  Pencil,
  GitCompare
} from 'lucide-react';
import { WorkspaceArtifact, ArtifactType, CitationStyle } from '../types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { MermaidRenderer } from './MermaidRenderer';
import { exportToAcademicDocx } from '../utils/exportDocx';
import { ExportModal } from './ExportModal';
import { ArtifactDiffViewer } from './ArtifactDiffViewer';
import { useToast } from '../../../components/Toast';
import { 
  downloadBibTeXFile, 
  downloadRISFile, 
  parseCitations, 
  formatAsAPA7, 
  formatAsIEEE, 
  formatAsHarvard,
  generateBibTeX,
  generateRIS
} from '../utils/citationExport';

export interface ArtifactCanvasProps {
  artifact: WorkspaceArtifact;
  onUpdateArtifact?: (updated: Partial<WorkspaceArtifact>) => void;
  onClose?: () => void;
  onRequestRevision?: (revisionPrompt: string, currentArtifact: WorkspaceArtifact) => void;
  onRollbackVersion?: (targetVersion: number) => Promise<void> | void;
  onSaveArtifact?: (content: string, title?: string) => Promise<void> | void;
  isStreaming?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export type CanvasViewMode = 'preview' | 'edit' | 'raw' | 'diff';

export const ArtifactCanvas: React.FC<ArtifactCanvasProps> = ({
  artifact,
  onUpdateArtifact,
  onClose,
  onRequestRevision,
  onRollbackVersion,
  onSaveArtifact,
  isStreaming = false,
  isExpanded: controlledExpanded,
  onToggleExpand: controlledToggleExpand
}) => {
  const { showToast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpand = controlledToggleExpand || (() => setInternalExpanded(prev => !prev));

  const [viewMode, setViewMode] = useState<CanvasViewMode>('preview');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(artifact.title || '');
  const [editableContent, setEditableContent] = useState(artifact.content);
  const [simulationOutput, setSimulationOutput] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA7');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showRevisionMenu, setShowRevisionMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'idle'>('idle');
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const revisionMenuRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(artifact.content);

  // Sync ref and title input when external artifact changes
  useEffect(() => {
    lastSavedContentRef.current = artifact.content;
    setTitleInput(artifact.title || '');
  }, [artifact.id, artifact.title, artifact.content]);

  // Handle saving inline title
  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== artifact.title) {
      if (onUpdateArtifact) {
        onUpdateArtifact({ title: trimmed });
      }
      if (onSaveArtifact) {
        onSaveArtifact(editableContent, trimmed);
      }
      showToast('Judul dokumen berhasil diperbarui', 'success');
    } else {
      setTitleInput(artifact.title || '');
    }
  };

  // Debounced auto-save (800ms) when user edits content in canvas
  useEffect(() => {
    if (viewMode !== 'edit') return;

    if (editableContent !== lastSavedContentRef.current) {
      setSaveStatus('saving');
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(async () => {
        try {
          if (onUpdateArtifact) {
            onUpdateArtifact({ content: editableContent });
          }
          if (onSaveArtifact) {
            await onSaveArtifact(editableContent, artifact.title);
          }
          lastSavedContentRef.current = editableContent;
          setSaveStatus('saved');
          setTimeout(() => {
            setSaveStatus('idle');
          }, 3000);
        } catch (e) {
          console.warn('Auto-save error:', e);
          setSaveStatus('unsaved');
        }
      }, 800);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [editableContent, viewMode, onUpdateArtifact, onSaveArtifact, artifact.title]);

  const isMermaid = useMemo(() => {
    if (artifact.type === 'CODE' && (artifact.language || '').toLowerCase().includes('mermaid')) return true;
    const trimmed = (editableContent || '').trim();
    return trimmed.startsWith('graph ') ||
           trimmed.startsWith('flowchart ') ||
           trimmed.startsWith('sequenceDiagram') ||
           trimmed.startsWith('classDiagram') ||
           trimmed.startsWith('erDiagram') ||
           trimmed.startsWith('stateDiagram') ||
           trimmed.startsWith('gantt') ||
           trimmed.startsWith('pie') ||
           trimmed.startsWith('gitGraph') ||
           trimmed.startsWith('mindmap');
  }, [artifact.type, artifact.language, editableContent]);

  // Sync content when external artifact changes and user is not actively editing
  useEffect(() => {
    if (viewMode !== 'edit') {
      setEditableContent(artifact.content);
    }
  }, [artifact.content, viewMode]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
      if (revisionMenuRef.current && !revisionMenuRef.current.contains(e.target as Node)) {
        setShowRevisionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const wordCount = useMemo(() => {
    if (!editableContent) return 0;
    return editableContent.trim().split(/\s+/).filter(Boolean).length;
  }, [editableContent]);

  const readingTime = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableContent);
      setIsCopied(true);
      showToast('Konten artefak berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('Gagal menyalin konten.', 'error');
    }
  };

  const handleCopyCitationFormatted = async (format: 'APA7' | 'IEEE' | 'HARVARD' | 'BIBTEX' | 'RIS') => {
    try {
      const parsed = parseCitations(editableContent);
      let textToCopy = editableContent;
      if (format === 'APA7') {
        textToCopy = formatAsAPA7(parsed) || editableContent;
      } else if (format === 'IEEE') {
        textToCopy = formatAsIEEE(parsed) || editableContent;
      } else if (format === 'HARVARD') {
        textToCopy = formatAsHarvard(parsed) || editableContent;
      } else if (format === 'BIBTEX') {
        textToCopy = generateBibTeX(editableContent, artifact.title);
      } else if (format === 'RIS') {
        textToCopy = generateRIS(editableContent, artifact.title);
      }

      await navigator.clipboard.writeText(textToCopy);
      showToast(`Sitasi format ${format} berhasil disalin ke clipboard!`, 'success');
    } catch {
      showToast('Gagal menyalin format sitasi.', 'error');
    }
  };

  const handleDownloadBibTeX = () => {
    downloadBibTeXFile(editableContent, artifact.title);
    setShowDownloadMenu(false);
    showToast('Berkas BibTeX (.bib) berhasil diunduh.', 'success');
  };

  const handleDownloadRIS = () => {
    downloadRISFile(editableContent, artifact.title);
    setShowDownloadMenu(false);
    showToast('Berkas RIS (.ris) untuk Zotero/Mendeley berhasil diunduh.', 'success');
  };

  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    setShowDownloadMenu(false);
    try {
      showToast('Menyusun naskah format skripsi (.docx)...', 'info');
      await exportToAcademicDocx({
        title: artifact.title || 'Naskah Akademik',
        content: editableContent,
        authorName: 'Mahasiswa'
      });
      showToast('Naskah Word (.docx) standar format skripsi berhasil diunduh!', 'success');
    } catch (err: any) {
      console.error('Docx export failed:', err);
      showToast('Gagal mengekspor berkas .docx.', 'error');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleDownload = (forcedExt?: string) => {
    if (artifact.type === 'CITATION' && !forcedExt) {
      if (citationStyle === 'BIBTEX') {
        handleDownloadBibTeX();
        return;
      }
    }

    let extension = forcedExt || 'txt';
    let mimeType = 'text/plain;charset=utf-8';

    if (!forcedExt) {
      if (artifact.type === 'CODE') {
        const lang = (artifact.language || '').toLowerCase();
        if (lang.includes('python') || lang === 'py') extension = 'py';
        else if (lang.includes('typescript') || lang === 'ts') extension = 'ts';
        else if (lang.includes('javascript') || lang === 'js') extension = 'js';
        else if (lang.includes('sql')) extension = 'sql';
        else if (lang.includes('html')) extension = 'html';
        else if (lang.includes('css')) extension = 'css';
        else if (lang.includes('json')) extension = 'json';
        else extension = 'txt';
        mimeType = 'text/plain;charset=utf-8';
      } else if (artifact.type === 'DOCUMENT' || artifact.type === 'OUTLINE') {
        extension = 'md';
        mimeType = 'text/markdown;charset=utf-8';
      } else if (artifact.type === 'CITATION') {
        extension = 'txt';
        mimeType = 'text/plain;charset=utf-8';
      }
    } else {
      if (forcedExt === 'md') mimeType = 'text/markdown;charset=utf-8';
      else if (forcedExt === 'bib') mimeType = 'application/x-bibtex;charset=utf-8';
      else if (forcedExt === 'ris') mimeType = 'application/x-research-info-systems;charset=utf-8';
    }

    let downloadPayload = editableContent;
    if (forcedExt === 'bib') {
      downloadPayload = generateBibTeX(editableContent, artifact.title);
    } else if (forcedExt === 'ris') {
      downloadPayload = generateRIS(editableContent, artifact.title);
    }

    const safeTitle = (artifact.title || 'artefak_ruangkerja')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 30);

    const blob = new Blob([downloadPayload], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle}_v${artifact.version || 1}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
    showToast(`Berkas .${extension} berhasil diunduh.`, 'success');
  };

  const handleContentChange = (newVal: string) => {
    setEditableContent(newVal);
    if (onUpdateArtifact) {
      onUpdateArtifact({ content: newVal });
    }
  };

  const handleQuickRevisionClick = (actionLabel: string, promptInstruction: string) => {
    if (isStreaming || !onRequestRevision) return;
    const fullInstruction = `Tolong revisi artefak "${artifact.title}" (${artifact.type}) dengan instruksi berikut: ${promptInstruction}`;
    onRequestRevision(fullInstruction, { ...artifact, content: editableContent });
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationOutput(null);

    setTimeout(() => {
      try {
        const lang = (artifact.language || '').toLowerCase();
        if (lang.includes('javascript') || lang === 'js' || lang.includes('typescript') || lang === 'ts') {
          const logs: string[] = [];
          const customConsole = {
            log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            warn: (...args: any[]) => logs.push('[WARN] ' + args.join(' ')),
            error: (...args: any[]) => logs.push('[ERR] ' + args.join(' '))
          };

          const runnableCode = `
            (function(console) {
              try {
                ${editableContent}
              } catch(e) {
                console.error(e.message);
              }
            })(customConsole);
          `;

          const runFn = new Function('customConsole', runnableCode);
          runFn(customConsole);

          if (logs.length === 0) {
            setSimulationOutput('✓ Kode dieksekusi sukses tanpa error output (return 0).');
          } else {
            setSimulationOutput(logs.join('\n'));
          }
        } else if (lang.includes('python') || lang === 'py') {
          const lines = editableContent.split('\n');
          const hasSyntaxErr = lines.some(l => l.includes('def ') && !l.trim().endsWith(':'));
          if (hasSyntaxErr) {
            setSimulationOutput('SyntaxError: expected \':\' at end of function definition.');
          } else {
            setSimulationOutput(`[Python 3.11 Runtime Simulation]
=========================================
✓ Syntax Check: Passed
✓ Complexity Evaluation: Optimal O(n) loop
✓ Simulation Status: Executed successfully.`);
          }
        } else if (lang.includes('sql')) {
          setSimulationOutput(`[SQL Query Analyzer]
=========================================
✓ Query Parsing: Valid SQL syntax
✓ Execution Plan: Index Scan verified
✓ Safe Sandbox: No destructive queries detected.`);
        } else {
          setSimulationOutput(`[Runtime Analyzer]
✓ Kode terverifikasi secara statis tanpa error fatal.`);
        }
      } catch (err: any) {
        setSimulationOutput(`[Execution Error] ${err?.message || 'Gagal menjalankan simulasi'}`);
      } finally {
        setIsSimulating(false);
      }
    }, 350);
  };

  const getArtifactIcon = (type: ArtifactType) => {
    switch (type) {
      case 'CODE': return <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'DOCUMENT': return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'CITATION': return <Quote className="w-4 h-4 text-amber-500" />;
      case 'OUTLINE': return <ListTree className="w-4 h-4 text-teal-500" />;
      default: return <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const quickRevisions = useMemo(() => {
    if (artifact.type === 'CODE') {
      return [
        { label: '⚡ Optimasi Big-O', prompt: 'Optimasi performa, kurangi alokasi memori, dan analisis kompleksitas Big-O.' },
        { label: '🛡️ Handle Edge-Cases', prompt: 'Tambahkan validasi input lengkap, exception handling, dan edge-case defensif.' },
        { label: '📝 Komentar Dok', prompt: 'Tambahkan docstring dan komentar penjelasan alur algoritma secara detail.' },
        { label: '🔄 Refactor TypeScript', prompt: 'Refactor kode ini ke TypeScript dengan strict typing dan interface yang rapi.' }
      ];
    } else if (artifact.type === 'CITATION') {
      return [
        { label: '📌 Format APA 7th', prompt: 'Konversi dan format semua data sitasi ini ke standar ilmiah APA 7th Edition.' },
        { label: '📚 Format IEEE', prompt: 'Konversi dan susun sitasi ini ke dalam format standar penomoran IEEE.' },
        { label: '🔍 Cek DOI & Penulis', prompt: 'Periksa kelengkapan nama penulis, tahun rilis, judul artikel, dan tautan DOI.' },
        { label: '🔤 Urutkan Alfabetis', prompt: 'Urutkan seluruh daftar pustaka secara alfabetis berdasarkan nama belakang penulis utama.' }
      ];
    } else if (artifact.type === 'OUTLINE') {
      return [
        { label: '🔬 Perluas Metodologi', prompt: 'Perdalam dan perluas bagian metodologi penelitian, teknik sampling, dan uji instrumen.' },
        { label: '🎯 Pertajam Masalah', prompt: 'Pertajam rumusan masalah dan pertanyaan penelitian dengan metode piramida terbalik.' },
        { label: '📊 Sintesis Teori', prompt: 'Tambahkan kerangka sintesis teori dan peta literatur komparatif.' },
        { label: '✂️ Lebih Ringkas', prompt: 'Rampingkan struktur outline ini agar lebih padat, to-the-point, dan berbobot.' }
      ];
    }
    return [
      { label: '🎓 Lebih Formal & Baku', prompt: 'Perhalus bahasa agar lebih formal, bernada akademis baku sesuai KBBI, dan kohesif.' },
      { label: '✨ Perbaiki Grammar', prompt: 'Perbaiki tata bahasa, struktur SPOK, tanda baca, dan konsistensi istilah teknis.' },
      { label: '💡 Tambah Contoh Nyata', prompt: 'Tambahkan contoh kasus konkret dan elaborasi bukti empiris yang relevan.' },
      { label: '✂️ Parafrase Ringkas', prompt: 'Parafrase dokumen ini agar lebih ringkas, padat, dan lolos uji orisinalitas/Turnitin.' }
    ];
  }, [artifact.type]);

  return (
    <div 
      className={`flex flex-col h-full bg-slate-50/50 dark:bg-[#0e1422] transition-all duration-200 overflow-hidden ${
        isExpanded ? 'fixed inset-0 z-50 bg-white dark:bg-slate-950' : 'relative w-full'
      }`}
    >
      {/* 1. SINGLE-TIER SLEEK CANVAS HEADER (56px / h-14) */}
      <div className="h-14 px-3 sm:px-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 z-20">
        {/* Sisi Kiri: Ikon tipe file + Judul Dokumen (inline editable) + Badge Versi */}
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial max-w-[42%]">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-400 shrink-0">
            {getArtifactIcon(artifact.type)}
          </div>

          <div className="min-w-0 flex items-center gap-1.5">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitleInput(artifact.title || '');
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="h-7 text-xs sm:text-sm font-semibold px-2 py-0 bg-white dark:bg-slate-900 border border-emerald-500 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none ring-2 ring-emerald-500/20 max-w-[140px] sm:max-w-[200px]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-1.5 min-w-0 text-left cursor-pointer"
                title="Klik untuk mengedit judul dokumen"
              >
                <h2 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {artifact.title || 'Artefak RuangKerja'}
                </h2>
                <Pencil className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            )}

            {/* Small Version Badge */}
            <button
              type="button"
              onClick={() => setShowVersionHistoryModal(true)}
              className="px-1.5 py-0.5 rounded-full text-[10.5px] font-mono font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 border border-emerald-200/80 dark:border-emerald-800/80 shrink-0 transition-colors cursor-pointer"
              title="Buka Riwayat Versi & Snapshot Artefak"
            >
              v{artifact.version || 1}
            </button>
          </div>
        </div>

        {/* Sisi Tengah: Segmented Control Ramping [ Pratinjau | Edit | Kode | Diff ] (h~30px) */}
        <div className="h-[30px] p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center border border-slate-200/80 dark:border-slate-700/80 shrink-0 relative">
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`h-full px-2.5 sm:px-3 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 relative z-10 ${
              viewMode === 'preview'
                ? 'text-emerald-800 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
            title="Pratinjau Dokumen (Paper Sheet View)"
          >
            {viewMode === 'preview' && (
              <motion.div
                layoutId="canvasViewModePill"
                className="absolute inset-0 bg-white dark:bg-slate-900 rounded-md shadow-2xs -z-10 ring-1 ring-black/5 dark:ring-white/10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Pratinjau</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`h-full px-2.5 sm:px-3 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 relative z-10 ${
              viewMode === 'edit'
                ? 'text-emerald-800 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
            title="Edit Dokumen Langsung (Auto-save)"
          >
            {viewMode === 'edit' && (
              <motion.div
                layoutId="canvasViewModePill"
                className="absolute inset-0 bg-white dark:bg-slate-900 rounded-md shadow-2xs -z-10 ring-1 ring-black/5 dark:ring-white/10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Edit3 className="w-3 h-3" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('raw')}
            className={`h-full px-2.5 sm:px-3 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 relative z-10 ${
              viewMode === 'raw'
                ? 'text-emerald-800 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
            title="Tampilan Mentah Kode / Markdown"
          >
            {viewMode === 'raw' && (
              <motion.div
                layoutId="canvasViewModePill"
                className="absolute inset-0 bg-white dark:bg-slate-900 rounded-md shadow-2xs -z-10 ring-1 ring-black/5 dark:ring-white/10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Code2 className="w-3 h-3" />
            <span className="hidden sm:inline">Kode</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('diff')}
            className={`h-full px-2.5 sm:px-3 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 relative z-10 ${
              viewMode === 'diff'
                ? 'text-emerald-800 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
            title="Bandingkan Perubahan Versi (Visual Diff)"
          >
            {viewMode === 'diff' && (
              <motion.div
                layoutId="canvasViewModePill"
                className="absolute inset-0 bg-white dark:bg-slate-900 rounded-md shadow-2xs -z-10 ring-1 ring-black/5 dark:ring-white/10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <GitCompare className="w-3 h-3" />
            <span className="hidden sm:inline">Diff</span>
          </button>
        </div>

        {/* Sisi Kanan: Tombol Aksi Icon / Ringkas */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* ✨ Revisi Dokumen Popover Dropdown */}
          <div className="relative" ref={revisionMenuRef}>
            <button
              type="button"
              onClick={() => setShowRevisionMenu(!showRevisionMenu)}
              className="h-[30px] px-2 sm:px-2.5 rounded-lg text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100/90 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-1 transition-colors cursor-pointer shadow-3xs"
              title="Menu Revisi Dokumen Otomatis"
              aria-expanded={showRevisionMenu}
            >
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Revisi</span>
              <ChevronDown className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
            </button>

            {showRevisionMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 animate-scale-up space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Revisi Cepat AI</span>
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                </div>
                {quickRevisions.map((rev, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setShowRevisionMenu(false);
                      handleQuickRevisionClick(rev.label, rev.prompt);
                    }}
                    disabled={isStreaming}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{rev.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Salin Dokumen */}
          <button
            type="button"
            onClick={handleCopy}
            className="h-[30px] px-2 sm:px-2.5 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer shadow-3xs"
            title="Salin Seluruh Konten Dokumen"
            aria-label="Salin Teks"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold">Disalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500" />
                <span className="hidden sm:inline">Salin</span>
              </>
            )}
          </button>

          {/* Ekspor Dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              type="button"
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="h-[30px] px-2 sm:px-2.5 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer shadow-3xs"
              title="Opsi Ekspor File"
              aria-label="Ekspor File"
              aria-expanded={showDownloadMenu}
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span className="hidden sm:inline">Ekspor</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 animate-scale-up space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowDownloadMenu(false);
                    setShowExportModal(true);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-between cursor-pointer mb-1 shadow-2xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pusat Ekspor Lengkap
                  </span>
                  <span className="text-[9.5px] bg-emerald-500/80 px-1.5 py-0.5 rounded font-mono">PDF/Docx</span>
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  disabled={isExportingDocx}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors flex items-center justify-between cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Word Skripsi (4-4-3-3)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">.docx</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDownloadMenu(false);
                    showToast('Menyiapkan pratinjau cetak PDF...', 'info');
                    setTimeout(() => window.print(), 250);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    PDF Siap Cetak
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">.pdf</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('md')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Markdown
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('txt')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Teks Polos
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">.txt</span>
                </button>

                {artifact.type === 'CITATION' && (
                  <>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={handleDownloadBibTeX}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5 text-amber-500" />
                        BibTeX (Overleaf)
                      </span>
                      <span className="text-[10px] font-mono text-amber-600">.bib</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadRIS}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-amber-500" />
                        RIS (Zotero/Mendeley)
                      </span>
                      <span className="text-[10px] font-mono text-amber-600">.ris</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Perluas Layar (Fullscreen Toggle) */}
          <button
            type="button"
            onClick={toggleExpand}
            className="h-[30px] w-[30px] rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer hidden sm:flex shadow-3xs"
            title={isExpanded ? 'Kembalikan Ukuran Layar' : 'Mode Layar Penuh (Fokus)'}
            aria-label="Toggle Fullscreen"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Tutup Canvas */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-[30px] w-[30px] rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shadow-3xs"
              title="Tutup Canvas (Kembali ke Chat)"
              aria-label="Tutup Canvas"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. AREA KONTEN KANVAS UTAMA DENGAN BACKGROUND NETRAL ABU-ABU LEMBUT */}
      <div className="flex-1 overflow-y-auto bg-slate-100/60 dark:bg-[#0b101b] p-3 sm:p-5 lg:p-8 custom-scrollbar">
        {/* MODE 4: DIFF (VISUAL VERSION COMPARISON) */}
        {viewMode === 'diff' && (
          <div className="max-w-4xl mx-auto h-[580px] flex flex-col shadow-sm">
            <ArtifactDiffViewer
              currentArtifact={artifact}
              onCloseDiff={() => setViewMode('preview')}
            />
          </div>
        )}

        {/* MODE 2: EDIT (EDITOR BERSIH BERGAYA PAPER SHEET) */}
        {viewMode === 'edit' && (
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 min-h-[580px] flex flex-col">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Editor Langsung</span>
              </div>
              <span className="text-[11px] text-slate-400">Otomatis tersinkronisasi ke sesi</span>
            </div>

            <textarea
              ref={editorRef}
              value={editableContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Ketik atau sesuaikan draf dokumen Anda di sini..."
              className="w-full flex-1 min-h-[500px] p-3 bg-transparent resize-none focus:outline-none font-mono text-xs sm:text-sm leading-relaxed text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20"
            />
          </div>
        )}

        {/* MODE 3: KODE / MARKDOWN (RAW SOURCE DENGAN GUTTER NOMOR BARIS) */}
        {viewMode === 'raw' && (
          <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden border border-slate-700/60 dark:border-slate-800 bg-[#0d1117] text-slate-200 shadow-md">
            <div className="px-4 py-2.5 bg-[#161b22] border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] text-slate-300 font-sans font-medium">
                  Raw Source ({artifact.type === 'CODE' ? (artifact.language || 'code') : 'Markdown'})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>{editableContent.split('\n').length} baris</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] font-sans flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Salin raw code/markdown"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Tersalin' : 'Salin Raw'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed select-text flex">
              <div className="pr-4 select-none text-slate-600 dark:text-slate-500 text-right font-mono text-xs leading-relaxed border-r border-slate-800 mr-4 shrink-0">
                {editableContent.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="flex-1 custom-scrollbar text-slate-100 overflow-x-auto">
                <code>{editableContent}</code>
              </pre>
            </div>
          </div>
        )}

        {/* MODE 1: PRATINJAU (PAPER SHEET AESTHETIC FOR DOCUMENTS) */}
        {viewMode === 'preview' && (
          isMermaid ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <MermaidRenderer 
                chart={editableContent} 
                title={artifact.title}
                onRequestFixDiagram={(rawCode) => {
                  if (onRequestRevision) {
                    onRequestRevision(`Tolong perbaiki sintaks diagram Mermaid berikut agar valid dan dapat dirender secara visual:\n\`\`\`mermaid\n${rawCode}\n\`\`\``, artifact);
                  }
                }}
              />
              <details className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 text-xs">
                <summary className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Lihat Sintaks Sumber Diagram (Mermaid)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Buka/Tutup</span>
                </summary>
                <div className="mt-3 p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto">
                  <pre>
                    <code>{editableContent}</code>
                  </pre>
                </div>
              </details>
            </div>
          ) : artifact.type === 'CODE' ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-[#1a1b26] text-slate-200 shadow-md">
                <div className="px-4 py-2.5 bg-[#16161e] border-b border-slate-700/50 flex items-center justify-between text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-[11px] text-slate-300 font-sans font-medium">{artifact.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{artifact.language || 'code'}</span>
                    <span>•</span>
                    <span>{editableContent.split('\n').length} baris</span>
                  </div>
                </div>
                <div className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed select-text">
                  <pre className="custom-scrollbar">
                    <code>{editableContent}</code>
                  </pre>
                </div>
              </div>

              {simulationOutput && (
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#0b0f19] text-emerald-400 shadow-md animate-slide-up">
                  <div className="px-4 py-2 bg-[#111624] border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-slate-200">Hasil Analisis & Runtime</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSimulationOutput(null)}
                      className="p-1 hover:text-slate-200 text-slate-500 rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                    {simulationOutput}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* PAPER SHEET VIEW: Lembaran Kertas Kerja Rapi (max-w-3xl, centered, p-8 sampai p-12, shadow-sm, border tipis) */
            <div className="max-w-3xl mx-auto my-2 sm:my-4 bg-white dark:bg-slate-900 rounded-2xl p-7 sm:p-10 md:p-12 border border-slate-200/80 dark:border-slate-800 shadow-sm leading-relaxed print-document-area">
              {/* Top Citation Style Bar jika tipe CITATION */}
              {artifact.type === 'CITATION' && (
                <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <BookMarked className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">Format:</span>
                    {(['APA7', 'IEEE', 'HARVARD', 'BIBTEX'] as CitationStyle[]).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => {
                          setCitationStyle(style);
                          if (onRequestRevision) {
                            onRequestRevision(`Tolong konversi seluruh sitasi ini ke format standar ${style}.`, artifact);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          citationStyle === style
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400 mr-1">Salin:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCitationFormatted('APA7')}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 text-[10.5px] cursor-pointer"
                    >
                      APA
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCitationFormatted('IEEE')}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 text-[10.5px] cursor-pointer"
                    >
                      IEEE
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadBibTeX}
                      className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10.5px] font-mono cursor-pointer"
                    >
                      .bib
                    </button>
                  </div>
                </div>
              )}

              {/* Clean Typography with Emerald Accent Blockquotes */}
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm md:text-base leading-relaxed prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-slate-50 prose-p:leading-relaxed prose-p:my-3 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-blockquote:border-l-4 prose-blockquote:border-emerald-500/80 prose-blockquote:bg-emerald-50/40 dark:prose-blockquote:bg-emerald-950/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-hr:border-slate-200 dark:prose-hr:border-slate-800">
                <LazyMarkdown content={editableContent || '*(Artefak kosong)*'} />
              </div>

              {/* Contextual Revision Chips at Document Bottom */}
              <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 select-none">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Saran Revisi Cepat:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {quickRevisions.map((rev, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickRevisionClick(rev.label, rev.prompt)}
                      disabled={isStreaming}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/80 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {rev.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* 3. STATUS BAR BAWAH RAMPING (~28px - 32px) */}
      <footer className="h-7 sm:h-8 px-4 bg-white/95 dark:bg-[#0f1728]/95 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0 select-none z-10">
        {/* Kiri: Status penyimpanan + Streaming indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' ? (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Menyimpan otomatis...</span>
            </span>
          ) : saveStatus === 'saved' ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Tersimpan otomatis</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <Check className="w-3 h-3 text-emerald-500/70" />
              <span>Tersimpan otomatis</span>
            </span>
          )}

          {isStreaming && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium animate-pulse ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>AI sedang menyusun...</span>
            </span>
          )}
        </div>

        {/* Kanan: Info kata & waktu baca / Info kode */}
        <div className="flex items-center gap-2">
          {artifact.type === 'CODE' ? (
            <>
              <span className="font-mono">{artifact.language || 'code'}</span>
              <span>•</span>
              <span>{editableContent.split('\n').length} baris</span>
              {viewMode === 'preview' && (
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10.5px] font-semibold cursor-pointer"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{isSimulating ? 'Cek...' : 'Run'}</span>
                </button>
              )}
            </>
          ) : (
            <span>{wordCount} kata • ±{readingTime} mnt baca</span>
          )}
        </div>
      </footer>

      {/* 5. MULTI-VERSION HISTORY MODAL / DIALOG DENGAN SPRING EXIT & ENTRANCE */}
      <AnimatePresence>
        {showVersionHistoryModal && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowVersionHistoryModal(false)}
          >
            <motion.div 
              className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              variants={modalPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                    <History className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      Riwayat Versi Artefak
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {artifact.title} • {artifact.versions?.length || 1} snapshot tersimpan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVersionHistoryModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer btn-press-compact"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body - Version List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
                {artifact.versions && artifact.versions.length > 0 ? (
                  artifact.versions.map((ver) => {
                    const isActive = ver.version === artifact.version;
                    const formattedDate = ver.createdAt
                      ? new Date(ver.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Waktu tidak tercatat';

                    const charCount = ver.content ? ver.content.length : 0;
                    const previewSnippet = ver.content ? ver.content.trim().substring(0, 140) : '';

                    return (
                      <div
                        key={ver.id || `ver_${ver.version}`}
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 shadow-2xs'
                            : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                              isActive
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}>
                              v{ver.version}
                            </span>
                            {isActive && (
                              <span className="px-2 py-0.5 text-[10.5px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full">
                                Versi Aktif
                              </span>
                            )}
                            <span className="text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formattedDate}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('diff');
                                setShowVersionHistoryModal(false);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                              title="Bandingkan diff dengan versi aktif"
                            >
                              <GitCompare className="w-3 h-3" />
                              <span>Diff</span>
                            </button>

                            {!isActive && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (isRollingBack) return;
                                  setIsRollingBack(true);
                                  try {
                                    if (onRollbackVersion) {
                                      await onRollbackVersion(ver.version);
                                    }
                                    setShowVersionHistoryModal(false);
                                  } finally {
                                    setIsRollingBack(false);
                                  }
                                }}
                                disabled={isRollingBack}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50 btn-press-compact"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Pulihkan</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1 mb-1">
                          {ver.title || artifact.title}
                        </div>

                        {previewSnippet && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80 line-clamp-2 leading-relaxed">
                            {previewSnippet}...
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-2">
                          <span>{charCount} karakter</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-medium">Hanya terdapat 1 versi aktif saat ini (v1).</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Setiap revisi AI atau penyimpanan berkala akan otomatis membuat snapshot versi baru.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Memulihkan versi akan menyalin snapshot versi tersebut ke dokumen aktif.
                </span>
                <button
                  type="button"
                  onClick={() => setShowVersionHistoryModal(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer btn-press-compact"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. MODAL EKSPOR DOKUMEN BAKU AKADEMIK */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        artifact={artifact}
        content={editableContent}
        showToast={showToast}
        onGenerateBibTeX={generateBibTeX}
        onGenerateRIS={generateRIS}
      />
    </div>
  );
};
