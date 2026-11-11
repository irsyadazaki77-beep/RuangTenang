import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ollamaBaseUrl, localInferenceQueue, ensureOllamaRunning } from '../ai/ollamaRuntime.js';
import { getGenAIClient } from '../../config/aiConfig.js';
import {
  CoderModelOrchestrator,
  GEMINI_CODING_MODELS,
  type CoderAiProvider,
  type CouncilPersonaMode
} from './coderModelOrchestrator.js';

const execAsync = promisify(exec);

export type SandboxMode = 'local' | 'browser';

export interface LocalOllamaModelInfo {
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  modifiedAt: string;
  family: string;
  parameterSize: string;
  quantization: string;
  roleBadge: string;
  recommendedForCoding: boolean;
  supportsNativeTools: boolean;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

export interface AgentToolCall {
  id: string;
  name: 'list_files' | 'read_file' | 'write_file' | 'edit_file_diff' | 'search_code' | 'run_command';
  arguments: Record<string, any>;
}

export interface AgentToolExecutionOutput {
  toolCallId: string;
  toolName: string;
  status: 'completed' | 'failed';
  summary: string;
  output: string;
  fileChanged?: {
    path: string;
    beforeContent?: string;
    afterContent: string;
  };
  durationMs: number;
}

export type AgentPersonaId =
  | 'habibie'
  | 'kihadjar'
  | 'bambang'
  | 'sutarjo'
  | 'kartini'
  | 'dewi'
  | 'gibran'
  | 'kancil'
  | 'jokowi'
  | 'megawati';

export interface AgentPersonaConfig {
  id: AgentPersonaId;
  name: string;
  role: string;
  avatar: string;
  badgeColor: string;
  specialty: string;
  targetModel?: string;
}

export const AGENT_PERSONAS: AgentPersonaConfig[] = [
  {
    id: 'habibie',
    name: 'Pak Habibie',
    role: 'Chief System Architect & Master Engineer',
    avatar: '📐',
    badgeColor: 'amber',
    specialty: 'Arsitektur sistem kompleks, blueprint multi-file modular, dan rancangan modular skala besar.',
    targetModel: 'si-gacor:latest'
  },
  {
    id: 'kihadjar',
    name: 'Ki Hadjar',
    role: 'Deep Reasoning & Root Cause Debugger',
    avatar: '🧠',
    badgeColor: 'purple',
    specialty: 'Chain-of-Thought (CoT) mendalam, analisis akar masalah error/crash, dan investigasi logika.',
    targetModel: 'si-gacor:latest'
  },
  {
    id: 'sutarjo',
    name: 'Mas Sutarjo',
    role: 'Senior Core Implementor',
    avatar: '⚡',
    badgeColor: 'sky',
    specialty: 'Penulisan fungsi presisi, pembuatan berkas baru, operasi diff terarah, dan manipulasi kode.',
    targetModel: 'si-pinter:latest'
  },
  {
    id: 'dewi',
    name: 'Mbak Dewi',
    role: 'Frontend & UI/UX Specialist',
    avatar: '🎨',
    badgeColor: 'teal',
    specialty: 'Desain antarmuka visual responsif, HTML/CSS, Tailwind styling, estetika dan live preview.',
    targetModel: 'si-tangguh:latest'
  },
  {
    id: 'bambang',
    name: 'Pak Bambang',
    role: 'QA & Safety Terminal Inspector',
    avatar: '🛡️',
    badgeColor: 'emerald',
    specialty: 'Validasi unit test terminal, keamanan script eksekusi, mitigasi bug, dan kepastian build.',
    targetModel: 'si-tangguh:latest'
  },
  {
    id: 'kartini',
    name: 'Ibu Kartini',
    role: 'Code Governance & Documentation',
    avatar: '📚',
    badgeColor: 'rose',
    specialty: 'Review kualitas keterbacaan kode (clean code), standarisasi dokumentasi, dan panduan proyek.',
    targetModel: 'si-tangguh:latest'
  },
  {
    id: 'gibran',
    name: 'Mas Gibran',
    role: 'Sat-Set Dispatcher & Tool Router',
    avatar: '🚀',
    badgeColor: 'indigo',
    specialty: 'Klasifikasi maksud instruksi super cepat (<150ms) dan routing tool call secara presisi.',
    targetModel: 'si-pinter:latest'
  },
  {
    id: 'kancil',
    name: 'Si Kancil',
    role: 'Ultra-Fast Linter & Formatter',
    avatar: '⚡',
    badgeColor: 'orange',
    specialty: 'Perapian indentasi kilat, pembersihan spasi berlebih, dan validasi sintaksis sebelum save.',
    targetModel: 'si-pinter:latest'
  }
];

export type AgentStreamEvent =
  | { type: 'status'; message: string; step: number; maxSteps: number; agentName?: string; agentRole?: string }
  | { type: 'agent_active'; agent: AgentPersonaConfig; step: number }
  | { type: 'thought'; content: string; step: number; agentName?: string }
  | { type: 'tool_start'; toolCallId: string; toolName: string; args: Record<string, any>; step: number; agentName?: string }
  | { type: 'tool_result'; result: AgentToolExecutionOutput; step: number; agentName?: string }
  | { type: 'file_changed'; path: string; content: string; beforeContent?: string; sandboxMode: SandboxMode; agentName?: string }
  | { type: 'token'; content: string; agentName?: string }
  | { type: 'done'; modelUsed: string; totalSteps: number; toolCallsCount: number; durationMs: number; activeAgents?: string[] }
  | { type: 'error'; message: string };

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.cache',
  'tmp'
]);

const FORBIDDEN_FILE_PATTERNS = [
  /(^|[/\\])\.env($|[/\\]|\.)/i,
  /(^|[/\\])\.git($|[/\\])/i,
  /(^|[/\\])node_modules($|[/\\])/i,
  /(^|[/\\])prisma($|[/\\])/i,
  /(^|[/\\])server($|[/\\])/i,
  /(^|[/\\])dist($|[/\\])/i,
  /(^|[/\\])\.vscode($|[/\\])/i
];

const DESTRUCTIVE_COMMAND_PATTERNS = [
  /\brm\s+-rf\s+\/(\s|$)/i,
  /\bformat\s+[a-z]:/i,
  /\bdel\s+\/[sq]\s+[a-z]:\\/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\breg(\.exe)?\s+(delete|add)\b/i,
  /\bdiskpart\b/i,
  /\bbcdedit\b/i,
  /\bnet\s+user\b/i,
  /\bvssadmin\b/i,
  /\bpowershell.*-enc\b/i,
  /\b(curl|wget).*\|\s*(bash|sh|cmd|powershell)\b/i,
  /(\.\.[/\\]){2,}/,
  /\b(cat|type|more|tail|head)\s+([^\s]*[/\\])?\.env\b/i
];

const DEFAULT_WORKSPACE_DIR = path.resolve(process.cwd(), 'coder-workspace');

const STARTER_FILES: Record<string, string> = {
  'README.md': `# 🚀 RuangCoder Local Workspace

Selamat datang di **RuangCoder** — Autonomous Local AI Coding Agent.
Workspace ini dapat dikelola secara otonom oleh model AI lokal Anda (Ollama) menggunakan **Mode A (Local Disk)** maupun **Mode B (In-Browser Sandbox)**.

## 🛠️ Kemampuan Agent
- \`list_files\`: Menelusuri struktur direktori proyek
- \`read_file\`: Membaca isi kode sumber dengan nomor baris
- \`write_file\`: Membuat file baru atau memperbarui file
- \`edit_file_diff\`: Melakukan *surgical patch* pada baris kode tertentu
- \`search_code\`: Mencari simbol/fungsi di seluruh proyek
- \`run_command\`: Menjalankan perintah terminal & melihat hasilnya
`,
  'package.json': JSON.stringify(
    {
      name: 'ruangcoder-starter-app',
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        test: 'node test.js',
        start: 'node app.js'
      }
    },
    null,
    2
  ),
  'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RuangCoder Sandbox App</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="app-card">
    <div class="badge">⚡ RuangCoder Live Preview</div>
    <h1>Halo dari RuangCoder!</h1>
    <p>Minta AI Agent lokal di panel kanan untuk memodifikasi tampilan atau menambahkan fitur baru ke aplikasi ini.</p>
    <div class="counter-box">
      <button id="decBtn" class="btn btn-secondary">-</button>
      <span id="countValue">0</span>
      <button id="incBtn" class="btn btn-primary">+</button>
    </div>
    <p id="statusText" class="status-text">Siap menerima instruksi coding agent...</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
  'styles.css': `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: radial-gradient(circle at top, #1e293b, #0f172a);
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.app-card {
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 20px;
  padding: 32px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}
.badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  margin-bottom: 16px;
}
h1 {
  font-size: 26px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #38bdf8, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
p {
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
}
.counter-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}
#countValue {
  font-size: 36px;
  font-weight: 800;
  min-width: 64px;
  color: #f8fafc;
}
.btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.btn:active {
  transform: scale(0.94);
}
.btn-primary {
  background: #10b981;
  color: #052e16;
}
.btn-secondary {
  background: #334155;
  color: #f8fafc;
}
.status-text {
  font-size: 12px;
  color: #38bdf8;
  margin-bottom: 0;
}`,
  'app.js': `// RuangCoder Starter Script
let count = 0;

function updateDisplay() {
  const countEl = typeof document !== 'undefined' ? document.getElementById('countValue') : null;
  const statusEl = typeof document !== 'undefined' ? document.getElementById('statusText') : null;
  if (countEl) countEl.textContent = String(count);
  if (statusEl) statusEl.textContent = \`Nilai counter saat ini: \${count}\`;
}

if (typeof document !== 'undefined') {
  document.getElementById('incBtn')?.addEventListener('click', () => {
    count += 1;
    updateDisplay();
  });
  document.getElementById('decBtn')?.addEventListener('click', () => {
    count -= 1;
    updateDisplay();
  });
} else {
  console.log('RuangCoder CLI script berhasil dijalankan!');
}
`,
  'utils.js': `export function calculateStats(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return { sum: 0, average: 0, min: 0, max: 0 };
  }
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  return {
    sum,
    average: Number((sum / numbers.length).toFixed(2)),
    min: Math.min(...numbers),
    max: Math.max(...numbers)
  };
}
`,
  'test.js': `import { calculateStats } from './utils.js';

const stats = calculateStats([10, 20, 30, 40]);
console.log('Hasil kalkulasi statistik:', stats);

if (stats.sum === 100 && stats.average === 25) {
  console.log('✅ TEST PASSED: Semua fungsi berjalan akurat!');
  process.exit(0);
} else {
  console.error('❌ TEST FAILED: Nilai tidak sesuai ekspektasi');
  process.exit(1);
}
`
};

