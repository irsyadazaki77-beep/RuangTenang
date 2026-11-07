import React from 'react';
import { Layers, Check, Plus, Trash2, X } from 'lucide-react';

export interface CdnLibrary {
  id: string;
  name: string;
  description: string;
  category: 'CSS & Styling' | 'Icons' | 'Data & Visual' | 'Animation & 3D';
  snippet: string;
  identifier: string; // substring to detect presence in index.html
}

export const POPULAR_CDN_LIBRARIES: CdnLibrary[] = [
  {
    id: 'tailwind',
    name: 'Tailwind CSS (CDN)',
    description: 'Utility-first CSS framework untuk styling cepat tanpa menulis CSS manual.',
    category: 'CSS & Styling',
    snippet: '<script src="https://cdn.tailwindcss.com"></script>',
    identifier: 'cdn.tailwindcss.com'
  },
  {
    id: 'lucide',
    name: 'Lucide Icons Web',
    description: 'Koleksi ribuan ikon modern minimalis dan tajam (lucide.createIcons()).',
    category: 'Icons',
    snippet: '<script src="https://unpkg.com/lucide@latest"></script>',
    identifier: 'unpkg.com/lucide'
  },
  {
    id: 'fontawesome',
    name: 'FontAwesome 6 Icons',
    description: 'Pustaka ikon terlengkap untuk ikon sosial media dan antarmuka web.',
    category: 'Icons',
    snippet: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">',
    identifier: 'font-awesome/6.'
  },
  {
    id: 'bootstrap',
    name: 'Bootstrap 5 CSS',
    description: 'Komponen UI responsif siap pakai (grid, navbar, button, cards, modal).',
    category: 'CSS & Styling',
    snippet: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">',
    identifier: 'bootstrap@5'
  },
  {
    id: 'chartjs',
    name: 'Chart.js',
    description: 'Grafik dan chart interaktif (bar, line, pie, radar) untuk visualisasi data.',
    category: 'Data & Visual',
    snippet: '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
    identifier: 'chart.js'
  },
  {
    id: 'confetti',
    name: 'Canvas Confetti',
    description: 'Efek letupan konfeti perayaan interaktif untuk gamifikasi dan tombol aksi.',
    category: 'Animation & 3D',
    snippet: '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>',
    identifier: 'canvas-confetti'
  },
  {
    id: 'threejs',
    name: 'Three.js 3D Engine',
    description: 'WebGL 3D engine untuk membuat animasi 3D, partikel, dan objek 3D di browser.',
    category: 'Animation & 3D',
    snippet: '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
    identifier: 'three.js'
  },
  {
    id: 'animatecss',
    name: 'Animate.css',
    description: 'Pustaka animasi CSS instan (bounce, fadeIn, pulse, shake, flip).',
    category: 'Animation & 3D',
    snippet: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">',
    identifier: 'animate.css'
  }
];

interface CdnLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  indexHtmlContent: string;
  onUpdateIndexHtml: (newHtml: string) => void;
  isDark?: boolean;
}

export const CdnLibraryModal: React.FC<CdnLibraryModalProps> = ({
  isOpen,
  onClose,
  indexHtmlContent,
  onUpdateIndexHtml,
  isDark = true
}) => {
  const isInstalled = (lib: CdnLibrary) => {
    return indexHtmlContent.includes(lib.identifier);
  };

  const handleToggleLibrary = (lib: CdnLibrary) => {
    const installed = isInstalled(lib);
    let updatedHtml = indexHtmlContent;

    if (installed) {
      // Remove snippet or lines containing identifier
      const lines = updatedHtml.split('\n');
      const filtered = lines.filter(l => !l.includes(lib.identifier));
      updatedHtml = filtered.join('\n');
    } else {
      // Inject snippet inside <head>
      if (updatedHtml.includes('</head>')) {
        updatedHtml = updatedHtml.replace('</head>', `  ${lib.snippet}\n</head>`);
      } else if (updatedHtml.includes('<head>')) {
        updatedHtml = updatedHtml.replace('<head>', `<head>\n  ${lib.snippet}`);
      } else {
        updatedHtml = `${lib.snippet}\n${updatedHtml}`;
      }
    }

    onUpdateIndexHtml(updatedHtml);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
          isDark ? 'bg-[#0f172a] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Sisipkan Pustaka CDN (Quick Packages)</h3>
              <p className="text-[11px] text-slate-400">
                Pasang library CSS/JS populer langsung ke dalam <span className="font-mono text-sky-400">index.html</span> dengan 1 klik.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Library Cards Grid */}
        <div className="p-4 overflow-y-auto space-y-2.5 max-h-[60vh]">
          {POPULAR_CDN_LIBRARIES.map(lib => {
            const installed = isInstalled(lib);
            return (
              <div
                key={lib.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                  installed
                    ? isDark
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-emerald-50 border-emerald-300'
                    : isDark
                    ? 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs truncate">{lib.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {lib.category}
                    </span>
                    {installed && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Terpasang
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {lib.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleLibrary(lib)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition shrink-0 flex items-center gap-1.5 ${
                    installed
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      : 'bg-sky-500 hover:bg-sky-400 text-white shadow-xs'
                  }`}
                >
                  {installed ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Pasang</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t text-xs flex items-center justify-between ${
            isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <span>Pustaka yang dipasang otomatis tersinkronisasi ke Live Preview.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
