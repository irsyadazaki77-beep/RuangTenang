/**
 * Smart Copilot-style Ghost Text & Inline Completion Provider for RuangMonacoEditor.
 * Zero-cost, high-performance in-browser heuristic engine with contextual code synthesis.
 */

export interface InlineCompletionResult {
  text: string;
  range?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

/**
 * Generates contextual ghost text based on current line, previous lines, and file extension.
 */
export function generateGhostCompletion(
  filePath: string,
  lineContent: string,
  cursorColumn: number,
  _precedingText?: string
): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const rawPrefix = lineContent.substring(0, Math.max(0, cursorColumn - 1));
  const prefix = rawPrefix.trim();

  if (!prefix || prefix.length < 2) return null;

  // TypeScript / JavaScript Heuristics
  if (['js', 'ts', 'jsx', 'tsx', 'mjs'].includes(ext)) {
    if (prefix.endsWith('console.log(') || rawPrefix.endsWith('console.log(')) {
      return `'[DEBUG]', { timestamp: new Date().toISOString() });`;
    }
    if (prefix.endsWith('console.error(') || rawPrefix.endsWith('console.error(')) {
      return `'[ERROR]', error);`;
    }
    if (prefix.endsWith('const [') || rawPrefix.endsWith('const [')) {
      return `state, setState] = useState(null);`;
    }
    if (prefix.endsWith('useEffect(() => {') || rawPrefix.endsWith('useEffect(() => {')) {
      return `\n    // Side effect logic\n    return () => {};\n  }, []);`;
    }
    if (rawPrefix.endsWith('async function ') || rawPrefix.endsWith('async (')) {
      return `) => {\n    try {\n      // async implementation\n    } catch (err) {\n      console.error(err);\n    }\n  }`;
    }
    if (prefix.endsWith('fetch(') || rawPrefix.endsWith('fetch(')) {
      return `'/api/endpoint', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(payload)\n  }).then(res => res.json());`;
    }
    if (prefix.endsWith('document.addEventListener(') || rawPrefix.endsWith('document.addEventListener(')) {
      return `'DOMContentLoaded', () => {\n    console.log('DOM loaded');\n  });`;
    }
    if (rawPrefix.endsWith('export default function ') && !rawPrefix.includes('(')) {
      const componentName = filePath.replace(/\.[^/.]+$/, '').split(/[/\\]/).pop() || 'Component';
      const capitalized = componentName.charAt(0).toUpperCase() + componentName.slice(1);
      return `${capitalized}() {\n  return (\n    <div className="p-4">\n      <h1>${capitalized}</h1>\n    </div>\n  );\n}`;
    }
  }

  // HTML / JSX Markup Heuristics
  if (['html', 'htm', 'jsx', 'tsx'].includes(ext)) {
    if (prefix.startsWith('<!DOCTYPE') || prefix.startsWith('<!doctype')) {
      return ` html>\n<html lang="id">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>`;
    }
    if (prefix.startsWith('<button') && !prefix.includes('>')) {
      return ` type="button" className="px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-500 transition-colors">\n    Klik Disini\n  </button>`;
    }
    if (prefix.startsWith('<input') && !prefix.includes('>')) {
      return ` type="text" placeholder="Masukkan input..." className="w-full px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500" />`;
    }
    if (rawPrefix.endsWith('<div className="') || rawPrefix.endsWith('<div class="')) {
      return `flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">\n  \n</div>`;
    }
    if (prefix.startsWith('<section') && !prefix.includes('>')) {
      return ` className="max-w-7xl mx-auto px-4 py-12">\n  \n</section>`;
    }
  }

  // CSS / Styling Heuristics
  if (['css', 'scss', 'less'].includes(ext)) {
    if (prefix.endsWith('display:') || rawPrefix.endsWith('display:')) {
      return ` flex;\n  align-items: center;\n  justify-content: space-between;`;
    }
    if (prefix.endsWith('background:') || rawPrefix.endsWith('background:')) {
      return ` radial-gradient(circle at 50% 10%, #1e293b, #090d16);`;
    }
    if (prefix.endsWith('box-shadow:') || rawPrefix.endsWith('box-shadow:')) {
      return ` 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);`;
    }
    if (prefix.endsWith('transition:') || rawPrefix.endsWith('transition:')) {
      return ` all 0.2s cubic-bezier(0.4, 0, 0.2, 1);`;
    }
    if (rawPrefix.endsWith('@keyframes ') && !rawPrefix.includes('{')) {
      return `fadeIn {\n  from { opacity: 0; transform: translateY(4px); }\n  to { opacity: 1; transform: translateY(0); }\n}`;
    }
  }

  // Python Heuristics
  if (['py'].includes(ext)) {
    if (rawPrefix.endsWith('def ') || prefix === 'def') {
      return `main():\n    print("Halo dari Python RuangCoder!")\n\nif __name__ == "__main__":\n    main()`;
    }
    if (rawPrefix.endsWith('class ') || prefix === 'class') {
      return `Model:\n    def __init__(self, name: str):\n        self.name = name\n\n    def __repr__(self):\n        return f"Model({self.name})"`;
    }
    if (prefix.endsWith('try:') || rawPrefix.endsWith('try:')) {
      return `\n    # code execution\n    pass\nexcept Exception as err:\n    print(f"Error: {err}")`;
    }
  }

  // Markdown Heuristics
  if (['md', 'markdown'].includes(ext)) {
    if (rawPrefix.trim() === '```') {
      return `javascript\n// Tulis kode disini\n\`\`\``;
    }
    if (rawPrefix.trim() === '#') {
      return ` Judul Dokumen\n\n## Pendahuluan\nTuliskan catatan dan dokumentasi proyek disini.\n`;
    }
  }

  // JSON Heuristics
  if (['json'].includes(ext)) {
    if (prefix.endsWith('"scripts": {')) {
      return `\n    "dev": "vite",\n    "build": "vite build",\n    "preview": "vite preview"\n  },`;
    }
  }

  return null;
}
