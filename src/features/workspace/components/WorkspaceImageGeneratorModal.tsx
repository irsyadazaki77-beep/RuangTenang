import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Download,
  Copy,
  Check,
  Send,
  FilePlus,
  RefreshCw,
  AlertCircle,
  Printer,
  Code2,
  Layers,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  generateAiImage,
  generateVisualCanvas,
  downloadHtmlAsPng,
  GenerateVisualCanvasPayload
} from '../../../services/imageService';

interface WorkspaceImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onInsertToChat?: (markdownImage: string) => void;
  onCreateArtifact?: (title: string, markdownContent: string) => void;
}

type GeneratorMode = 'visual_canvas' | 'traditional_image';

type VisualCanvasPreset = {
  id: 'handwritten_notes' | 'infographic' | 'cheatsheet' | 'poster' | 'flashcard';
  title: string;
  badge: string;
  desc: string;
  icon: string;
  samplePrompts: string[];
};

const VISUAL_PRESETS: VisualCanvasPreset[] = [
  {
    id: 'handwritten_notes',
    title: 'Catatan Tulis Tangan',
    badge: 'Paling Populer',
    desc: 'Buku bergaris, font tulisan tangan estetik, stabilo pastel, sticky notes & doodle.',
    icon: '📝',
    samplePrompts: [
      'Ringkasan Hukum Termodinamika 1 & 2 beserta rumus dan contoh aplikasi nyata',
      'Catatan biologi: Struktur Sel Hewan vs Sel Tumbuhan dengan stabilo warna-warni',
      'Catatan rumus Kalkulus Dasar: Aturan Turunan, Integral Tak Tentu & Trik Cepat',
      'Ringkasan konsep Ekonomi Makro: Inflasi, GDP, Kebijakan Moneter & Fiskal'
    ]
  },
  {
    id: 'infographic',
    title: 'Infografis & Peta Konsep',
    badge: 'Struktur Rapi',
    desc: 'Bagan tahapan alur proses, kartu visual terstruktur, badge statistik, dan panah alur.',
    icon: '📊',
    samplePrompts: [
      'Alur kerja Machine Learning dari Data Preprocessing, Training, hingga Deployment',
      'Tahapan Metodologi Penelitian Ilmiah dari Perumusan Masalah sampai Publikasi',
      'Infografis Siklus Krebs dan Respirasi Seluler dalam 4 fase utama',
      'Arsitektur Microservices vs Monolith: Kelebihan, Kekurangan & Kapan Digunakan'
    ]
  },
  {
    id: 'cheatsheet',
    title: 'Cheatsheet & Formula',
    badge: 'Ringkas Ujian',
    desc: 'Tata letak kolom padat berisi rumus kunci, kotak formula matematika, dan sintaks penting.',
    icon: '📑',
    samplePrompts: [
      'Cheatsheet Rumus Fisika Dasar: Kinematika Gerak Lurus & Gerak Parabola',
      'Cheatsheet Query Penting SQL: SELECT, JOIN, GROUP BY, Window Functions',
      'Rumus Matematika Diskrit: Kombinatorika, Logika Proposisi & Himpunan',
      'Cheatsheet 12 Tenses Bahasa Inggris: Rumus Struktur, Signal Words & Contoh'
    ]
  },
  {
    id: 'poster',
    title: 'Poster & Sampul Edukasi',
    badge: 'Visual Banner',
    desc: 'Desain satu halaman dengan tipografi tebal, hero header mencolok, dan latar estetik.',
    icon: '🖼️',
    samplePrompts: [
      'Poster edukasi pentingnya menjaga kesehatan mental di lingkungan perkuliahan',
      'Poster pengenalan teknologi AI Generatif dan etika penggunaannya',
      'Sampul proposal riset: Analisis Sentimen Media Sosial dengan NLP'
    ]
  },
  {
    id: 'flashcard',
    title: 'Flashcard Rangkuman',
    badge: 'Studi Cepat',
    desc: 'Kartu hafalan visual berisi pertanyaan esensial, definisi inti, dan poin kunci.',
    icon: '🗂️',
    samplePrompts: [
      'Kartu hafalan 5 istilah kunci Jaringan Komputer: TCP/IP, DNS, Subnet, DHCP, NAT',
      'Flashcard konsep Anatomi Otak Manusia: Cerebrum, Cerebellum, Brainstem',
      'Definisi esensial dalam Hukum Tata Negara: Trias Politica & Check and Balances'
    ]
  }
];

