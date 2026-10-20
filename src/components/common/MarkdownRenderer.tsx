import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  content: string;
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
    }
  }), []);

  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}