export function resolveWorkspaceSessionDir(workspaceId?: string): string {
  if (!workspaceId || workspaceId === 'default') return DEFAULT_WORKSPACE_DIR;
  const sanitized = String(workspaceId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!sanitized) return DEFAULT_WORKSPACE_DIR;
  return path.join(DEFAULT_WORKSPACE_DIR, 'sessions', sanitized);
}

export async function ensureCoderWorkspaceInitialized(workspaceDir = DEFAULT_WORKSPACE_DIR): Promise<string> {
  const targetDir = path.resolve(workspaceDir);
  if (!fsSync.existsSync(targetDir)) {
    await fs.mkdir(targetDir, { recursive: true });
    for (const [relPath, content] of Object.entries(STARTER_FILES)) {
      const fullPath = path.join(targetDir, relPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }
  }
  return targetDir;
}

export function getStarterFiles(): Record<string, string> {
  return { ...STARTER_FILES };
}

export function resolveSafeWorkspacePath(targetRelativePath: string, workspaceRoot = DEFAULT_WORKSPACE_DIR): string {
  const cleaned = (targetRelativePath || '.').replace(/^[/\\]+/, '');
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedTarget = path.resolve(resolvedRoot, cleaned);

  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Akses ditolak: Path "${targetRelativePath}" berada di luar sandbox workspace.`);
  }

  // Prevent accessing sensitive server files or hidden configuration
  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(cleaned)) {
      throw new Error(`Akses ditolak: Akses ke file/direktori sistem "${targetRelativePath}" dilarang demi keamanan.`);
    }
  }

  // Symlink jail protection: If file or directory exists, verify its canonical realpath
  if (fsSync.existsSync(resolvedTarget)) {
    try {
      const real = fsSync.realpathSync(resolvedTarget);
      if (real !== resolvedRoot && !real.startsWith(resolvedRoot + path.sep)) {
        throw new Error(`Akses ditolak: Symlink "${targetRelativePath}" mengarah ke luar sandbox workspace.`);
      }
    } catch (e: any) {
      if (e.message?.startsWith('Akses ditolak:')) throw e;
    }
  }

  return resolvedTarget;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function classifyLocalModel(name: string): {
  roleBadge: string;
  recommendedForCoding: boolean;
  supportsNativeTools: boolean;
} {
  const lower = name.toLowerCase();
  // 1. Trio Model Lokal RuangTenang
  if (lower.includes('si-pinter') || lower.includes('pinter')) {
    return {
      roleBadge: '⭐ Utama (Coding Presisi & Tool Agent • 1.7B)',
      recommendedForCoding: true,
      supportsNativeTools: true
    };
  }
  if (lower.includes('si-tangguh') || lower.includes('tangguh')) {
    return {
      roleBadge: '🛡️ Workhorse (QA, Testing & UI Engine • 12B)',
      recommendedForCoding: true,
      supportsNativeTools: true
    };
  }
  if (lower.includes('si-gacor') || lower.includes('gacor')) {
    return {
      roleBadge: '🏛️ Flagship Titan (Arsitektur & Deep Reasoning • 27B)',
      recommendedForCoding: true,
      supportsNativeTools: false
    };
  }
  // 2. Base model fallback matching
  if (lower.includes('qwen') || lower.includes('coder')) {
    return {
      roleBadge: '⭐ Utama (Coding & Tool Agent)',
      recommendedForCoding: true,
      supportsNativeTools: true
    };
  }
  if (lower.includes('deepseek-r1')) {
    return {
      roleBadge: '🧠 Deep Reasoning & Logic',
      recommendedForCoding: true,
      supportsNativeTools: false
    };
  }
  if (lower.includes('phi4')) {
    return {
      roleBadge: '⚡ Fast Code & Refactor',
      recommendedForCoding: true,
      supportsNativeTools: true
    };
  }
  if (lower.includes('bonsai')) {
    return {
      roleBadge: '🏗️ Deep Architecture (27B)',
      recommendedForCoding: true,
      supportsNativeTools: false
    };
  }
  if (lower.includes('mistral-nemo') || lower.includes('nemo')) {
    return {
      roleBadge: '🛡️ Balanced Workhorse (12B)',
      recommendedForCoding: true,
      supportsNativeTools: true
    };
  }
  return {
    roleBadge: '💬 Local General Model',
    recommendedForCoding: false,
    supportsNativeTools: false
  };
}

export async function listInstalledOllamaModels(): Promise<{
  reachable: boolean;
  baseUrl: string;
  models: LocalOllamaModelInfo[];
}> {
  const baseUrl = ollamaBaseUrl() || 'http://127.0.0.1:11434';
  try {
    let response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    }).catch(() => null);

    if (!response || !response.ok) {
      await ensureOllamaRunning(baseUrl);
      response = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(4000)
      }).catch(() => null);
    }

    if (!response || !response.ok) {
      return { reachable: false, baseUrl, models: [] };
    }
    const data = await response.json();
    const rawModels = Array.isArray(data?.models) ? data.models : [];
    const models: LocalOllamaModelInfo[] = rawModels.map((m: any) => {
      const name = String(m.name || '');
      const sizeBytes = Number(m.size || 0);
      const classification = classifyLocalModel(name);
      return {
        name,
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        modifiedAt: String(m.modified_at || ''),
        family: String(m.details?.family || 'local'),
        parameterSize: String(m.details?.parameter_size || ''),
        quantization: String(m.details?.quantization_level || ''),
        ...classification
      };
    });

    // Sort so recommended fast coding models (qwen3:1.7b and phi4-mini) appear at the top
    models.sort((a, b) => {
      if (a.name.includes('qwen3:1.7b')) return -1;
      if (b.name.includes('qwen3:1.7b')) return 1;
      if (a.name.includes('phi4-mini')) return -1;
      if (b.name.includes('phi4-mini')) return 1;
      if (a.recommendedForCoding !== b.recommendedForCoding) {
        return a.recommendedForCoding ? -1 : 1;
      }
      return b.sizeBytes - a.sizeBytes;
    });

    return { reachable: true, baseUrl, models };
  } catch {
    return { reachable: false, baseUrl, models: [] };
  }
}

export async function buildLocalFileTree(
  dirPath = DEFAULT_WORKSPACE_DIR,
  relativeBase = '',
  depth = 0
): Promise<FileTreeNode[]> {
  if (depth > 5) return [];
  await ensureCoderWorkspaceInitialized();
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileTreeNode[] = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.DS_Store')) continue;
    const relPath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const children = await buildLocalFileTree(fullPath, relPath, depth + 1);
      nodes.push({
        name: entry.name,
        path: relPath,
        type: 'directory',
        children
      });
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      nodes.push({
        name: entry.name,
        path: relPath,
        type: 'file',
        size: stat.size
      });
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export interface CodeSearchMatch {
  file: string;
  line: number;
  text: string;
}

/**
 * Resiliently replaces a target code block inside content, handling CRLF/LF differences,
 * trailing whitespace, and minor indentation variances.
 */
export function applyResilientDiff(
  originalContent: string,
  target: string,
  replacement: string,
  filePath = ''
): string {
  // 1. Direct exact match
  if (originalContent.includes(target)) {
    return originalContent.replace(target, replacement);
  }

  // 2. CRLF / LF line endings normalization
  const isCrlf = originalContent.includes('\r\n');
  const normalizedOriginal = originalContent.replace(/\r\n/g, '\n');
  const normalizedTarget = target.replace(/\r\n/g, '\n');
  const normalizedReplacement = replacement.replace(/\r\n/g, '\n');

  if (normalizedOriginal.includes(normalizedTarget)) {
    const replaced = normalizedOriginal.replace(normalizedTarget, normalizedReplacement);
    return isCrlf ? replaced.replace(/\n/g, '\r\n') : replaced;
  }

  // 3. Trimmed line-by-line fuzzy matching (ignoring trailing whitespace)
  const origLines = normalizedOriginal.split('\n');
  const targetLines = normalizedTarget.split('\n');
  const targetLinesTrimmed = targetLines.map(l => l.trimEnd());

  if (targetLinesTrimmed.length > 0 && targetLinesTrimmed.some(l => l.trim().length > 0)) {
    for (let i = 0; i <= origLines.length - targetLinesTrimmed.length; i++) {
      let matched = true;
      for (let j = 0; j < targetLinesTrimmed.length; j++) {
        if (origLines[i + j].trimEnd() !== targetLinesTrimmed[j]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        const before = origLines.slice(0, i);
        const after = origLines.slice(i + targetLinesTrimmed.length);
        const repLines = normalizedReplacement.split('\n');
        const combined = [...before, ...repLines, ...after].join(isCrlf ? '\r\n' : '\n');
        return combined;
      }
    }
  }

  // 4. Ultra-tolerant whitespace-agnostic matching (ignoring all indentation and line gaps)
  const targetClean = targetLines.map(l => l.trim()).filter(Boolean);
  if (targetClean.length > 0) {
    for (let i = 0; i <= origLines.length - targetClean.length; i++) {
      let matchCount = 0;
      let k = i;
      while (k < origLines.length && matchCount < targetClean.length) {
        if (origLines[k].trim() === targetClean[matchCount]) {
          matchCount++;
        } else if (origLines[k].trim().length > 0) {
          break;
        }
        k++;
      }
      if (matchCount === targetClean.length) {
        const before = origLines.slice(0, i);
        const after = origLines.slice(k);
        const repLines = normalizedReplacement.split('\n');
        return [...before, ...repLines, ...after].join(isCrlf ? '\r\n' : '\n');
      }
    }
  }

  // 5. Single-line substring or token match if target is brief
  if (targetClean.length === 1 && targetClean[0].length >= 5) {
    const needle = targetClean[0];
    const foundIdx = origLines.findIndex(l => l.includes(needle));
    if (foundIdx !== -1) {
      const before = origLines.slice(0, foundIdx);
      const after = origLines.slice(foundIdx + 1);
      const repLines = normalizedReplacement.split('\n');
      return [...before, ...repLines, ...after].join(isCrlf ? '\r\n' : '\n');
    }
  }

  throw new Error(
    `Blok kode target tidak ditemukan di dalam ${filePath || 'file'}. Pastikan blok kode target cocok dengan isi file saat ini.`
  );
}

/**
 * Searches for a query string across all text files in the workspace.
 */
export async function searchWorkspaceCode(
  query: string,
  workspaceRoot = DEFAULT_WORKSPACE_DIR,
  maxResults = 50
): Promise<CodeSearchMatch[]> {
  const trimmed = (query || '').trim().toLowerCase();
  if (!trimmed) return [];
  const tree = await buildLocalFileTree(workspaceRoot);
  const collectFiles = (nodes: FileTreeNode[]): string[] =>
    nodes.flatMap(n => (n.type === 'directory' ? collectFiles(n.children || []) : [n.path]));
  const allFiles = collectFiles(tree);

  const results: CodeSearchMatch[] = [];
  for (const relFile of allFiles) {
    if (results.length >= maxResults) break;
    try {
      const full = resolveSafeWorkspacePath(relFile, workspaceRoot);
      const text = await fs.readFile(full, 'utf-8');
      const lines = text.split(/\r?\n/);
      for (let idx = 0; idx < lines.length; idx++) {
        if (lines[idx].toLowerCase().includes(trimmed)) {
          results.push({
            file: relFile,
            line: idx + 1,
            text: lines[idx].trim()
          });
          if (results.length >= maxResults) break;
        }
      }
    } catch {
      // ignore unreadable/binary
    }
  }
  return results;
}

export function truncateOutput(text: string, maxChars = 3500): string {
  if (!text || text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2) - 40;
  return `${text.slice(0, half)}\n\n[... Truncated ${text.length - maxChars} karakter log untuk efisiensi konteks VRAM SLM ...]\n\n${text.slice(-half)}`;
}

/**
 * Forcefully terminates a process and all its spawned child processes (process tree)
 * to prevent orphaned zombie background processes from consuming CPU / RAM.
 */
export function killProcessTree(pid: number | undefined): void {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${pid} /T /F`, { windowsHide: true }, () => {});
    } else {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {
        process.kill(pid, 'SIGKILL');
      }
    }
  } catch {
    // Process already terminated or inaccessible
  }
}

