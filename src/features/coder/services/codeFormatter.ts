/**
 * Lightweight, zero-dependency code formatter for HTML, CSS, JavaScript, and JSON.
 * Formats active files instantly without requiring heavy external dependencies.
 */
export function formatCode(content: string, filePath: string): string {
  const trimmed = content.trim();
  if (!trimmed) return content;

  const lower = filePath.toLowerCase();

  // 1. JSON Formatter
  if (lower.endsWith('.json')) {
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2) + '\n';
    } catch {
      return content;
    }
  }

  // 2. CSS Formatter
  if (lower.endsWith('.css')) {
    try {
      const normalized = trimmed
        .replace(/\s*\{\s*/g, ' {\n')
        .replace(/\s*;\s*/g, ';\n')
        .replace(/\s*\}\s*/g, '\n}\n');

      let formatted = '';
      let indentLevel = 0;
      const lines = normalized.split('\n');

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.includes('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        const indent = '  '.repeat(indentLevel);
        const formattedLine = line.includes(':') && !line.includes('{')
          ? line.replace(/\s*:\s*/, ': ')
          : line;

        formatted += indent + formattedLine + '\n';

        if (line.includes('{')) {
          indentLevel++;
        }
      }
      return formatted.trimEnd() + '\n';
    } catch {
      return content;
    }
  }

  // 3. HTML Formatter
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    try {
      let formatted = '';
      let indentLevel = 0;
      const tokens = trimmed.replace(/>\s*</g, '>\n<').split('\n');

      const voidTags = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
      ]);

      for (let token of tokens) {
        token = token.trim();
        if (!token) continue;

        const isClosing = token.startsWith('</');
        const isSingleLineTag = token.startsWith('<') && token.includes('</');
        const isOpening = token.startsWith('<') && !isClosing && !token.endsWith('/>') && !isSingleLineTag;
        const tagNameMatch = token.match(/<([a-zA-Z0-9!_-]+)/);
        const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
        const isVoid = voidTags.has(tagName) || token.endsWith('/>');

        if (isClosing) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        const indent = '  '.repeat(indentLevel);
        formatted += indent + token + '\n';

        if (isOpening && !isVoid) {
          indentLevel++;
        }
      }
      return formatted.trimEnd() + '\n';
    } catch {
      return content;
    }
  }

  // 4. JavaScript / TypeScript Formatter
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.ts') || lower.endsWith('.tsx')) {
    try {
      const normalized = trimmed
        .replace(/\)\s*\{/g, ') {\n')
        .replace(/;\s*(?!\s*\*\/)/g, ';\n');

      let formatted = '';
      let indentLevel = 0;
      const lines = normalized.split('\n');

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('}') || line.startsWith(']') || line.startsWith(')')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        const indent = '  '.repeat(indentLevel);
        formatted += indent + line + '\n';

        if (line.endsWith('{') || line.endsWith('[') || line.endsWith('(')) {
          indentLevel++;
        }
      }
      return formatted.trimEnd() + '\n';
    } catch {
      return content;
    }
  }

  return content;
}
