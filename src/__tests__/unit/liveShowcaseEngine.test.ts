import { describe, expect, it } from 'vitest';

export interface ShowcaseTemplateOptions {
  title: string;
  codeOrData: string;
  theme?: 'light' | 'dark';
}

export function generateStandaloneShowcaseHtml(options: ShowcaseTemplateOptions): string {
  const { title, codeOrData, theme = 'light' } = options;
  return `<!DOCTYPE html>
<html lang="id" class="${theme}">
<head>
  <meta charset="UTF-8">
  <title>${title} - RuangCoder Interactive Showcase</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 p-6">
  <header class="mb-6 border-b pb-4">
    <h1 class="text-xl font-bold text-indigo-700">${title}</h1>
    <p class="text-xs text-slate-500">Simulasi Interaktif Dihasilkan oleh RuangCoder AI</p>
  </header>
  <main id="app-root">
    <pre class="p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-xs"><code>${codeOrData}</code></pre>
  </main>
</body>
</html>`;
}

describe('Live Showcase Engine', () => {
  it('generates valid standalone HTML page containing the code or data', () => {
    const html = generateStandaloneShowcaseHtml({
      title: 'Simulasi Algoritma K-Means',
      codeOrData: 'console.log("K-Means clustering initialized");'
    });

    expect(html).toContain('Simulasi Algoritma K-Means');
    expect(html).toContain('RuangCoder Interactive Showcase');
    expect(html).toContain('console.log("K-Means clustering initialized");');
    expect(html).toContain('tailwindcss.com');
  });
});
