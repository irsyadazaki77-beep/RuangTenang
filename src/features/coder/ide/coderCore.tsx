import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Layers,
  FileJson,
  Image as ImageIcon,
  FileText,
  Timer,
  Brain,
  Wrench,
  FolderOpen,
  Globe,
  Sparkles,
  Terminal as TerminalIcon,
  GitCompare
} from 'lucide-react';
import { WorkspaceMode } from '../../workspace/types';

export interface AgentPersonaConfig {
  id: string;
  name: string;
  role: string;
  avatar: string;
  badgeColor: string;
  specialty: string;
}

export const COUNCIL_PERSONAS: AgentPersonaConfig[] = [
  {
    id: 'habibie',
    name: 'Pak Habibie',
    role: 'Chief System Architect',
    avatar: '📐',
    badgeColor: 'amber',
    specialty: 'Arsitektur sistem kompleks & blueprint multi-file'
  },
  {
    id: 'kihadjar',
    name: 'Ki Hadjar',
    role: 'Deep Reasoning & Debugger',
    avatar: '🧠',
    badgeColor: 'purple',
    specialty: 'Chain-of-Thought (CoT), analisis akar masalah & deduksi logika'
  },
  {
    id: 'sutarjo',
    name: 'Mas Sutarjo',
    role: 'Core Implementor',
    avatar: '⚡',
    badgeColor: 'sky',
    specialty: 'Penulisan fungsi presisi & surgical diff'
  },
  {
    id: 'dewi',
    name: 'Mbak Dewi',
    role: 'Frontend & UI/UX Specialist',
    avatar: '🎨',
    badgeColor: 'teal',
    specialty: 'Desain visual antarmuka, CSS, Tailwind & layout responsif'
  },
  {
    id: 'bambang',
    name: 'Pak Bambang',
    role: 'QA & Safety Inspector',
    avatar: '🛡️',
    badgeColor: 'emerald',
    specialty: 'Terminal test, mitigasi bug, sanitasi & kepastian build'
  },
  {
    id: 'kartini',
    name: 'Ibu Kartini',
    role: 'Code Governance & Docs',
    avatar: '📚',
    badgeColor: 'rose',
    specialty: 'Review clean code, tata kelola & standarisasi dokumentasi'
  },
  {
    id: 'gibran',
    name: 'Mas Gibran',
    role: 'Sat-Set Router & Dispatcher',
    avatar: '🚀',
    badgeColor: 'indigo',
    specialty: 'Klasifikasi maksud instruksi super cepat (<150ms) & routing'
  },
  {
    id: 'kancil',
    name: 'Si Kancil',
    role: 'Ultra-Fast Linter',
    avatar: '⚡',
    badgeColor: 'orange',
    specialty: 'Perapian indentasi kilat & validasi sintaks sebelum save'
  }
];

export const PROFESSIONAL_PERSONAS: AgentPersonaConfig[] = [
  {
    id: 'habibie',
    name: 'Lead Architect',
    role: 'Principal System Architect',
    avatar: '🏛️',
    badgeColor: 'amber',
    specialty: 'Rancangan arsitektur sistem tingkat tinggi & blueprint multi-file modular'
  },
  {
    id: 'kihadjar',
    name: 'Debug Specialist',
    role: 'Deep Reasoning & Root Cause',
    avatar: '🔬',
    badgeColor: 'purple',
    specialty: 'Investigasi deduksi mendalam (Chain-of-Thought) & resolusi exception'
  },
  {
    id: 'sutarjo',
    name: 'Core Engineer',
    role: 'Senior Implementor',
    avatar: '💻',
    badgeColor: 'sky',
    specialty: 'Implementasi coding fungsi presisi & surgical diff patching'
  },
  {
    id: 'dewi',
    name: 'UI/UX Specialist',
    role: 'Frontend & Responsive Lead',
    avatar: '🎨',
    badgeColor: 'teal',
    specialty: 'Penataan visual modern responsif, CSS layout & estetika antarmuka'
  },
  {
    id: 'bambang',
    name: 'QA & SecOps',
    role: 'Safety & Terminal Inspector',
    avatar: '🛡️',
    badgeColor: 'emerald',
    specialty: 'Sandbox terminal testing, sanitasi script & verifikasi build'
  },
  {
    id: 'kartini',
    name: 'Governance Lead',
    role: 'Documentation & Code Auditor',
    avatar: '📋',
    badgeColor: 'rose',
    specialty: 'Audit clean code, standar repository & pemeliharaan dokumentasi'
  },
  {
    id: 'gibran',
    name: 'Fast Dispatcher',
    role: 'Rapid Triage & Tool Router',
    avatar: '⚡',
    badgeColor: 'indigo',
    specialty: 'Routing maksud perintah instan (<150ms) & eksekusi cepat'
  }
];