export async function executeSafeShellCommand(
  command: string,
  cwd = DEFAULT_WORKSPACE_DIR,
  timeoutMs = 15000
): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
  const trimmed = (command || '').trim();
  if (!trimmed) {
    throw new Error('Perintah terminal tidak boleh kosong.');
  }
  for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error('Perintah ditolak oleh sistem keamanan sandbox RuangCoder.');
    }
  }

  await ensureCoderWorkspaceInitialized(cwd);
  const startedAt = Date.now();

  // Strip sensitive production credentials, tokens, and database secrets from subprocess environment
  const safeEnv: Record<string, string> = {
    PATH: process.env.PATH || process.env.Path || '',
    Path: process.env.Path || process.env.PATH || '',
    PATHEXT: process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD',
    TEMP: process.env.TEMP || '',
    TMP: process.env.TMP || '',
    SYSTEMROOT: process.env.SYSTEMROOT || '',
    HOMEDRIVE: process.env.HOMEDRIVE || '',
    HOMEPATH: process.env.HOMEPATH || '',
    USERPROFILE: process.env.USERPROFILE || '',
    SHELL: process.env.SHELL || '',
    LANG: process.env.LANG || 'en_US.UTF-8',
    NODE_ENV: 'sandbox'
  };

  const effectiveTimeout = Math.min(Math.max(timeoutMs, 2000), 30000);

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | null = null;
    let isSettled = false;

    const child = exec(trimmed, {
      cwd,
      env: safeEnv,
      maxBuffer: 1024 * 512,
      windowsHide: true
    }, (err, stdout, stderr) => {
      if (isSettled) return;
      isSettled = true;
      if (timer) clearTimeout(timer);

      const durationMs = Date.now() - startedAt;
      if (err) {
        resolve({
          stdout: truncateOutput(String(stdout || (err as any).stdout || ''), 3500),
          stderr: truncateOutput(String(stderr || (err as any).stderr || err.message || 'Command execution error'), 2500),
          exitCode: typeof (err as any).code === 'number' ? (err as any).code : 1,
          durationMs
        });
      } else {
        resolve({
          stdout: truncateOutput(stdout || '', 3500),
          stderr: truncateOutput(stderr || '', 2500),
          exitCode: 0,
          durationMs
        });
      }
    });

    // Watchdog timer with robust Process-Tree Termination
    timer = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      killProcessTree(child.pid);
      const durationMs = Date.now() - startedAt;
      resolve({
        stdout: '',
        stderr: `Batas waktu eksekusi (${effectiveTimeout / 1000}s) tercapai. Seluruh pohon proses terminal anak telah dihentikan secara aman oleh sandbox RuangCoder.`,
        exitCode: 124, // Standard timeout exit code (SIGALRM)
        durationMs
      });
    }, effectiveTimeout);
  });
}

/**
 * Executes a single Agent Tool Call against either:
 * - Mode A: Local Disk Workspace (coder-workspace)
 * - Mode B: In-Browser Virtual Filesystem map
 */