type AspectRatioOption = {
  id: string;
  label: string;
  desc: string;
  width: number;
  height: number;
};

type StylePresetOption = {
  id: 'academic_illustration' | 'vector_infographic' | 'photorealistic' | 'minimalist_diagram';
  label: string;
  desc: string;
};

const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: 'square', label: '1:1', desc: 'Persegi (1024×1024)', width: 1024, height: 1024 },
  { id: 'landscape', label: '16:9', desc: 'Lanskap (1024×576)', width: 1024, height: 576 },
  { id: 'portrait', label: '9:16', desc: 'Portret (576×1024)', width: 576, height: 1024 },
];

const STYLE_PRESETS: StylePresetOption[] = [
  { id: 'academic_illustration', label: 'Ilustrasi Akademik', desc: 'Visual edukatif, estetika ilmiah & modern' },
  { id: 'vector_infographic', label: 'Infografis Vektor', desc: 'Ikon flat, palet modern & latar bersih' },
  { id: 'photorealistic', label: 'Fotorealistik', desc: 'Detail tinggi, pencahayaan alami 8k' },
  { id: 'minimalist_diagram', label: 'Diagram Skematis', desc: 'Garis presisi, minimalis & kontras tinggi' },
];

export function WorkspaceImageGeneratorModal({
  isOpen,
  onClose,
  initialPrompt = '',
  onInsertToChat,
  onCreateArtifact
}: WorkspaceImageGeneratorModalProps) {
  const [activeMode, setActiveMode] = useState<GeneratorMode>('visual_canvas');
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedPreset, setSelectedPreset] = useState<VisualCanvasPreset>(VISUAL_PRESETS[0]);

  // Traditional image state
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioOption>(ASPECT_RATIOS[0]);
  const [selectedStyle, setSelectedStyle] = useState<StylePresetOption>(STYLE_PRESETS[0]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Visual canvas state
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [showHtmlCode, setShowHtmlCode] = useState(false);
  const [previewScale, setPreviewScale] = useState<number>(0.85);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prompt, isGenerating, activeMode, selectedPreset, selectedRatio]);

  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || prompt).trim();
    if (!promptToUse || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    if (activeMode === 'visual_canvas') {
      try {
        const payload: GenerateVisualCanvasPayload = {
          prompt: promptToUse,
          style: selectedPreset.id
        };
        const result = await generateVisualCanvas(payload);
        if (result.htmlContent) {
          setGeneratedHtml(result.htmlContent);
          setGeneratedTitle(result.title || selectedPreset.title);
          setGeneratedPrompt(promptToUse);
        } else {
          throw new Error('Gagal memproses visual HTML canvas dari AI');
        }
      } catch (err: any) {
        setError(err?.message || 'Gagal menghasilkan catatan visual. Silakan coba kembali.');
      } finally {
        setIsGenerating(false);
      }
    } else {
      setImageLoaded(false);
      try {
        const result = await generateAiImage({
          prompt: promptToUse,
          width: selectedRatio.width,
          height: selectedRatio.height,
          style: selectedStyle.id
        });

        if (result.imageUrl) {
          setGeneratedImageUrl(result.imageUrl);
          setGeneratedPrompt(promptToUse);
          setProvider(result.provider || null);
        } else {
          throw new Error('URL gambar tidak diterima dari server.');
        }
      } catch (err: any) {
        setError(err?.message || 'Gagal menghasilkan gambar. Periksa koneksi atau coba lagi.');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleDownloadVisualPng = async () => {
    if (!generatedHtml) return;
    setIsExportingPng(true);
    try {
      const filename = `${(generatedTitle || 'catatan-visual').toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      await downloadHtmlAsPng(generatedHtml, filename);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handlePrintVisual = () => {
    if (!iframeRef.current) return;
    try {
      iframeRef.current.contentWindow?.focus();
      iframeRef.current.contentWindow?.print();
    } catch {
      // Fallback: buka jendela cetak baru
      if (generatedHtml) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(generatedHtml);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      }
    }
  };

  const handleCreateVisualArtifact = () => {
    if (!generatedHtml || !onCreateArtifact) return;
    const title = generatedTitle || 'Catatan Visual Grafis';
    const artifactMarkdown = `:::artifact{type="code" language="html" title="${title}"}\n${generatedHtml}\n:::`;
    onCreateArtifact(title, artifactMarkdown);
    onClose();
  };

  const handleInsertVisualToChat = () => {
    if (!generatedHtml || !onInsertToChat) return;
    const title = generatedTitle || 'Catatan Visual';
    const message = `Saya telah membuat visual **${title}** bergaya ${selectedPreset.title}:\n\n:::artifact{type="code" language="html" title="${title}"}\n${generatedHtml}\n:::`;
    onInsertToChat(message);
    onClose();
  };

  const handleCopyHtml = async () => {
    if (!generatedHtml) return;
    try {
      await navigator.clipboard.writeText(generatedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // Traditional raster actions
  const handleCopyLink = async () => {
    if (!generatedImageUrl) return;
    const fullUrl = generatedImageUrl.startsWith('http')
      ? generatedImageUrl
      : `${window.location.origin}${generatedImageUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadRaster = () => {
    if (!generatedImageUrl) return;
    const a = document.createElement('a');
    a.href = generatedImageUrl;
    a.download = `ruangkerja-ai-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleInsertRasterToChat = () => {
    if (!generatedImageUrl || !onInsertToChat) return;
    const title = generatedPrompt || 'Gambar AI';
    const markdown = `![${title}](${generatedImageUrl})\n\n*Gambar di-generate dengan prompt: "${title}"*`;
    onInsertToChat(markdown);
    onClose();
  };

  const handleCreateRasterArtifact = () => {
    if (!generatedImageUrl || !onCreateArtifact) return;
    const title = (generatedPrompt || 'Visualisasi Dokumen').slice(0, 45);
    const markdown = `# ${title}\n\n![${generatedPrompt || 'Gambar'}](${generatedImageUrl})\n\n### Deskripsi Prompt\n> "${generatedPrompt}"\n\n### Catatan Tambahan\nAnda dapat menambahkan analisis, catatan penjelasan konsep, atau referensi pendukung di bawah ini.\n`;
    onCreateArtifact(title, markdown);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-generator-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[94vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-4 sm:px-6 py-3.5 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="image-generator-title" className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                  Studio Catatan & Gambar Visual
                </h2>
                <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300/40">
                  100% Bebas Biaya
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Buat catatan tulis tangan estetik, infografis konsep, cheatsheet rumus, atau gambar edukasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 bg-slate-100/60 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={() => setActiveMode('visual_canvas')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeMode === 'visual_canvas'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400 bg-white/70 dark:bg-slate-900/70 rounded-t-lg'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🎨 Catatan Visual & Infografis (Gemini Canvas)</span>
            <span className="text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 rounded">
              Rekomendasi
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('traditional_image')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeMode === 'traditional_image'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400 bg-white/70 dark:bg-slate-900/70 rounded-t-lg'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>🖼️ Generator Raster Tradisional (SD / Ilustrasi)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {activeMode === 'visual_canvas' ? (
            /* VISUAL CANVAS MODE */
            <div className="space-y-4">
              {/* Preset Selector Cards */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Format Catatan Visual:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {VISUAL_PRESETS.map(preset => {
                    const isSelected = selectedPreset.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100 ring-1 ring-teal-500/50 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{preset.icon}</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-teal-200/80 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-xs font-bold mt-1.5">{preset.title}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {preset.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="visual-prompt" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Materi atau Konsep yang Ingin Dibuatkan Visual:
                  </label>
                  <span className="text-[10.5px] text-slate-400">
                    <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Ctrl+Enter</kbd> untuk buat
                  </span>
                </div>
                <textarea
                  id="visual-prompt"
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={`Contoh: ${selectedPreset.samplePrompts[0]}...`}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-950/50 p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500 transition-all resize-none"
                />
              </div>

              {/* Quick Sample Prompts */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Ide Cepat ({selectedPreset.title}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPreset.samplePrompts.map((sample, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setPrompt(sample);
                        handleGenerate(sample);
                      }}
                      disabled={isGenerating}
                      className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all text-left line-clamp-1"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Generated Result Preview (Visual Canvas) */}
              {generatedHtml && (
                <div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {generatedTitle || 'Hasil Catatan Visual'}
                      </span>
                      <span className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800/60">
                        {selectedPreset.title}
                      </span>
                    </div>

                    {/* Scale and Code Toggles */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewScale(s => Math.max(0.5, +(s - 0.15).toFixed(2)))}
                        title="Perkecil Pratinjau"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono text-slate-500 px-1">
                        {Math.round(previewScale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewScale(s => Math.min(1.2, +(s + 0.15).toFixed(2)))}
                        title="Perbesar Pratinjau"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowHtmlCode(!showHtmlCode)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] transition-colors ${
                          showHtmlCode
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>{showHtmlCode ? 'Lihat Visual' : 'Lihat Kode'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Canvas Preview Area */}
                  {showHtmlCode ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-200 p-4 font-mono text-xs max-h-[380px] overflow-auto custom-scrollbar">
                      <pre>
                        <code>{generatedHtml}</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-inner flex justify-center p-2 sm:p-4 max-h-[460px] overflow-y-auto custom-scrollbar">
                      <div
                        style={{
                          transform: `scale(${previewScale})`,
                          transformOrigin: 'top center',
                          width: '100%',
                          minHeight: '600px',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <iframe
                          ref={iframeRef}
                          title={generatedTitle || 'Catatan Visual'}
                          srcDoc={generatedHtml}
                          sandbox="allow-scripts allow-modals allow-same-origin"
                          className="w-full min-h-[700px] border-0 rounded-lg shadow-md bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Visual Canvas Action Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadVisualPng}
                      disabled={isExportingPng}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {isExportingPng ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Merender PNG...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Gambar PNG HD</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintVisual}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak / PDF</span>
                    </button>

                    {onCreateArtifact && (
                      <button
                        type="button"
                        onClick={handleCreateVisualArtifact}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors"
                      >
                        <FilePlus className="w-3.5 h-3.5" />
                        <span>Buka di Canvas RuangKerja</span>
                      </button>
                    )}

                    {onInsertToChat && (
                      <button
                        type="button"
                        onClick={handleInsertVisualToChat}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim ke Obrolan</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCopyHtml}
                      title="Salin Kode HTML Visual"
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors ml-auto"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TRADITIONAL RASTER IMAGE MODE */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="raster-prompt" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Deskripsi Gambar (Prompt)
                </label>
                <textarea
                  id="raster-prompt"
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Contoh: Ilustrasi mahasiswa berdiskusi di perpustakaan digital dengan visualisasi hologram..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-950/50 p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500 transition-all resize-none"
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rasio Aspek & Dimensi
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ASPECT_RATIOS.map(ratio => {
                    const isSelected = selectedRatio.id === ratio.id;
                    return (
                      <button
                        key={ratio.id}
                        type="button"
                        onClick={() => setSelectedRatio(ratio)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <p className="text-xs font-bold">{ratio.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{ratio.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style Preset Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Gaya Visual & Estetika
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STYLE_PRESETS.map(style => {
                    const isSelected = selectedStyle.id === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyle(style)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{style.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{style.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {generatedImageUrl && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Hasil Gambar:</span>
                    {provider && (
                      <span className="text-[10.5px] font-normal text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800/60">
                        Model: {provider === 'local-sd' ? 'Local AI' : provider}
                      </span>
                    )}
                  </div>

                  <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center max-h-[340px]">
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-xs text-slate-400 animate-pulse">
                        Memuat tampilan gambar...
                      </div>
                    )}
                    <img
                      src={generatedImageUrl}
                      alt={generatedPrompt || 'Hasil gambar'}
                      onLoad={() => setImageLoaded(true)}
                      className={`max-h-[340px] w-auto max-w-full object-contain transition-opacity duration-300 ${
                        imageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {onInsertToChat && (
                      <button
                        type="button"
                        onClick={handleInsertRasterToChat}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium shadow-xs transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Masukkan ke Obrolan</span>
                      </button>
                    )}
                    {onCreateArtifact && (
                      <button
                        type="button"
                        onClick={handleCreateRasterArtifact}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors"
                      >
                        <FilePlus className="w-3.5 h-3.5" />
                        <span>Buka di Dokumen Canvas</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDownloadRaster}
                      title="Unduh gambar"
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      title="Salin tautan gambar"
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 px-4 sm:px-6 py-3.5 bg-slate-50/70 dark:bg-slate-950/40">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isGenerating
              ? (activeMode === 'visual_canvas' ? 'AI sedang merancang catatan visual...' : 'AI sedang menggambar visual...')
              : (activeMode === 'visual_canvas' ? '100% Menggunakan Gemini LLM tanpa API key gambar tambahan' : 'Model raster lokal / cloud')}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Merancang...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {activeMode === 'visual_canvas'
                      ? (generatedHtml ? 'Buat Ulang Visual' : 'Buat Catatan Visual')
                      : (generatedImageUrl ? 'Generate Ulang' : 'Generate Gambar')}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}