export type SandboxMode = 'local' | 'browser';
export type ViewSplitMode = 'editor' | 'split' | 'preview';

export interface LocalOllamaModel {
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  family: string;
  parameterSize: string;
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

export interface AgentToolStep {
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
  status: 'running' | 'completed' | 'failed';
  summary?: string;
  output?: string;
  durationMs?: number;
  fileChanged?: {
    path: string;
    beforeContent?: string;
    afterContent: string;
  };
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  thoughts?: string[];
  toolSteps?: AgentToolStep[];
  modifiedFiles?: string[];
  statusText?: string;
  isStreaming?: boolean;
  error?: string;
  retryPrompt?: string;
  durationMs?: number;
  activePersona?: AgentPersonaConfig;
  activeAgents?: string[];
  qaAuditResult?: {
    status: 'passed' | 'warning' | 'error';
    score: number;
    issuesCount: number;
  };
}

export interface TerminalEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  source: 'user' | 'agent';
  timestamp: string;
}

export type TerminalTabType = 'terminal' | 'js_repl' | 'python_repl' | 'c_runner' | 'sql_runner' | 'problems' | 'test_runner' | 'agent_logs' | 'preview_console';

export interface CodebaseSnapshot {
  id: string;
  timestamp: string;
  source: 'ai_tool' | 'manual_save' | 'checkpoint';
  label: string;
  files: Record<string, string>;
  fileCount: number;
}

export interface RuangCoderIDEProps {
  onOpenSidebar?: () => void;
  onSwitchMode?: (mode: WorkspaceMode) => void;
}

export const BROWSER_SANDBOX_STORAGE_KEY = 'ruangcoder_browser_virtual_files_v2';
export const RUANGCODER_CHAT_HISTORY_KEY = 'ruangcoder_chat_messages_v1';

export const DEFAULT_STARTER_FILES: Record<string, string> = {
  'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RuangCoder Sandbox Application</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="app-card">
    <div class="badge">⚡ RuangCoder Live Sandbox</div>
    <h1>Halo dari RuangCoder!</h1>
    <p>AI Coding Agent otonom berbasis Local AI (Ollama). Minta agent di panel kanan untuk menambahkan fitur baru atau merombak UI.</p>
    <div class="counter-box">
      <button id="decBtn" class="btn btn-secondary">-</button>
      <span id="countValue">0</span>
      <button id="incBtn" class="btn btn-primary">+</button>
    </div>
    <p id="statusText" class="status-text">Siap mengeksekusi instruksi koding...</p>
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: radial-gradient(circle at 50% 10%, #1e293b, #090d16);
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.app-card {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 20px;
  padding: 32px;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
.badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  margin-bottom: 16px;
}
h1 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #38bdf8, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
p {
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 24px;
}
.counter-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}
#countValue {
  font-size: 36px;
  font-weight: 800;
  min-width: 60px;
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
  transition: transform 0.12s ease;
}
.btn:active {
  transform: scale(0.92);
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
}`,
  'app.js': `// RuangCoder Application Logic
let count = 0;

function updateDisplay() {
  const countEl = typeof document !== 'undefined' ? document.getElementById('countValue') : null;
  const statusEl = typeof document !== 'undefined' ? document.getElementById('statusText') : null;
  if (countEl) countEl.textContent = String(count);
  if (statusEl) statusEl.textContent = \`Counter: \${count}\`;
}

if (typeof document !== 'undefined') {
  document.getElementById('incBtn')?.addEventListener('click', () => {
    count++;
    updateDisplay();
  });
  document.getElementById('decBtn')?.addEventListener('click', () => {
    count--;
    updateDisplay();
  });
} else {
  console.log('RuangCoder backend runner script executed.');
}`,
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
}`,
  'test.js': `import { calculateStats } from './utils.js';

const stats = calculateStats([10, 20, 30, 40]);
console.log('Statistik:', stats);

if (stats.sum === 100 && stats.average === 25) {
  console.log('✅ TEST PASSED: Kalkulasi akurat!');
  process.exit(0);
} else {
  console.error('❌ TEST FAILED');
  process.exit(1);
}`,
  'package.json': JSON.stringify(
    {
      name: 'ruangcoder-workspace',
      version: '1.0.0',
      type: 'module',
      scripts: {
        test: 'node test.js',
        start: 'node app.js'
      }
    },
    null,
    2
  ),
  'README.md': `# RuangCoder Project Workspace