export async function executeCoderAgentTool(
  toolCall: AgentToolCall,
  sandboxMode: SandboxMode,
  virtualFiles: Record<string, string>,
  workspaceDir: string = DEFAULT_WORKSPACE_DIR
): Promise<AgentToolExecutionOutput> {
  const startedAt = Date.now();
  const args = toolCall.arguments || {};

  try {
    switch (toolCall.name) {
      case 'list_files': {
        if (sandboxMode === 'browser') {
          const paths = Object.keys(virtualFiles).sort();
          const listing = paths.map(p => `- ${p} (${virtualFiles[p].length} bytes)`).join('\n');
          return {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            status: 'completed',
            summary: `Menemukan ${paths.length} file di Browser Sandbox`,
            output: listing || '(Workspace kosong)',
            durationMs: Date.now() - startedAt
          };
        }

        const subPath = typeof args.path === 'string' ? args.path : '.';
        const targetDir = resolveSafeWorkspacePath(subPath, workspaceDir);
        const tree = await buildLocalFileTree(targetDir, subPath === '.' ? '' : subPath);
        const flatten = (nodes: FileTreeNode[], indent = ''): string[] =>
          nodes.flatMap(n =>
            n.type === 'directory'
              ? [`${indent}📁 ${n.path}/`, ...flatten(n.children || [], indent + '  ')]
              : [`${indent}📄 ${n.path} (${n.size ?? 0} B)`]
          );
        const lines = flatten(tree);
        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          status: 'completed',
          summary: `Membaca daftar file (${lines.length} entri)`,
          output: lines.join('\n') || '(Direktori kosong)',
          durationMs: Date.now() - startedAt
        };
      }

      case 'read_file': {
        const rawPath = String(args.path || args.filePath || '').replace(/^[/\\]+/, '');
        if (!rawPath) throw new Error('Parameter "path" wajib diisi.');
        const startLine = Math.max(1, Number(args.startLine) || 1);
        const endLine = Math.max(startLine, Number(args.endLine) || startLine + 250);

        let content: string;
        if (sandboxMode === 'browser') {
          if (!(rawPath in virtualFiles)) {
            throw new Error(`File "${rawPath}" tidak ditemukan di Browser Sandbox.`);
          }
          content = virtualFiles[rawPath];
        } else {
          const fullPath = resolveSafeWorkspacePath(rawPath, workspaceDir);
          content = await fs.readFile(fullPath, 'utf-8');
        }

        const allLines = content.split(/\r?\n/);
        const sliced = allLines.slice(startLine - 1, endLine);
        const rawNumbered = sliced.map((line, idx) => `${startLine + idx}: ${line}`).join('\n');
        const numbered = truncateOutput(rawNumbered, 4000);

        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          status: 'completed',
          summary: `Membaca ${rawPath} (baris ${startLine}-${Math.min(endLine, allLines.length)})`,
          output: `File: ${rawPath} (Total ${allLines.length} baris)\n---\n${numbered}`,
          durationMs: Date.now() - startedAt
        };
      }

      case 'write_file': {
        const rawPath = String(args.path || args.filePath || '').replace(/^[/\\]+/, '');
        let content = typeof args.content === 'string' ? args.content : '';
        if (!rawPath) throw new Error('Parameter "path" wajib diisi.');

        // Sanitize code fences if raw model output was surrounded by ```ext ... ``` or left an unclosed code block fence
        let sanitized = content.trim();
        if (sanitized.startsWith('```')) {
          sanitized = sanitized.replace(/^```[a-zA-Z0-9_-]*\r?\n/, '');
          if (sanitized.endsWith('```')) {
            sanitized = sanitized.slice(0, -3).trimEnd();
          }
          content = sanitized;
        }

        let beforeContent: string | undefined;
        if (sandboxMode === 'browser') {
          beforeContent = virtualFiles[rawPath];
          virtualFiles[rawPath] = content;
        } else {
          const fullPath = resolveSafeWorkspacePath(rawPath, workspaceDir);
          try {
            beforeContent = await fs.readFile(fullPath, 'utf-8');
          } catch {
            beforeContent = undefined;
          }
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content, 'utf-8');
        }

        const lineCount = content.split(/\r?\n/).length;
        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          status: 'completed',
          summary: `${beforeContent === undefined ? 'Membuat' : 'Memperbarui'} file ${rawPath} (${lineCount} baris)`,
          output: `Berhasil menyimpan ${rawPath} (${content.length} karakter, ${lineCount} baris).`,
          fileChanged: {
            path: rawPath,
            beforeContent,
            afterContent: content
          },
          durationMs: Date.now() - startedAt
        };
      }

      case 'edit_file_diff': {
        const rawPath = String(args.path || args.filePath || '').replace(/^[/\\]+/, '');
        const target = String(args.target || '');
        const replacement = String(args.replacement ?? '');
        if (!rawPath || !target) {
          throw new Error('Parameter "path" dan "target" wajib diisi untuk edit_file_diff.');
        }

        let currentContent: string;
        if (sandboxMode === 'browser') {
          if (!(rawPath in virtualFiles)) {
            throw new Error(`File "${rawPath}" tidak ditemukan di Browser Sandbox.`);
          }
          currentContent = virtualFiles[rawPath];
        } else {
          const fullPath = resolveSafeWorkspacePath(rawPath, workspaceDir);
          currentContent = await fs.readFile(fullPath, 'utf-8');
        }

        const updatedContent = applyResilientDiff(currentContent, target, replacement, rawPath);
        if (sandboxMode === 'browser') {
          virtualFiles[rawPath] = updatedContent;
        } else {
          const fullPath = resolveSafeWorkspacePath(rawPath, workspaceDir);
          await fs.writeFile(fullPath, updatedContent, 'utf-8');
        }

        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          status: 'completed',
          summary: `Memodifikasi diff pada ${rawPath}`,
          output: `Berhasil menerapkan perubahan diff pada ${rawPath}.`,
          fileChanged: {
            path: rawPath,
            beforeContent: currentContent,
            afterContent: updatedContent
          },
          durationMs: Date.now() - startedAt
        };
      }

      case 'search_code': {
        const query = String(args.query || '').trim();
        if (!query) throw new Error('Parameter "query" wajib diisi.');
        const lowerQuery = query.toLowerCase();
        const matches: string[] = [];

        if (sandboxMode === 'browser') {
          for (const [filePath, fileContent] of Object.entries(virtualFiles)) {
            const lines = fileContent.split(/\r?\n/);
            lines.forEach((line, idx) => {
              if (line.toLowerCase().includes(lowerQuery) && matches.length < 40) {
                matches.push(`${filePath}:${idx + 1}: ${line.trim()}`);
              }
            });
          }
        } else {
          const found = await searchWorkspaceCode(query, workspaceDir, 40);
          for (const m of found) {
            matches.push(`${m.file}:${m.line}: ${m.text}`);
          }
        }

        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          status: 'completed',
          summary: `Mencari "${query}" (${matches.length} hasil ditemukan)`,
          output: matches.length > 0 ? matches.join('\n') : `Tidak ditemukan kecocokan untuk "${query}".`,
          durationMs: Date.now() - startedAt
        };
      }

      case 'run_command': {
        const command = String(args.command || '').trim();
        if (!command) throw new Error('Parameter "command" wajib diisi.');

        if (sandboxMode === 'browser') {
          return {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            status: 'completed',
            summary: `Menjalankan "${command}" di In-Browser Runtime`,
            output: `[Browser Sandbox Runtime] Command "${command}" dieksekusi pada virtual environment (${Object.keys(virtualFiles).length} file aktif). Preview aplikasi telah disinkronkan.`,
            durationMs: Date.now() - startedAt
          };
        }

        const execResult = await executeSafeShellCommand(command, workspaceDir);
        const combined = [
          `Exit Code: ${execResult.exitCode}`,
          execResult.stdout ? `STDOUT:\n${execResult.stdout.trim()}` : '',
          execResult.stderr ? `STDERR:\n${execResult.stderr.trim()}` : ''
        ]
          .filter(Boolean)
          .join('\n\n');

        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          status: execResult.exitCode === 0 ? 'completed' : 'failed',
          summary: `Menjalankan "${command}" (exit ${execResult.exitCode})`,
          output: combined,
          durationMs: execResult.durationMs
        };
      }

      default:
        throw new Error(`Tool "${toolCall.name}" tidak dikenal.`);
    }
  } catch (err: any) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      status: 'failed',
      summary: `Gagal menjalankan ${toolCall.name}: ${err?.message || 'Error'}`,
      output: `ERROR: ${err?.message || String(err)}`,
      durationMs: Date.now() - startedAt
    };
  }
}

