import React, { useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Terminal } from 'lucide-react';

interface Props {
  content: string;
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

  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-[#0f141f] text-slate-100 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#161d2b] px-3.5 py-1.5 text-[11px] font-mono text-slate-400 select-none">
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-teal-400 shrink-0" />
          <span className="uppercase tracking-wider font-semibold text-slate-300">
            {language || 'code'}
          </span>
        </div>
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
      <div className="overflow-x-auto p-3.5 text-xs sm:text-[13px] font-mono leading-relaxed custom-scrollbar">
        <pre className="m-0 bg-transparent p-0">
          <code className={className} {...props}>
            {rawCode}
          </code>
        </pre>
      </div>
    </div>
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

  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}