Workspace ini dikelola langsung oleh **RuangCoder Autonomous AI Agent** via Ollama.`
};

export const PROMPT_SUGGESTIONS = [
  '🔍 Audit seluruh struktur kode di workspace dan jelaskan alurnya.',
  '🎨 Ubah index.html dan styles.css menjadi Todo List & Pomodoro Timer bertema modern.',
  '🧪 Tambahkan fungsi hitung median di utils.js lalu jalankan test.js di terminal.',
  '⚡ Buat fitur kalkulator interaktif lengkap di index.html dan app.js.'
];

export function isImageFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.ico')
  );
}

export function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return <FileCode className="w-3.5 h-3.5 text-orange-500 shrink-0" aria-hidden="true" />;
  }
  if (lower.endsWith('.css')) {
    return <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" aria-hidden="true" />;
  }
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.ts')) {
    return <FileCode className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />;
  }
  if (lower.endsWith('.json')) {
    return <FileJson className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />;
  }
  if (isImageFile(filename)) {
    return <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" aria-hidden="true" />;
  }
  return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />;
}

/**
 * Isolated Pomodoro Timer component to avoid re-rendering the entire IDE every 1 second.
 */
export const PomodoroFocusBadge: React.FC<{ isDark: boolean }> = React.memo(({ isDark }) => {
  const [pomodoroSeconds, setPomodoroSeconds] = useState<number>(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState<boolean>(false);

  useEffect(() => {
    let timer: any = null;
    if (isPomodoroRunning && pomodoroSeconds > 0) {
      timer = setInterval(() => {
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            setIsPomodoroRunning(false);
            alert('🎉 Sesi Fokus 25 Menit Selesai! Saatnya istirahat mata sejenak 5 menit.');
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPomodoroRunning, pomodoroSeconds]);

  return (
    <button
      type="button"
      onClick={() => setIsPomodoroRunning(p => !p)}
      aria-pressed={isPomodoroRunning}
      aria-label={isPomodoroRunning ? 'Jeda Pomodoro Timer' : 'Mulai Pomodoro Focus 25 Menit'}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
        isPomodoroRunning
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
          : isDark
          ? 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-700'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
      }`}
      title={isPomodoroRunning ? 'Jeda Pomodoro Timer' : 'Mulai Pomodoro Focus 25 Menit'}
    >
      <Timer className={`w-3.5 h-3.5 ${isPomodoroRunning ? 'animate-spin text-amber-400' : ''}`} aria-hidden="true" />
      <span className="font-mono text-[11px]">
        {Math.floor(pomodoroSeconds / 60)
          .toString()
          .padStart(2, '0')}
        :{(pomodoroSeconds % 60).toString().padStart(2, '0')}
      </span>
    </button>
  );
});

