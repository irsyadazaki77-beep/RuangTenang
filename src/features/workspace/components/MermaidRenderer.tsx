import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Download, Copy, Check, FileImage, AlertCircle, Wrench, Code2, Eye } from 'lucide-react';
import { useToast } from '../../../components/Toast';

interface MermaidRendererProps {
  chart: string;
  title?: string;
  className?: string;
  onRequestFixDiagram?: (rawCode: string) => void;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ 
  chart, 
  title, 
  className = '',
  onRequestFixDiagram 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showRawCodeOnError, setShowRawCodeOnError] = useState<boolean>(false);
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const renderMermaidChart = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        
        const isDarkMode = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'neutral',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          themeVariables: isDarkMode ? {
            primaryColor: '#059669',
            primaryTextColor: '#f8fafc',
            primaryBorderColor: '#34d399',
            lineColor: '#94a3b8',
            secondaryColor: '#064e3b',
            tertiaryColor: '#022c22'
          } : {
            primaryColor: '#ecfdf5',
            primaryTextColor: '#064e3b',
            primaryBorderColor: '#10b981',
            lineColor: '#64748b'
          }
        });

        const uniqueId = `mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const cleanChart = chart.trim();
        
        const { svg } = await mermaid.render(uniqueId, cleanChart);
        if (isMounted) {
          setSvgContent(svg);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('Mermaid render error caught gracefully:', err);
        if (isMounted) {
          setError(err?.message || 'Sintaks diagram Mermaid tidak valid atau memuat format yang belum didukung.');
          setLoading(false);
        }
      }
    };

    renderMermaidChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setIsCopied(true);
      showToast('Sintaks diagram Mermaid berhasil disalin!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showToast('Gagal menyalin sintaks diagram.', 'error');
    }
  };

  const handleDownloadSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(title || 'diagram_skripsi').toLowerCase().replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Diagram SVG berhasil diunduh.', 'success');
  };

  const handleDownloadPNG = () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const scale = 2;
      canvas.width = (img.width || 800) * scale;
      canvas.height = (img.height || 600) * scale;

      if (ctx) {
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `${(title || 'diagram_skripsi').toLowerCase().replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Diagram PNG resolusi tinggi berhasil diunduh.', 'success');
      }
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(2.5, Math.max(0.4, Number((prev + delta).toFixed(1)))));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleTriggerFix = () => {
    if (onRequestFixDiagram) {
      onRequestFixDiagram(chart);
    } else {
      handleCopyCode();
      showToast('Sintaks telah disalin. Anda dapat menempelkannya di obrolan dengan perintah perbaikan.', 'info');
    }
  };

  return (
    <div className={`my-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 overflow-hidden shadow-xs ${className}`}>
      {/* Diagram Header Toolbar */}
      <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{title || 'Diagram Alur / Kerangka Konseptual'}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          {!error && !loading && (
            <>
              <button
                type="button"
                onClick={() => handleZoom(-0.15)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Perkecil (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 rounded-lg text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Reset Ukuran (100%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={() => handleZoom(0.15)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Perbesar (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
            </>
          )}

          {/* Copy Syntax */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Salin Sintaks Mermaid"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {!error && !loading && (
            <>
              {/* Export PNG */}
              <button
                type="button"
                onClick={handleDownloadPNG}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Unduh PNG Resolusi Tinggi"
              >
                <FileImage className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline text-[11px] font-medium">PNG</span>
              </button>

              {/* Export SVG */}
              <button
                type="button"
                onClick={handleDownloadSVG}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Unduh Berkas Vektor SVG"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline text-[11px] font-medium">SVG</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Render Canvas Area */}
      <div 
        ref={containerRef}
        className="p-6 overflow-x-auto min-h-[160px] flex items-center justify-center bg-white/50 dark:bg-slate-950/40"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-400 text-xs animate-pulse">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Merender diagram interaktif...</span>
          </div>
        ) : error ? (
          <div className="w-full p-4 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 text-rose-800 dark:text-rose-200 text-xs animate-fade-in">
            <div className="flex items-center gap-2 font-bold mb-1.5 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Sintaks Diagram Memerlukan Penyesuaian</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] mb-3 leading-relaxed">
              Diagram belum dapat ditampilkan secara visual karena ada karakter atau struktur format yang tidak sesuai dengan parser Mermaid.
            </p>

            {/* Action buttons for graceful recovery */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setShowRawCodeOnError(prev => !prev)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
              >
                {showRawCodeOnError ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
                <span>{showRawCodeOnError ? 'Sembunyikan Kode Mentah' : 'Tampilkan Kode Mentah'}</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerFix}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Minta AI Perbaiki Sintaks Diagram</span>
              </button>
            </div>

            {showRawCodeOnError && (
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto border border-slate-800 mt-2">
                <code>{chart}</code>
              </pre>
            )}
          </div>
        ) : (
          <div 
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="mermaid-svg-container max-w-full"
          />
        )}
      </div>
    </div>
  );
};
