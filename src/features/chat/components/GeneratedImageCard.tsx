import React, { useState } from 'react';
import { Download, ExternalLink, Copy, Check, Sparkles, AlertCircle, Maximize2, X } from 'lucide-react';

interface GeneratedImageCardProps {
  prompt?: string;
  imageUrl?: string;
  provider?: string;
  error?: string;
}

export function GeneratedImageCard({
  prompt,
  imageUrl,
  provider,
  error
}: GeneratedImageCardProps) {
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopyLink = async () => {
    if (!imageUrl) return;
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `ruangtenang-ai-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (error) {
    return (
      <div className="mt-3 p-3.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl text-xs sm:text-[13px] text-rose-800 dark:text-rose-200 flex items-start gap-2.5 shadow-2xs">
        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold">Gagal Menghasilkan Gambar</p>
          <p className="mt-0.5 text-xs text-rose-700/90 dark:text-rose-300/90 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400 animate-spin" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm transition-all hover:shadow-md">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-3.5 py-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
              {provider ? `AI Generated (${provider})` : 'Gambar AI'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Salin tautan gambar"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              title="Unduh gambar JPG"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
            >
              <Download className="h-3 w-3" />
              <span>Unduh</span>
            </button>
          </div>
        </div>

        {/* Image Preview with Skeleton Loader */}
        <div className="relative group bg-slate-100 dark:bg-slate-950 overflow-hidden min-h-[220px] max-h-[460px] flex items-center justify-center">
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 animate-pulse bg-slate-100 dark:bg-slate-950">
              <Sparkles className="w-6 h-6 text-teal-500 animate-bounce" />
              <span className="text-xs">Memuat gambar...</span>
            </div>
          )}
          <img
            src={imageUrl}
            alt={prompt || 'AI generated image'}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`w-full h-auto object-contain cursor-zoom-in transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setIsFullscreen(true)}
          />

          {/* Quick hover overlay for fullscreen preview */}
          {loaded && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity"
              title="Perbesar gambar"
              aria-label="Perbesar gambar"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Prompt Caption */}
        {prompt && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60">
            <p className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
              Prompt
            </p>
            <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed italic line-clamp-3">
              "{prompt}"
            </p>
          </div>
        )}
      </div>

      {/* Lightbox / Fullscreen Modal */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Gambar Layar Penuh"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-w-5xl max-h-[92vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between mb-2 text-white/90">
              <span className="text-xs sm:text-sm font-medium truncate max-w-md">{prompt || 'Pratinjau Gambar'}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Unduh gambar"
                >
                  <Download className="w-4 h-4" />
                </button>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={imageUrl}
              alt={prompt || 'AI generated image full preview'}
              className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </>
  );
}