export const FormattedAgentContent: React.FC<{ content: string; isDark: boolean }> = ({ content, isDark }) => {
  if (!content) return null;

  const thinkRegex = /\*\*Think:?\^?\*\*([\s\S]*?)(?=(?:\*\*Call:?\*\*|$))/i;
  const callRegex = /\*\*Call:?\*\*([\s\S]*?)$/i;

  const hasThink = thinkRegex.test(content);
  const hasCall = callRegex.test(content);

  if (!hasThink && !hasCall) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
        {content}
      </div>
    );
  }

  let intro = content;
  let thinkText = '';
  let callText = '';

  const thinkMatch = content.match(thinkRegex);
  if (thinkMatch) {
    intro = content.slice(0, thinkMatch.index).trim();
    thinkText = thinkMatch[1].trim();
  }

  const callMatch = content.match(callRegex);
  if (callMatch) {
    if (!thinkMatch) {
      intro = content.slice(0, callMatch.index).trim();
    }
    callText = callMatch[1].trim();
  }

  return (
    <div className="space-y-2">
      {intro && (
        <div className={`whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          {intro}
        </div>
      )}
      {thinkText && (
        <details
          className={`group rounded-xl border p-2.5 text-xs transition-colors ${
            isDark ? 'bg-purple-950/20 border-purple-500/25 text-purple-200' : 'bg-purple-50/70 border-purple-200 text-purple-900 shadow-2xs'
          }`}
        >
          <summary className="font-semibold cursor-pointer flex items-center justify-between select-none opacity-85 group-hover:opacity-100">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Brain className="w-3.5 h-3.5 text-purple-500 animate-pulse shrink-0" aria-hidden="true" />
              <span>Pemikiran Internal Agen</span>
            </div>
            <span className="text-[10px] text-purple-400 group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
          </summary>
          <div className="mt-2 pt-2 border-t border-purple-500/20 text-[11px] font-mono whitespace-pre-wrap leading-relaxed opacity-95">
            {thinkText}
          </div>
        </details>
      )}
      {callText && (
        <div
          role="status"
          aria-label={`Panggilan tool agen: ${callText}`}
          className={`rounded-xl border px-3 py-1.5 text-xs font-mono flex items-center gap-2 ${
            isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          <Wrench className="w-3 h-3 text-sky-500 shrink-0" aria-hidden="true" />
          <span className="truncate">{callText}</span>
        </div>
      )}
    </div>
  );
};

export interface CoderMobileNavBarProps {
  isDark: boolean;
  mobileTab: string;
  viewSplitMode: ViewSplitMode;
  isTerminalOpen: boolean;
  onSelectFiles: () => void;
  onSelectEditor: () => void;
  onSelectPreview: () => void;
  onSelectAi: () => void;
  onSelectTerminal: () => void;
  onSelectDiff: () => void;
}

export const CoderMobileNavBar: React.FC<CoderMobileNavBarProps> = React.memo(({
  isDark,
  mobileTab,
  viewSplitMode,
  isTerminalOpen,
  onSelectFiles,
  onSelectEditor,
  onSelectPreview,
  onSelectAi,
  onSelectTerminal,
  onSelectDiff
}) => (
  <nav
    aria-label="Mobile Navigation"
    role="tablist"
    className={`lg:hidden fixed bottom-0 left-0 right-0 h-12 border-t z-50 flex items-center justify-around px-2 pb-safe ${
      isDark ? 'bg-[#090d16]/95 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-600'
    } backdrop-blur-md`}
  >
    <button
      type="button"
      role="tab"
      aria-selected={mobileTab === 'files'}
      aria-label="Buka File Explorer"
      onClick={onSelectFiles}
      className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
        mobileTab === 'files' ? 'text-sky-400 font-bold' : ''
      }`}
    >
      <FolderOpen className="w-4 h-4" aria-hidden="true" />
      <span>Files</span>
    </button>

    <button
      type="button"
      role="tab"
      aria-selected={mobileTab === 'editor' && viewSplitMode !== 'preview'}
      aria-label="Buka Editor Kode"
      onClick={onSelectEditor}
      className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
        mobileTab === 'editor' && viewSplitMode !== 'preview' ? 'text-sky-400 font-bold' : ''
      }`}
    >
      <FileCode className="w-4 h-4" aria-hidden="true" />
      <span>Editor</span>
    </button>

    <button
      type="button"
      role="tab"
      aria-selected={mobileTab === 'preview' || viewSplitMode === 'preview'}
      aria-label="Buka Live Preview"
      onClick={onSelectPreview}
      className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
        mobileTab === 'preview' || viewSplitMode === 'preview' ? 'text-emerald-400 font-bold' : ''
      }`}
    >
      <Globe className="w-4 h-4" aria-hidden="true" />
      <span>Preview</span>
    </button>

    <button
      type="button"
      role="tab"
      aria-selected={mobileTab === 'ai'}
      aria-label="Buka AI Agent"
      onClick={onSelectAi}
      className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
        mobileTab === 'ai' ? 'text-purple-400 font-bold' : ''
      }`}
    >
      <Sparkles className="w-4 h-4" aria-hidden="true" />
      <span>AI Agent</span>
    </button>

    <button
      type="button"
      role="tab"
      aria-selected={mobileTab === 'terminal' || isTerminalOpen}
      aria-label="Buka Terminal Terintegrasi"
      onClick={onSelectTerminal}
      className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
        mobileTab === 'terminal' || isTerminalOpen ? 'text-amber-400 font-bold' : ''
      }`}
    >
      <TerminalIcon className="w-4 h-4" aria-hidden="true" />
      <span>Terminal</span>
    </button>

    <button
      type="button"
      role="tab"
      aria-selected={mobileTab === 'diff'}
      aria-label="Buka Diff Inspector"
      onClick={onSelectDiff}
      className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
        mobileTab === 'diff' ? 'text-rose-400 font-bold' : ''
      }`}
    >
      <GitCompare className="w-4 h-4" aria-hidden="true" />
      <span>Diff</span>
    </button>
  </nav>
));
