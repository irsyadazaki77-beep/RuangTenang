import React, { Suspense, useMemo, useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, Terminal, Download, Maximize2, X } from 'lucide-react';
import { renderHighlightedCode } from '../../lib/codeHighlight';
import { OpenInCoderButton } from './OpenInCoderButton';

let katexCssLoaded = false;
export function ensureKatexStyles(): void {
  if (!katexCssLoaded && typeof document !== 'undefined') {
    katexCssLoaded = true;
    // @ts-expect-error - dynamic style import
    void import('katex/dist/katex.min.css');
  }
}

const MermaidRenderer = React.lazy(() =>
  import('../../features/workspace/components/MermaidRenderer').then(m => ({ default: m.MermaidRenderer }))
);

interface Props {
  content: string;
}

/** Converts \( ... \) and \[ ... \] LaTeX delimiters into the $ / $$ form remark-math understands. */
export function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `\n$$\n${expr.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$${expr.trim()}$`);
}

function extractTextFromNode(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join('');
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextFromNode(node.props.children);
  }
  return '';
}

function CodeBlockRenderer({
  inline,
  className,
  children,
  ...props
}: {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const rawCode = useMemo(() => extractTextFromNode(children).replace(/\n$/, ''), [children]);
  const match = /language-([\w-]+)/.exec(className || '');
  const language = match ? match[1] : '';
  const isBlock = !inline && (Boolean(match) || rawCode.includes('\n'));

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [rawCode]);

  if (!isBlock) {
    return (
      <code
        className="rounded-md bg-slate-100/90 dark:bg-slate-800/90 px-1.5 py-0.5 font-mono text-[0.86em] font-medium text-teal-800 dark:text-teal-300 border border-slate-200/60 dark:border-slate-700/60"
        {...props}
      >
        {children}
      </code>
    );
  }

  if (language.toLowerCase() === 'mermaid') {
    return (
      <div className="not-prose my-3">
        <Suspense fallback={<div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-500">Memuat diagram...</div>}>
          <MermaidRenderer chart={rawCode} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-[#0f141f] text-slate-100 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#161d2b] px-3.5 py-1.5 text-[11px] font-mono text-slate-400 select-none">
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-teal-400 shrink-0" />
          <span className="uppercase tracking-wider font-semibold text-slate-300">
            {language || 'code'}
          </span>
        </div>
        <div className="flex items-center gap-1">
        <OpenInCoderButton code={rawCode} language={language} />
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-sans font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          aria-label="Salin kode"
          title="Salin blok kode"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Salin</span>
            </>
          )}
        </button>
        </div>
      </div>
      <div className="overflow-x-auto p-3.5 text-xs sm:text-[13px] font-mono leading-relaxed custom-scrollbar">
        <pre className="m-0 bg-transparent p-0">
          <code className={className} {...props}>
            {renderHighlightedCode(rawCode, language)}
          </code>
        </pre>
      </div>
    </div>
  );
}

function MarkdownImageRenderer({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `${alt || 'gambar'}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <figure className="not-prose my-3.5 inline-block max-w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 shadow-xs">
        <div className="relative group flex items-center justify-center bg-slate-100 dark:bg-slate-950 overflow-hidden min-h-[160px]">
          <img
            src={src}
            alt={alt || 'Gambar'}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onClick={() => setIsFullscreen(true)}
            className={`max-h-[460px] w-auto max-w-full object-contain cursor-zoom-in transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            {...props}
          />
          {loaded && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleDownload}
                title="Unduh gambar"
                className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                title="Perbesar gambar"
                className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        {alt && (
          <figcaption className="px-3 py-1.5 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/60 truncate">
            {alt}
          </figcaption>
        )}
      </figure>

      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || 'Pratinjau gambar'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-w-5xl max-h-[92vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between mb-2 text-white/90">
              <span className="text-xs sm:text-sm font-medium truncate max-w-md">{alt || 'Gambar'}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Unduh gambar"
                >
                  <Download className="w-4 h-4" />
                </button>
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
              src={src}
              alt={alt || 'Gambar layar penuh'}
              className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </>
  );
}

function processChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, child => {
    if (typeof child === 'string') {
      if (!child.includes('[cite:')) return child;
      const parts = child.split(/(\[cite:[^\]]+\])/g);
      return parts.map((part, i) => {
        const match = part.match(/^\[cite:([^\]]+)\]$/);
        if (match) {
          const ids = match[1].split(',').map(s => s.trim()).filter(Boolean);
          return (
            <span key={i} className="inline-flex flex-wrap items-center gap-1 mx-1 align-baseline">
              {ids.map((id, j) => (
                <span
                  key={j}
                  className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 text-[10.5px] font-mono font-medium shadow-2xs"
                >
                  {id}
                </span>
              ))}
            </span>
          );
        }
        return part;
      });
    }
    return child;
  });
}

export default function MarkdownRenderer({ content }: Props) {
  const components = useMemo(() => ({
    p({ children, ...props }: any) {
      return <p {...props}>{processChildren(children)}</p>;
    },
    li({ children, ...props }: any) {
      return <li {...props}>{processChildren(children)}</li>;
    },
    pre({ children }: any) {
      return <>{children}</>;
    },
    code(codeProps: any) {
      return <CodeBlockRenderer {...codeProps} />;
    },
    img(imgProps: any) {
      return <MarkdownImageRenderer {...imgProps} />;
    },
    table({ children, ...props }: any) {
      return (
        <div className="not-prose my-3 w-full overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-[#12161f] shadow-3xs custom-scrollbar">
          <table className="w-full text-left text-xs sm:text-[13px] border-collapse" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children, ...props }: any) {
      return (
        <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-stone-700 dark:text-slate-200 font-semibold" {...props}>
          {children}
        </thead>
      );
    },
    th({ children, ...props }: any) {
      return (
        <th className="px-3.5 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200" {...props}>
          {children}
        </th>
      );
    },
    td({ children, ...props }: any) {
      return (
        <td className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/60 text-stone-700 dark:text-slate-300" {...props}>
          {children}
        </td>
      );
    },
    blockquote({ children, ...props }: any) {
      return (
        <blockquote className="my-2.5 border-l-2 border-teal-500/80 pl-3.5 italic text-stone-600 dark:text-stone-300 text-xs sm:text-[13.5px]" {...props}>
          {children}
        </blockquote>
      );
    }
  }), []);

  const normalized = useMemo(() => normalizeMathDelimiters(content), [content]);

  useEffect(() => {
    if (normalized.includes('$')) {
      ensureKatexStyles();
    }
  }, [normalized]);

  return (
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
      {normalized}
    </ReactMarkdown>
  );
}