const OLLAMA_TOOLS_SCHEMA = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Melihat daftar file dan struktur folder di dalam workspace proyek.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path relatif direktori (default: ".")' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Membaca isi kode dari sebuah file di dalam workspace.',
      parameters: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string', description: 'Path relatif file, misal "index.html" atau "app.js"' },
          startLine: { type: 'number', description: 'Baris awal (opsional, default 1)' },
          endLine: { type: 'number', description: 'Baris akhir (opsional, default 250)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Membuat file baru atau menimpa seluruh isi file dengan kode baru yang lengkap.',
      parameters: {
        type: 'object',
        required: ['path', 'content'],
        properties: {
          path: { type: 'string', description: 'Path relatif file yang akan dibuat/ditulis' },
          content: { type: 'string', description: 'Isi kode lengkap yang akan disimpan ke file' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_file_diff',
      description: 'Mengganti bagian kode tertentu (target) dengan kode baru (replacement) di dalam file.',
      parameters: {
        type: 'object',
        required: ['path', 'target', 'replacement'],
        properties: {
          path: { type: 'string', description: 'Path relatif file yang akan diedit' },
          target: { type: 'string', description: 'Potongan kode asli yang ingin diganti (harus sama persis)' },
          replacement: { type: 'string', description: 'Potongan kode pengganti yang baru' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_code',
      description: 'Mencari teks, nama fungsi, atau variabel di seluruh file proyek.',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Kata kunci atau simbol kode yang dicari' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Menjalankan perintah terminal/shell di dalam workspace (misal "node test.js" atau "npm test").',
      parameters: {
        type: 'object',
        required: ['command'],
        properties: {
          command: { type: 'string', description: 'Perintah shell yang akan dijalankan' }
        }
      }
    }
  }
];

export function buildAgentSystemPrompt(
  sandboxMode: SandboxMode,
  activeFilePath?: string,
  personaMode: CouncilPersonaMode = 'creative'
): string {
  const isProf = personaMode === 'professional';
  const councilTeam = isProf
    ? `1. **Lead Architect**: Merancang blueprint arsitektur sistem dan memimpin eksekusi modular.
2. **Root Cause Debugger**: Analisis deduksi mendalam (Chain-of-Thought), investigasi error/bug, dan stack trace.
3. **Core Engineer**: Implementasi kode fungsi presisi, pembuatan berkas baru, dan surgical diff edit.
4. **UI/UX Specialist**: Penataan visual antarmuka, CSS, Tailwind utility, estetika modern, dan tampilan responsif.
5. **QA & SecOps**: Pengujian terminal runner (run_command), sanitasi script, dan mitigasi risiko regresi.`
    : `1. **Pak Habibie** (Chief System Architect): Merancang blueprint arsitektur sistem dan memimpin eksekusi file.
2. **Ki Hadjar** (Deep Reasoning Debugger): Investigasi logika mendalam, deduksi akar masalah bug, dan chain-of-thought.
3. **Mas Sutarjo** (Senior Core Implementor): Penulisan fungsi presisi, manipulasi diff terarah, dan pembuatan berkas.
4. **Mbak Dewi** (Frontend & UI/UX Specialist): Desain visual antarmuka modern, CSS responsif, dan estetika live preview.
5. **Pak Bambang** (QA & Safety Terminal Inspector): Validasi unit test terminal, sanitasi script, dan build check.`;

  return `Anda adalah dewan kolaboratif **RuangCoder Autonomous Multi-Agent Council**:
${councilTeam}

Mode Sandbox Aktif: ${sandboxMode === 'local' ? 'MODE A (Local Disk Workspace)' : 'MODE B (In-Browser Virtual Sandbox)'}.
${activeFilePath ? `File yang sedang dibuka pengguna di Editor: "${activeFilePath}".` : ''}

LINGKUNGAN RUNTIME:
Aplikasi ini adalah Web Application berbasis HTML5, Modern CSS, dan JavaScript/TypeScript (index.html, styles.css, app.js) yang dirender langsung di editor live preview browser sandbox.
DILARANG menggunakan, menyebutkan, atau menyarankan framework backend Python (seperti Flask, FastAPI, Pydantic, Django) karena lingkungan ini khusus Web Sandbox browser client-side.
DILARANG mengulang-ulang kalimat yang sama atau membuat daftar opsi berulang (hindari degenerate repetition loop).

⚡ PRINSIP UTAMA: ACTION-FIRST & OTONOM PENUH (SEPERTI ANTIGRAVITY & CURSOR)
1. Anda adalah AI CODING AGENT OTONOM, BUKAN chatbot konsultasi pasif.
2. DILARANG KERAS menanyakan izin atau menawarkan opsi di akhir pesan (misalnya: "Apakah kamu ingin saya menambahkan...", "Beri tahu saya jika ingin melanjutkan", atau "Bagaimana menurutmu?"). Pengguna menginginkan Anda LANGSUNG mengeksekusinya!
3. DILARANG KERAS memberikan langkah-langkah manual kepada pengguna (misalnya: "Langkah selanjutnya: 1. Salin kode di atas ke index.html, 2. Buka styles.css..."). Pengguna menggunakan sistem ini agar ANDA yang langsung menulis dan menyimpan kodenya ke dalam file!
4. Ketika pengguna meminta membuat antarmuka, aplikasi, menambah fitur, styling, atau memperbaiki bug:
   - Anda WAJIB LANGSUNG memanggil tool \`write_file\` atau \`edit_file_diff\` untuk memodifikasi file terkait!
   - Untuk aplikasi web standar, file utamanya adalah \`index.html\`, \`styles.css\`, dan \`app.js\`.
   - Jangan hanya menulis kode di dalam chat! Pastikan kode tersimpan ke berkas proyek melalui tool.

TOOLS YANG TERSEDIA:
- \`list_files\`: melihat daftar file di proyek
- \`read_file\`: membaca isi file sebelum memodifikasinya
- \`write_file\`: membuat file baru atau memperbarui seluruh isi file dengan kode lengkap
- \`edit_file_diff\`: mengubah blok spesifik pada file (argumen "target" harus persis sama dengan kode asli)
- \`search_code\`: mencari kata kunci di seluruh kode
- \`run_command\`: menjalankan perintah terminal/test seperti \`node test.js\`

FORMAT TOOL CALLING:
Jika model Anda tidak mendukung pemanggilan tool native via function calling API, Anda WAJIB memanggil tool menggunakan tag XML berikut:
<tool_call>
{"name": "write_file", "arguments": {"path": "index.html", "content": "<!DOCTYPE html>\\n<html lang=\\"id\\">\\n<head>\\n  <meta charset=\\"UTF-8\\">\\n  <title>Aplikasi</title>\\n  <link rel=\\"stylesheet\\" href=\\"styles.css\\">\\n</head>\\n<body>\\n  <div id=\\"app\\"></div>\\n  <script src=\\"app.js\\"></script>\\n</body>\\n</html>"}}
</tool_call>

Atau blok JSON:
\`\`\`json
{"name": "write_file", "arguments": {"path": "index.html", "content": "..."}}
\`\`\`

Dewan Ahli bekerja secara otonom: diskusikan langkah secara singkat dalam <think> atau 1-2 kalimat deklaratif, lalu SEGERA panggil tool untuk menerapkan kode ke workspace!`;
}

export function isUserActionPrompt(prompt: string): boolean {
  const p = (prompt || '').toLowerCase().trim();
  if (/^(?:apa|kenapa|mengapa|bagaimana|jelaskan|terangkan|ceritakan|apakah|what|why|how|explain)\b/i.test(p)) {
    if (!/(?:dan|tolong|coba)\s+(?:buat|bikin|tambah|tulis|ubah|perbaiki|ganti|fix)/i.test(p)) {
      return false;
    }
  }
  return /(?:buat|bikin|tambah|ubah|ganti|perbaiki|fix|desain|styling|style|implement|modifikasi|update|patch|tulis|koding|generate|create|build|add|remove|hapus|refactor|antarmuka|tampilan|task|tugas)/i.test(p);
}

/**
 * Fallback parser for models (like deepseek-r1:1.5b or gemma3 or bonsai) that emit
 * tool calls inside <tool_call>...</tool_call> or ```json blocks instead of native Ollama tool_calls.
 * Also intelligently synthesizes write_file tool calls from raw markdown code blocks when users
 * request code creation or modifications.
 */
export function parseFallbackToolCallsFromText(
  text: string,
  options?: {
    activeFilePath?: string;
    isActionPrompt?: boolean;
    knownFiles?: string[];
  }
): {
  cleanedText: string;
  thoughtText: string;
  toolCalls: AgentToolCall[];
} {
  let working = text || '';
  const thoughts: string[] = [];

  // Extract <think>...</think> blocks
  working = working.replace(/<think>([\s\S]*?)<\/think>/gi, (_match, inner) => {
    if (inner && inner.trim()) thoughts.push(inner.trim());
    return '';
  });

  // Extract **Think:** or **Think:^** or Think: blocks
  working = working.replace(/(?:\*\*Think:?\^?\*\*|(?:\n|^)\s*Think:\^?)\s*([\s\S]*?)(?=(?:\*\*Call:?\*\*|Call:|###|<tool_call>|<action|```|$))/gi, (_match, inner) => {
    if (inner && inner.trim()) thoughts.push(inner.trim());
    return '';
  });

  const toolCalls: AgentToolCall[] = [];
  const validNames = new Set(['list_files', 'read_file', 'write_file', 'edit_file_diff', 'search_code', 'run_command']);

  // 1. Check <tool_call>...</tool_call>
  working = working.replace(/<tool_call>([\s\S]*?)<\/tool_call>/gi, (_match, inner) => {
    try {
      const parsed = JSON.parse(inner.trim());
      if (parsed && validNames.has(parsed.name)) {
        toolCalls.push({
          id: `tc_${Date.now()}_${toolCalls.length}`,
          name: parsed.name as AgentToolCall['name'],
          arguments: parsed.arguments || parsed.parameters || {}
        });
      }
    } catch {
      // ignore malformed
    }
    return '';
  });

  // 2. If no <tool_call> tag was found, check if the entire response or a ```json block is a single tool call object
  if (toolCalls.length === 0) {
    const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi;
    let match: RegExpExecArray | null;
    while ((match = jsonBlockRegex.exec(working)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && validNames.has(parsed.name) && typeof (parsed.arguments || parsed.parameters) === 'object') {
          toolCalls.push({
            id: `tc_${Date.now()}_${toolCalls.length}`,
            name: parsed.name,
            arguments: parsed.arguments || parsed.parameters || {}
          });
          working = working.replace(match[0], '');
        }
      } catch {
        // not a tool call json block
      }
    }
  }

  // 3. Check XML-style tool calls like <action name="write_file"> or <call:write_file path="...">
  if (toolCalls.length === 0) {
    const xmlCallRegex = /<(?:action|call):?([a-zA-Z_]+)(?:\s+([^>]*))?>([\s\S]*?)<\/(?:action|call|\1)>/gi;
    let xmlMatch: RegExpExecArray | null;
    while ((xmlMatch = xmlCallRegex.exec(working)) !== null) {
      const fnName = xmlMatch[1];
      if (validNames.has(fnName)) {
        const attrStr = xmlMatch[2] || '';
        const bodyContent = xmlMatch[3] || '';
        const args: Record<string, any> = {};

        const pathMatch = attrStr.match(/path=["']([^"']+)["']/i);
        if (pathMatch) args.path = pathMatch[1];

        try {
          const parsedBody = JSON.parse(bodyContent.trim());
          Object.assign(args, parsedBody);
        } catch {
          if (fnName === 'write_file' && !args.content) {
            args.content = bodyContent.trim();
          }
        }

        if (args.path || fnName === 'list_files') {
          toolCalls.push({
            id: `xml_tc_${Date.now()}_${toolCalls.length}`,
            name: fnName as AgentToolCall['name'],
            arguments: args
          });
          working = working.replace(xmlMatch[0], '');
        }
      }
    }
  }

  // 4. Smart code block extraction: If no tool calls were emitted and the prompt is an action prompt,
  // automatically convert markdown code blocks into write_file tool calls so files are updated immediately!
  if (toolCalls.length === 0 && options?.isActionPrompt) {
    const codeBlockRegex = /```([a-zA-Z0-9_.-]*)\s*\n([\s\S]*?)```/g;
    let cbMatch: RegExpExecArray | null;
    const detectedBlocks: Array<{ lang: string; code: string; index: number }> = [];

    while ((cbMatch = codeBlockRegex.exec(working)) !== null) {
      const lang = (cbMatch[1] || '').toLowerCase().trim();
      const code = (cbMatch[2] || '').trim();
      if (code.length >= 15 && !['bash', 'sh', 'shell', 'console', 'terminal', 'cmd'].includes(lang)) {
        detectedBlocks.push({ lang, code, index: cbMatch.index });
      }
    }

    for (const block of detectedBlocks) {
      const lookbackStart = Math.max(0, block.index - 200);
      const textBefore = working.slice(lookbackStart, block.index);
      const fileMentionMatch = textBefore.match(/(?:file|berkas|ke|pada|dalam|nama)?\s*[`"']?([a-zA-Z0-9_\-./]+\.(?:html|css|js|ts|json|jsx|tsx|md))[`"']?/i);

      let targetPath: string | undefined = fileMentionMatch ? fileMentionMatch[1] : undefined;

      if (!targetPath) {
        if (block.lang === 'html' || block.code.includes('<!DOCTYPE') || block.code.includes('<html')) {
          targetPath = 'index.html';
        } else if (block.lang === 'css' || (block.code.includes('{') && (block.code.includes('color:') || block.code.includes('background:') || block.code.includes('display:')))) {
          targetPath = 'styles.css';
        } else if (['javascript', 'js', 'typescript', 'ts'].includes(block.lang)) {
          targetPath = options?.activeFilePath && (options.activeFilePath.endsWith('.js') || options.activeFilePath.endsWith('.ts'))
            ? options.activeFilePath
            : 'app.js';
        } else if (options?.activeFilePath) {
          targetPath = options.activeFilePath;
        }
      }

      if (targetPath) {
        toolCalls.push({
          id: `auto_code_${Date.now()}_${toolCalls.length}`,
          name: 'write_file',
          arguments: {
            path: targetPath,
            content: block.code
          }
        });
      }
    }
  }

  return {
    cleanedText: working.trim(),
    thoughtText: thoughts.join('\n\n'),
    toolCalls
  };
}

/**
 * Real-time Circuit Breaker to detect and abort LLM degenerative repetition loops
 * (such as repeating identical bullet points or multi-line paragraphs endlessly).
 */
export function detectRepetitionLoop(text: string): { isLoop: boolean; cleanedText: string } {
  if (!text || text.length < 80) return { isLoop: false, cleanedText: text || '' };

  const rawLines = text.split('\n');
  const cleanLines = rawLines.map(l => l.trim()).filter(l => l.length >= 8);

  // 1. Check for single line repeating 3+ times consecutively
  if (cleanLines.length >= 3) {
    const last = cleanLines[cleanLines.length - 1];
    let repeatCount = 0;
    for (let i = cleanLines.length - 1; i >= 0; i--) {
      if (cleanLines[i] === last) repeatCount++;
      else break;
    }
    if (repeatCount >= 3) {
      const firstIdx = text.indexOf(last);
      const secondIdx = text.indexOf(last, firstIdx + last.length);
      const cutPoint = secondIdx !== -1 ? secondIdx + last.length : text.length;
      return { isLoop: true, cleanedText: text.slice(0, cutPoint).trim() };
    }

    // 2. Check for multi-line block repetition (2 to 8 lines repeating periodically)
    for (let blockSize = 2; blockSize <= 8; blockSize++) {
      if (cleanLines.length >= blockSize * 2) {
        const blockA = cleanLines.slice(-blockSize).join('\n');
        const blockB = cleanLines.slice(-blockSize * 2, -blockSize).join('\n');
        if (blockA === blockB) {
          const firstLineOfBlock = cleanLines[cleanLines.length - blockSize];
          const blockStart = text.lastIndexOf(firstLineOfBlock);
          return { isLoop: true, cleanedText: text.slice(0, blockStart > 0 ? blockStart : text.length).trim() };
        }
      }
    }
  }

  // 3. Substring n-gram repetition check (for phrases repeating >= 3 times in the tail)
  const tail = text.slice(-500);
  for (let len = 25; len <= 80; len += 5) {
    const chunk = tail.slice(-len);
    const count = tail.split(chunk).length - 1;
    if (count >= 3) {
      const firstOccur = text.indexOf(chunk);
      const secondOccur = text.indexOf(chunk, firstOccur + chunk.length);
      const cutPoint = secondOccur !== -1 ? secondOccur + chunk.length : text.length;
      return { isLoop: true, cleanedText: text.slice(0, cutPoint).trim() };
    }
  }

  return { isLoop: false, cleanedText: text };
}

export interface RunCoderAgentOptions {
  prompt: string;
  modelName: string;
  provider?: CoderAiProvider;
  sandboxMode: SandboxMode;
  activeFilePath?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  virtualFiles?: Record<string, string>;
  personaMode?: CouncilPersonaMode;
  workspaceDir?: string;
  abortSignal?: AbortSignal;
  onEvent: (event: AgentStreamEvent) => void;
}

const stepThresholdConsensus = (prompt: string): boolean => {
  return prompt.length > 25 || /buat|ubah|bikin|fitur|perbaiki|fix|refactor|desain/i.test(prompt);
};

export async function runCoderAgentLoop(options: RunCoderAgentOptions): Promise<void> {
  const {
    prompt,
    modelName,
    sandboxMode,
    activeFilePath,
    history = [],
    personaMode = 'creative',
    workspaceDir = DEFAULT_WORKSPACE_DIR,
    abortSignal,
    onEvent
  } = options;

  const startedAt = Date.now();
  const baseUrl = ollamaBaseUrl() || 'http://127.0.0.1:11434';
  const virtualFiles: Record<string, string> =
    sandboxMode === 'browser'
      ? { ...(options.virtualFiles || STARTER_FILES) }
      : {};

  if (sandboxMode === 'local') {
    await ensureCoderWorkspaceInitialized(workspaceDir);
  }

  const requestedProvider: CoderAiProvider = options.provider || 'auto';
  const genAIClient = getGenAIClient();
  const inventory = await listInstalledOllamaModels();
  let activeProvider: 'ollama' | 'gemini';
  let installedModelNames: string[];

  if (requestedProvider === 'gemini') {
    if (process.env.LOCAL_AI_ONLY === 'true' || process.env.DISABLE_CLOUD_AI === 'true' || !genAIClient) {
      onEvent({
        type: 'error',
        message: 'Layanan Cloud AI dinonaktifkan demi privasi dan keamanan data. Sistem menggunakan mode AI Lokal (Ollama).'
      });
      return;
    }
    activeProvider = 'gemini';
    installedModelNames = GEMINI_CODING_MODELS;
  } else if (requestedProvider === 'auto') {
    if (!inventory.reachable || inventory.models.length === 0) {
      if (genAIClient && process.env.LOCAL_AI_ONLY !== 'true' && process.env.DISABLE_CLOUD_AI !== 'true') {
        activeProvider = 'gemini';
        installedModelNames = GEMINI_CODING_MODELS;
        onEvent({
          type: 'status',
          message: 'Daemon Ollama lokal tidak aktif. Otomatis beralih ke Cloud Engine...',
          step: 0,
          maxSteps: 6,
          agentName: 'Cloud Fallback'
        });
      } else {
        onEvent({
          type: 'error',
          message: `Daemon Ollama lokal tidak terdeteksi di ${baseUrl}. Pastikan Ollama telah berjalan di komputer Anda (jalankan "Mulai RuangTenang.bat").`
        });
        return;
      }
    } else {
      activeProvider = 'ollama';
      installedModelNames = inventory.models.map(m => m.name);
    }
  } else {
    // requestedProvider === 'ollama'
    if (!inventory.reachable) {
      onEvent({
        type: 'error',
        message: `Daemon Ollama lokal tidak terdeteksi di ${baseUrl}. Pastikan Ollama telah terpasang dan berjalan (buka aplikasi Ollama atau jalankan 'ollama serve' di terminal).`
      });
      return;
    }
    if (inventory.models.length === 0) {
      onEvent({
        type: 'error',
        message: 'Tidak ada model AI lokal yang terpasang di Ollama. Jalankan `ollama pull qwen3:8b` di terminal untuk mengunduh model coding lokal.'
      });
      return;
    }
    activeProvider = 'ollama';
    installedModelNames = inventory.models.map(m => m.name);
  }

  const maxSteps = 6;
  const plannedTurns = CoderModelOrchestrator.planExecutionCouncil(
    prompt,
    activeFilePath,
    installedModelNames,
    maxSteps,
    personaMode,
    {
      primaryModelOverride: modelName && modelName !== 'auto' ? modelName : undefined,
      lockSingleModel: true,
      provider: activeProvider
    }
  );

  let totalToolCalls = 0;
  const usedModels = new Set<string>();

  const messages: Array<Record<string, any>> = [
    {
      role: 'system',
      content: buildAgentSystemPrompt(sandboxMode, activeFilePath, personaMode)
    }
  ];

  for (const h of history.slice(-8)) {
    if (h.content?.trim()) {
      messages.push({
        role: h.role,
        content: h.content
      });
    }
  }

  messages.push({
    role: 'user',
    content: prompt
  });

  let releaseQueue: (() => void) | undefined;
  try {
    if (activeProvider === 'ollama') {
      releaseQueue = await localInferenceQueue.acquire(abortSignal);
    }

    const assignedAgents = new Set<string>();

    // ⚔️ Grok-Style Multi-Agent Council Opening Debate / Consensus Phase
    // Sebelum memodifikasi disk, pimpinan arsitek (Habibie/Jokowi) dan reviewer (Bambang/Dewi) memberikan pandangan ringkas
    if (stepThresholdConsensus(prompt)) {
      const leader = plannedTurns[0]?.persona;
      const implementor = plannedTurns[1]?.persona;
      const tester = plannedTurns[3]?.persona || plannedTurns[2]?.persona;
      
      onEvent({
        type: 'status',
        message: 'Dewan Multi-Agent (Habibie x Sutarjo x Bambang) sedang berdeliberasi merumuskan konsensus...',
        step: 1,
        maxSteps,
        agentName: 'Council Deliberation',
        agentRole: 'Cross-Agent Debate'
      });

      const consensusSummary = `🏛️ **[Konsensus Dewan Multi-Agent]:**
- **${leader.name} (${leader.role})**: "Strategi: Kita bedah struktur kebutuhan terlebih dahulu, pastikan tidak merusak dependensi yang ada."
- **${implementor.name} (${implementor.role})**: "Siap. Saya akan fokus pada eksekusi kode bersih dan presisi menggunakan diff surgically."
- **${tester.name} (${tester.role})**: "Pastikan fungsi baru dilengkapi validasi input dan lolos pengujian anti-regresi."`;

      onEvent({
        type: 'thought',
        content: consensusSummary,
        step: 1,
        agentName: 'Dewan Multi-Agent'
      });
    }

    for (let step = 1; step <= maxSteps; step++) {
      if (abortSignal?.aborted) {
        throw new Error('Eksekusi dihentikan oleh pengguna.');
      }

      // Dynamic rotation / specialized role determination from Council Orchestrator
      const turnPlan = plannedTurns[step - 1] || plannedTurns[plannedTurns.length - 1];
      const currentPersona = turnPlan.persona;
      const turnModel = turnPlan.modelToUse;
      const modelMeta = classifyLocalModel(turnModel);

      usedModels.add(turnModel);
      assignedAgents.add(currentPersona.name);

      onEvent({
        type: 'agent_active',
        agent: currentPersona,
        step
      });

      onEvent({
        type: 'status',
        message: `[${currentPersona.name}] ${turnPlan.phaseTitle} (Model: ${turnModel})...`,
        step,
        maxSteps,
        agentName: currentPersona.name,
        agentRole: currentPersona.role
      });

      let useNativeTools = modelMeta.supportsNativeTools;
      let responseData: any;
      let streamedTokensThisTurn = 0;

      const callOllama = async (withTools: boolean) => {
        onEvent({
          type: 'status',
          message: `[${currentPersona.name}] Memproses inferensi dengan model ${turnModel}...`,
          step,
          maxSteps,
          agentName: currentPersona.name,
          agentRole: currentPersona.role
        });

        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: turnModel,
            messages,
            stream: true,
            keep_alive: '5m', // VRAM management: keeps model warm in GPU VRAM across turns
            ...(withTools ? { tools: OLLAMA_TOOLS_SCHEMA } : {}),
            options: {
              temperature: turnModel.includes('deepseek-r1') ? 0.6 : 0.3,
              repeat_penalty: 1.18,
              repeat_last_n: 128,
              presence_penalty: 0.3,
              frequency_penalty: 0.3,
              top_p: 0.9,
              top_k: 40,
              num_ctx: 8192,
              num_predict: 2048
            }
          }),
          signal: abortSignal
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`OLLAMA_HTTP_${res.status}: ${errText}`);
        }

        if (!res.body) {
          throw new Error('Response stream Ollama kosong.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let fullThinking = '';
        const accumulatedToolCalls: any[] = [];
        let isAbortedByLoopDetector = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const chunk = JSON.parse(trimmed);
              const deltaMsg = chunk?.message;
              if (deltaMsg) {
                if (typeof deltaMsg.thinking === 'string' && deltaMsg.thinking) {
                  fullThinking += deltaMsg.thinking;
                  onEvent({
                    type: 'thought',
                    content: deltaMsg.thinking,
                    step,
                    agentName: currentPersona.name
                  });
                }
                if (typeof deltaMsg.content === 'string' && deltaMsg.content) {
                  fullContent += deltaMsg.content;

                  // Real-time Circuit Breaker: Detect degenerative repetition loops
                  const loopCheck = detectRepetitionLoop(fullContent);
                  if (loopCheck.isLoop) {
                    fullContent = loopCheck.cleanedText;
                    isAbortedByLoopDetector = true;
                    try {
                      await reader.cancel();
                    } catch {
                      // ignore
                    }
                    onEvent({
                      type: 'status',
                      message: `[Anti-Loop Protection] Pengulangan teks terdeteksi dan dihentikan otomatis.`,
                      step,
                      maxSteps,
                      agentName: currentPersona.name
                    });
                    break;
                  }

                  // Stream token if using native tools or not yet starting raw tool json block
                  const isRawToolBlock = !withTools && (fullContent.includes('```json') || fullContent.trimStart().startsWith('{'));
                  if (!isRawToolBlock) {
                    streamedTokensThisTurn++;
                    onEvent({
                      type: 'token',
                      content: deltaMsg.content,
                      agentName: currentPersona.name
                    });
                  }
                }
                if (Array.isArray(deltaMsg.tool_calls) && deltaMsg.tool_calls.length > 0) {
                  accumulatedToolCalls.push(...deltaMsg.tool_calls);
                }
              }
            } catch {
              // Ignore partial JSON line
            }
          }

          if (isAbortedByLoopDetector) break;
        }

        return {
          message: {
            role: 'assistant',
            content: fullContent,
            thinking: fullThinking,
            ...(accumulatedToolCalls.length > 0 ? { tool_calls: accumulatedToolCalls } : {})
          }
        };
      };

      const callGeminiCoder = async (turnModel: string, sysPrompt: string) => {
        onEvent({
          type: 'status',
          message: `[${currentPersona.name}] Memproses inferensi cerdas dengan Gemini Cloud (${turnModel})...`,
          step,
          maxSteps,
          agentName: currentPersona.name,
          agentRole: currentPersona.role
        });

        const targetModel = turnModel.startsWith('gemini-') ? turnModel : 'gemini-3.8-flash';
        const client = genAIClient!;

        const conversationHistory = messages.filter(m => m.role !== 'system');
        const contents = conversationHistory.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || '') }]
        }));

        let fullContent = '';
        const fullThinking = '';
        const accumulatedToolCalls: any[] = [];

        try {
          const responseStream = await client.models.generateContentStream({
            model: targetModel,
            contents,
            config: {
              systemInstruction: sysPrompt,
              temperature: 0.3
            }
          });

          for await (const chunk of responseStream) {
            if (abortSignal?.aborted) break;
            const text = chunk.text || '';
            if (text) {
              fullContent += text;
              streamedTokensThisTurn += text.length;
              onEvent({
                type: 'token',
                content: text,
                agentName: currentPersona.name
              });
            }
            const parts = chunk.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if ((part as any).functionCall) {
                const fc = (part as any).functionCall;
                accumulatedToolCalls.push({
                  id: `call_${step}_${accumulatedToolCalls.length}_${Date.now()}`,
                  name: fc.name,
                  function: {
                    name: fc.name,
                    arguments: fc.args || {}
                  }
                });
              }
            }
          }
        } catch (err: any) {
          throw new Error(`GEMINI_API_ERROR: ${err?.message || String(err)}`);
        }

        return {
          message: {
            role: 'assistant',
            content: fullContent,
            thinking: fullThinking,
            ...(accumulatedToolCalls.length > 0 ? { tool_calls: accumulatedToolCalls } : {})
          }
        };
      };

      try {
        if (activeProvider === 'gemini') {
          responseData = await callGeminiCoder(turnModel, buildAgentSystemPrompt(sandboxMode, activeFilePath, personaMode));
        } else {
          responseData = await callOllama(useNativeTools);
        }
      } catch (err: any) {
        // Fallback if a model rejects the `tools` parameter in Ollama
        if (activeProvider === 'ollama' && useNativeTools) {
          useNativeTools = false;
          responseData = await callOllama(false);
        } else {
          throw err;
        }
      }

      const msg = responseData?.message || {};
      const rawContent = typeof msg.content === 'string' ? msg.content : '';
      const nativeThinking = typeof msg.thinking === 'string' ? msg.thinking.trim() : '';

      const isAction = isUserActionPrompt(prompt);
      const parsedFallback = parseFallbackToolCallsFromText(rawContent, {
        activeFilePath,
        isActionPrompt: isAction,
        knownFiles: sandboxMode === 'browser' ? Object.keys(virtualFiles) : undefined
      });
      const combinedThought = [nativeThinking, parsedFallback.thoughtText].filter(Boolean).join('\n\n');

      if (combinedThought && !msg.thinking) {
        onEvent({
          type: 'thought',
          content: combinedThought,
          step,
          agentName: currentPersona.name
        });
      }

      // Extract native tool calls if present
      const nativeToolCalls: AgentToolCall[] = Array.isArray(msg.tool_calls)
        ? msg.tool_calls
            .map((tc: any, idx: number) => {
              const fnName = tc?.function?.name;
              const rawArgs = tc?.function?.arguments;
              const parsedArgs =
                typeof rawArgs === 'string'
                  ? (() => {
                      try {
                        return JSON.parse(rawArgs);
                      } catch {
                        return {};
                      }
                    })()
                  : rawArgs || {};
              return {
                id: `call_${step}_${idx}_${Date.now()}`,
                name: fnName,
                arguments: parsedArgs
              };
            })
            .filter((tc: AgentToolCall) => Boolean(tc.name))
        : [];

      const activeToolCalls = nativeToolCalls.length > 0 ? nativeToolCalls : parsedFallback.toolCalls;

      // If no tool calls were requested, check if the multi-agent council should transition to the implementor!
      if (activeToolCalls.length === 0) {
        // Multi-Agent Council Continuity:
        // If step 1 (Architect/Planner/Debugger) only returned blueprint/advice in text without executing any tool calls,
        // but the user requested creating, modifying, or styling code (isAction is true) and no files have been touched yet:
        // DO NOT exit! Automatically pass the blueprint to the Core Implementor (Mas Sutarjo / Step 2) so code is actually written!
        if (step === 1 && isAction && totalToolCalls === 0 && step < maxSteps) {
          const nextTurn = plannedTurns[1] || plannedTurns[0];
          const nextPersona = nextTurn.persona;

          onEvent({
            type: 'status',
            message: `[Dewan Multi-Agent] Cetak biru arsitektur disetujui. Melanjutkan ke ${nextPersona.name} untuk langsung mengeksekusi kode ke file...`,
            step: 1,
            maxSteps,
            agentName: 'Council Handoff',
            agentRole: 'Architecture to Implementation'
          });

          // Record architect's thoughts/blueprint
          messages.push({
            role: 'assistant',
            content: parsedFallback.cleanedText || rawContent
          });

          // Give strict imperative command to the implementor
          messages.push({
            role: 'user',
            content: `[PERINTAH EKSEKUSI OTONOM UNTUK ${nextPersona.name} (${nextPersona.role})]:
Rancangan arsitektur di atas telah diterima. SEKARANG giliran Anda untuk LANGSUNG MENULIS DAN MENYIMPAN KODE LENGKAP ke dalam file proyek ("index.html", "styles.css", atau "app.js") menggunakan tool write_file atau edit_file_diff.
DILARANG KERAS hanya berbicara di chat, menanyakan izin, atau memberikan instruksi manual.
PANGGIL TOOL write_file DENGAN KODE LENGKAP SEKARANG JUGA!`
          });

          continue;
        }

        const finalAnswer =
          parsedFallback.cleanedText ||
          rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() ||
          'Tugas telah selesai dieksekusi.';

        if (streamedTokensThisTurn === 0) {
          onEvent({
            type: 'token',
            content: finalAnswer,
            agentName: currentPersona.name
          });
        }

        onEvent({
          type: 'done',
          modelUsed: Array.from(usedModels).join(', ') || 'Multi-Model Autonomous Swarm',
          totalSteps: step,
          toolCallsCount: totalToolCalls,
          durationMs: Date.now() - startedAt,
          activeAgents: Array.from(assignedAgents)
        });
        return;
      }

      // Record assistant message with its tool calls
      messages.push({
        role: 'assistant',
        content: parsedFallback.cleanedText || rawContent,
        ...(nativeToolCalls.length > 0 ? { tool_calls: msg.tool_calls } : {})
      });

      // Execute each requested tool sequentially and feed results back to Ollama
      for (const toolCall of activeToolCalls) {
        totalToolCalls += 1;
        onEvent({
          type: 'tool_start',
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          args: toolCall.arguments,
          step,
          agentName: currentPersona.name
        });

        const result = await executeCoderAgentTool(toolCall, sandboxMode, virtualFiles, workspaceDir);

        if (result.fileChanged) {
          onEvent({
            type: 'file_changed',
            path: result.fileChanged.path,
            content: result.fileChanged.afterContent,
            beforeContent: result.fileChanged.beforeContent,
            sandboxMode,
            agentName: currentPersona.name
          });

          // 🛡️ Bambang Autonomous Self-Healing & Test Verification Loop
          // Jika file kode JS/TS dimodifikasi, Pak Bambang memeriksa keberadaan test.js
          const changedPath = result.fileChanged.path;
          const hasTestFile = sandboxMode === 'browser' ? Boolean(virtualFiles['test.js']) : fsSync.existsSync(path.resolve(workspaceDir, 'test.js'));
          if (hasTestFile && (changedPath.endsWith('.js') || changedPath.endsWith('.ts')) && step < maxSteps) {
            onEvent({
              type: 'status',
              message: `[Pak Bambang] Menjalankan verifikasi anti-regresi otomatis (node test.js)...`,
              step,
              maxSteps,
              agentName: 'Pak Bambang',
              agentRole: 'QA & Safety Inspector'
            });

            const testTc: AgentToolCall = {
              id: `qa_autoheal_${step}_${Date.now()}`,
              name: 'run_command',
              arguments: { command: 'node test.js' }
            };
            const testResult = await executeCoderAgentTool(testTc, sandboxMode, virtualFiles, workspaceDir);
            onEvent({
              type: 'tool_result',
              result: testResult,
              step,
              agentName: 'Pak Bambang'
            });

            if (testResult.status === 'failed') {
              messages.push({
                role: 'user',
                content: `[⚠️ PERINGATAN QA DARI PAK BAMBANG]:
Modifikasi pada "${changedPath}" menyebabkan unit test "node test.js" GAGAL (exit code non-zero):
${testResult.output}

Instruksi untuk Mas Sutarjo/Dewan: Segera analisis stack trace di atas, lakukan perbaikan kode menggunakan edit_file_diff atau write_file agar seluruh test kembali lulus!`
              });
            } else {
              messages.push({
                role: 'user',
                content: `[✅ VERIFIKASI QA PAK BAMBANG SUKSES]:
Unit test "node test.js" lulus dengan sukses (exit 0). Semua fitur dalam kondisi stabil.`
              });
            }
          }
        }

        onEvent({
          type: 'tool_result',
          result,
          step,
          agentName: currentPersona.name
        });

        if (useNativeTools) {
          messages.push({
            role: 'tool',
            content: result.output,
            name: toolCall.name
          });
        } else {
          if (result.status === 'failed') {
            onEvent({
              type: 'status',
              message: `[Self-Healing] Tool ${toolCall.name} gagal (${result.summary}). Si Gacor & Dewan Ahli sedang merekayasa perbaikan otomatis...`,
              step,
              maxSteps,
              agentName: currentPersona.name
            });
            messages.push({
              role: 'user',
              content: `[⚠️ AUTO-HEAL DIRECTIVE - EKSEKUSI TOOL ${toolCall.name} GAGAL]:\n${result.output}\n\nInstruksi untuk ${currentPersona.name} / Si Gacor:\n1. Analisis akar penyebab error (sintaks, path berkas, target string, atau compiler error).\n2. Lakukan perbaikan langsung menggunakan edit_file_diff atau write_file agar kode kembali stabil dan berfungsi!`
            });
          } else {
            messages.push({
              role: 'user',
              content: `[HASIL EKSEKUSI TOOL ${toolCall.name}]:\n${result.output}\n\nLanjutkan langkah berikutnya atau berikan jawaban akhir jika tugas sudah selesai.`
            });
          }
        }
      }
    }

    // If maxSteps was reached, emit final summary message
    onEvent({
      type: 'token',
      content: '\n\n✅ Batas langkah otonom maksimum telah tercapai. Tim Dewan Ahli AI (Pak Habibie, Mas Sutarjo, Ki Hadjar, Pak Bambang, dkk) telah menerapkan semua perubahan file ke workspace.'
    });
    onEvent({
      type: 'done',
      modelUsed: Array.from(usedModels).join(', ') || 'Multi-Model Autonomous Swarm',
      totalSteps: maxSteps,
      toolCallsCount: totalToolCalls,
      durationMs: Date.now() - startedAt,
      activeAgents: Array.from(assignedAgents)
    });
  } catch (err: any) {
    onEvent({
      type: 'error',
      message: err?.message || 'Terjadi kesalahan saat menjalankan RuangCoder Agent.'
    });
  } finally {
    releaseQueue?.();
  }
}
