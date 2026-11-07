import React from 'react';

type TokenType = 'comment' | 'string' | 'number' | 'keyword' | 'tag' | 'plain';

const COLORS: Record<TokenType, string> = {
  comment: 'text-slate-500 italic',
  string: 'text-emerald-300',
  number: 'text-amber-300',
  keyword: 'text-sky-300 font-medium',
  tag: 'text-rose-300',
  plain: ''
};

const JS_KEYWORDS = 'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|null|undefined|true|false|this|interface|type|enum|implements|public|private|protected|static|void';
const PY_KEYWORDS = 'def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|raise|with|lambda|pass|break|continue|None|True|False|and|or|not|in|is|yield|async|await|self|print';
const C_KEYWORDS = 'int|char|float|double|long|short|unsigned|signed|void|struct|union|enum|typedef|const|static|extern|return|if|else|for|while|do|switch|case|break|continue|include|define|class|public|private|protected|new|delete|namespace|using|template|bool|true|false|NULL|nullptr|auto';
const SQL_KEYWORDS = 'SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|AS|AND|OR|NOT|NULL|PRIMARY|KEY|DISTINCT|UNION|COUNT|SUM|AVG|MIN|MAX|LIKE|IN|IS';
const SH_KEYWORDS = 'if|then|else|fi|for|do|done|while|case|esac|function|echo|export|cd|ls|npm|git|sudo|return';

interface LangSpec {
  keywords: string;
  comment: string;
  caseInsensitive?: boolean;
}

const LANGS: Record<string, LangSpec> = {
  js: { keywords: JS_KEYWORDS, comment: '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/' },
  python: { keywords: PY_KEYWORDS, comment: '#[^\\n]*' },
  c: { keywords: C_KEYWORDS, comment: '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|^\\s*#[^\\n]*' },
  sql: { keywords: SQL_KEYWORDS, comment: '--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/', caseInsensitive: true },
  sh: { keywords: SH_KEYWORDS, comment: '#[^\\n]*' },
  json: { keywords: 'true|false|null', comment: '(?!)' },
  css: { keywords: 'important|inherit|auto|none|block|flex|grid|absolute|relative|fixed', comment: '\\/\\*[\\s\\S]*?\\*\\/' }
};

const ALIASES: Record<string, string> = {
  javascript: 'js', jsx: 'js', ts: 'js', typescript: 'js', tsx: 'js', java: 'js', kotlin: 'js', go: 'js', rust: 'js', php: 'js',
  py: 'python', python3: 'python',
  c: 'c', cpp: 'c', 'c++': 'c', cs: 'c', csharp: 'c',
  sql: 'sql', sqlite: 'sql', postgresql: 'sql',
  bash: 'sh', shell: 'sh', sh: 'sh', zsh: 'sh', powershell: 'sh',
  json: 'json', css: 'css', scss: 'css'
};

export interface HighlightToken {
  type: TokenType;
  text: string;
}

export function resolveLanguage(lang: string): string | null {
  const key = lang.toLowerCase();
  if (key === 'html' || key === 'xml' || key === 'svg') return 'markup';
  if (key in LANGS) return key;
  return ALIASES[key] ?? null;
}

function tokenizeMarkup(code: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  const re = /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][\w:-]*)|("[^"]*"|'[^']*')|(\/?>)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) tokens.push({ type: 'plain', text: code.slice(last, m.index) });
    const type: TokenType = m[1] ? 'comment' : m[2] ? 'tag' : m[3] ? 'string' : 'tag';
    tokens.push({ type, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < code.length) tokens.push({ type: 'plain', text: code.slice(last) });
  return tokens;
}

const REGEX_CACHE: Record<string, RegExp> = {};
const TOKEN_CACHE = new Map<string, HighlightToken[]>();
const MAX_CACHE_ENTRIES = 64;

function getLanguageRegex(resolved: string, spec: LangSpec): RegExp {
  if (!REGEX_CACHE[resolved]) {
    const flags = spec.caseInsensitive ? 'gmi' : 'gm';
    REGEX_CACHE[resolved] = new RegExp(
      `(${spec.comment})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(\\b\\d+(?:\\.\\d+)?\\b)|\\b(${spec.keywords})\\b`,
      flags
    );
  }
  REGEX_CACHE[resolved].lastIndex = 0;
  return REGEX_CACHE[resolved];
}

/** Pure tokenizer (exported for tests). Unknown languages return a single plain token. */
export function tokenizeCode(code: string, language: string): HighlightToken[] {
  const resolved = resolveLanguage(language);
  if (!resolved) return [{ type: 'plain', text: code }];
  if (resolved === 'markup') return tokenizeMarkup(code);

  const cacheKey = `${resolved}:${code.length}:${code.slice(0, 40)}`;
  if (code.length < 8000 && TOKEN_CACHE.has(cacheKey)) {
    const cached = TOKEN_CACHE.get(cacheKey)!;
    // Fast verification
    if (cached.map(t => t.text).join('') === code) {
      return cached;
    }
  }

  const spec = LANGS[resolved];
  const re = getLanguageRegex(resolved, spec);

  const tokens: HighlightToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    if (m.index > last) tokens.push({ type: 'plain', text: code.slice(last, m.index) });
    const type: TokenType = m[1] ? 'comment' : m[2] ? 'string' : m[3] ? 'number' : 'keyword';
    tokens.push({ type, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < code.length) tokens.push({ type: 'plain', text: code.slice(last) });

  if (code.length < 8000) {
    if (TOKEN_CACHE.size >= MAX_CACHE_ENTRIES) {
      const firstKey = TOKEN_CACHE.keys().next().value;
      if (firstKey) TOKEN_CACHE.delete(firstKey);
    }
    TOKEN_CACHE.set(cacheKey, tokens);
  }

  return tokens;
}

export function renderHighlightedCode(code: string, language: string): React.ReactNode {
  return tokenizeCode(code, language).map((token, i) =>
    token.type === 'plain'
      ? <React.Fragment key={i}>{token.text}</React.Fragment>
      : <span key={i} className={COLORS[token.type]}>{token.text}</span>
  );
}
