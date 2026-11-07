import React from 'react';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import { Code2 } from 'lucide-react';

const FILE_BY_LANGUAGE: Record<string, string> = {
  html: 'index.html',
  css: 'style.css',
  javascript: 'script.js',
  js: 'script.js',
  python: 'main.py',
  py: 'main.py',
  sql: 'query.sql',
  c: 'main.c'
};

export function getCoderFileName(language: string): string | null {
  return FILE_BY_LANGUAGE[language.toLowerCase()] ?? null;
}

/** Writes the snippet to the existing RuangKerja→RuangCoder bridge consumed by RuangCoderIDE. */
export function stageCodeForCoder(code: string, fileName: string): void {
  sessionStorage.setItem('ruangkerja_to_coder_bridge', JSON.stringify({
    presetFiles: { [fileName]: code },
    activeFile: fileName,
    sourceType: 'chat'
  }));
}

function OpenButton({ code, fileName }: { code: string; fileName: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        try {
          stageCodeForCoder(code, fileName);
          navigate('/coder');
        } catch {
          /* sessionStorage unavailable; nothing to hand off */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-sans font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
      title="Buka kode ini di RuangCoder"
      aria-label="Buka di RuangCoder"
    >
      <Code2 className="h-3 w-3" />
      <span>RuangCoder</span>
    </button>
  );
}

export function OpenInCoderButton({ code, language }: { code: string; language: string }) {
  const inRouter = useInRouterContext();
  const fileName = getCoderFileName(language);
  if (!inRouter || !fileName) return null;
  return <OpenButton code={code} fileName={fileName} />;
}
