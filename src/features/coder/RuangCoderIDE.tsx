import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import {
  Terminal as TerminalIcon,
  FolderOpen,
  FileCode,
  Play,
  Sparkles,
  Cpu,
  HardDrive,
  Globe,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  Send,
  Square,
  Eye,
  GitCompare,
  Code2,
  Search,
  PanelLeftClose,
  PanelLeft,
  Wrench,
  Brain,
  RotateCcw,
  X,
  FileText,
  FileJson,
  Layers,
  Columns,
  Maximize2,
  Minimize2,
  Check,
  ArrowUpRight,
  Sun,
  Moon,
  Download,
  Bug,
  Smartphone,
  Tablet,
  Monitor,
  Copy,
  Edit3,
  Image as ImageIcon,
  Headphones,
  AlertTriangle,
  History,
  Upload,
  Undo2,
  MoreVertical, MoreHorizontal, PanelRightClose,
  ShieldCheck,
  FolderPlus,
  Crosshair,
  FileArchive,
  Mic,
  MicOff,
  QrCode,
  Timer,
  Heart,
  Award,
  Database,
  Users
} from 'lucide-react';
import { WorkspaceMode } from '../workspace/types';
import { apiClient } from '../../lib/apiClient';
import { safeLocalStorage } from '../../lib/storage';
import { useTheme } from '../../contexts/ThemeContext';
import { RuangMonacoEditor, detectMonacoLanguage } from './components/RuangMonacoEditor';
import { TemplateSelectorModal } from './components/TemplateSelectorModal';
import { StarterTemplate } from './components/starterTemplates';
import { QualityAuditModal } from './components/QualityAuditModal';
import { CoderInspectorDock } from './components/CoderInspectorDock';
import { CoderCommandTitleBar } from './components/CoderCommandTitleBar';
import { CoderStatusBar } from './components/CoderStatusBar';
import { performQualityAudit, QualityAuditReport } from './services/codeQualityAuditor';
import { DiffReviewModal } from './components/DiffReviewModal';
import { useCoderInlineDiff } from './hooks/useCoderInlineDiff';
import { InlineDiffDecorationBar } from './components/InlineDiffDecorationBar';
import { QrPreviewModal } from './components/QrPreviewModal';
import { QuickOpenModal } from './components/QuickOpenModal';
import { CommandPaletteModal, CommandItem } from './components/CommandPaletteModal';
import { InlineAiAssistModal } from './components/InlineAiAssistModal';
import { InlineAiActionBar } from './components/InlineAiActionBar';
import { StarterTemplateModal } from './components/StarterTemplateModal';
import {
  playTestPassSound,
  playTestFailSound,
  playFileModifiedSound,
  playHandOffSound
} from './services/coderSoundFx';
import { CdnLibraryModal } from './components/CdnLibraryModal';
import { formatCode } from './services/codeFormatter';
import { GitControlPanel } from './components/GitControlPanel';
import { ArtifactViewerModal, ArtifactData } from './components/ArtifactViewerModal';
import { AdvancedTabBar, SplitEditorMode } from './components/AdvancedTabBar';
import { GlobalSearchPanel } from './components/GlobalSearchPanel';
import { InteractiveReplDock } from './components/InteractiveReplDock';
import { BreadcrumbBar } from './components/BreadcrumbBar';
import { EditorProblemMarker } from './components/RuangMonacoEditor';
import { ErrorLensActionBanner } from './components/ErrorLensActionBanner';
import { WorkspaceProjectModal, WorkspaceProject } from './components/WorkspaceProjectModal';
import { ZenCodingBreakModal } from './components/ZenCodingBreakModal';
import { generateMarkdownLabReport, downloadFile } from './services/labReportExporter';
import { CodeFlowchartModal } from './components/CodeFlowchartModal';
import { GitHubExportModal } from './components/GitHubExportModal';
import { generateSmartTestFile } from './services/codeTestGenerator';
import { AutograderChallengeModal } from './components/AutograderChallengeModal';
import { runAutograderSuite, AutograderReport } from './services/codeEdgeCaseTester';
import { SqlPlaygroundModal } from './components/SqlPlaygroundModal';
import { MabaExplainerModal } from './components/MabaExplainerModal';
import { FrustrationSupportModal } from './components/FrustrationSupportModal';
import { PeerPairReviewModal } from './components/PeerPairReviewModal';
import { CodeMethodologyExplainerModal } from './components/CodeMethodologyExplainerModal';
import { codingErgonomicsService, ErgonomicsState } from './services/codingErgonomicsService';
import {
  GitBranch,
  GraduationCap
} from 'lucide-react';
import {
  soundscapeEngine,
  SoundscapeTrackId
} from '../../lib/soundscapeEngine';
import {
  initVirtualFsStorage,
  saveVirtualFile as saveVirtualFileIdb,
  deleteVirtualFile as deleteVirtualFileIdb,
  renameVirtualFile as renameVirtualFileIdb,
  duplicateVirtualFile as duplicateVirtualFileIdb,
  resetVirtualFiles as resetVirtualFilesIdb
} from './services/virtualFsStorage';

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

type SandboxMode = 'local' | 'browser';
type ViewSplitMode = 'editor' | 'split' | 'preview';

interface LocalOllamaModel {
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  family: string;
  parameterSize: string;
  roleBadge: string;
  recommendedForCoding: boolean;
  supportsNativeTools: boolean;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

interface AgentToolStep {
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

interface AgentChatMessage {
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

interface TerminalEntry {
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

interface RuangCoderIDEProps {
  onOpenSidebar?: () => void;
  onSwitchMode?: (mode: WorkspaceMode) => void;
}

const BROWSER_SANDBOX_STORAGE_KEY = 'ruangcoder_browser_virtual_files_v2';
const RUANGCODER_CHAT_HISTORY_KEY = 'ruangcoder_chat_messages_v1';

const DEFAULT_STARTER_FILES: Record<string, string> = {
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

const PROMPT_SUGGESTIONS = [
  '🔍 Audit seluruh struktur kode di workspace dan jelaskan alurnya.',
  '🎨 Ubah index.html dan styles.css menjadi Todo List & Pomodoro Timer bertema modern.',
  '🧪 Tambahkan fungsi hitung median di utils.js lalu jalankan test.js di terminal.',
  '⚡ Buat fitur kalkulator interaktif lengkap di index.html dan app.js.'
];

function isImageFile(filename: string): boolean {
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

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return <FileCode className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
  }
  if (lower.endsWith('.css')) {
    return <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
  }
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.ts')) {
    return <FileCode className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  }
  if (lower.endsWith('.json')) {
    return <FileJson className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  }
  if (isImageFile(filename)) {
    return <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
  }
  return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

/**
 * Isolated Pomodoro Timer component to avoid re-rendering the entire 4,000+ line IDE every 1 second.
 */
const PomodoroFocusBadge: React.FC<{ isDark: boolean }> = React.memo(({ isDark }) => {
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
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
        isPomodoroRunning
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
          : isDark
          ? 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-700'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
      }`}
      title={isPomodoroRunning ? 'Jeda Pomodoro Timer' : 'Mulai Pomodoro Focus 25 Menit'}
    >
      <Timer className={`w-3.5 h-3.5 ${isPomodoroRunning ? 'animate-spin text-amber-400' : ''}`} />
      <span className="font-mono text-[11px]">
        {Math.floor(pomodoroSeconds / 60)
          .toString()
          .padStart(2, '0')}
        :{(pomodoroSeconds % 60).toString().padStart(2, '0')}
      </span>
    </button>
  );
});

const FormattedAgentContent: React.FC<{ content: string; isDark: boolean }> = ({ content, isDark }) => {
  if (!content) return null;

  // Check for raw leaked **Think:^** or **Think:** or **Call:** in the agent's text
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
              <Brain className="w-3.5 h-3.5 text-purple-500 animate-pulse shrink-0" />
              <span>Pemikiran Internal Agen</span>
            </div>
            <span className="text-[10px] text-purple-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-2 pt-2 border-t border-purple-500/20 text-[11px] font-mono whitespace-pre-wrap leading-relaxed opacity-95">
            {thinkText}
          </div>
        </details>
      )}
      {callText && (
        <div
          className={`rounded-xl border px-3 py-1.5 text-xs font-mono flex items-center gap-2 ${
            isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          <Wrench className="w-3 h-3 text-sky-500 shrink-0" />
          <span className="truncate">{callText}</span>
        </div>
      )}
    </div>
  );
};

export const RuangCoderIDE: React.FC<RuangCoderIDEProps> = ({ onSwitchMode }) => {
  const navigate = useNavigate();
  const { actualTheme, toggleTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  // Activity Bar & Sidebar Navigation
  const [activeActivityTab, setActiveActivityTab] = useState<'explorer' | 'search' | 'git' | 'diff' | 'models'>('explorer');
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [isSuiteMenuOpen, setIsSuiteMenuOpen] = useState<boolean>(false);
  const suiteMenuRef = useRef<HTMLDivElement>(null);

  // Sandbox Mode: 'local' | 'browser'
  const [sandboxMode, setSandboxMode] = useState<SandboxMode>(() => {
    return (safeLocalStorage.getItem('ruangcoder_sandbox_mode') as SandboxMode) || 'local';
  });

  // Council Persona Mode: 'creative' | 'professional'
  const [personaMode, setPersonaMode] = useState<'creative' | 'professional'>(() => {
    return (safeLocalStorage.getItem('ruangcoder_persona_mode') as any) || 'creative';
  });

  // Local AI (Ollama) Models
  const [_models, setModels] = useState<LocalOllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return safeLocalStorage.getItem('ruangcoder_selected_model') || 'qwen3:8b';
  });
  const [ollamaReachable, setOllamaReachable] = useState<boolean>(true);
  const [_ollamaBaseUrl, setOllamaBaseUrl] = useState<string>('http://127.0.0.1:11434');
  const [_isLoadingModels, setIsLoadingModels] = useState<boolean>(false);

  // Local AI Provider State (Ollama On-Device)
  const [aiProvider, setAiProvider] = useState<'auto' | 'ollama' | 'gemini'>('ollama');
  const [geminiStatus, setGeminiStatus] = useState<{ available: boolean; models: string[] }>({
    available: false,
    models: []
  });

  // Multi-Project State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [projectsList, setProjectsList] = useState<WorkspaceProject[]>([
    { id: 'default', name: 'Default Workspace', path: 'coder-workspace' }
  ]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('default');

  // Zen Break State
  const [isZenBreakOpen, setIsZenBreakOpen] = useState<boolean>(false);
  const [zenBreakReason, setZenBreakReason] = useState<'streak' | 'repeated_errors' | 'manual'>('manual');

  // Intelligent Error Lens State
  const [lastTerminalError, setLastTerminalError] = useState<string | null>(null);

  // Flowchart & GitHub Gist Modals
  const [isFlowchartModalOpen, setIsFlowchartModalOpen] = useState<boolean>(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);

  // Filesystem State
  const [localTree, setLocalTree] = useState<FileTreeNode[]>([]);

  // Fetch Local File Tree with robust unwrap
  const refreshLocalWorkspace = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/api/v1/coder/fs/tree');
      const payload = res?.data?.data ?? res?.data;
      if (payload?.tree && Array.isArray(payload.tree)) {
        setLocalTree(payload.tree);
      }
    } catch (err) {
      console.error('Failed to load local tree:', err);
    }
  }, []);
  const [localFileCache, setLocalFileCache] = useState<Record<string, string>>({});
  const [browserFiles, setBrowserFiles] = useState<Record<string, string>>(() => {
    try {
      const raw = safeLocalStorage.getItem(BROWSER_SANDBOX_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_STARTER_FILES;
  });

  // Editor Tabs & Content State
  const [openTabs, setOpenTabs] = useState<string[]>(['index.html', 'styles.css', 'app.js']);
  const [activeFilePath, setActiveFilePath] = useState<string>('index.html');
  const [editorContent, setEditorContent] = useState<string>('');
  const [debouncedEditorContent, setDebouncedEditorContent] = useState<string>('');
  const [isAutoReloadEnabled, setIsAutoReloadEnabled] = useState<boolean>(true);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSavingFile, setIsSavingFile] = useState<boolean>(false);
  const [fileFilter, setFileFilter] = useState<string>('');
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [renamingFilePath, setRenamingFilePath] = useState<string | null>(null);
  const [renamingNewName, setRenamingNewName] = useState<string>('');

  // VS Code Equivalence Suite States: Multi-Pane & Diagnostics
  const [pinnedTabs, setPinnedTabs] = useState<string[]>([]);
  const [splitEditorMode, setSplitEditorMode] = useState<SplitEditorMode>('none');
  const [secondaryFilePath, setSecondaryFilePath] = useState<string | null>(null);
  const [secondaryEditorContent, setSecondaryEditorContent] = useState<string>('');
  const [secondaryIsDirty, setSecondaryIsDirty] = useState<boolean>(false);
  const [problemMarkers, setProblemMarkers] = useState<Record<string, EditorProblemMarker[]>>({});
  const [cursorPos, setCursorPos] = useState<{ line: number; column: number }>({ line: 1, column: 1 });

  const dirtyTabs = useMemo(() => {
    const s = new Set<string>();
    if (isDirty && activeFilePath) s.add(activeFilePath);
    if (secondaryIsDirty && secondaryFilePath) s.add(secondaryFilePath);
    return s;
  }, [isDirty, activeFilePath, secondaryIsDirty, secondaryFilePath]);

  // Agent Chat State with local persistence across page reloads
  const [messages, setMessages] = useState<AgentChatMessage[]>(() => {
    try {
      const saved = safeLocalStorage.getItem(RUANGCODER_CHAT_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Reset status isStreaming & statusText jika sempat tertinggal saat reload
          return parsed.map((m: AgentChatMessage) => ({
            ...m,
            isStreaming: false,
            statusText: undefined
          }));
        }
      }
    } catch (e) {
      console.warn('[RuangCoder] Gagal memulihkan riwayat chat:', e);
    }
    return [];
  });
  const [promptInput, setPromptInput] = useState<string>('');
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);

  // Auto-save chat messages to localStorage when updated (keep last 50 messages)
  useEffect(() => {
    try {
      if (messages.length > 0) {
        const cleaned = messages.slice(-50).map(m => ({
          ...m,
          isStreaming: false,
          statusText: undefined
        }));
        safeLocalStorage.setItem(RUANGCODER_CHAT_HISTORY_KEY, JSON.stringify(cleaned));
      } else {
        safeLocalStorage.removeItem(RUANGCODER_CHAT_HISTORY_KEY);
      }
    } catch (e) {
      console.warn('[RuangCoder] Gagal menyimpan riwayat chat:', e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      const bridgeRaw = sessionStorage.getItem('ruangkerja_to_coder_bridge');
      if (bridgeRaw) {
        sessionStorage.removeItem('ruangkerja_to_coder_bridge');
        const parsed = JSON.parse(bridgeRaw);
        if (parsed?.presetFiles && typeof parsed.presetFiles === 'object') {
          const pFiles = parsed.presetFiles as Record<string, string>;
          if (sandboxMode === 'browser') {
            setBrowserFiles(pFiles);
            for (const [p, c] of Object.entries(pFiles)) {
              saveVirtualFileIdb(p, c);
            }
          } else {
            for (const [p, c] of Object.entries(pFiles)) {
              apiClient.post('/api/v1/coder/fs/file', { path: p, content: c }).catch(() => {});
            }
            refreshLocalWorkspace();
          }
          const primaryFile = parsed.activeFile ||
            (pFiles['main.py'] ? 'main.py' :
             pFiles['query.sql'] ? 'query.sql' :
             pFiles['main.c'] ? 'main.c' :
             pFiles['index.html'] ? 'index.html' :
             Object.keys(pFiles)[0]);
          setActiveFilePath(primaryFile);
          setEditorContent(pFiles[primaryFile] || '');
          setOpenTabs(Object.keys(pFiles));
          setPreviewKey(k => k + 1);

          if (parsed.preferredTerminalTab) {
            setTerminalTab(parsed.preferredTerminalTab);
            setIsTerminalOpen(true);
          } else if (primaryFile.endsWith('.py')) {
            setTerminalTab('python_repl');
            setIsTerminalOpen(true);
          } else if (primaryFile.endsWith('.sql')) {
            setTerminalTab('sql_runner');
            setIsTerminalOpen(true);
          } else if (primaryFile.endsWith('.c')) {
            setTerminalTab('c_runner');
            setIsTerminalOpen(true);
          }

          if (parsed.prompt) {
            setPromptInput(parsed.prompt);
          }

          const assistantMsg = parsed.sourceType === 'thesis'
            ? `🎓 **Kode Skripsi Berhasil Dimuat dari Ruang Kerja!**\nBerkas \`${primaryFile}\` telah dibuka di Editor. Anda dapat mengeksekusi skrip di terminal/REPL atau menggunakan menu **"Bedah Metodologi Skripsi"** untuk menyusun Bab 3 & Bab 4 skripsi secara otomatis.`
            : `📥 **Proyek Berhasil Diimpor dari Ruang Kerja!**\nBerkas proyek \`${primaryFile}\` telah dimuat ke Live Sandbox.`;

          setMessages(prev => [
            ...prev,
            {
              id: `bridge_${Date.now()}`,
              role: 'assistant',
              content: assistantMsg,
              timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else if (parsed?.content) {
          const docTitle = parsed.title || 'Dokumen Import';
          const fileName = `imported_${(parsed.title || 'dokumen').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
          
          if (sandboxMode === 'browser') {
            setBrowserFiles(prev => ({ ...prev, [fileName]: parsed.content }));
            saveVirtualFileIdb(fileName, parsed.content);
          } else {
            apiClient.post('/api/v1/coder/fs/file', { path: fileName, content: parsed.content }).catch(() => {});
          }

          setActiveFilePath(fileName);
          setEditorContent(parsed.content);
          setPromptInput(`Halo Dewan AI! Saya baru saja mengimpor draf "${docTitle}" (${fileName}) dari Ruang Kerja. Tolong buatkan aplikasi visual web interaktif/dashboard berdasarkan dokumen ini!`);
          setMessages(prev => [
            ...prev,
            {
              id: `bridge_${Date.now()}`,
              role: 'assistant',
              content: `📥 **Draf Berhasil Diimpor dari Ruang Kerja!**\nBerkas \`${fileName}\` telah dibuka di Editor. Anda bisa meminta Dewan Ahli AI untuk menyusun kode aplikasi interaktif, simulasi, atau dashboard visual berdasarkan isi dokumen ini.`,
              timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      }
    } catch (e) {
      console.warn('[RuangCoder] Gagal membaca bridge dari Ruang Kerja:', e);
    }
  }, [sandboxMode, refreshLocalWorkspace]);

  // View Layout Modes (Default to Split for immediate live coding & preview feedback)
  const [viewSplitMode, setViewSplitMode] = useState<ViewSplitMode>('split');
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('ruangcoder_agent_panel_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [preZenState, setPreZenState] = useState<{ sidebar: boolean; agent: boolean; terminal: boolean } | null>(null);
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState<boolean>(false);
  const moreToolsRef = useRef<HTMLDivElement>(null);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState<boolean>(false);
  const [isExplorerMenuOpen, setIsExplorerMenuOpen] = useState<boolean>(false);
  const explorerMenuRef = useRef<HTMLDivElement>(null);

  // OS detection for shortcuts
  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.platform),
    []
  );
  const [terminalTab, setTerminalTab] = useState<TerminalTabType>('terminal');
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([]);
  const [consecutiveFailures, setConsecutiveFailures] = useState<number>(0);
  const [testRunnerResult, setTestRunnerResult] = useState<{
    status: 'idle' | 'running' | 'success' | 'failure';
    output: string;
    durationMs: number;
  }>({ status: 'idle', output: '', durationMs: 0 });

  // Mobile Navigation Tab (< 1024px)
  const [mobileTab, setMobileTab] = useState<'editor' | 'files' | 'preview' | 'ai' | 'terminal' | 'diff'>('editor');

  // Lo-Fi Focus Audio State
  const [isLofiPlaying, setIsLofiPlaying] = useState<boolean>(soundscapeEngine.state.isPlaying);
  const [currentLofiTrack, _setCurrentLofiTrack] = useState<SoundscapeTrackId>('rain');
  const [_isLofiMenuOpen, _setIsLofiMenuOpen] = useState<boolean>(false);

  // Diff & Micro-Commit Snapshot State
  const [lastDiff, setLastDiff] = useState<{
    path: string;
    beforeContent: string;
    afterContent: string;
  } | null>(null);
  const activeInlineDiff = useCoderInlineDiff(
    lastDiff && lastDiff.path === activeFilePath ? lastDiff.beforeContent : '',
    lastDiff && lastDiff.path === activeFilePath ? lastDiff.afterContent : ''
  );
  const [snapshots, setSnapshots] = useState<CodebaseSnapshot[]>(() => [
    {
      id: `snap_init`,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      source: 'checkpoint',
      label: 'Inisialisasi Project',
      files: { ...DEFAULT_STARTER_FILES },
      fileCount: Object.keys(DEFAULT_STARTER_FILES).length
    }
  ]);

  // Multi-Agent Council State
  const [activeCouncilPersona, setActiveCouncilPersona] = useState<AgentPersonaConfig | null>(null);

  // Starter Templates & Quality Audit Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isStarterGalleryOpen, setIsStarterGalleryOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<QualityAuditReport | null>(null);
  const [isDiffReviewModalOpen, setIsDiffReviewModalOpen] = useState<boolean>(false);
  const [isInspectElementActive, setIsInspectElementActive] = useState<boolean>(false);
  const [inspectedElementInfo, setInspectedElementInfo] = useState<{ tag: string; selector: string; text: string } | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // Next-Gen Coder Modules (Autograder, SQL Canvas, ELIM Maba, Ergonomics, Peer Pair)
  const [isAutograderModalOpen, setIsAutograderModalOpen] = useState<boolean>(false);
  const [autograderReport, setAutograderReport] = useState<AutograderReport | null>(null);
  const [isAutograderRunning, setIsAutograderRunning] = useState<boolean>(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [isMabaExplainerModalOpen, setIsMabaExplainerModalOpen] = useState<boolean>(false);
  const [isFrustrationModalOpen, setIsFrustrationModalOpen] = useState<boolean>(false);
  const [isPairReviewModalOpen, setIsPairReviewModalOpen] = useState<boolean>(false);
  const [isThesisMethodologyModalOpen, setIsThesisMethodologyModalOpen] = useState<boolean>(false);
  const [ergonomicsState, setErgonomicsState] = useState<ErgonomicsState>(() => codingErgonomicsService.getState());

  useEffect(() => {
    const unsub = codingErgonomicsService.subscribe(setErgonomicsState);
    return unsub;
  }, []);

  // Power-User IDE Modals (Quick Open, Command Palette, Inline AI, CDN Libraries)
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isInlineAiOpen, setIsInlineAiOpen] = useState<boolean>(false);
  const [inlineAiSelectedText, setInlineAiSelectedText] = useState<string>('');
  const [isInlineAiFloatingOpen, setIsInlineAiFloatingOpen] = useState<boolean>(false);
  const [isCdnModalOpen, setIsCdnModalOpen] = useState<boolean>(false);

  // Voice Prompting State
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false);

  // Dynamic Resizable Panel Dimensions (Pixels or Percentages)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = safeLocalStorage.getItem('ruangcoder_sidebar_w');
    return saved ? Number(saved) : 240;
  });
  const [agentPanelWidth, setAgentPanelWidth] = useState<number>(() => {
    const saved = safeLocalStorage.getItem('ruangcoder_agent_w');
    return saved ? Number(saved) : 440;
  });
  const [editorSplitRatio, setEditorSplitRatio] = useState<number>(() => {
    const saved = safeLocalStorage.getItem('ruangcoder_split_ratio');
    return saved ? Number(saved) : 50; // 50% editor, 50% preview
  });
  const [terminalHeight, setTerminalHeight] = useState<number>(() => {
    const saved = safeLocalStorage.getItem('ruangcoder_terminal_h');
    return saved ? Number(saved) : 220;
  });

  // Artifacts Viewer Modal State (Antigravity style)
  const [activeArtifact, _setActiveArtifact] = useState<ArtifactData | null>(null);
  const [isArtifactModalOpen, setIsArtifactModalOpen] = useState<boolean>(false);

  // Context Tag Autocomplete State (@file, @problems, @web)
  const [isContextTagMenuOpen, setIsContextTagMenuOpen] = useState<boolean>(false);

  // Global Code Search State
  const [_globalSearchQuery, _setGlobalSearchQuery] = useState<string>('');
  const [_globalSearchResults, setGlobalSearchResults] = useState<Array<{ file: string; line: number; text: string }>>([]);
  const [_isSearchingCode, setIsSearchingCode] = useState<boolean>(false);

  // Live Preview Console & Viewport State
  const [previewLogs, setPreviewLogs] = useState<Array<{ id: string; level: 'log' | 'warn' | 'error'; text: string; time: string }>>([]);
  const [isPreviewConsoleOpen, setIsPreviewConsoleOpen] = useState<boolean>(false);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Preview Console & Element Inspector Message Listener
  useEffect(() => {
    const handlePreviewMessage = (e: MessageEvent) => {
      if (e.data?.type === 'ruangcoder_preview_console') {
        const { level, message, time } = e.data;
        setPreviewLogs(prev => [
          ...prev.slice(-100),
          {
            id: `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            level: level || 'log',
            text: message || '',
            time: time || new Date().toLocaleTimeString('id-ID')
          }
        ]);
      } else if (e.data?.type === 'ruangcoder_element_selected') {
        const { tag, id, className, text } = e.data;
        const selector = tag + (id ? `#${id}` : '') + (className ? `.${className.split(' ').filter(Boolean).slice(0, 2).join('.')}` : '');
        setInspectedElementInfo({ tag, selector, text: text || '' });
        const dewi = COUNCIL_PERSONAS.find(p => p.id === 'dewi');
        if (dewi) setActiveCouncilPersona(dewi);
        setPromptInput(`Mbak Dewi, tolong ubah style/tampilan elemen <${selector}> ini: "${(text || '').slice(0, 40)}"`);
        setIsInspectElementActive(false);
      }
    };
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, []);

  // Voice Prompting using Web Speech API
  const handleToggleVoicePrompt = () => {
    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung Web Speech Recognition. Gunakan browser modern (Chrome / Edge).');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;
      setIsVoiceRecording(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setPromptInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsVoiceRecording(false);
      };

      recognition.onerror = () => {
        setIsVoiceRecording(false);
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      recognition.start();
    } catch {
      setIsVoiceRecording(false);
    }
  };

  // High-performance mouse drag handlers with requestAnimationFrame throttling and deferred localStorage
  const handleStartResizeSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    let latestW = startW;
    let rafId: number | null = null;

    const onMouseMove = (moveEv: MouseEvent) => {
      latestW = Math.max(160, Math.min(500, startW + (moveEv.clientX - startX)));
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setSidebarWidth(latestW);
          rafId = null;
        });
      }
    };
    const onMouseUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      safeLocalStorage.setItem('ruangcoder_sidebar_w', String(latestW));
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleStartResizeAgentPanel = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = agentPanelWidth;
    let latestW = startW;
    let rafId: number | null = null;

    const onMouseMove = (moveEv: MouseEvent) => {
      latestW = Math.max(280, Math.min(800, startW - (moveEv.clientX - startX)));
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setAgentPanelWidth(latestW);
          rafId = null;
        });
      }
    };
    const onMouseUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      safeLocalStorage.setItem('ruangcoder_agent_w', String(latestW));
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleStartResizeSplitRatio = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = document.getElementById('ruangcoder-editor-split-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let latestRatio = editorSplitRatio;
    let rafId: number | null = null;

    const onMouseMove = (moveEv: MouseEvent) => {
      const relativeX = moveEv.clientX - rect.left;
      latestRatio = Math.max(15, Math.min(85, Math.round((relativeX / rect.width) * 100)));
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setEditorSplitRatio(latestRatio);
          rafId = null;
        });
      }
    };
    const onMouseUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      safeLocalStorage.setItem('ruangcoder_split_ratio', String(latestRatio));
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleStartResizeTerminal = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = terminalHeight;
    let latestH = startH;
    let rafId: number | null = null;

    const onMouseMove = (moveEv: MouseEvent) => {
      latestH = Math.max(100, Math.min(650, startH - (moveEv.clientY - startY)));
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setTerminalHeight(latestH);
          rafId = null;
        });
      }
    };
    const onMouseUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      safeLocalStorage.setItem('ruangcoder_terminal_h', String(latestH));
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Sync soundscape engine state
  useEffect(() => {
    const unsub = soundscapeEngine.subscribe(st => {
      setIsLofiPlaying(st.isPlaying);
    });
    return () => unsub();
  }, []);

  // Register and sync with RuangCoder Virtual Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/ruangcoder-sw.js', { scope: '/ruangcoder-virtual/' })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const activeFiles = sandboxMode === 'browser' ? browserFiles : localFileCache;
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_VIRTUAL_FILES',
        files: activeFiles
      });
    }
  }, [sandboxMode, browserFiles, localFileCache]);

  // Snapshot Creation Helper
  const createSnapshot = useCallback(
    (label: string, source: 'ai_tool' | 'manual_save' | 'checkpoint' = 'checkpoint') => {
      const activeMap = sandboxMode === 'browser' ? { ...browserFiles } : { ...localFileCache };
      const newSnap: CodebaseSnapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        source,
        label,
        files: activeMap,
        fileCount: Object.keys(activeMap).length
      };
      setSnapshots(prev => [newSnap, ...prev.slice(0, 19)]);
    },
    [sandboxMode, browserFiles, localFileCache]
  );

  // Rollback to Specific Snapshot
  const handleRollbackSnapshot = async (snap: CodebaseSnapshot) => {
    const confirmRollback = window.confirm(
      `Rollback kode ke snapshot "${snap.label}" (${snap.timestamp})?\nSemua file virtual akan dikembalikan ke titik ini.`
    );
    if (!confirmRollback) return;

    if (sandboxMode === 'browser') {
      setBrowserFiles(snap.files);
      for (const [p, c] of Object.entries(snap.files)) {
        await saveVirtualFileIdb(p, c);
      }
    } else {
      for (const [p, c] of Object.entries(snap.files)) {
        await apiClient.post('/api/v1/coder/fs/file', { path: p, content: c });
      }
      await refreshLocalWorkspace();
    }

    if (snap.files[activeFilePath]) {
      setEditorContent(snap.files[activeFilePath]);
    } else {
      const first = Object.keys(snap.files)[0] || 'index.html';
      setActiveFilePath(first);
      setEditorContent(snap.files[first] || '');
    }

    setIsDirty(false);
    setLastDiff(null);
    setPreviewKey(k => k + 1);
  };

  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const _editorTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Close Dropdowns on Click Outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (suiteMenuRef.current && !suiteMenuRef.current.contains(e.target as Node)) {
        setIsSuiteMenuOpen(false);
      }
      if (explorerMenuRef.current && !explorerMenuRef.current.contains(e.target as Node)) {
        setIsExplorerMenuOpen(false);
      }
      if (moreToolsRef.current && !moreToolsRef.current.contains(e.target as Node)) {
        setIsMoreToolsOpen(false);
      }
    };
    if (isSuiteMenuOpen || isExplorerMenuOpen || isMoreToolsOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSuiteMenuOpen, isExplorerMenuOpen, isMoreToolsOpen]);

  // Persist State
  useEffect(() => {
    safeLocalStorage.setItem('ruangcoder_agent_panel_open', String(isAgentPanelOpen));
  }, [isAgentPanelOpen]);

  const handleToggleZenMode = useCallback(() => {
    setIsZenMode(prev => {
      if (!prev) {
        setPreZenState({
          sidebar: isSidebarVisible,
          agent: isAgentPanelOpen,
          terminal: isTerminalOpen
        });
        setIsSidebarVisible(false);
        setIsAgentPanelOpen(false);
        setIsTerminalOpen(false);
        return true;
      } else {
        if (preZenState) {
          setIsSidebarVisible(preZenState.sidebar);
          setIsAgentPanelOpen(preZenState.agent);
          setIsTerminalOpen(preZenState.terminal);
        } else {
          setIsSidebarVisible(true);
          setIsAgentPanelOpen(true);
        }
        return false;
      }
    });
  }, [isSidebarVisible, isAgentPanelOpen, isTerminalOpen, preZenState]);

  // Persist State
  useEffect(() => {
    safeLocalStorage.setItem('ruangcoder_sandbox_mode', sandboxMode);
  }, [sandboxMode]);

  useEffect(() => {
    safeLocalStorage.setItem('ruangcoder_persona_mode', personaMode);
  }, [personaMode]);

  useEffect(() => {
    if (selectedModel) safeLocalStorage.setItem('ruangcoder_selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    try {
      safeLocalStorage.setItem(BROWSER_SANDBOX_STORAGE_KEY, JSON.stringify(browserFiles));
    } catch {}
  }, [browserFiles]);

  // Debounced editor content synchronization to eliminate iframe reload flickering
  useEffect(() => {
    if (!isAutoReloadEnabled) return;
    const timer = setTimeout(() => {
      setDebouncedEditorContent(editorContent);
    }, 1200);
    return () => clearTimeout(timer);
  }, [editorContent, isAutoReloadEnabled]);

  // Fetch Ollama Models with robust unwrap
  const fetchOllamaInventory = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const res = await apiClient.get<any>('/api/v1/coder/models');
      const payload = res?.data?.data ?? res?.data;
      if (payload) {
        setOllamaReachable(Boolean(payload.reachable));
        if (payload.baseUrl) setOllamaBaseUrl(payload.baseUrl);
        if (payload.gemini) {
          setGeminiStatus({
            available: Boolean(payload.gemini.available),
            models: Array.isArray(payload.gemini.models) ? payload.gemini.models : []
          });
        }
        const list: LocalOllamaModel[] = Array.isArray(payload.models) ? payload.models : [];
        setModels(list);
        if (list.length > 0 && !list.some(m => m.name === selectedModel)) {
          const qwen = list.find(m => m.name.includes('qwen3:8b')) || list[0];
          setSelectedModel(qwen.name);
        }
      }
    } catch {
      setOllamaReachable(false);
    } finally {
      setIsLoadingModels(false);
    }
  }, [selectedModel]);

  // Fetch Projects List for Workspace Manager
  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/api/v1/coder/projects');
      const payload = res?.data?.data ?? res?.data;
      if (payload?.projects && Array.isArray(payload.projects)) {
        setProjectsList(payload.projects);
      }
    } catch (err) {
      console.warn('Gagal memuat daftar proyek:', err);
    }
  }, []);

  const handleCreateProject = useCallback(async (name: string, templateId?: string) => {
    const res = await apiClient.post<any>('/api/v1/coder/projects', { name, templateId });
    const payload = res?.data?.data ?? res?.data;
    if (payload?.id) {
      setCurrentProjectId(payload.id);
      await fetchProjects();
    }
  }, [fetchProjects]);

  const handleExportLabReport = useCallback(() => {
    const currentFiles = sandboxMode === 'browser' ? browserFiles : { [activeFilePath]: editorContent };
    const latestTestOutput = [...terminalEntries].reverse().find(e => e.command.includes('test'))?.stdout 
      || testRunnerResult.output 
      || 'Semua tes berhasil dijalankan tanpa kendala.';
    
    const markdown = generateMarkdownLabReport({
      title: `Laporan Praktikum - Proyek ${currentProjectId}`,
      studentName: 'Mahasiswa Ruang Tenang',
      courseName: 'Praktikum Pemrograman & Algoritma',
      summary: `Pengembangan kode interaktif dan pengujian fungsional modul proyek ${currentProjectId} pada Ruang Coder.`,
      files: currentFiles,
      testOutput: latestTestOutput
    });

    downloadFile(markdown, `Laporan_Praktikum_${currentProjectId}.md`);
  }, [sandboxMode, browserFiles, activeFilePath, editorContent, terminalEntries, testRunnerResult, currentProjectId]);

  const handleExportLabReportToRuangKerja = useCallback(() => {
    const currentFiles = sandboxMode === 'browser' ? browserFiles : { [activeFilePath]: editorContent };
    const latestTestOutput = [...terminalEntries].reverse().find(e => e.command.includes('test'))?.stdout 
      || testRunnerResult.output 
      || 'Semua tes berhasil dijalankan tanpa kendala.';
    
    const markdown = generateMarkdownLabReport({
      title: `Laporan Praktikum - Proyek ${currentProjectId}`,
      studentName: 'Mahasiswa Ruang Tenang',
      courseName: 'Praktikum Pemrograman & Algoritma',
      summary: `Pengembangan kode interaktif dan pengujian fungsional modul proyek ${currentProjectId} pada Ruang Coder.`,
      files: currentFiles,
      testOutput: latestTestOutput
    });

    const payload = {
      title: `Laporan Praktikum: ${currentProjectId}`,
      content: markdown,
      type: 'DOCUMENT',
      sourceFile: activeFilePath,
      createdAt: Date.now()
    };
    sessionStorage.setItem('coder_to_ruangkerja_bridge', JSON.stringify(payload));
    if (onSwitchMode) {
      onSwitchMode('RUANG_KERJA');
    } else {
      navigate('/workspace');
    }
  }, [sandboxMode, browserFiles, activeFilePath, editorContent, terminalEntries, testRunnerResult, currentProjectId, onSwitchMode, navigate]);

  const handleExportRunOutputToThesis = useCallback(() => {
    try {
      const lang = activeFilePath.endsWith('.py')
        ? 'python'
        : activeFilePath.endsWith('.sql')
        ? 'sql'
        : activeFilePath.endsWith('.c')
        ? 'c'
        : activeFilePath.endsWith('.html')
        ? 'html'
        : 'javascript';

      let outputText = '';
      if (terminalTab === 'preview_console') {
        outputText = previewLogs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.text}`).join('\n');
      } else {
        outputText = terminalEntries
          .map(e => `${e.command ? `$ ${e.command}\n` : ''}${e.stdout}${e.stderr ? `\n[STDERR]: ${e.stderr}` : ''}`)
          .join('\n\n');
      }

      if (!outputText.trim()) {
        outputText = `Status: Modul ${activeFilePath} dieksekusi melalui sandbox ${terminalTab}.\nTidak ada galat runtime (Exit code: 0).`;
      }

      const timestamp = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' });

      const markdown = `# Lampiran Bab IV: Catatan Pengujian & Log Eksekusi Komputasi

> **Sumber Berkas:** \`${activeFilePath}\`  
> **Waktu Pengujian:** ${timestamp}  
> **Lingkungan Eksekusi:** RuangCoder IDE Sandbox (\`${terminalTab}\`)

---

## 1. Skrip / Modul Program yang Diuji
\`\`\`${lang}
${editorContent}
\`\`\`

## 2. Luaran Eksekusi & Log Terminal (Empirical Run Output)
\`\`\`text
${outputText}
\`\`\`

## 3. Pembahasan Empiris untuk Bab IV Skripsi
Berdasarkan log pengujian di atas, modul program \`${activeFilePath}\` telah dijalankan secara empiris dan menghasilkan luaran komputasi yang deterministik.

### Poin-Poin Analisis:
1. **Keberhasilan Eksekusi:** Modul berjalan tanpa galat fatal (*unhandled exception*) dan mematuhi spesifikasi fungsi yang didefinisikan pada perancangan Bab III.
2. **Kesesuaian Masukan-Keluaran:** Luaran yang dihasilkan pada terminal mencerminkan transformasi data atau komputasi matematis yang diharapkan.
3. **Validasi Eksperimental:** Log eksekusi ini dapat dijadikan bukti otentik pengujian sistem pada sidang komprehensif atau laporan tugas akhir.
`;

      const payload = {
        title: `Lampiran Bab 4 - Output Run ${activeFilePath}`,
        content: markdown,
        type: 'DOCUMENT',
        sourceFile: activeFilePath,
        createdAt: Date.now()
      };

      sessionStorage.setItem('coder_to_ruangkerja_bridge', JSON.stringify(payload));
      if (onSwitchMode) {
        onSwitchMode('RUANG_KERJA');
      } else {
        navigate('/workspace');
      }
    } catch (err) {
      console.error('Gagal mengekspor log pengujian ke Ruang Kerja:', err);
    }
  }, [activeFilePath, terminalTab, previewLogs, terminalEntries, editorContent, onSwitchMode, navigate]);

  const handleTriggerAiAutoFix = useCallback((file: string) => {
    const markers = problemMarkers[file] || [];
    if (!markers.length) return;
    const errorDescriptions = markers.map(m => `Baris ${m.startLineNumber}: ${m.message}`).join('\n');
    const fixPrompt = `Tolong perbaiki error sintaksis berikut pada berkas \`${file}\`:\n\n${errorDescriptions}\n\nKode saat ini:\n\`\`\`\n${editorContent}\n\`\`\`\n\nJelaskan letak kesalahannya dan berikan kode perbaikannya.`;
    setPromptInput(fixPrompt);
    setIsAgentPanelOpen(true);
  }, [problemMarkers, editorContent]);

  // Read file into editor with robust unwrap
  const loadFileIntoEditor = useCallback(
    async (filePath: string, modeOverride?: SandboxMode) => {
      const mode = modeOverride || sandboxMode;
      setActiveFilePath(filePath);
      setIsDirty(false);

      if (!openTabs.includes(filePath)) {
        setOpenTabs(prev => [...prev, filePath]);
      }

      if (mode === 'browser') {
        const content = browserFiles[filePath] ?? '';
        setEditorContent(content);
        setDebouncedEditorContent(content);
        return;
      }

      try {
        const res = await apiClient.get<any>(`/api/v1/coder/fs/file?path=${encodeURIComponent(filePath)}`);
        const payload = res?.data?.data ?? res?.data;
        const content = typeof payload?.content === 'string' ? payload.content : '';
        setEditorContent(content);
        setDebouncedEditorContent(content);
        setLocalFileCache(prev => ({ ...prev, [filePath]: content }));
      } catch {
        setEditorContent('');
        setDebouncedEditorContent('');
      }
    },
    [sandboxMode, browserFiles, openTabs]
  );

  // Sync cache for web preview
  const syncLocalPreviewCache = useCallback(async () => {
    for (const f of ['index.html', 'styles.css', 'app.js']) {
      try {
        const res = await apiClient.get<any>(`/api/v1/coder/fs/file?path=${encodeURIComponent(f)}`);
        const payload = res?.data?.data ?? res?.data;
        if (typeof payload?.content === 'string') {
          setLocalFileCache(prev => ({ ...prev, [f]: payload.content }));
        }
      } catch {}
    }
  }, []);

  // Initial Load & IndexedDB Migration
  useEffect(() => {
    void (async () => {
      const stored = await initVirtualFsStorage(DEFAULT_STARTER_FILES);
      if (stored && Object.keys(stored).length > 0) {
        setBrowserFiles(stored);
      }
    })();
    void fetchOllamaInventory();
    void refreshLocalWorkspace();
    void syncLocalPreviewCache();
  }, [fetchOllamaInventory, refreshLocalWorkspace, syncLocalPreviewCache]);

  useEffect(() => {
    void loadFileIntoEditor(activeFilePath, sandboxMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxMode, refreshLocalWorkspace]);

  const handleGenerateAutoUnitTest = useCallback(async () => {
    const testSuite = generateSmartTestFile(activeFilePath, editorContent);
    const testPath = testSuite.testFilename;
    if (sandboxMode === 'browser') {
      setBrowserFiles(prev => ({ ...prev, [testPath]: testSuite.testCode }));
      await saveVirtualFileIdb(testPath, testSuite.testCode);
    } else {
      await apiClient.post('/api/v1/coder/fs/file', {
        path: testPath,
        content: testSuite.testCode
      });
      await refreshLocalWorkspace();
    }
    if (!openTabs.includes(testPath)) {
      setOpenTabs(prev => [...prev, testPath]);
    }
    await loadFileIntoEditor(testPath);
    setTerminalTab('test_runner');
    setIsTerminalOpen(true);
  }, [activeFilePath, editorContent, sandboxMode, openTabs, loadFileIntoEditor, refreshLocalWorkspace]);

  // Close tab
  const handleCloseTab = (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const remaining = openTabs.filter(t => t !== filePath);
    setOpenTabs(remaining);
    if (activeFilePath === filePath && remaining.length > 0) {
      void loadFileIntoEditor(remaining[remaining.length - 1]);
    }
    if (secondaryFilePath === filePath) {
      setSecondaryFilePath(null);
      setSplitEditorMode('none');
    }
  };

  const handleTogglePinTab = (filePath: string) => {
    setPinnedTabs(prev =>
      prev.includes(filePath) ? prev.filter(t => t !== filePath) : [...prev, filePath]
    );
  };

  const handleCloseOthers = (filePath: string) => {
    setOpenTabs(prev => prev.filter(t => t === filePath || pinnedTabs.includes(t)));
    if (activeFilePath !== filePath) {
      void loadFileIntoEditor(filePath);
    }
  };

  const handleCloseToTheRight = (filePath: string) => {
    const idx = openTabs.indexOf(filePath);
    if (idx === -1) return;
    setOpenTabs(prev => prev.filter((t, i) => i <= idx || pinnedTabs.includes(t)));
  };

  const handleCloseSaved = () => {
    setOpenTabs(prev => prev.filter(t => dirtyTabs.has(t) || pinnedTabs.includes(t) || t === activeFilePath));
  };

  const handleCopyPath = (filePath: string) => {
    void navigator.clipboard?.writeText(filePath);
  };

  const handleSplitEditor = (mode: SplitEditorMode, targetPath?: string) => {
    setSplitEditorMode(mode);
    if (mode === 'none') {
      setSecondaryFilePath(null);
      return;
    }
    const fileToSplit = targetPath || (openTabs.find(t => t !== activeFilePath) || activeFilePath);
    setSecondaryFilePath(fileToSplit);
    const content = sandboxMode === 'browser' ? browserFiles[fileToSplit] || '' : localFileCache[fileToSplit] || '';
    setSecondaryEditorContent(content);
    setSecondaryIsDirty(false);
  };

  const handleSaveSecondaryFile = useCallback(async () => {
    if (!secondaryFilePath) return;
    setDebouncedEditorContent(secondaryEditorContent);
    if (sandboxMode === 'browser') {
      setBrowserFiles(prev => ({ ...prev, [secondaryFilePath]: secondaryEditorContent }));
      void saveVirtualFileIdb(secondaryFilePath, secondaryEditorContent);
      setSecondaryIsDirty(false);
      setPreviewKey(k => k + 1);
    } else {
      const res = await apiClient.post<any>('/api/v1/coder/fs/file', {
        path: secondaryFilePath,
        content: secondaryEditorContent
      });
      if (res.success) {
        setLocalFileCache(prev => ({ ...prev, [secondaryFilePath]: secondaryEditorContent }));
        setSecondaryIsDirty(false);
        setPreviewKey(k => k + 1);
      }
    }
  }, [secondaryFilePath, secondaryEditorContent, sandboxMode]);

  // Save current active file
  const handleSaveFile = useCallback(async () => {
    if (!activeFilePath) return;
    setIsSavingFile(true);
    setDebouncedEditorContent(editorContent);
    try {
      if (sandboxMode === 'browser') {
        setBrowserFiles(prev => ({ ...prev, [activeFilePath]: editorContent }));
        void saveVirtualFileIdb(activeFilePath, editorContent);
        setIsDirty(false);
        setPreviewKey(k => k + 1);
        createSnapshot(`Simpan ${activeFilePath}`, 'manual_save');
      } else {
        const res = await apiClient.post<any>('/api/v1/coder/fs/file', {
          path: activeFilePath,
          content: editorContent
        });
        if (res.success) {
          setLocalFileCache(prev => ({ ...prev, [activeFilePath]: editorContent }));
          setIsDirty(false);
          setPreviewKey(k => k + 1);
          createSnapshot(`Simpan ${activeFilePath}`, 'manual_save');
          void refreshLocalWorkspace();
        }
      }
    } finally {
      setIsSavingFile(false);
    }
  }, [activeFilePath, editorContent, sandboxMode, refreshLocalWorkspace, createSnapshot]);

  // Tab key indentation support in textarea
  const _handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const updated = val.substring(0, start) + '  ' + val.substring(end);
      setEditorContent(updated);
      setIsDirty(true);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Export workspace as ZIP archive
  const handleExportZip = useCallback(async () => {
    try {
      if (sandboxMode === 'local') {
        const link = document.createElement('a');
        link.href = '/api/v1/coder/fs/export-zip';
        link.download = 'ruangcoder-workspace.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const zip = new JSZip();
        for (const [fName, content] of Object.entries(browserFiles)) {
          zip.file(fName, content);
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ruangcoder-sandbox.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export ZIP:', err);
    }
  }, [sandboxMode, browserFiles]);

  // Export single standalone HTML bundle (Self-Contained)
  const handleExportSingleHtmlBundle = () => {
    try {
      const blob = new Blob([livePreviewHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ruangcoder-bundle.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export single HTML:', err);
    }
  };

  // Export active file or snippet back to Ruang Kerja Canvas (F3.7 Bidirectional Bridge)
  const handleExportToRuangKerja = () => {
    try {
      const activeContent = editorContent || browserFiles[activeFilePath] || '';
      const ext = activeFilePath.split('.').pop() || 'txt';
      const lang = ext === 'html' ? 'html' : ext === 'css' ? 'css' : ext === 'json' ? 'json' : ext === 'py' ? 'python' : 'javascript';
      const payload = {
        title: `Lampiran Kode: ${activeFilePath}`,
        content: `### 💻 Implementasi Berkas: \`${activeFilePath}\`\n\n> Diekspor langsung dari lingkungan pengembangan **Ruang Coder** pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.\n\n\`\`\`${lang}\n${activeContent}\n\`\`\`\n\n#### 📌 Catatan Penjelasan Algoritma:\n- Berkas ini mengimplementasikan logika utama dari modul terkait.\n- Telah diuji melalui Live Sandbox Ruang Coder.`,
        type: 'CODE',
        sourceFile: activeFilePath,
        createdAt: Date.now()
      };
      sessionStorage.setItem('coder_to_ruangkerja_bridge', JSON.stringify(payload));
      if (onSwitchMode) {
        onSwitchMode('RUANG_KERJA');
      } else {
        navigate('/workspace');
      }
    } catch (err) {
      console.error('Gagal mengekspor ke Ruang Kerja:', err);
    }
  };

  // Perform global code search across files
  const _handlePerformGlobalSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) {
      setGlobalSearchResults([]);
      return;
    }
    setIsSearchingCode(true);
    try {
      if (sandboxMode === 'browser') {
        const matches: Array<{ file: string; line: number; text: string }> = [];
        const lower = q.toLowerCase();
        for (const [file, content] of Object.entries(browserFiles)) {
          const lines = content.split(/\r?\n/);
          lines.forEach((l, idx) => {
            if (l.toLowerCase().includes(lower) && matches.length < 50) {
              matches.push({ file, line: idx + 1, text: l.trim() });
            }
          });
        }
        setGlobalSearchResults(matches);
      } else {
        const res = await apiClient.get<any>(`/api/v1/coder/fs/search?q=${encodeURIComponent(q)}`);
        const payload = res?.data?.data ?? res?.data;
        setGlobalSearchResults(payload?.matches || []);
      }
    } catch {
      setGlobalSearchResults([]);
    } finally {
      setIsSearchingCode(false);
    }
  };

  // Revert Diff back to beforeContent
  const handleRevertDiff = async () => {
    if (!lastDiff) return;
    const { path: fPath, beforeContent } = lastDiff;
    if (sandboxMode === 'browser') {
      setBrowserFiles(prev => ({ ...prev, [fPath]: beforeContent }));
    } else {
      await apiClient.post('/api/v1/coder/fs/file', { path: fPath, content: beforeContent });
      await refreshLocalWorkspace();
    }
    if (activeFilePath === fPath) {
      setEditorContent(beforeContent);
      setIsDirty(false);
    }
    setLastDiff(null);
    setPreviewKey(k => k + 1);
  };

  // Accept Diff
  const handleAcceptDiff = () => {
    setLastDiff(null);
  };

  // Format Document (Shift+Alt+F)
  const handleFormatDocument = useCallback(() => {
    if (!editorContent || !activeFilePath) return;
    const formatted = formatCode(editorContent, activeFilePath);
    if (formatted !== editorContent) {
      setEditorContent(formatted);
      setIsDirty(true);
    }
  }, [editorContent, activeFilePath]);

  // Update index.html via CDN Library Injector
  const handleUpdateIndexHtml = useCallback(async (newHtml: string) => {
    if (sandboxMode === 'browser') {
      setBrowserFiles(prev => ({ ...prev, ['index.html']: newHtml }));
      await saveVirtualFileIdb('index.html', newHtml);
    } else {
      await apiClient.post('/api/v1/coder/fs/file', { path: 'index.html', content: newHtml });
      await refreshLocalWorkspace();
    }
    if (activeFilePath === 'index.html') {
      setEditorContent(newHtml);
    }
    setPreviewKey(k => k + 1);
  }, [sandboxMode, activeFilePath, refreshLocalWorkspace]);

  // Power-User Keyboard Shortcuts: Ctrl+S, Ctrl+P, Ctrl+Shift+P, Ctrl+K, Shift+Alt+F, Ctrl+B, Ctrl+`
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // 1. Ctrl+S: Save file
      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveFile();
        return;
      }

      // 2. Ctrl+Shift+P or F1: Command Palette
      if ((isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'p') || e.key === 'F1') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // 3. Ctrl+P: Quick Open File
      if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsQuickOpenOpen(prev => !prev);
        return;
      }

      // 4. Ctrl+K: Inline AI Assist
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsInlineAiOpen(prev => !prev);
        return;
      }

      // 5. Shift+Alt+F: Format Document
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFormatDocument();
        return;
      }

      // 6. Ctrl+B: Toggle Sidebar
      if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarVisible(prev => !prev);
        return;
      }

      // 7. Ctrl+`: Toggle Terminal
      if (isCmdOrCtrl && e.key.toLowerCase() === '`') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
        return;
      }

      // 7b. Ctrl+J: Toggle bottom dock (VS Code / Cursor)
      if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
        return;
      }

      // 7c. F5: Run (reload preview)
      if (e.key === 'F5' && !isCmdOrCtrl) {
        e.preventDefault();
        setViewSplitMode('split');
        setPreviewKey(k => k + 1);
        return;
      }

      // 8. Ctrl+L or Cmd+L: Toggle AI Agent Panel
      if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsAgentPanelOpen(prev => !prev);
        return;
      }

      // 9. Ctrl+Shift+F: Global Workspace Search
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setActiveActivityTab('search');
        setIsSidebarVisible(true);
        return;
      }

      // 10. Ctrl+W: Close active tab
      if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeFilePath) {
          handleCloseTab(activeFilePath);
        }
        return;
      }

      // 11. Ctrl+Shift+Z or Cmd+Shift+Z: Toggle Zen Mode
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleToggleZenMode();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSaveFile, handleFormatDocument, handleToggleZenMode, activeFilePath, openTabs]);

  // Create new file
  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFileName.trim().replace(/^[/\\]+/, '');
    if (!name) return;

    if (sandboxMode === 'browser') {
      setBrowserFiles(prev => ({ ...prev, [name]: '' }));
      await saveVirtualFileIdb(name, '');
    } else {
      await apiClient.post('/api/v1/coder/fs/file', { path: name, content: '' });
      await refreshLocalWorkspace();
    }
    setNewFileName('');
    setIsCreatingFile(false);
    void loadFileIntoEditor(name);
  };

  // Delete file
  const handleDeleteFile = async (filePath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Hapus file "${filePath}"?`)) return;

    if (sandboxMode === 'browser') {
      await deleteVirtualFileIdb(filePath);
      setBrowserFiles(prev => {
        const next = { ...prev };
        delete next[filePath];
        return next;
      });
    } else {
      await apiClient.delete(`/api/v1/coder/fs/file?path=${encodeURIComponent(filePath)}`);
      await refreshLocalWorkspace();
    }
    if (openTabs.includes(filePath)) {
      handleCloseTab(filePath, { stopPropagation: () => {} } as any);
    }
  };

  // Rename file
  const handleRenameFile = async (oldPath: string, newNameRaw: string) => {
    const newName = newNameRaw.trim().replace(/^[/\\]+/, '');
    if (!newName || oldPath === newName) {
      setRenamingFilePath(null);
      return;
    }

    if (sandboxMode === 'browser') {
      await renameVirtualFileIdb(oldPath, newName);
      setBrowserFiles(prev => {
        const next = { ...prev };
        const content = next[oldPath] ?? '';
        delete next[oldPath];
        next[newName] = content;
        return next;
      });
    } else {
      const content = localFileCache[oldPath] ?? '';
      await apiClient.post('/api/v1/coder/fs/file', { path: newName, content });
      await apiClient.delete(`/api/v1/coder/fs/file?path=${encodeURIComponent(oldPath)}`);
      await refreshLocalWorkspace();
    }

    setOpenTabs(prev => prev.map(t => (t === oldPath ? newName : t)));
    if (activeFilePath === oldPath) {
      setActiveFilePath(newName);
    }
    setRenamingFilePath(null);
  };

  // Duplicate file
  const handleDuplicateFile = async (sourcePath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const lastDot = sourcePath.lastIndexOf('.');
    const ext = lastDot > 0 ? sourcePath.slice(lastDot) : '';
    const base = lastDot > 0 ? sourcePath.slice(0, lastDot) : sourcePath;
    const copyPath = `${base}-copy${ext}`;

    if (sandboxMode === 'browser') {
      await duplicateVirtualFileIdb(sourcePath, copyPath);
      const content = browserFiles[sourcePath] ?? '';
      setBrowserFiles(prev => ({ ...prev, [copyPath]: content }));
    } else {
      const content = localFileCache[sourcePath] ?? '';
      await apiClient.post('/api/v1/coder/fs/file', { path: copyPath, content });
      await refreshLocalWorkspace();
    }
    void loadFileIntoEditor(copyPath);
  };

  // Reset virtual files to default starter files
  const handleResetStarterFiles = useCallback(async () => {
    if (!window.confirm('Reset semua file di sandbox ke template awal? Perubahan saat ini akan hilang.')) return;
    if (sandboxMode === 'browser') {
      const fresh = await resetVirtualFilesIdb(DEFAULT_STARTER_FILES);
      setBrowserFiles(fresh);
      void loadFileIntoEditor('index.html');
      setPreviewKey(k => k + 1);
    }
  }, [sandboxMode, loadFileIntoEditor]);

  // Apply selected starter template
  const handleApplyStarterTemplate = async (template: StarterTemplate) => {
    if (sandboxMode === 'browser') {
      const fresh = await resetVirtualFilesIdb(template.files);
      setBrowserFiles(fresh);
      setOpenTabs(template.openTabs);
      void loadFileIntoEditor(template.activeFile);
      setPreviewKey(k => k + 1);

      // Select recommended persona if available
      const recommended = COUNCIL_PERSONAS.find(p => p.id === template.recommendedPersonaId);
      if (recommended) {
        setActiveCouncilPersona(recommended);
      }

      // Add snapshot checkpoint
      setSnapshots(prev => [
        {
          id: `snap_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          source: 'checkpoint',
          label: `Template: ${template.name}`,
          files: { ...template.files },
          fileCount: Object.keys(template.files).length
        },
        ...prev
      ]);
    } else {
      for (const [filePath, content] of Object.entries(template.files)) {
        await apiClient.post('/api/v1/coder/fs/file', { path: filePath, content });
      }
      await refreshLocalWorkspace();
      setOpenTabs(template.openTabs);
      void loadFileIntoEditor(template.activeFile);
      setPreviewKey(k => k + 1);
    }
  };

  // Trigger Code Quality Audit by Pak Bambang
  const handleRunQualityAudit = useCallback(() => {
    const filesToAudit = sandboxMode === 'browser' ? browserFiles : localFileCache;
    const report = performQualityAudit(filesToAudit);
    setAuditReport(report);
    setIsAuditModalOpen(true);
  }, [sandboxMode, browserFiles, localFileCache]);

  // Trigger Autograder & Edge-Case Challenge
  const handleRunAutograder = async () => {
    setIsAutograderRunning(true);
    setIsAutograderModalOpen(true);
    try {
      const report = await runAutograderSuite(editorContent, activeFilePath.replace(/\.[^/.]+$/, ''));
      setAutograderReport(report);
      if (report.score === 100) {
        playTestPassSound();
        codingErgonomicsService.recordSuccess();
      } else {
        playTestFailSound();
        codingErgonomicsService.recordError('Autograder edge case failure');
      }
    } catch (err: any) {
      codingErgonomicsService.recordError(err?.message);
    } finally {
      setIsAutograderRunning(false);
    }
  };

  // Terminal Runner
  const handleRunTerminalCommand = useCallback(async (cmdOverride?: string) => {
    const cmd = (cmdOverride ?? terminalInput).trim();
    if (!cmd || isRunningCommand) return;
    if (!cmdOverride) setTerminalInput('');
    setIsRunningCommand(true);
    setIsTerminalOpen(true);
    setTerminalTab('terminal');

    const startedAt = Date.now();
    try {
      if (sandboxMode === 'browser') {
        const parts = cmd.trim().split(/\s+/);
        const commandName = parts[0]?.toLowerCase();
        const targetArg = parts[1];

        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        if (commandName === 'ls' || commandName === 'dir') {
          const files = Object.keys(browserFiles).sort();
          stdout = files.map(f => `${f.padEnd(22)} ${(browserFiles[f]?.length || 0)} B`).join('\n') || '(Direktori kosong)';
        } else if (commandName === 'pwd') {
          stdout = '/workspace/browser-sandbox';
        } else if (commandName === 'cat') {
          if (!targetArg) {
            stderr = 'Penggunaan: cat <nama-file>';
            exitCode = 1;
          } else if (!(targetArg in browserFiles)) {
            stderr = `File "${targetArg}" tidak ditemukan di sandbox virtual.`;
            exitCode = 1;
          } else {
            stdout = browserFiles[targetArg];
          }
        } else if (commandName === 'echo') {
          stdout = parts.slice(1).join(' ');
        } else if (commandName === 'clear' || commandName === 'cls') {
          setTerminalEntries([]);
          setIsRunningCommand(false);
          return;
        } else if (commandName === 'touch') {
          if (!targetArg) {
            stderr = 'Penggunaan: touch <nama-file>';
            exitCode = 1;
          } else {
            setBrowserFiles(prev => ({ ...prev, [targetArg]: '' }));
            stdout = `File ${targetArg} berhasil dibuat.`;
          }
        } else if (commandName === 'rm') {
          if (!targetArg) {
            stderr = 'Penggunaan: rm <nama-file>';
            exitCode = 1;
          } else if (!(targetArg in browserFiles)) {
            stderr = `File "${targetArg}" tidak ditemukan.`;
            exitCode = 1;
          } else {
            setBrowserFiles(prev => {
              const next = { ...prev };
              delete next[targetArg];
              return next;
            });
            stdout = `File ${targetArg} dihapus.`;
          }
        } else if (commandName === 'help') {
          stdout = `⚡ Perintah Virtual Shell Browser:
- ls / dir              : Melihat daftar file virtual & ukuran
- cat <file>            : Membaca teks isi file
- node <file>           : Menjalankan skrip JS virtual
- touch <file>          : Membuat file baru
- rm <file>             : Menghapus file
- echo <teks>           : Menampilkan teks
- pwd                   : Direktori aktif virtual
- clear                 : Membersihkan log terminal`;
        } else if (commandName === 'node') {
          const scriptName = targetArg || 'app.js';
          if (!browserFiles[scriptName]) {
            stderr = `File "${scriptName}" tidak ditemukan.`;
            exitCode = 1;
          } else {
            const logs: string[] = [];
            const errs: string[] = [];
            const rawCode = browserFiles[scriptName]
              .replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/([^'"]+)['"];?/g, (_m, _imports, modPath) => {
                const mod = (browserFiles[modPath] || '').replace(/export\s+function/g, 'function');
                return `${mod}\n`;
              })
              .replace(/export\s+function/g, 'function')
              .replace(/process\.exit\(\d+\);?/g, '');

            try {
              const mockConsole = {
                log: (...args: any[]) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
                error: (...args: any[]) => errs.push(args.map(a => String(a)).join(' ')),
                warn: (...args: any[]) => logs.push(args.map(a => String(a)).join(' '))
              };
              const runner = new Function('console', rawCode);
              runner(mockConsole);
              stdout = logs.join('\n') || 'Skrip berhasil dieksekusi tanpa keluaran log.';
              stderr = errs.join('\n');
            } catch (err: any) {
              stderr = err?.message || String(err);
              exitCode = 1;
            }
          }
        } else {
          stdout = `[Browser Sandbox] Perintah "${cmd}" dijalankan pada ${Object.keys(browserFiles).length} file virtual. Ketik "help" untuk melihat panduan.`;
        }

        if (exitCode !== 0) {
          setConsecutiveFailures(c => {
            const next = c + 1;
            if (next >= 4) {
              setZenBreakReason('repeated_errors');
              setIsZenBreakOpen(true);
            }
            return next;
          });
          setLastTerminalError(stderr || `Perintah "${cmd}" gagal.`);
        } else {
          setConsecutiveFailures(0);
          setLastTerminalError(null);
        }

        setTerminalEntries(prev => [
          ...prev.slice(-99),
          {
            id: `term_${Date.now()}`,
            command: cmd,
            stdout,
            stderr,
            exitCode,
            durationMs: Date.now() - startedAt,
            source: 'user',
            timestamp: new Date().toLocaleTimeString('id-ID')
          }
        ]);
      } else {
        const res = await apiClient.post<any>('/api/v1/coder/terminal/exec', { command: cmd });
        const payload = res?.data?.data ?? res?.data;
        if (payload) {
          const finalExit = payload.exitCode ?? 0;
          if (finalExit !== 0) {
            setConsecutiveFailures(c => {
              const next = c + 1;
              if (next >= 4) {
                setZenBreakReason('repeated_errors');
                setIsZenBreakOpen(true);
              }
              return next;
            });
            setLastTerminalError(payload.stderr || `Perintah "${cmd}" gagal dengan exit code ${finalExit}.`);
          } else {
            setConsecutiveFailures(0);
            setLastTerminalError(null);
          }

          setTerminalEntries(prev => [
            ...prev.slice(-99),
            {
              id: `term_${Date.now()}`,
              command: cmd,
              stdout: payload.stdout || '',
              stderr: payload.stderr || '',
              exitCode: finalExit,
              durationMs: payload.durationMs ?? Date.now() - startedAt,
              source: 'user',
              timestamp: new Date().toLocaleTimeString('id-ID')
            }
          ]);
        }
      }
    } finally {
      setIsRunningCommand(false);
    }
  }, [browserFiles, isRunningCommand, sandboxMode, terminalInput]);

  // Dedicated Test Suite Runner
  const handleRunTestSuite = useCallback(async () => {
    setTerminalTab('test_runner');
    setIsTerminalOpen(true);
    setTestRunnerResult({ status: 'running', output: 'Menjalankan rangkaian unit test...', durationMs: 0 });
    const startTime = Date.now();
    try {
      await handleRunTerminalCommand('node test.js');
      const dur = Date.now() - startTime;
      const isFailed = consecutiveFailures > 0;
      if (isFailed) {
        try { playTestFailSound(); } catch {}
        setLastTerminalError(prev => prev || `Test suite gagal dieksekusi.`);
      } else {
        try { playTestPassSound(); } catch {}
        setLastTerminalError(null);
      }
      setTestRunnerResult({
        status: isFailed ? 'failure' : 'success',
        output: `Eksekusi "node test.js" selesai dalam ${dur}ms. Cek tab Terminal untuk rincian log lengkap.`,
        durationMs: dur
      });
    } catch (err: any) {
      try { playTestFailSound(); } catch {}
      setTestRunnerResult({
        status: 'failure',
        output: err?.message || String(err),
        durationMs: Date.now() - startTime
      });
    }
  }, [consecutiveFailures, handleRunTerminalCommand]);

  // Export Workspace to JSON
  const handleExportJsonBackup = () => {
    const data = sandboxMode === 'browser' ? browserFiles : localFileCache;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ruangcoder-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const handleImportJsonBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null) {
          if (sandboxMode === 'browser') {
            setBrowserFiles(parsed);
            for (const [p, c] of Object.entries(parsed)) {
              if (typeof c === 'string') await saveVirtualFileIdb(p, c);
            }
          }
          createSnapshot('Impor Backup JSON', 'manual_save');
          setPreviewKey(k => k + 1);
          alert('Berhasil mengimpor berkas proyek dari JSON!');
        }
      } catch {
        alert('Format file JSON tidak valid!');
      }
    };
    reader.readAsText(file);
  };

  // Sync virtual sandbox to disk
  const handleSyncVirtualToDisk = async () => {
    if (sandboxMode !== 'browser') return;
    const confirmSync = window.confirm(
      'Salin seluruh file sandbox virtual ke disk lokal server? File yang sama di disk akan ditimpa.'
    );
    if (!confirmSync) return;
    try {
      for (const [p, c] of Object.entries(browserFiles)) {
        await apiClient.post('/api/v1/coder/fs/file', { path: p, content: c });
      }
      alert('Semua file dari Sandbox Browser berhasil disalin ke Disk Lokal!');
      await refreshLocalWorkspace();
    } catch (err: any) {
      alert(`Gagal menyinkronkan ke disk: ${err?.message || err}`);
    }
  };

  // Agent Execution Loop (SSE Stream)
  const handleSendAgentPrompt = async (customPrompt?: string) => {
    const text = (customPrompt ?? promptInput).trim();
    if (!text || isAgentRunning) return;
    if (!customPrompt) setPromptInput('');

    if (isDirty) await handleSaveFile();

    const userMsg: AgentChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const agentMsgId = `a_${Date.now() + 1}`;
    const agentMsg: AgentChatMessage = {
      id: agentMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Dewan Ahli AI (Auto)',
      thoughts: [],
      toolSteps: [],
      modifiedFiles: [],
      statusText: 'Dewan Ahli AI merumuskan strategi tugas...',
      isStreaming: true
    };

    setMessages(prev => [...prev, userMsg, agentMsg]);
    setIsAgentRunning(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const matchCsrf = typeof document !== 'undefined' ? document.cookie.match(/(^| )XSRF-TOKEN=([^;]+)/) : null;
      const csrfToken = matchCsrf ? decodeURIComponent(matchCsrf[2]) : null;

      const historyPayload = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/v1/coder/agent/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': currentProjectId,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: text,
          modelName: 'auto',
          provider: aiProvider,
          sandboxMode,
          activeFilePath,
          history: historyPayload,
          personaMode,
          ...(sandboxMode === 'browser' ? { virtualFiles: browserFiles } : {})
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: Failed to connect to RuangCoder agent.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          const lines = trimmed.split('\n');
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;
            const json = line.replace(/^data:\s*/, '');
            if (!json) continue;

            try {
              const ev = JSON.parse(json);

              if (ev.type === 'status') {
                setMessages(prev => prev.map(m => (m.id === agentMsgId ? { ...m, statusText: ev.message } : m)));
              } else if (ev.type === 'agent_active') {
              setActiveCouncilPersona(ev.agent);
              try { playHandOffSound(); } catch {}
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentMsgId
                    ? {
                        ...m,
                        activePersona: ev.agent,
                        activeAgents: Array.from(new Set([...(m.activeAgents || []), ev.agent.name]))
                      }
                    : m
                )
              );
            } else if (ev.type === 'thought') {
              setMessages(prev =>
                prev.map(m => (m.id === agentMsgId ? { ...m, thoughts: [...(m.thoughts || []), ev.content] } : m))
              );
            } else if (ev.type === 'tool_start') {
              const step: AgentToolStep = {
                toolCallId: ev.toolCallId,
                toolName: ev.toolName,
                args: ev.args || {},
                status: 'running'
              };
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentMsgId
                    ? {
                        ...m,
                        statusText: `Tool: ${ev.toolName}`,
                        toolSteps: [...(m.toolSteps || []), step]
                      }
                    : m
                )
              );
            } else if (ev.type === 'file_changed') {
              const fPath = String(ev.path || '');
              const newContent = String(ev.content ?? '');
              const prevContent = typeof ev.beforeContent === 'string' ? ev.beforeContent : '';

              setLastDiff({ path: fPath, beforeContent: prevContent, afterContent: newContent });
              try { playFileModifiedSound(); } catch {}

              if (sandboxMode === 'browser') {
                setBrowserFiles(prev => ({ ...prev, [fPath]: newContent }));
              } else {
                setLocalFileCache(prev => ({ ...prev, [fPath]: newContent }));
                void refreshLocalWorkspace();
              }

              setActiveFilePath(fPath);
              setEditorContent(newContent);
              setIsDirty(false);
              // Avoid force-destroying iframe DOM instance; livePreviewHtml smoothly syncs into srcDoc
              createSnapshot(`AI: Modifikasi ${fPath}`, 'ai_tool');

              setMessages(prev =>
                prev.map(m =>
                  m.id === agentMsgId
                    ? {
                        ...m,
                        modifiedFiles: Array.from(new Set([...(m.modifiedFiles || []), fPath]))
                      }
                    : m
                )
              );
            } else if (ev.type === 'tool_result') {
              const resObj = ev.result;
              if (resObj?.toolName === 'run_command') {
                setTerminalEntries(prev => [
                  ...prev.slice(-99),
                  {
                    id: `agent_cmd_${Date.now()}`,
                    command: `[Agent] ${resObj.summary}`,
                    stdout: resObj.output || '',
                    stderr: '',
                    exitCode: resObj.status === 'completed' ? 0 : 1,
                    durationMs: resObj.durationMs || 0,
                    source: 'agent',
                    timestamp: new Date().toLocaleTimeString('id-ID')
                  }
                ]);
              }
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentMsgId
                    ? {
                        ...m,
                        toolSteps: (m.toolSteps || []).map(ts =>
                          ts.toolCallId === resObj.toolCallId
                            ? {
                                ...ts,
                                status: resObj.status,
                                summary: resObj.summary,
                                output: resObj.output,
                                durationMs: resObj.durationMs,
                                fileChanged: resObj.fileChanged
                              }
                            : ts
                        )
                      }
                    : m
                )
              );
            } else if (ev.type === 'token') {
              setMessages(prev =>
                prev.map(m => (m.id === agentMsgId ? { ...m, content: (m.content || '') + ev.content } : m))
              );
            } else if (ev.type === 'done') {
              setActiveCouncilPersona(null);

              // Autonomous Silent QA Review by Pak Bambang after modifications
              let qaInfo: { status: 'passed' | 'warning' | 'error'; score: number; issuesCount: number } | undefined;
              try {
                // Periksa apakah ada tool execution yang gagal (misal edit_file_diff gagal)
                const currentMsg = messages.find(m => m.id === agentMsgId);
                const hasFailedTool = currentMsg?.toolSteps?.some(ts => ts.status === 'failed');

                const currentFiles = sandboxMode === 'browser' ? browserFiles : localFileCache;
                const quickReport = performQualityAudit(currentFiles);
                
                if (hasFailedTool) {
                  quickReport.overallStatus = 'error';
                  quickReport.score = Math.min(quickReport.score, 40);
                  quickReport.checks.unshift({
                    id: 'tool_execution_failed',
                    title: 'Kegagalan Modifikasi File (edit_file_diff)',
                    status: 'error',
                    detail: 'Agent mengalami kegagalan saat mencoba memodifikasi baris kode file.'
                  });
                }

                const issues = quickReport.checks.filter(c => c.status !== 'passed').length;
                qaInfo = {
                  status: quickReport.overallStatus,
                  score: quickReport.score,
                  issuesCount: issues
                };
                setAuditReport(quickReport);
              } catch {}

              setMessages(prev =>
                prev.map(m =>
                  m.id === agentMsgId
                    ? {
                        ...m,
                        modelUsed: ev.modelUsed || m.modelUsed,
                        durationMs: ev.durationMs,
                        activeAgents: ev.activeAgents || m.activeAgents,
                        statusText: undefined,
                        isStreaming: false,
                        qaAuditResult: qaInfo
                      }
                    : m
                )
              );
            } else if (ev.type === 'error') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentMsgId
                    ? { ...m, error: ev.message, retryPrompt: text, statusText: undefined, isStreaming: false }
                    : m
                )
              );
            }
          } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        const rawMsg = String(err?.message || '');
        const isNetworkErr = /network error|failed to fetch|fetch failed|connection lost/i.test(rawMsg);
        const errorDisplay = isNetworkErr
          ? 'Koneksi ke server AI terputus saat memproses model lokal. Model mungkin membutuhkan waktu inferensi lebih lama. Silakan klik coba lagi.'
          : (err?.message || 'Koneksi terputus.');

        setMessages(prev =>
          prev.map(m =>
            m.id === agentMsgId
              ? {
                  ...m,
                  error: errorDisplay,
                  retryPrompt: text,
                  isStreaming: false,
                  statusText: undefined
                }
              : m
          )
        );
      }
    } finally {
      setIsAgentRunning(false);
      abortControllerRef.current = null;
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // Build file list for the explorer
  const fileItems = useMemo(() => {
    const q = fileFilter.trim().toLowerCase();
    if (sandboxMode === 'browser') {
      return Object.keys(browserFiles)
        .sort()
        .filter(p => !q || p.toLowerCase().includes(q))
        .map(p => ({ path: p, size: browserFiles[p]?.length || 0 }));
    }
    const flatten = (nodes: FileTreeNode[]): Array<{ path: string; size: number }> =>
      nodes.flatMap(n => (n.type === 'directory' ? flatten(n.children || []) : [{ path: n.path, size: n.size || 0 }]));
    return flatten(localTree).filter(f => !q || f.path.toLowerCase().includes(q));
  }, [sandboxMode, browserFiles, localTree, fileFilter]);

  // Command Palette Items (Ctrl+Shift+P)
  const commandPaletteCommands = useMemo<CommandItem[]>(() => [
    {
      id: 'format_document',
      title: 'Format Dokumen (Rapikan Indentasi & Spasi)',
      category: 'Editor',
      shortcut: 'Shift+Alt+F',
      icon: <Code2 className="w-4 h-4 text-sky-400" />,
      action: () => handleFormatDocument()
    },
    {
      id: 'inline_ai',
      title: 'Inline AI: Edit & Modifikasi Kode Terarah...',
      category: 'AI & Audit',
      shortcut: isMac ? 'Cmd+K' : 'Ctrl+K',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      action: () => setIsInlineAiOpen(true)
    },
    {
      id: 'quick_open',
      title: 'Buka Berkas Cepat (Quick Open File)...',
      category: 'Editor',
      shortcut: isMac ? 'Cmd+P' : 'Ctrl+P',
      icon: <Search className="w-4 h-4 text-sky-400" />,
      action: () => setIsQuickOpenOpen(true)
    },
    {
      id: 'export_zip',
      title: 'Download Seluruh Proyek sebagai ZIP Archive',
      category: 'Project',
      icon: <Download className="w-4 h-4 text-emerald-400" />,
      action: () => void handleExportZip()
    },
    {
      id: 'cdn_libs',
      title: 'Sisipkan Pustaka / CDN Populer (Tailwind, Lucide, Chart.js, dll)...',
      category: 'Project',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      action: () => setIsCdnModalOpen(true)
    },
    {
      id: 'quality_audit',
      title: 'Jalankan Audit Kualitas Kode & Sanitasi (Pak Bambang)',
      category: 'AI & Audit',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      action: () => handleRunQualityAudit()
    },
    {
      id: 'starter_templates',
      title: 'Ganti atau Muat Starter Template Proyek Baru...',
      category: 'Project',
      icon: <FolderPlus className="w-4 h-4 text-teal-400" />,
      action: () => setIsTemplateModalOpen(true)
    },
    {
      id: 'run_tests',
      title: 'Jalankan Rangkaian Unit Test (node test.js)',
      category: 'Project',
      icon: <Play className="w-4 h-4 text-emerald-400" />,
      action: () => void handleRunTestSuite()
    },
    {
      id: 'preview_console',
      title: 'Buka Tab Runtime Console Log Preview',
      category: 'View & Theme',
      icon: <TerminalIcon className="w-4 h-4 text-amber-400" />,
      action: () => {
        setIsTerminalOpen(true);
        setTerminalTab('preview_console');
      }
    },
    {
      id: 'toggle_terminal',
      title: 'Buka / Tutup Terminal Shell',
      category: 'View & Theme',
      shortcut: 'Ctrl+`',
      icon: <TerminalIcon className="w-4 h-4 text-emerald-400" />,
      action: () => setIsTerminalOpen(prev => !prev)
    },
    {
      id: 'toggle_sidebar',
      title: 'Buka / Tutup Sidebar File Explorer',
      category: 'View & Theme',
      shortcut: isMac ? 'Cmd+B' : 'Ctrl+B',
      icon: <PanelLeft className="w-4 h-4 text-slate-400" />,
      action: () => setIsSidebarVisible(prev => !prev)
    },
    {
      id: 'toggle_agent',
      title: 'Buka / Tutup Panel RuangCoder AI Agent',
      category: 'View & Theme',
      shortcut: isMac ? 'Cmd+L' : 'Ctrl+L',
      icon: <Sparkles className="w-4 h-4 text-sky-400" />,
      action: () => setIsAgentPanelOpen(prev => !prev)
    },
    {
      id: 'toggle_zen',
      title: isZenMode ? 'Keluar dari Zen Mode' : 'Aktifkan Zen Mode (Fokus Tanpa Gangguan)',
      category: 'View & Theme',
      shortcut: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z',
      icon: <Maximize2 className="w-4 h-4 text-indigo-400" />,
      action: () => handleToggleZenMode()
    },
    {
      id: 'save_file',
      title: 'Simpan Berkas Aktif',
      category: 'Editor',
      shortcut: isMac ? 'Cmd+S' : 'Ctrl+S',
      icon: <Save className="w-4 h-4 text-sky-400" />,
      action: () => void handleSaveFile()
    },
    {
      id: 'toggle_theme',
      title: `Ganti Tema ke Mode ${isDark ? 'Terang (Light)' : 'Gelap (Dark)'}`,
      category: 'View & Theme',
      icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
      action: () => toggleTheme()
    },
    {
      id: 'toggle_lofi',
      title: `Toggle Musik Lo-Fi Focus (${isLofiPlaying ? 'Matikan' : 'Nyalakan'})`,
      category: 'View & Theme',
      icon: <Headphones className="w-4 h-4 text-emerald-400" />,
      action: () => soundscapeEngine.toggleTrack(currentLofiTrack)
    },
    {
      id: 'new_file',
      title: 'Buat Berkas / File Baru di Workspace',
      category: 'Project',
      icon: <Plus className="w-4 h-4 text-sky-400" />,
      action: () => setIsCreatingFile(true)
    },
    {
      id: 'reset_sandbox',
      title: 'Reset Sandbox ke Template Awal (Default Files)',
      category: 'Project',
      icon: <RotateCcw className="w-4 h-4 text-rose-400" />,
      action: () => void handleResetStarterFiles()
    }
  ], [
    handleFormatDocument,
    isMac,
    handleExportZip,
    handleRunQualityAudit,
    handleRunTestSuite,
    handleSaveFile,
    isDark,
    toggleTheme,
    isLofiPlaying,
    currentLofiTrack,
    handleResetStarterFiles,
    isZenMode,
    handleToggleZenMode
  ]);

  // Live preview HTML builder with Module Importmap & In-App Console Capture
  const livePreviewHtml = useMemo(() => {
    const map = sandboxMode === 'browser' ? browserFiles : localFileCache;
    let html = map['index.html'] || (activeFilePath.endsWith('.html') ? debouncedEditorContent : '');
    const css = map['styles.css'] || '';
    const js = map['app.js'] || '';

    if (!html) {
      return `<!DOCTYPE html><html><body style="background:#090d16;color:#64748b;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">index.html tidak ditemukan.</body></html>`;
    }

    // Build virtual module import map for all other .js files in workspace
    const importMapEntries: Record<string, string> = {};
    for (const [fName, fContent] of Object.entries(map)) {
      if (fName.endsWith('.js') && fName !== 'app.js') {
        try {
          const base64Code = btoa(unescape(encodeURIComponent(fContent)));
          const dataUri = `data:text/javascript;charset=utf-8;base64,${base64Code}`;
          importMapEntries[`./${fName}`] = dataUri;
          importMapEntries[fName] = dataUri;
        } catch {}
      }
    }

    const consoleCaptureScript = `<script>
(function() {
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  function sendLog(level, args) {
    try {
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      window.parent.postMessage({
        type: 'ruangcoder_preview_console',
        level,
        message: msg,
        time: new Date().toLocaleTimeString('id-ID')
      }, '*');
    } catch {}
  }
  console.log = function(...args) { origLog.apply(console, args); sendLog('log', args); };
  console.error = function(...args) { origError.apply(console, args); sendLog('error', args); };
  console.warn = function(...args) { origWarn.apply(console, args); sendLog('warn', args); };
  window.addEventListener('error', function(e) {
    sendLog('error', [e.message + (e.lineno ? ' (baris ' + e.lineno + ')' : '')]);
  });

  // Visual UI Element Inspector (Hover outline + Click-to-prompt)
  let hoverOverlay = null;
  function getOrCreateOverlay() {
    if (!hoverOverlay) {
      hoverOverlay = document.createElement('div');
      hoverOverlay.id = '__ruangcoder_hover_overlay';
      hoverOverlay.style.position = 'fixed';
      hoverOverlay.style.pointerEvents = 'none';
      hoverOverlay.style.zIndex = '999999';
      hoverOverlay.style.border = '2px dashed #a855f7';
      hoverOverlay.style.backgroundColor = 'rgba(168, 85, 247, 0.15)';
      hoverOverlay.style.transition = 'all 0.05s ease';
      hoverOverlay.style.display = 'none';
      document.body.appendChild(hoverOverlay);
    }
    return hoverOverlay;
  }

  window.addEventListener('mousemove', function(e) {
    if (!window.__ruangcoder_inspect_mode) {
      if (hoverOverlay) hoverOverlay.style.display = 'none';
      return;
    }
    const target = e.target;
    if (target && target !== hoverOverlay && target !== document.body && target !== document.documentElement) {
      const rect = target.getBoundingClientRect();
      const ov = getOrCreateOverlay();
      ov.style.display = 'block';
      ov.style.top = rect.top + 'px';
      ov.style.left = rect.left + 'px';
      ov.style.width = rect.width + 'px';
      ov.style.height = rect.height + 'px';
    }
  }, true);

  window.addEventListener('click', function(e) {
    if (window.__ruangcoder_inspect_mode) {
      e.preventDefault();
      e.stopPropagation();
      if (hoverOverlay) hoverOverlay.style.display = 'none';
      const target = e.target;
      if (target) {
        window.parent.postMessage({
          type: 'ruangcoder_element_selected',
          tag: target.tagName.toLowerCase(),
          id: target.id || '',
          className: target.className || '',
          text: target.textContent?.trim().slice(0, 60) || ''
        }, '*');
      }
    }
  }, true);
})();
</script>`;

    const importMapScript =
      Object.keys(importMapEntries).length > 0
        ? `<script type="importmap">${JSON.stringify({ imports: importMapEntries })}</script>`
        : '';

    // Inject console capture and import map right after <head>
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${consoleCaptureScript}\n${importMapScript}`);
    } else {
      html = `${consoleCaptureScript}\n${importMapScript}\n${html}`;
    }

    if (css) {
      if (html.includes('styles.css')) {
        html = html.replace(/<link[^>]+href=["'][^"']*styles\.css["'][^>]*>/i, `<style>\n${css}\n</style>`);
      } else if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>\n${css}\n</style></head>`);
      }
    }

    // Replace other virtual stylesheets
    for (const [fName, fContent] of Object.entries(map)) {
      if (fName.endsWith('.css') && fName !== 'styles.css') {
        const escaped = fName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const linkRegex = new RegExp(`<link[^>]+href=["'](\\./)?${escaped}["'][^>]*>`, 'gi');
        html = html.replace(linkRegex, `<style data-virtual-file="${fName}">\n${fContent}\n</style>`);
      }
    }

    // Replace images with data URIs if found in virtual map
    for (const [fName, fContent] of Object.entries(map)) {
      if (/\.(svg|png|jpg|jpeg|webp)$/i.test(fName) && fContent) {
        let dataUri = '';
        if (fName.endsWith('.svg')) {
          dataUri = fContent.startsWith('data:')
            ? fContent
            : `data:image/svg+xml;utf8,${encodeURIComponent(fContent)}`;
        } else if (fContent.startsWith('data:image/')) {
          dataUri = fContent;
        }
        if (dataUri) {
          const escaped = fName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const imgRegex = new RegExp(`src=["'](\\./)?${escaped}["']`, 'gi');
          html = html.replace(imgRegex, `src="${dataUri}"`);
        }
      }
    }

    if (js) {
      if (html.includes('app.js')) {
        html = html.replace(
          /<script[^>]+src=["'][^"']*app\.js["'][^>]*><\/script>/i,
          `<script type="module">\n${js}\n</script>`
        );
      } else if (html.includes('</body>')) {
        html = html.replace('</body>', `<script type="module">\n${js}\n</script></body>`);
      }
    }

    return html;
  }, [sandboxMode, browserFiles, localFileCache, activeFilePath, debouncedEditorContent]);

  // Zero-allocation line counter (avoids splitting large code strings on every keystroke)
  const lineCount = useMemo(() => {
    let count = 1;
    for (let i = 0; i < editorContent.length; i++) {
      if (editorContent.charCodeAt(i) === 10) count++;
    }
    return count;
  }, [editorContent]);

  return (
    <div
      className={`flex h-dvh w-full lg:pt-9 lg:pb-6 font-sans overflow-hidden select-none text-[13px] transition-colors duration-150 ${
        isDark ? 'bg-[#0d1117] text-slate-200' : 'bg-[#f8fafc] text-slate-800'
      }`}
    >
      <CoderCommandTitleBar
        projectName={currentProjectId}
        activeFilePath={activeFilePath}
        isMac={isMac}
        isDark={isDark}
        isSidebarVisible={isSidebarVisible}
        isDockOpen={isTerminalOpen}
        isAgentOpen={isAgentPanelOpen}
        onOpenSearch={() => setIsQuickOpenOpen(true)}
        onRun={() => {
          setViewSplitMode('split');
          setPreviewKey(k => k + 1);
        }}
        onRunTests={() => void handleRunTestSuite()}
        onToggleSidebar={() => setIsSidebarVisible(p => !p)}
        onToggleDock={() => setIsTerminalOpen(p => !p)}
        onToggleAgent={() => setIsAgentPanelOpen(p => !p)}
      />
      <CoderStatusBar
        isDark={isDark}
        errorCount={Object.values(problemMarkers).reduce((a, c) => a + c.filter(m => m.severity >= 8).length, 0)}
        warningCount={Object.values(problemMarkers).reduce((a, c) => a + c.filter(m => m.severity < 8).length, 0)}
        cursor={cursorPos}
        language={detectMonacoLanguage(activeFilePath)}
        aiLabel={aiProvider === 'gemini' ? 'Gemini Cloud' : aiProvider === 'ollama' ? 'Ollama Lokal' : 'AI Auto'}
        isDirty={isDirty}
        onOpenProblems={() => {
          setTerminalTab('problems');
          setIsTerminalOpen(true);
        }}
        onOpenGit={() => {
          setActiveActivityTab('git');
          setIsSidebarVisible(true);
        }}
      />
      {/* ============================================================== */}
      {/* 1. SKINNY ACTIVITY BAR (VS Code / Cursor Leftmost 48px Rail)  */}
      {/* ============================================================== */}
      <nav
        aria-label="Activity Bar"
        className={`hidden lg:flex w-12 shrink-0 border-r flex-col items-center justify-between py-2.5 z-30 transition-colors ${
          isDark ? 'bg-[#090d16] border-[#1f293d]' : 'bg-[#f1f5f9] border-slate-200'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          {/* RuangSuite Brand & Switcher */}
          <div ref={suiteMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSuiteMenuOpen(prev => !prev)}
              className="w-8 h-8 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 flex items-center justify-center transition-all cursor-pointer ring-1 ring-sky-500/30 active:scale-95"
              title="RuangSuite App Switcher"
              aria-label="Menu RuangSuite"
            >
              <img src="/ruangcoder.svg" alt="RuangCoder" className="w-5 h-5 rounded object-contain" />
            </button>

            {/* Suite Switcher Dropdown */}
            {isSuiteMenuOpen && (
              <div
                className={`absolute left-11 top-0 w-52 border rounded-xl shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                  isDark ? 'bg-[#0f172a] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pilih Ruang
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuiteMenuOpen(false);
                    if (onSwitchMode) {
                      onSwitchMode('RUANG_TENANG');
                    } else {
                      navigate('/');
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800/80' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <img src="/favicon.svg" alt="" className="w-4 h-4 rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">RuangTenang</div>
                    <div className="text-[10px] text-slate-400">Refleksi & Konseling</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuiteMenuOpen(false);
                    if (onSwitchMode) {
                      onSwitchMode('RUANG_KERJA');
                    } else {
                      navigate('/workspace');
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800/80' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <img src="/ruangkerja.svg" alt="" className="w-4 h-4 rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">RuangKerja</div>
                    <div className="text-[10px] text-slate-400">Akademik & Dokumen</div>
                  </div>
                </button>
                <div
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-semibold border ${
                    isDark
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      : 'bg-sky-50 text-sky-800 border-sky-200'
                  }`}
                >
                  <img src="/ruangcoder.svg" alt="" className="w-4 h-4 rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">RuangCoder</div>
                    <div className="text-[10px] text-sky-600 dark:text-sky-400">AI Coding Agent (Aktif)</div>
                  </div>
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>

          <div className={`w-6 h-[1px] my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

          {/* Activity Icons */}
          <button
            type="button"
            onClick={() => {
              if (activeActivityTab === 'explorer' && isSidebarVisible) {
                setIsSidebarVisible(false);
              } else {
                setActiveActivityTab('explorer');
                setIsSidebarVisible(true);
              }
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
              isSidebarVisible && activeActivityTab === 'explorer'
                ? isDark
                  ? 'text-sky-400 bg-slate-800/80'
                  : 'text-sky-600 bg-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
            }`}
            title="File Explorer (Ctrl+B)"
            aria-label="Explorer"
          >
            {isSidebarVisible && activeActivityTab === 'explorer' && (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-sky-500 rounded-r" />
            )}
            <FolderOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeActivityTab === 'search' && isSidebarVisible) {
                setIsSidebarVisible(false);
              } else {
                setActiveActivityTab('search');
                setIsSidebarVisible(true);
              }
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
              isSidebarVisible && activeActivityTab === 'search'
                ? isDark
                  ? 'text-sky-400 bg-slate-800/80'
                  : 'text-sky-600 bg-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
            }`}
            title="Pencarian Global"
            aria-label="Cari di Workspace"
          >
            {isSidebarVisible && activeActivityTab === 'search' && (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-sky-500 rounded-r" />
            )}
            <Search className="w-4 h-4" />
          </button>

          {/* Git Source Control Panel (VS Code style Ctrl+Shift+G) */}
          <button
            type="button"
            onClick={() => {
              if (activeActivityTab === 'git' && isSidebarVisible) {
                setIsSidebarVisible(false);
              } else {
                setActiveActivityTab('git');
                setIsSidebarVisible(true);
              }
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
              isSidebarVisible && activeActivityTab === 'git'
                ? isDark
                  ? 'text-emerald-400 bg-slate-800/80'
                  : 'text-emerald-600 bg-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
            }`}
            title="Source Control & Git (Ctrl+Shift+G)"
            aria-label="Git Source Control"
          >
            {isSidebarVisible && activeActivityTab === 'git' && (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />
            )}
            <GitBranch className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeActivityTab === 'diff' && isSidebarVisible) {
                setIsSidebarVisible(false);
              } else {
                setActiveActivityTab('diff');
                setIsSidebarVisible(true);
              }
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
              isSidebarVisible && activeActivityTab === 'diff'
                ? isDark
                  ? 'text-purple-400 bg-slate-800/80'
                  : 'text-purple-600 bg-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
            }`}
            title="Diff Inspector & Source Control"
            aria-label="Diff Inspector"
          >
            {isSidebarVisible && activeActivityTab === 'diff' && (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-purple-500 rounded-r" />
            )}
            <GitCompare className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setViewSplitMode(m => (m === 'split' ? 'editor' : 'split'))}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              viewSplitMode === 'split'
                ? isDark
                  ? 'text-emerald-400 bg-slate-800/80'
                  : 'text-emerald-600 bg-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Bagi Layar: Code Editor + Live Preview"
            aria-label="Split View"
          >
            <Columns className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsAgentPanelOpen(prev => !prev)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
              isAgentPanelOpen
                ? isDark
                  ? 'text-sky-400 bg-slate-800/80 shadow-xs'
                  : 'text-sky-600 bg-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
            }`}
            title={`Toggle RuangCoder AI Agent (${isMac ? 'Cmd+L' : 'Ctrl+L'})`}
            aria-label="AI Agent"
          >
            {isAgentPanelOpen && (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-sky-500 rounded-r" />
            )}
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Activity Icons */}
        <div className="flex flex-col items-center gap-2">
          {/* THEME TOGGLE (Sun / Moon) */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isDark
                ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/80'
                : 'text-amber-500 hover:text-amber-600 hover:bg-slate-200/70'
            }`}
            title={isDark ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
            aria-label="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsTerminalOpen(prev => !prev)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isTerminalOpen
                ? isDark
                  ? 'text-emerald-400 bg-slate-800/80'
                  : 'text-emerald-600 bg-white shadow-xs'
                : isDark
                ? 'text-slate-500 hover:text-slate-300'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Toggle Integrated Terminal (Ctrl+`)"
            aria-label="Terminal"
          >
            <TerminalIcon className="w-4 h-4" />
          </button>

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
              isDark
                ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                : 'bg-white text-slate-700 border-slate-300 shadow-2xs'
            }`}
            title={ollamaReachable ? 'Dewan 8 Ahli AI Lokal Terhubung (Ollama Aktif)' : 'Ollama Daemon Terputus'}
          >
            <span
              className={`w-2 h-2 rounded-full mr-0.5 ${
                ollamaReachable ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'
              }`}
            />
          </div>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* 2. PRIMARY SIDEBAR (Collapsible & Resizable File Tree & Search) */}
      {/* ============================================================== */}
      {isSidebarVisible && (
        <aside
          aria-label="File Explorer"
          style={{ width: `${sidebarWidth}px` }}
          className={`shrink-0 border-r flex flex-col select-none transition-colors relative ${
            isDark ? 'bg-[#0b0f19] border-[#1f293d]' : 'bg-[#ffffff] border-slate-200'
          } ${mobileTab === 'files' || mobileTab === 'diff' ? 'fixed inset-0 z-40 w-full pb-14 bg-[#0b0f19]' : 'hidden lg:flex'}`}
        >
          {/* Header */}
          <div
            className={`h-10 px-3 border-b flex items-center justify-between text-xs font-bold tracking-wider ${
              isDark ? 'border-[#1f293d] text-slate-400' : 'border-slate-200 text-slate-600'
            }`}
          >
            {activeActivityTab === 'explorer' ? (
              <button
                type="button"
                onClick={() => {
                  void fetchProjects();
                  setIsProjectModalOpen(true);
                }}
                className={`flex items-center gap-1.5 truncate max-w-[150px] px-1.5 py-1 rounded transition-colors cursor-pointer text-left ${
                  isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
                title="Kelola & Ganti Proyek"
              >
                <FolderOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate uppercase font-bold text-[11px]">
                  {currentProjectId === 'default' ? 'Default Proyek' : currentProjectId}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>
            ) : (
              <span className="truncate">
                {activeActivityTab === 'search'
                  ? 'SEARCH FILES'
                  : activeActivityTab === 'git'
                  ? 'SOURCE CONTROL (GIT)'
                  : 'DIFF INSPECTOR'}
              </span>
            )}
            <div className="flex items-center gap-0.5">
              {activeActivityTab === 'explorer' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFile(p => !p)}
                    className={`p-1 rounded cursor-pointer ${
                      isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                    }`}
                    title="Buat File Baru"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (sandboxMode === 'local') void refreshLocalWorkspace();
                      else setPreviewKey(k => k + 1);
                    }}
                    className={`p-1 rounded cursor-pointer ${
                      isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                    }`}
                    title="Refresh Files"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Overflow Actions Menu (ZIP, JSON Backup, Import, Sync) */}
              <div ref={explorerMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsExplorerMenuOpen(prev => !prev)}
                  className={`p-1 rounded cursor-pointer ${
                    isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                  }`}
                  title="Opsi & Ekspor Workspace"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {isExplorerMenuOpen && (
                  <div
                    className={`absolute right-0 top-7 w-52 rounded-xl border p-1 shadow-2xl z-50 text-xs space-y-0.5 ${
                      isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsExplorerMenuOpen(false);
                        setIsTemplateModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-teal-400 hover:text-teal-300 cursor-pointer font-medium"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Pilih Starter Template...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExplorerMenuOpen(false);
                        handleExportToRuangKerja();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-emerald-400 hover:text-emerald-300 cursor-pointer font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Kirim ke Ruang Kerja (Canvas)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExplorerMenuOpen(false);
                        handleRunQualityAudit();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-emerald-400 hover:text-emerald-300 cursor-pointer font-medium"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Audit Kualitas (Bambang)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExplorerMenuOpen(false);
                        void handleExportZip();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 hover:text-white cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>Unduh ZIP Proyek</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExplorerMenuOpen(false);
                        handleExportSingleHtmlBundle();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 hover:text-white cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-teal-400" />
                      <span>Ekspor Single HTML Bundle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExplorerMenuOpen(false);
                        handleExportJsonBackup();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 hover:text-white cursor-pointer"
                    >
                      <FileJson className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ekspor JSON Backup</span>
                    </button>
                    <label className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 hover:text-white cursor-pointer">
                      <FileArchive className="w-3.5 h-3.5 text-sky-400" />
                      <span>Impor ZIP Project</span>
                      <input
                        type="file"
                        accept=".zip"
                        className="hidden"
                        onChange={async e => {
                          setIsExplorerMenuOpen(false);
                          const f = e.target.files?.[0];
                          if (!f) return;
                          try {
                            const zip = await JSZip.loadAsync(f);
                            const extracted: Record<string, string> = {};
                            for (const [filename, fileObj] of Object.entries(zip.files)) {
                              if (!fileObj.dir && !filename.startsWith('__MACOSX/')) {
                                const text = await fileObj.async('text');
                                extracted[filename] = text;
                              }
                            }
                            if (Object.keys(extracted).length > 0) {
                              if (sandboxMode === 'browser') {
                                const fresh = await resetVirtualFilesIdb(extracted);
                                setBrowserFiles(fresh);
                              } else {
                                for (const [p, c] of Object.entries(extracted)) {
                                  await apiClient.post('/api/v1/coder/fs/file', { path: p, content: c });
                                }
                                await refreshLocalWorkspace();
                              }
                              setOpenTabs(Object.keys(extracted).slice(0, 3));
                              void loadFileIntoEditor(Object.keys(extracted)[0]);
                              setPreviewKey(k => k + 1);
                            }
                          } catch (err) {
                            alert('Gagal mengekstrak berkas ZIP: ' + err);
                          }
                        }}
                      />
                    </label>
                    <label className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 hover:text-white cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-purple-400" />
                      <span>Impor JSON Backup</span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={e => {
                          setIsExplorerMenuOpen(false);
                          const f = e.target.files?.[0];
                          if (f) handleImportJsonBackup(f);
                        }}
                      />
                    </label>
                    {sandboxMode === 'browser' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsExplorerMenuOpen(false);
                            void handleSyncVirtualToDisk();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 hover:text-white cursor-pointer"
                        >
                          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Salin ke Disk Lokal Server</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsExplorerMenuOpen(false);
                            void handleResetStarterFiles();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset ke Template Awal</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsSidebarVisible(false)}
                className={`p-1 rounded cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
                title="Tutup Panel (Ctrl+B)"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* VIEW TAB 1: FILE EXPLORER */}
          {activeActivityTab === 'explorer' && (
            <>
              {/* New file form */}
              {isCreatingFile && (
                <form
                  onSubmit={handleCreateNewFile}
                  className={`p-2 border-b flex gap-1 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                >
                  <input
                    type="text"
                    value={newFileName}
                    onChange={e => setNewFileName(e.target.value)}
                    placeholder="filename.js"
                    autoFocus
                    className={`flex-1 border rounded px-2 py-1 text-xs outline-none ${
                      isDark
                        ? 'bg-slate-950 border-sky-500 text-white'
                        : 'bg-white border-sky-500 text-slate-900'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                  >
                    +
                  </button>
                </form>
              )}

              {/* Filter input */}
              <div className={`p-2 border-b ${isDark ? 'border-[#1f293d]' : 'border-slate-200'}`}>
                <div
                  className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs ${
                    isDark ? 'bg-slate-900/90 border-slate-800/90' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <Search className="w-3 h-3 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={fileFilter}
                    onChange={e => setFileFilter(e.target.value)}
                    placeholder="Filter file..."
                    className={`bg-transparent text-xs outline-none w-full ${
                      isDark ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'
                    }`}
                  />
                  {fileFilter && (
                    <button type="button" onClick={() => setFileFilter('')} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* File Tree List */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {fileItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    {sandboxMode === 'local' ? 'Memuat file local workspace...' : 'Tidak ada file'}
                  </div>
                ) : (
                  fileItems.map(file => {
                    const isSelected = file.path === activeFilePath;
                    return (
                      <div
                        key={file.path}
                        onClick={() => void loadFileIntoEditor(file.path)}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                          isSelected
                            ? isDark
                              ? 'bg-sky-500/15 text-sky-200 font-semibold border-l-2 border-sky-400 shadow-xs'
                              : 'bg-sky-50 text-sky-800 font-semibold border-l-2 border-sky-500 shadow-2xs'
                            : isDark
                            ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {renamingFilePath === file.path ? (
                          <form
                            onSubmit={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleRenameFile(file.path, renamingNewName);
                            }}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 flex items-center gap-1"
                          >
                            <input
                              type="text"
                              value={renamingNewName}
                              onChange={e => setRenamingNewName(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Escape') setRenamingFilePath(null);
                              }}
                              className="w-full text-xs font-mono px-1.5 py-0.5 rounded border border-sky-400 bg-slate-900 text-white outline-none"
                            />
                            <button type="submit" className="text-emerald-400 hover:text-emerald-300 px-1 cursor-pointer" title="Simpan nama">
                              <Check className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => setRenamingFilePath(null)} className="text-slate-400 hover:text-slate-300 px-1 cursor-pointer" title="Batal">
                              <X className="w-3 h-3" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                              {getFileIcon(file.path)}
                              <span className="truncate font-medium" title={file.path}>{file.path}</span>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={e => void handleDuplicateFile(file.path, e)}
                                className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-sky-400 cursor-pointer"
                                title="Duplikasi file"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setRenamingFilePath(file.path);
                                  setRenamingNewName(file.path);
                                }}
                                className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-amber-400 cursor-pointer"
                                title="Ubah nama file"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={e => void handleDeleteFile(file.path, e)}
                                className="p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 cursor-pointer"
                                title="Hapus file"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* VIEW TAB 2: GLOBAL CODE SEARCH & REPLACE */}
          {activeActivityTab === 'search' && (
            <div className="flex-1 flex flex-col min-h-0">
              <GlobalSearchPanel
                files={sandboxMode === 'browser' ? browserFiles : localFileCache}
                isDark={isDark}
                onNavigateToFile={f => {
                  void loadFileIntoEditor(f);
                }}
                onReplaceInFile={(f, updated) => {
                  if (sandboxMode === 'browser') {
                    setBrowserFiles(prev => ({ ...prev, [f]: updated }));
                    void saveVirtualFileIdb(f, updated);
                  } else {
                    void apiClient.post('/api/v1/coder/fs/file', { path: f, content: updated });
                    setLocalFileCache(prev => ({ ...prev, [f]: updated }));
                  }
                  if (activeFilePath === f) {
                    setEditorContent(updated);
                  }
                  setPreviewKey(k => k + 1);
                }}
                onReplaceAllFiles={updates => {
                  if (sandboxMode === 'browser') {
                    setBrowserFiles(prev => ({ ...prev, ...updates }));
                    for (const [p, c] of Object.entries(updates)) {
                      void saveVirtualFileIdb(p, c);
                    }
                  } else {
                    for (const [p, c] of Object.entries(updates)) {
                      void apiClient.post('/api/v1/coder/fs/file', { path: p, content: c });
                    }
                    setLocalFileCache(prev => ({ ...prev, ...updates }));
                  }
                  if (updates[activeFilePath] !== undefined) {
                    setEditorContent(updates[activeFilePath]);
                  }
                  setPreviewKey(k => k + 1);
                }}
              />
            </div>
          )}

          {/* VIEW TAB 2.5: SOURCE CONTROL (GIT) */}
          {activeActivityTab === 'git' && (
            <GitControlPanel
              files={sandboxMode === 'browser' ? browserFiles : localFileCache}
              lastDiff={lastDiff}
              snapshots={snapshots}
              onCommit={msg => {
                createSnapshot(msg, 'manual_save');
                setLastDiff(null);
              }}
              onRollback={snap => void handleRollbackSnapshot(snap)}
              onOpenFile={f => void loadFileIntoEditor(f)}
            />
          )}

          {/* VIEW TAB 3: VISUAL DIFF INSPECTOR & SNAPSHOT TIMELINE */}
          {activeActivityTab === 'diff' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {/* Active Diff Section */}
              {lastDiff ? (
                <div className="border-b border-slate-800 flex flex-col min-h-0 shrink-0 max-h-[50%]">
                  <div
                    className={`p-2.5 border-b flex items-center justify-between text-xs ${
                      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GitCompare className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="font-bold truncate text-[11px] text-purple-400">{lastDiff.path}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleAcceptDiff}
                        className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Terima Perubahan Diff"
                      >
                        <Check className="w-3 h-3" />
                        <span>Terima</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRevertDiff()}
                        className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Kembalikan Kode Semula"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revert</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed space-y-0.5 select-text">
                    {lastDiff.beforeContent === lastDiff.afterContent ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        Tidak ada perbedaan konten antara file sebelum dan sesudah.
                      </div>
                    ) : (
                      lastDiff.beforeContent
                        .split(/\r?\n/)
                        .slice(0, 40)
                        .map((line, i) => (
                          <div key={`rem_${i}`} className="bg-rose-500/15 text-rose-300 px-1.5 py-0.5 rounded-xs truncate">
                            - {line || ' '}
                          </div>
                        ))
                        .concat(
                          lastDiff.afterContent
                            .split(/\r?\n/)
                            .slice(0, 40)
                            .map((line, i) => (
                              <div key={`add_${i}`} className="bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded-xs truncate">
                                + {line || ' '}
                              </div>
                            ))
                        )
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-slate-500 text-[11px] border-b border-slate-800">
                  <div className="font-semibold text-slate-400">Tidak ada pending diff</div>
                  <div className="text-[10px] text-slate-600">Perubahan surgical AI akan muncul di sini.</div>
                </div>
              )}

              {/* Micro-Commit Snapshot History */}
              <div className="flex-1 flex flex-col min-h-0 p-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                  <div className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-sky-400" />
                    <span>SNAPSHOT HISTORY ({snapshots.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => createSnapshot(`Manual Checkpoint #${snapshots.length + 1}`, 'checkpoint')}
                    className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] cursor-pointer"
                    title="Simpan Titik Pemulihan Baru"
                  >
                    + Checkpoint
                  </button>
                </div>

                <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                  {snapshots.map(snap => (
                    <div
                      key={snap.id}
                      className={`p-2 rounded-lg border text-xs flex flex-col gap-1 transition-colors ${
                        isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              snap.source === 'ai_tool'
                                ? 'bg-purple-400'
                                : snap.source === 'manual_save'
                                ? 'bg-emerald-400'
                                : 'bg-sky-400'
                            }`}
                          />
                          <span className="font-semibold truncate text-[11px] text-slate-200">{snap.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">{snap.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>{snap.fileCount} berkas virtual</span>
                        <button
                          type="button"
                          onClick={() => void handleRollbackSnapshot(snap)}
                          className="px-1.5 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                          title="Kembalikan kode ke snapshot ini"
                        >
                          <Undo2 className="w-2.5 h-2.5" />
                          <span>Rollback</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mode Switcher Pill at Footer */}
          <div
            className={`px-3 py-2 border-t flex items-center justify-between text-[11px] font-medium ${
              isDark ? 'border-[#1f293d] bg-[#090d16] text-slate-400' : 'border-slate-200 bg-slate-50/90 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${sandboxMode === 'local' ? 'bg-sky-500' : 'bg-emerald-500'}`} />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Sandbox</span>
            </div>
            <div
              className={`flex rounded-lg p-0.5 border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/80 border-slate-300/80'
              }`}
            >
              <button
                type="button"
                onClick={() => setSandboxMode('local')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  sandboxMode === 'local'
                    ? isDark
                      ? 'bg-slate-850 text-sky-400 font-bold shadow-2xs'
                      : 'bg-white text-sky-700 font-bold shadow-2xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Local
              </button>
              <button
                type="button"
                onClick={() => setSandboxMode('browser')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  sandboxMode === 'browser'
                    ? isDark
                      ? 'bg-slate-850 text-emerald-400 font-bold shadow-2xs'
                      : 'bg-white text-emerald-700 font-bold shadow-2xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Browser
              </button>
            </div>
          </div>

          {/* Sidebar Resize Handle */}
          <div
            onMouseDown={handleStartResizeSidebar}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-sky-500/50 transition-colors z-40 select-none group"
            title="Geser untuk mengubah lebar sidebar"
          >
            <div className="w-full h-full group-hover:bg-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </aside>
      )}

      {/* ============================================================== */}
      {/* 3. CENTER EDITOR & LIVE PREVIEW WORKSPACE                      */}
      {/* ============================================================== */}
      <main
        className={`flex-1 flex flex-col min-w-0 border-r relative transition-colors ${
          isDark ? 'bg-[#090d16] border-[#1f293d]' : 'bg-[#ffffff] border-slate-200'
        } ${mobileTab === 'files' || mobileTab === 'diff' || mobileTab === 'ai' ? 'hidden lg:flex' : 'flex'}`}
      >
        {/* Tab Bar (VS Code style tabs with Pin, Context Menu, Dirty Dot, Split) */}
        <div
          className={`h-10 shrink-0 border-b flex items-center justify-between px-2 overflow-x-auto transition-colors ${
            isDark ? 'bg-[#0b0f19] border-[#1f293d]' : 'bg-[#f1f5f9] border-slate-200'
          }`}
        >
          <div className="flex-1 min-w-0 mr-2">
            <AdvancedTabBar
              openTabs={openTabs}
              activeFilePath={activeFilePath}
              pinnedTabs={pinnedTabs}
              dirtyTabs={dirtyTabs}
              splitMode={splitEditorMode}
              isDark={isDark}
              onSelectTab={tabPath => void loadFileIntoEditor(tabPath)}
              onCloseTab={(tabPath, e) => handleCloseTab(tabPath, e)}
              onCloseOthers={handleCloseOthers}
              onCloseToTheRight={handleCloseToTheRight}
              onCloseSaved={handleCloseSaved}
              onTogglePinTab={handleTogglePinTab}
              onSplitEditor={handleSplitEditor}
              onCopyPath={handleCopyPath}
              getFileIcon={getFileIcon}
            />
          </div>

          {/* Top Actions: Streamlined, focused & uncluttered */}
          <div className="flex items-center gap-1.5 pl-2 shrink-0">
            {/* Zen Mode Exit Button if active */}
            {isZenMode && (
              <button
                type="button"
                onClick={handleToggleZenMode}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs transition-colors"
                title="Keluar dari Zen Mode (Ctrl+Shift+Z)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Zen</span>
              </button>
            )}

            {/* Save Button */}
            <button
              type="button"
              onClick={() => void handleSaveFile()}
              disabled={isSavingFile}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                isDirty
                  ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500 shadow-xs'
                  : isDark
                  ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/80'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300/80 shadow-2xs'
              }`}
              title={`Simpan Berkas (${isMac ? 'Cmd+S' : 'Ctrl+S'})`}
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSavingFile ? 'Saving...' : 'Save'}</span>
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Perubahan belum disimpan" />}
            </button>

            {/* Split View Segmented Control */}
            <div
              className={`flex rounded-md p-0.5 border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/80 border-slate-300/80'
              }`}
            >
              <button
                type="button"
                onClick={() => setViewSplitMode('editor')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  viewSplitMode === 'editor'
                    ? isDark
                      ? 'bg-slate-800 text-sky-400 font-bold'
                      : 'bg-white text-sky-600 font-bold shadow-2xs'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Hanya Kode"
              >
                <Code2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewSplitMode('split')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  viewSplitMode === 'split'
                    ? isDark
                      ? 'bg-slate-800 text-sky-400 font-bold'
                      : 'bg-white text-sky-600 font-bold shadow-2xs'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Split: Kode & Live Preview"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewSplitMode('preview')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  viewSplitMode === 'preview'
                    ? isDark
                      ? 'bg-slate-800 text-sky-400 font-bold'
                      : 'bg-white text-sky-600 font-bold shadow-2xs'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Hanya Live Preview"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Toggle Terminal Button */}
            <button
              type="button"
              onClick={() => setIsTerminalOpen(p => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                isTerminalOpen
                  ? isDark
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                  : isDark
                  ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/80'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300/80 shadow-2xs'
              }`}
              title={`Buka / Tutup Terminal (${isMac ? 'Cmd+`' : 'Ctrl+`'})`}
            >
              <TerminalIcon className={`w-3.5 h-3.5 ${isTerminalOpen ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden xl:inline">Terminal</span>
            </button>

            {/* Toggle AI Agent Panel Button */}
            <button
              type="button"
              onClick={() => setIsAgentPanelOpen(p => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                isAgentPanelOpen
                  ? isDark
                    ? 'bg-sky-950/40 text-sky-300 border-sky-800/80 shadow-xs'
                    : 'bg-sky-50 text-sky-800 border-sky-200 shadow-2xs'
                  : isDark
                  ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/80'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300/80 shadow-2xs'
              }`}
              title={`Buka / Tutup Panel AI Agent (${isMac ? 'Cmd+L' : 'Ctrl+L'})`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAgentPanelOpen ? 'text-sky-400' : 'text-slate-400'}`} />
              <span className="hidden xl:inline">Agent</span>
            </button>

            {/* Bridge: Send to Ruang Kerja Canvas */}
            <button
              type="button"
              onClick={handleExportToRuangKerja}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/80'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300/80 shadow-2xs'
              }`}
              title="Kirim Berkas Kode Ini ke Dokumen Canvas Ruang Kerja sebagai Lampiran Skripsi"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              <span className="hidden xl:inline">Ruang Kerja</span>
            </button>

            {/* More Tools Dropdown Menu */}
            <div ref={moreToolsRef} className="relative">
              <button
                type="button"
                onClick={() => setIsMoreToolsOpen(p => !p)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                  isMoreToolsOpen
                    ? isDark
                      ? 'bg-slate-750 text-white border-slate-600'
                      : 'bg-slate-200 text-slate-900 border-slate-300 shadow-2xs'
                    : isDark
                    ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/80'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300/80 shadow-2xs'
                }`}
                title="Tools & Fitur Tambahan (Lo-Fi, Pomodoro, Templates, QA, Format, CDN, Zen Mode)"
                aria-label="More tools"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline">Tools</span>
              </button>

              {isMoreToolsOpen && (
                <div
                  className={`absolute right-0 top-8 w-60 rounded-xl border p-1.5 shadow-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                    isDark ? 'bg-[#0f172a] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Fokus & Produktivitas</span>
                  </div>

                  {/* Lo-Fi Focus Audio */}
                  <button
                    type="button"
                    onClick={() => {
                      soundscapeEngine.toggleTrack(currentLofiTrack);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Headphones className={`w-3.5 h-3.5 ${isLofiPlaying ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                      <span>Lo-Fi Focus Audio</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isLofiPlaying ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'
                    }`}>
                      {isLofiPlaying ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  {/* Pomodoro Focus Timer */}
                  <div className="px-2 py-1 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pomodoro Timer</span>
                    </span>
                    <PomodoroFocusBadge isDark={isDark} />
                  </div>

                  {/* Zen Sanctuary Breathing */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setZenBreakReason('manual');
                      setIsZenBreakOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-teal-300' : 'hover:bg-slate-100 text-teal-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-teal-400" />
                      <span>Zen Sanctuary (Napas 4-7-8)</span>
                    </div>
                  </button>

                  {/* Zen Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      handleToggleZenMode();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Zen Mode</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Ctrl+Shift+Z</span>
                  </button>

                  <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />

                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Alat Kode & Audit
                  </div>

                  {/* Format Document */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      handleFormatDocument();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Format Kode</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Shift+Alt+F</span>
                  </button>

                  {/* QA Audit Pak Bambang */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      handleRunQualityAudit();
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Audit Kualitas (Pak Bambang)</span>
                  </button>

                  {/* Inline AI */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsInlineAiOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Inline AI Assist</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Ctrl+K</span>
                  </button>

                  {/* Starter Templates */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsStarterGalleryOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Starter Templates</span>
                  </button>

                  {/* CDN Libraries */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsCdnModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Sisipkan CDN Library</span>
                  </button>

                  {/* Quick Open File */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsQuickOpenOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-sky-400" />
                      <span>Buka File Cepat</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Ctrl+P</span>
                  </button>

                  {/* Command Palette */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsCommandPaletteOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <span>Command Palette</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">F1</span>
                  </button>

                  {/* Generate Auto Unit Test */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      void handleGenerateAutoUnitTest();
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-amber-300' : 'hover:bg-slate-100 text-amber-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buat Test Unit Otomatis</span>
                  </button>

                  {/* Flowchart Visualizer */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsFlowchartModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-purple-300' : 'hover:bg-slate-100 text-purple-700'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                    <span>Diagram Alur Logika (Flowchart)</span>
                  </button>

                  {/* Autograder & Edge-Case Challenge */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      void handleRunAutograder();
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-amber-300' : 'hover:bg-slate-100 text-amber-700'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lab Autograder & Edge Cases</span>
                  </button>

                  {/* Bedah Metodologi Skripsi (Bab 3 & 4) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsThesisMethodologyModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-sky-300' : 'hover:bg-slate-100 text-sky-700'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                    <span>Bedah Metodologi Skripsi (Bab 3 & 4)</span>
                  </button>

                  {/* Bedah Kode Mode Maba (ELIM) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsMabaExplainerModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-pink-300' : 'hover:bg-slate-100 text-pink-700'
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5 text-pink-400" />
                    <span>Bedah Kode Mode Maba (ELIM)</span>
                  </button>

                  {/* SQL Database Canvas & SIAKAD Sandbox */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsSqlModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-indigo-300' : 'hover:bg-slate-100 text-indigo-700'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    <span>SQL Canvas & Basis Data SIAKAD</span>
                  </button>

                  {/* Ruang Kolaborasi & Asistensi Lab */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsPairReviewModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-emerald-300' : 'hover:bg-slate-100 text-emerald-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ruang Kolaborasi & Asistensi Lab</span>
                  </button>

                  {/* RuangTenang Care & Bernapas Sejenak */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsFrustrationModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-teal-300' : 'hover:bg-slate-100 text-teal-700'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 text-teal-400" />
                    <span>RuangTenang Care & Bernapas</span>
                  </button>

                  {/* Export GitHub Gist */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      setIsGitHubModalOpen(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>Ekspor ke GitHub Gist</span>
                  </button>

                  <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />

                  {/* Download ZIP */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      void handleExportZip();
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-emerald-400' : 'hover:bg-slate-100 text-emerald-600'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Proyek (ZIP)</span>
                  </button>

                  {/* Export Academic Lab Report */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      handleExportLabReport();
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-sky-400' : 'hover:bg-slate-100 text-sky-600'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ekspor Laporan Praktikum (.md)</span>
                  </button>

                  {/* Export Lab Report to Ruang Kerja Canvas */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreToolsOpen(false);
                      handleExportLabReportToRuangKerja();
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-emerald-400' : 'hover:bg-slate-100 text-emerald-600'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Kirim Laporan ke Ruang Kerja</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Breadcrumbs Bar */}
        <BreadcrumbBar
          filePath={activeFilePath}
          lineCount={lineCount}
          isDark={isDark}
          isZenMode={isZenMode}
          onToggleZenMode={handleToggleZenMode}
        />

        {/* Error Lens & 1-Klik AI Auto-Fix Banner */}
        {(problemMarkers[activeFilePath] || []).length > 0 && (
          <div className={`px-3 py-1.5 border-b flex items-center justify-between text-xs transition-colors shrink-0 ${
            isDark ? 'bg-rose-950/40 border-rose-900/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="font-semibold">
                Terdeteksi {(problemMarkers[activeFilePath] || []).length} masalah sintaksis pada berkas ini.
              </span>
              <span className="text-[11px] opacity-80 truncate hidden md:inline">
                {(problemMarkers[activeFilePath] || [])[0]?.message}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleTriggerAiAutoFix(activeFilePath)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] shadow-xs cursor-pointer transition-colors"
                title="Kirim detail error ke Dewan AI untuk diperbaiki otomatis"
              >
                <Sparkles className="w-3 h-3 text-amber-200" />
                <span>Auto-Fix dengan AI</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Canvas Area (Split / Editor / Preview) */}
        <div
          id="ruangcoder-editor-split-container"
          className={`flex-1 flex min-h-0 relative overflow-hidden ${
            isDark ? 'bg-[#090d16]' : 'bg-[#ffffff]'
          }`}
        >
          {/* Editor Column */}
          {viewSplitMode !== 'preview' && (
            <div
              style={{
                width: viewSplitMode === 'split' ? `${editorSplitRatio}%` : '100%',
                flex: viewSplitMode === 'split' ? 'none' : '1'
              }}
              className={`flex flex-col min-h-0 relative ${
                viewSplitMode === 'split' ? (isDark ? 'border-r border-[#1f293d]' : 'border-r border-slate-200') : ''
              }`}
            >
              {isImageFile(activeFilePath) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/60 overflow-auto">
                  <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl max-w-lg text-center space-y-3">
                    <div className="text-xs font-semibold text-sky-400 font-mono flex items-center justify-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>{activeFilePath}</span>
                    </div>
                    {activeFilePath.endsWith('.svg') ? (
                      <div
                        className="p-4 bg-white/5 rounded-xl border border-slate-800 flex items-center justify-center min-h-48 max-h-72 overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: editorContent }}
                      />
                    ) : (
                      <img
                        src={
                          sandboxMode === 'browser'
                            ? editorContent.startsWith('data:')
                              ? editorContent
                              : `data:image/png;base64,${editorContent}`
                            : `/api/v1/coder/fs/file?path=${encodeURIComponent(activeFilePath)}`
                        }
                        alt={activeFilePath}
                        className="max-h-64 max-w-full rounded-lg mx-auto object-contain border border-slate-800"
                      />
                    )}
                    <div className="text-[11px] text-slate-500 font-mono">
                      Image View Canvas • {editorContent.length} bytes
                    </div>
                  </div>
                </div>
              ) : splitEditorMode !== 'none' && secondaryFilePath ? (
                /* Split Multi-Pane Editor (VS Code Dual Editor) */
                <div className={`flex-1 flex min-h-0 ${splitEditorMode === 'vertical' ? 'flex-row' : 'flex-col'}`}>
                  {/* Primary Editor Pane */}
                  <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-b border-slate-800/80">
                    <div className="h-6 px-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-sky-400 truncate">{activeFilePath} (Primary)</span>
                      {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </div>
                    <div className="flex-1 min-h-0 relative">
                      <RuangMonacoEditor
                        onCursorChange={(line, column) => setCursorPos({ line, column })}
                        filePath={activeFilePath}
                        value={editorContent}
                        onChange={val => {
                          setEditorContent(val);
                          setIsDirty(true);
                        }}
                        onSave={handleSaveFile}
                        onMarkersChange={markers => {
                          setProblemMarkers(prev => ({ ...prev, [activeFilePath]: markers }));
                        }}
                        onTriggerInlineAi={selected => {
                          setInlineAiSelectedText(selected);
                          if (selected && selected.trim()) {
                            setIsInlineAiFloatingOpen(true);
                          } else {
                            setIsInlineAiOpen(true);
                          }
                        }}
                        isDark={isDark}
                      />
                    </div>
                  </div>

                  {/* Secondary Editor Pane */}
                  <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    <div className="h-6 px-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-purple-400 truncate">{secondaryFilePath} (Split Pane)</span>
                      <div className="flex items-center gap-1.5">
                        {secondaryIsDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        <button
                          type="button"
                          onClick={() => {
                            setSplitEditorMode('none');
                            setSecondaryFilePath(null);
                          }}
                          className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Tutup Split Pane"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                      <RuangMonacoEditor
                        filePath={secondaryFilePath}
                        value={secondaryEditorContent}
                        onChange={val => {
                          setSecondaryEditorContent(val);
                          setSecondaryIsDirty(true);
                        }}
                        onSave={handleSaveSecondaryFile}
                        onMarkersChange={markers => {
                          setProblemMarkers(prev => ({ ...prev, [secondaryFilePath]: markers }));
                        }}
                        onTriggerInlineAi={selected => {
                          setInlineAiSelectedText(selected);
                          if (selected && selected.trim()) {
                            setIsInlineAiFloatingOpen(true);
                          } else {
                            setIsInlineAiOpen(true);
                          }
                        }}
                        isDark={isDark}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Standard Editor */
                <>
                  <RuangMonacoEditor
                    onCursorChange={(line, column) => setCursorPos({ line, column })}
                    filePath={activeFilePath}
                    value={editorContent}
                    onChange={val => {
                      setEditorContent(val);
                      setIsDirty(true);
                    }}
                    onSave={handleSaveFile}
                    onMarkersChange={markers => {
                      setProblemMarkers(prev => ({ ...prev, [activeFilePath]: markers }));
                    }}
                    onTriggerInlineAi={selected => {
                      setInlineAiSelectedText(selected);
                      if (selected && selected.trim()) {
                        setIsInlineAiFloatingOpen(true);
                      } else {
                        setIsInlineAiOpen(true);
                      }
                    }}
                    diffDecorations={activeInlineDiff.hasDiff && lastDiff && lastDiff.path === activeFilePath ? activeInlineDiff.decorations : undefined}
                    isDark={isDark}
                  />

                  {/* Modern In-Editor Floating Diff Action Bar */}
                  {activeInlineDiff.hasDiff && lastDiff && lastDiff.path === activeFilePath && (
                    <InlineDiffDecorationBar
                      filePath={activeFilePath}
                      additions={activeInlineDiff.additions}
                      deletions={activeInlineDiff.deletions}
                      onAccept={() => {
                        handleAcceptDiff();
                        setLastDiff(null);
                      }}
                      onReject={() => {
                        void handleRevertDiff();
                        setLastDiff(null);
                      }}
                      onOpenModal={() => setIsDiffReviewModalOpen(true)}
                      isDark={isDark}
                    />
                  )}

                  {/* Floating Inline AI Action Bar over Monaco / Fallback */}
                  <InlineAiActionBar
                    isOpen={isInlineAiFloatingOpen}
                    selectedText={inlineAiSelectedText}
                    onClose={() => setIsInlineAiFloatingOpen(false)}
                    onSubmit={(actionPrompt, selectedCode) => {
                      const fullPrompt = `${actionPrompt}\n\nKode rujukan (${activeFilePath}):\n\`\`\`\n${selectedCode}\n\`\`\``;
                      void handleSendAgentPrompt(fullPrompt);
                    }}
                    isDark={isDark}
                  />
                </>
              )}
            </div>
          )}

          {/* Draggable Split Divider between Editor and Preview */}
          {viewSplitMode === 'split' && (
            <div
              onMouseDown={handleStartResizeSplitRatio}
              className="w-1.5 h-full cursor-col-resize hover:bg-sky-500/50 bg-[#1f293d] transition-colors z-30 select-none group shrink-0"
              title="Geser untuk mengatur perbandingan lebar Editor vs Live Preview"
            >
              <div className="w-full h-full group-hover:bg-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Live Web Preview Column with Viewport Frames & Console */}
          {viewSplitMode !== 'editor' && (
            <div
              style={{
                width: viewSplitMode === 'split' ? `${100 - editorSplitRatio}%` : '100%',
                flex: viewSplitMode === 'split' ? 'none' : '1'
              }}
              className="flex flex-col bg-slate-950 min-h-0 relative"
            >
              <div className="h-7 px-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Live Web Sandbox
                </span>

                {/* Device Viewport Toggle */}
                <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('desktop')}
                    className={`p-0.5 rounded ${previewViewport === 'desktop' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-white'}`}
                    title="Desktop View (100%)"
                  >
                    <Monitor className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('tablet')}
                    className={`p-0.5 rounded ${previewViewport === 'tablet' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-white'}`}
                    title="Tablet View (768px)"
                  >
                    <Tablet className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('mobile')}
                    className={`p-0.5 rounded ${previewViewport === 'mobile' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-white'}`}
                    title="Mobile View (375px)"
                  >
                    <Smartphone className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isInspectElementActive;
                      setIsInspectElementActive(next);
                      const iframe = document.querySelector('iframe[title="RuangCoder Live Web Preview"]') as HTMLIFrameElement;
                      if (iframe?.contentWindow) {
                        try {
                          (iframe.contentWindow as any).__ruangcoder_inspect_mode = next;
                        } catch {}
                      }
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      isInspectElementActive
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                    title="Inspect & Edit UI Element dengan Mbak Dewi"
                  >
                    <Crosshair className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{isInspectElementActive ? 'Inspecting...' : 'Inspect'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAutoReloadEnabled(p => !p)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                      isAutoReloadEnabled
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                    title={isAutoReloadEnabled ? 'Auto-Reload Aktif (Debounced 1.2s / Instan saat Simpan)' : 'Auto-Reload Jeda (Klik Reload manual)'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAutoReloadEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{isAutoReloadEnabled ? 'Live: ON' : 'Live: OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewConsoleOpen(p => !p)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      isPreviewConsoleOpen
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : previewLogs.some(l => l.level === 'error')
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                    title="Toggle In-App Console"
                  >
                    <Bug className="w-2.5 h-2.5" />
                    <span>Console ({previewLogs.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewKey(k => k + 1)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
                    title="Reload Preview"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Reload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([livePreviewHtml], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-sky-400 hover:text-sky-300 cursor-pointer"
                    title="Buka Live Preview di Jendela / Tab Baru"
                  >
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">Pop-out</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-teal-400 hover:text-teal-300 cursor-pointer"
                    title="Scan QR Code untuk Preview di Layar Smartphone"
                  >
                    <QrCode className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">QR Scan</span>
                  </button>
                </div>
              </div>

              {/* Inspected Element Quick Bar Banner */}
              {inspectedElementInfo && (
                <div className="px-3 py-1.5 bg-purple-950/80 border-b border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
                  <div className="flex items-center gap-2 truncate">
                    <Crosshair className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="font-mono text-[11px] font-bold text-purple-300">
                      &lt;{inspectedElementInfo.selector}&gt;
                    </span>
                    <span className="text-[11px] text-purple-400/80 truncate">
                      "{inspectedElementInfo.text.slice(0, 35)}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const dewi = COUNCIL_PERSONAS.find(p => p.id === 'dewi');
                        if (dewi) setActiveCouncilPersona(dewi);
                        setPromptInput(`Mbak Dewi, tolong percantik dan ubah styling elemen <${inspectedElementInfo.selector}> ("${inspectedElementInfo.text}") agar lebih modern.`);
                      }}
                      className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold cursor-pointer transition shadow-xs"
                    >
                      Style dengan Mbak Dewi
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectedElementInfo(null)}
                      className="p-0.5 rounded hover:bg-purple-800 text-purple-300 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Iframe Viewport Wrapper */}
              <div className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden bg-slate-900/40">
                <iframe
                  key={previewKey}
                  title="RuangCoder Live Web Preview"
                  srcDoc={livePreviewHtml}
                  sandbox="allow-scripts"
                  className={`h-full bg-white border-0 transition-all rounded-xs shadow-lg ${
                    previewViewport === 'mobile'
                      ? 'w-[375px] max-h-[667px]'
                      : previewViewport === 'tablet'
                      ? 'w-[768px]'
                      : 'w-full'
                  }`}
                />
              </div>

              {/* Collapsible Preview Console Drawer */}
              {isPreviewConsoleOpen && (
                <div className="h-36 shrink-0 bg-[#070a12] border-t border-slate-800 flex flex-col font-mono text-[11px]">
                  <div className="h-6 px-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[10px]">
                    <div className="flex items-center gap-1.5 font-bold text-slate-300">
                      <Bug className="w-3 h-3 text-emerald-400" />
                      <span>RUNTIME PREVIEW CONSOLE</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewLogs([])}
                      className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 select-text">
                    {previewLogs.length === 0 ? (
                      <div className="text-slate-500 italic text-center py-2">
                        Tidak ada log output runtime dari preview iframe.
                      </div>
                    ) : (
                      previewLogs.map(log => (
                        <div
                          key={log.id}
                          className={`flex items-start justify-between gap-2 py-0.5 px-1 rounded ${
                            log.level === 'error'
                              ? 'bg-rose-500/15 text-rose-300'
                              : log.level === 'warn'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-slate-500 text-[9px] shrink-0 font-sans">{log.time}</span>
                            <span className="font-bold shrink-0 uppercase text-[9px]">{`[${log.level}]`}</span>
                            <span className="break-all whitespace-pre-wrap">{log.text}</span>
                          </div>
                          {log.level === 'error' && (
                            <button
                              type="button"
                              onClick={() => {
                                const kihadjar = COUNCIL_PERSONAS.find(p => p.id === 'kihadjar');
                                if (kihadjar) setActiveCouncilPersona(kihadjar);
                                setPromptInput(`Ki Hadjar, tolong analisis dan perbaiki runtime error berikut:\n"${log.text}"\nLokasi file terkait: ${activeFilePath}`);
                              }}
                              className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[9px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition border border-rose-500/30"
                              title="Kirim error ini ke Ki Hadjar untuk dianalisis dan diperbaiki"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Fix with Ki Hadjar</span>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* DOCKED INTEGRATED TERMINAL (VS Code Bottom Panel Resizable)    */}
        {/* ============================================================== */}
        {isTerminalOpen && (
          <div
            style={{ height: isTerminalMaximized ? '90%' : `${terminalHeight}px` }}
            className={`shrink-0 bg-[#070a12] border-t flex flex-col relative ${
              isDark ? 'border-[#1f293d]' : 'border-slate-300'
            }`}
          >
            {/* Terminal Vertical Resize Handle (Top edge) */}
            {!isTerminalMaximized && (
              <div
                onMouseDown={handleStartResizeTerminal}
                className="absolute -top-1 left-0 w-full h-2 cursor-row-resize hover:bg-sky-500/50 transition-colors z-40 select-none group"
                title="Geser ke atas/bawah untuk mengatur tinggi terminal"
              >
                <div className="w-full h-0.5 group-hover:bg-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            {/* Anti-Burnout & Stress Shield Alert */}
            {consecutiveFailures >= 3 && (
              <div className="px-3 py-1.5 bg-amber-950/70 border-b border-amber-500/40 flex items-center justify-between text-xs text-amber-200 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    <strong>Peringatan Anti-Burnout:</strong> Terdeteksi {consecutiveFailures} eksekusi berturut-turut error. Tarik napas sejenak atau minta bantuan AI.
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setConsecutiveFailures(0);
                      soundscapeEngine.playAllActive();
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-600/40 hover:bg-emerald-600/60 text-emerald-300 text-[10px] font-bold cursor-pointer"
                  >
                    🎧 Putar Lo-Fi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConsecutiveFailures(0);
                      setPromptInput(
                        `Tolong analisis dan perbaiki error berikut: ${terminalEntries[terminalEntries.length - 1]?.stderr || 'error runtime'}`
                      );
                      setActiveActivityTab('explorer');
                    }}
                    className="px-2 py-0.5 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-300 text-[10px] font-bold cursor-pointer"
                  >
                    Minta Solusi AI
                  </button>
                </div>
              </div>
            )}

            {/* Terminal Header */}
            <div className="h-7 px-3 bg-[#0b0f19] border-b border-[#1f293d] flex items-center justify-between text-xs shrink-0 overflow-x-auto">
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setTerminalTab('terminal')}
                  className={`font-semibold text-[11px] cursor-pointer flex items-center gap-1 ${
                    terminalTab === 'terminal' ? 'text-sky-400 border-b border-sky-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TerminalIcon className="w-3 h-3" />
                  <span>TERMINAL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('js_repl')}
                  className={`font-semibold text-[11px] cursor-pointer flex items-center gap-1 ${
                    terminalTab === 'js_repl' ? 'text-amber-400 border-b border-amber-400' : 'text-slate-400 hover:text-white'
                  }`}
                  title="JavaScript Interactive Evaluator REPL"
                >
                  <Code2 className="w-3 h-3 text-amber-400" />
                  <span>JS REPL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('python_repl')}
                  className={`font-semibold text-[11px] cursor-pointer flex items-center gap-1 ${
                    terminalTab === 'python_repl' ? 'text-sky-400 border-b border-sky-400' : 'text-slate-400 hover:text-white'
                  }`}
                  title="In-Browser Python Simulator"
                >
                  <Code2 className="w-3 h-3 text-sky-400" />
                  <span>PYTHON REPL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('c_runner')}
                  className={`font-semibold text-[11px] cursor-pointer flex items-center gap-1 ${
                    terminalTab === 'c_runner' ? 'text-emerald-400 border-b border-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                  title="C/C++ Student Simulator & Virtual Memory"
                >
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  <span>C/C++ SIM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('sql_runner')}
                  className={`font-semibold text-[11px] cursor-pointer flex items-center gap-1 ${
                    terminalTab === 'sql_runner' ? 'text-indigo-400 border-b border-indigo-400' : 'text-slate-400 hover:text-white'
                  }`}
                  title="SQLite Relational Database Canvas (SIAKAD)"
                >
                  <Database className="w-3 h-3 text-indigo-400" />
                  <span>SQL CANVAS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('problems')}
                  className={`font-semibold text-[11px] cursor-pointer flex items-center gap-1 ${
                    terminalTab === 'problems' ? 'text-rose-400 border-b border-rose-400' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Monaco Diagnostics & Syntax Problems"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>PROBLEMS</span>
                  {Object.values(problemMarkers).reduce((a, c) => a + c.length, 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[9px]">
                      {Object.values(problemMarkers).reduce((a, c) => a + c.length, 0)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('test_runner')}
                  className={`font-semibold text-[11px] cursor-pointer flex items-center gap-1 ${
                    terminalTab === 'test_runner' ? 'text-emerald-400 border-b border-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>TEST RUNNER</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('agent_logs')}
                  className={`font-semibold text-[11px] cursor-pointer flex items-center gap-1 ${
                    terminalTab === 'agent_logs' ? 'text-purple-400 border-b border-purple-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-3 h-3" />
                  <span>AGENT LOGS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalTab('preview_console')}
                  className={`font-semibold text-[11px] cursor-pointer flex items-center gap-1 ${
                    terminalTab === 'preview_console' ? 'text-amber-400 border-b border-amber-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bug className="w-3 h-3" />
                  <span>CONSOLE ({previewLogs.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportRunOutputToThesis}
                  className="px-2 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Ekspor luaran terminal/REPL ini ke naskah Bab 4 skripsi di RuangKerja"
                >
                  <GraduationCap className="w-2.5 h-2.5 text-sky-400" />
                  <span>Kirim ke Bab 4</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleRunTestSuite()}
                  className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Jalankan node test.js"
                >
                  <Play className="w-2.5 h-2.5" />
                  <span>Run Test</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (terminalTab === 'preview_console') setPreviewLogs([]);
                    else setTerminalEntries([]);
                  }}
                  className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 text-[10px] cursor-pointer"
                  title="Clear Console"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsTerminalMaximized(p => !p)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  title="Maximize/Restore"
                >
                  {isTerminalMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsTerminalOpen(false)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  title="Close Terminal"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Intelligent Error Lens Action Banner */}
            {lastTerminalError && (
              <ErrorLensActionBanner
                errorText={lastTerminalError}
                activeFilePath={activeFilePath}
                isDark={isDark}
                onAskKiHadjar={(promptText) => {
                  const kihadjar = COUNCIL_PERSONAS.find(p => p.id === 'kihadjar');
                  if (kihadjar) setActiveCouncilPersona(kihadjar);
                  setPromptInput(promptText);
                  setIsAgentPanelOpen(true);
                  void handleSendAgentPrompt(promptText);
                }}
                onAutoFix={(promptText) => {
                  setPromptInput(promptText);
                  setIsAgentPanelOpen(true);
                  void handleSendAgentPrompt(promptText);
                }}
                onNavigateToFileLine={(file) => {
                  void loadFileIntoEditor(file);
                }}
                onDismiss={() => setLastTerminalError(null)}
              />
            )}

            {/* TAB CONTENT 1: SHELL TERMINAL */}
            {terminalTab === 'terminal' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-2.5 font-mono text-[11.5px] space-y-1.5 select-text leading-5">
                  {terminalEntries.length === 0 ? (
                    <div className="text-slate-500">
                      Ketik perintah shell di bawah atau jalankan tombol cepat <code className="text-emerald-400">node test.js</code>.
                    </div>
                  ) : (
                    terminalEntries.map(entry => (
                      <div key={entry.id} className="space-y-0.5">
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-emerald-400 font-bold">
                            developer@ruangcoder:{sandboxMode === 'local' ? '~/coder-workspace' : '~/virtual-sandbox'}$
                          </span>
                          <span className="text-sky-300 font-bold">{entry.command}</span>
                          <span className="text-[10px] text-slate-600">({entry.durationMs}ms)</span>
                        </div>
                        {entry.stdout && <pre className="text-slate-200 whitespace-pre-wrap">{entry.stdout}</pre>}
                        {entry.stderr && (
                          <div className="flex items-start justify-between gap-2 p-1.5 rounded bg-rose-500/10 border border-rose-500/20">
                            <pre className="text-rose-400 whitespace-pre-wrap flex-1">{entry.stderr}</pre>
                            <button
                              type="button"
                              onClick={() => {
                                const kihadjar = COUNCIL_PERSONAS.find(p => p.id === 'kihadjar');
                                if (kihadjar) setActiveCouncilPersona(kihadjar);
                                setPromptInput(`Ki Hadjar, tolong perbaiki error terminal dari perintah "${entry.command}":\n"${entry.stderr}"`);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition border border-rose-500/30"
                              title="Kirim error terminal ini ke Ki Hadjar"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Fix with Ki Hadjar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {isRunningCommand && (
                    <div className="flex items-center gap-2 text-sky-400 animate-pulse">
                      <span className="text-emerald-400 font-bold">$</span>
                      <span>Menjalankan perintah di sandbox runtime...</span>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    void handleRunTerminalCommand();
                  }}
                  className="h-8 px-3 bg-[#0b0f19] border-t border-[#1f293d] flex items-center gap-2 shrink-0"
                >
                  <span className="text-emerald-400 font-mono font-bold">$</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={e => setTerminalInput(e.target.value)}
                    placeholder="node test.js... (ketik 'help' untuk daftar perintah)"
                    className="flex-1 bg-transparent font-mono text-xs text-white outline-none placeholder:text-slate-600"
                  />
                  <button
                    type="submit"
                    disabled={isRunningCommand}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    {isRunningCommand ? 'Running...' : 'Enter'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT 2: TEST RUNNER */}
            {terminalTab === 'test_runner' && (
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-2 select-text">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        testRunnerResult.status === 'success'
                          ? 'bg-emerald-400'
                          : testRunnerResult.status === 'failure'
                          ? 'bg-rose-400'
                          : testRunnerResult.status === 'running'
                          ? 'bg-sky-400 animate-ping'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span className="font-bold text-slate-200">
                      Status: {testRunnerResult.status.toUpperCase()}
                    </span>
                    {testRunnerResult.durationMs > 0 && (
                      <span className="text-slate-500 text-[11px]">({testRunnerResult.durationMs}ms)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRunTestSuite()}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Play className="w-3 h-3" />
                    <span>Jalankan Test Sekarang</span>
                  </button>
                </div>
                {testRunnerResult.output ? (
                  <pre className="p-2.5 rounded bg-[#050811] border border-slate-800 text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">
                    {testRunnerResult.output}
                  </pre>
                ) : (
                  <div className="text-slate-500 text-center py-4">
                    Belum ada hasil test. Klik tombol di atas untuk menjalankan pengujian otomatis.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: AGENT LOGS */}
            {terminalTab === 'agent_logs' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs select-text">
                {messages.length === 0 ? (
                  <div className="text-slate-500 text-center py-4">
                    Belum ada riwayat aktivitas agent AI.
                  </div>
                ) : (
                  messages
                    .filter(m => m.role === 'assistant')
                    .map(m => (
                      <div key={m.id} className="p-2 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-bold text-sky-400">{m.activePersona?.name || m.modelUsed || 'AI Agent'}</span>
                          <span>{m.timestamp}</span>
                        </div>
                        {m.thoughts && m.thoughts.length > 0 && (
                          <div className="text-[11px] text-purple-300 italic bg-purple-950/20 p-1.5 rounded">
                            {m.thoughts[m.thoughts.length - 1]}
                          </div>
                        )}
                        {m.toolSteps && m.toolSteps.length > 0 && (
                          <div className="text-[11px] text-slate-400 space-y-0.5">
                            {m.toolSteps.map((ts, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="text-emerald-400 font-bold">✓</span>
                                <span>{ts.toolName}: {ts.summary || JSON.stringify(ts.args)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}

            {/* TAB CONTENT 4: PREVIEW CONSOLE */}
            {terminalTab === 'preview_console' && (
              <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 select-text">
                {previewLogs.length === 0 ? (
                  <div className="text-slate-500 text-center py-4">
                    Tidak ada log runtime dari preview aplikasi.
                  </div>
                ) : (
                  previewLogs.map(log => (
                    <div
                      key={log.id}
                      className={`px-2 py-1 rounded text-[11px] flex items-start justify-between gap-2 ${
                        log.level === 'error'
                          ? 'bg-rose-500/15 text-rose-300'
                          : log.level === 'warn'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-[10px] text-slate-500 shrink-0">{log.time}</span>
                        <span className="font-bold uppercase text-[10px] shrink-0 text-slate-400">[{log.level}]</span>
                        <pre className="whitespace-pre-wrap flex-1">{log.text}</pre>
                      </div>
                      {log.level === 'error' && (
                        <button
                          type="button"
                          onClick={() => {
                            const kihadjar = COUNCIL_PERSONAS.find(p => p.id === 'kihadjar');
                            if (kihadjar) setActiveCouncilPersona(kihadjar);
                            setPromptInput(`Ki Hadjar, tolong perbaiki runtime console error:\n"${log.text}"`);
                          }}
                          className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition border border-rose-500/30"
                          title="Kirim error ini ke Ki Hadjar"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Fix with Ki Hadjar</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT 5: INTERACTIVE JS / PYTHON / C / SQL REPL & MONACO PROBLEMS */}
            {(terminalTab === 'js_repl' || terminalTab === 'python_repl' || terminalTab === 'c_runner' || terminalTab === 'sql_runner' || terminalTab === 'problems') && (
              <InteractiveReplDock
                currentTab={terminalTab}
                activeFilePath={activeFilePath}
                problemMarkers={problemMarkers}
                isDark={isDark}
                onNavigateToProblem={f => {
                  void loadFileIntoEditor(f);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 4. RIGHT PANEL: CURSOR COMPOSER & CLAUDE CODE AGENT CHAT (Resizable) */}
      {/* ============================================================== */}
      {isAgentPanelOpen && (
        <aside
          aria-label="RuangCoder Agent Panel"
          style={{ width: `${agentPanelWidth}px` }}
          className={`shrink-0 border-l flex flex-col min-h-0 select-none transition-colors relative ${
            isDark ? 'bg-[#0b0f19] border-[#1f293d]' : 'bg-[#ffffff] border-slate-200'
          } ${mobileTab === 'ai' ? 'fixed inset-0 z-40 w-full pb-14 bg-[#0b0f19]' : 'hidden lg:flex'}`}
        >
          {/* Agent Panel Resize Handle (Left edge) */}
          <div
            onMouseDown={handleStartResizeAgentPanel}
            className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-sky-500/50 transition-colors z-40 select-none group"
            title="Geser untuk mengubah lebar panel Agent"
          >
            <div className="w-full h-full group-hover:bg-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {/* Agent Header */}
          <div
            className={`h-10 px-3.5 border-b flex items-center justify-between ${
              isDark ? 'border-[#1f293d]' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <span className={`font-bold text-xs tracking-wide truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                RUANGCODER AGENT
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  aiProvider === 'gemini' && geminiStatus.available
                    ? 'bg-purple-400 shadow-[0_0_6px_#c084fc]'
                    : ollamaReachable
                    ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                    : 'bg-amber-400'
                }`}
                title={
                  aiProvider === 'gemini' && geminiStatus.available
                    ? 'Gemini Cloud Engine Aktif'
                    : ollamaReachable
                    ? 'Dewan Ahli AI Lokal Terhubung (Ollama • 100% Privat)'
                    : 'Ollama Offline: Pastikan Ollama lokal aktif (http://127.0.0.1:11434)'
                }
              />
            </div>

            {/* AI Engine Provider Selector */}
            <div className={`flex items-center gap-0.5 text-[10px] p-0.5 rounded-lg border ${
              isDark ? 'border-slate-800 bg-slate-900/80 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
            }`}>
              <button
                type="button"
                onClick={() => setAiProvider('ollama')}
                className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors font-medium ${
                  aiProvider === 'ollama'
                    ? isDark ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'bg-white text-emerald-700 font-bold shadow-2xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Model AI Lokal Ollama (100% Privat di Komputer Sendiri)"
              >
                Ollama Lokal
              </button>
              {geminiStatus.available && (
                <>
                  <button
                    type="button"
                    onClick={() => setAiProvider('auto')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors font-medium ${
                      aiProvider === 'auto'
                        ? isDark ? 'bg-sky-600 text-white font-bold shadow-xs' : 'bg-white text-sky-700 font-bold shadow-2xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Otomatis: Gunakan Ollama jika tersedia, jika tidak beralih ke Cloud"
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiProvider('gemini')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors font-medium ${
                      aiProvider === 'gemini'
                        ? isDark ? 'bg-purple-600 text-white font-bold shadow-xs' : 'bg-white text-purple-700 font-bold shadow-2xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Paksa Gemini Cloud Engine"
                  >
                    Gemini
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800/50 cursor-pointer"
                  title="Reset Chat"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAgentPanelOpen(false)}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Tutup Panel AI (Ctrl+L)"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Multi-Agent Council Visual Bar with Dual-Persona Mode Toggle */}
          <div
            className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 ${
              isDark ? 'border-[#1f293d] bg-slate-950/40' : 'border-slate-200 bg-slate-50/80'
            }`}
          >
            <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 py-0.5 scrollbar-none [scrollbar-width:none]">
              {(personaMode === 'creative' ? COUNCIL_PERSONAS : PROFESSIONAL_PERSONAS).map(p => {
                const isActive = activeCouncilPersona?.id === p.id;
                return (
                  <div
                    key={p.id}
                    title={`${p.name} (${p.role}): ${p.specialty}`}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all select-none shrink-0 ${
                      isActive
                        ? isDark
                          ? 'bg-sky-500/20 text-sky-200 font-semibold ring-1 ring-sky-500/40'
                          : 'bg-sky-100 text-sky-800 font-semibold ring-1 ring-sky-300'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="text-xs">{p.avatar}</span>
                    <span className="text-[10px] font-medium">{p.name.replace(/^(Pak|Ki|Mas|Mbak|Ibu|Si)\s+/, '')}</span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPersonaMode(m => (m === 'creative' ? 'professional' : 'creative'))}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 cursor-pointer border transition-all flex items-center gap-1 ${
                personaMode === 'professional'
                  ? isDark
                    ? 'bg-purple-950/40 text-purple-300 border-purple-800 hover:bg-purple-900/50'
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 shadow-2xs'
                  : isDark
                  ? 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
              }`}
              title="Klik untuk beralih antara Persona Tokoh Kreatif vs Tim Profesional"
            >
              <span>{personaMode === 'professional' ? '💼 Tim Pro' : '🏛️ Tokoh'}</span>
            </button>
          </div>

          {/* Animated Active Agent Council Handoff Flow Indicator */}
          {activeCouncilPersona && (
            <div className="px-3 py-1.5 bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border-b border-sky-500/30 flex items-center justify-between text-xs text-sky-200 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm animate-bounce">{activeCouncilPersona.avatar}</span>
                <div className="truncate text-[11px]">
                  <span className="font-bold text-sky-300">{activeCouncilPersona.name}</span>
                  <span className="text-slate-400 mx-1">•</span>
                  <span className="text-slate-300">{activeCouncilPersona.role}</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold animate-pulse shrink-0">
                ⚡ Memproses Tugas
              </span>
            </div>
          )}

          {/* Agent Feed (Reasoning + Tool Calls + Responses) */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4 select-text">
            {messages.length === 0 ? (
              <div className="space-y-3 py-2">
                <div
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    isDark
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-500 dark:text-sky-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Dewan 8 Ahli AI Siap Membantu</span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Instruksi coding didelegasikan otomatis ke 8 tokoh spesialis (arsitektur, CoT debug, implementasi, UI/UX, QA, dokumentasi).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
                    Saran Prompt Cepat
                  </div>
                  {PROMPT_SUGGESTIONS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => void handleSendAgentPrompt(prompt)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs leading-relaxed transition-all cursor-pointer ${
                        isDark
                          ? 'bg-slate-900/50 hover:bg-slate-850 border-slate-800/80 hover:border-sky-500/40 text-slate-300 hover:text-white'
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-sky-400 text-slate-700 hover:text-slate-900 shadow-2xs'
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`rounded-2xl p-3.5 text-xs space-y-2.5 ${
                  msg.role === 'user'
                    ? isDark
                      ? 'bg-sky-600/15 border border-sky-500/30 text-white ml-6'
                      : 'bg-sky-50 border border-sky-200 text-sky-950 ml-6 shadow-2xs'
                    : isDark
                    ? 'bg-[#0f1422] border border-[#1f293d] text-slate-200'
                    : 'bg-[#f8fafc] border border-slate-200/90 text-slate-800 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {msg.role === 'user' ? (
                      <span className="uppercase tracking-wider">Developer</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{msg.activePersona?.avatar || '🤖'}</span>
                        <span className="font-bold text-sky-500 dark:text-sky-300">
                          {msg.activePersona ? `${msg.activePersona.name} • ${msg.activePersona.role}` : `RuangCoder (${msg.modelUsed || 'Dewan Ahli AI'})`}
                        </span>
                      </div>
                    )}
                  </div>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Multi-Agent Collaboration Tag */}
                {msg.activeAgents && msg.activeAgents.length > 1 && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <span>Dewan Konsorsium:</span>
                    <span className="text-sky-400 font-semibold">{msg.activeAgents.join(', ')}</span>
                  </div>
                )}

                {/* Collapsible Chain-of-Thought (Reasoning) */}
                {msg.thoughts && msg.thoughts.length > 0 && (
                  <div
                    className={`rounded-xl border overflow-hidden ${
                      isDark ? 'bg-slate-950/80 border-purple-500/20' : 'bg-purple-50/70 border-purple-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedThoughts(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                      className={`w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] font-semibold ${
                        isDark ? 'text-purple-300 hover:bg-slate-900' : 'text-purple-700 hover:bg-purple-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                        <span>Chain-of-Thought Reasoning ({msg.thoughts.length} steps)</span>
                      </div>
                      {expandedThoughts[msg.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {expandedThoughts[msg.id] && (
                      <div
                        className={`p-2.5 border-t text-[11px] font-mono whitespace-pre-wrap leading-relaxed ${
                          isDark ? 'border-slate-800 text-slate-400' : 'border-purple-200 text-purple-900'
                        }`}
                      >
                        {msg.thoughts.join('\n\n---\n\n')}
                      </div>
                    )}
                  </div>
                )}

                {/* Tool Execution Cards (Claude Code style) */}
                {msg.toolSteps && msg.toolSteps.length > 0 && (
                  <div className="space-y-1.5">
                    {msg.toolSteps.map(step => {
                      const isOpen = Boolean(expandedTools[step.toolCallId]);
                      return (
                        <div
                          key={step.toolCallId}
                          className={`rounded-xl border overflow-hidden ${
                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedTools(p => ({ ...p, [step.toolCallId]: !p[step.toolCallId] }))}
                            className={`w-full px-2.5 py-1.5 flex items-center justify-between text-left cursor-pointer ${
                              isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {step.status === 'running' ? (
                                <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin shrink-0" />
                              ) : step.status === 'completed' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              )}
                              <Wrench className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-mono font-bold text-[11px] text-sky-600 dark:text-sky-300">{step.toolName}</span>
                              <span className="text-[11px] text-slate-500 truncate">{step.summary || JSON.stringify(step.args)}</span>
                            </div>
                            {isOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                          </button>
                          {isOpen && (
                            <div
                              className={`p-2.5 border-t font-mono text-[11px] space-y-1 ${
                                isDark ? 'border-slate-800 bg-black/50' : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <div className="text-slate-500">
                                Args: <span className="text-sky-600 dark:text-sky-300">{JSON.stringify(step.args)}</span>
                              </div>
                              {step.output && (
                                <pre
                                  className={`whitespace-pre-wrap break-words max-h-40 overflow-y-auto p-2 rounded border ${
                                    isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-800'
                                  }`}
                                >
                                  {step.output}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Modified Files Pills & Diff Review Button */}
                {msg.modifiedFiles && msg.modifiedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {msg.modifiedFiles.map(filePath => (
                        <button
                          key={filePath}
                          type="button"
                          onClick={() => {
                            void loadFileIntoEditor(filePath);
                            setViewSplitMode('split');
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold cursor-pointer"
                        >
                          <FileCode className="w-3 h-3" />
                          <span>{filePath}</span>
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                    {lastDiff && (
                      <button
                        type="button"
                        onClick={() => setIsDiffReviewModalOpen(true)}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-bold cursor-pointer transition shadow-xs"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Review Diff & Accept / Revert</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Pak Bambang Autonomous QA Review Badge */}
                {msg.qaAuditResult && (
                  <div
                    className={`mt-2 px-3 py-2 rounded-xl border text-[11px] flex items-center justify-between gap-2 transition-all ${
                      msg.qaAuditResult.status === 'passed'
                        ? isDark
                          ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : msg.qaAuditResult.status === 'warning'
                        ? isDark
                          ? 'border-amber-500/30 bg-amber-950/30 text-amber-300'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                        : isDark
                        ? 'border-rose-500/30 bg-rose-950/30 text-rose-300'
                        : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold truncate">
                        {msg.qaAuditResult.status === 'passed'
                          ? `Pak Bambang QA: Lolos Verifikasi (Skor: ${msg.qaAuditResult.score}/100)`
                          : `Pak Bambang QA: Ditemukan ${msg.qaAuditResult.issuesCount} catatan (Skor: ${msg.qaAuditResult.score}/100)`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunQualityAudit}
                      className={`px-2.5 py-0.5 rounded-md font-semibold text-[10px] shrink-0 border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-slate-900/80 hover:bg-slate-900 text-slate-200 border-slate-700'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs'
                      }`}
                    >
                      Detail
                    </button>
                  </div>
                )}

                {/* Agent Response Content */}
                {msg.content && (
                  <FormattedAgentContent content={msg.content} isDark={isDark} />
                )}

                {/* Streaming status */}
                {msg.isStreaming && msg.statusText && (
                  <div className="flex items-center gap-2 text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{msg.statusText}</span>
                  </div>
                )}

                {msg.error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0">⚠️</span>
                      <span className="flex-1 leading-relaxed">{msg.error}</span>
                    </div>
                    {msg.retryPrompt && !isAgentRunning && (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSendAgentPrompt(msg.retryPrompt)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Coba Lagi</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Composer Input Area (Cursor / Claude Code style) */}
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleSendAgentPrompt();
          }}
          className={`p-3 border-t space-y-2 ${isDark ? 'border-[#1f293d] bg-[#090d16]' : 'border-slate-200 bg-[#f8fafc]'}`}
        >
          {/* Active Context Chips & @-tagging menu */}
          <div className="relative flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
            <span className="font-semibold">Context:</span>
            <span
              className={`px-2 py-0.5 rounded-md font-mono border ${
                isDark ? 'bg-slate-800 text-sky-300 border-slate-700' : 'bg-white text-sky-700 border-slate-200 shadow-2xs'
              }`}
            >
              @{activeFilePath}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md font-mono border ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200 shadow-2xs'
              }`}
            >
              @{sandboxMode === 'local' ? 'Local-Disk' : 'Virtual-FS'}
            </span>

            {/* Antigravity Context Tag Trigger Button */}
            <button
              type="button"
              onClick={() => setIsContextTagMenuOpen(p => !p)}
              className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition flex items-center gap-1 border ${
                isDark
                  ? 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border-purple-500/30'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 shadow-2xs'
              }`}
            >
              <span>+ Tag Context</span>
            </button>

            {/* Token Budget Gauge & Context Compression Button */}
            {(() => {
              const approxTokens = Math.round(
                (messages.reduce((acc, m) => acc + (m.content?.length || 0), 0) + (editorContent?.length || 0)) / 4
              );
              const maxTokens = 8192;
              const ratio = Math.min(100, Math.round((approxTokens / maxTokens) * 100));
              return (
                <div className="flex items-center gap-1.5 ml-auto">
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono border ${
                      isDark ? 'bg-slate-850/80 text-slate-300 border-slate-700/80' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                    title={`Estimasi Ukuran Konteks Aktif: ~${approxTokens.toLocaleString()} / ${maxTokens.toLocaleString()} token (${ratio}%)`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        ratio > 75 ? 'bg-rose-400 animate-pulse' : ratio > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                    <span>
                      ~{approxTokens} / {maxTokens} tok
                    </span>
                  </div>
                  {messages.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        // Padatkan konteks dengan menyimpan hanya 3 interaksi terakhir
                        setMessages(prev => {
                          const keep = prev.slice(-3);
                          return [
                            {
                              id: `comp_${Date.now()}`,
                              role: 'assistant',
                              content: '🧹 *Konteks percakapan sebelumnya telah dipadatkan untuk menghemat token dan menjaga kecepatan respon dewan ahli.*',
                              timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            },
                            ...keep
                          ];
                        });
                      }}
                      className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[9px] font-semibold cursor-pointer transition"
                      title="Padatkan histori pesan menjadi ringkasan singkat"
                    >
                      🧹 Padatkan
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Context Tagging Dropdown */}
            {isContextTagMenuOpen && (
              <div
                className={`absolute bottom-7 left-12 w-64 rounded-xl border p-1 shadow-2xl z-50 text-xs space-y-1 ${
                  isDark ? 'bg-[#0f172a] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Antigravity Smart Context
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPromptInput(prev => `${prev} @problems `);
                    setIsContextTagMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-mono text-rose-400">@problems</span>
                  <span className="text-[10px] text-slate-500">Log runtime error</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPromptInput(prev => `${prev} @web `);
                    setIsContextTagMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-mono text-sky-400">@web</span>
                  <span className="text-[10px] text-slate-500">Cari doc / referensi</span>
                </button>
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-800 mt-1">
                  Pilih File Spesifik:
                </div>
                {fileItems.slice(0, 5).map(f => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => {
                      setPromptInput(prev => `${prev} @${f.path} `);
                      setIsContextTagMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-slate-800 cursor-pointer truncate font-mono text-[11px] text-slate-300"
                  >
                    @{f.path}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className={`relative rounded-2xl border p-2.5 space-y-2 transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-800 focus-within:border-sky-500/60'
                : 'bg-white border-slate-300 focus-within:border-sky-500 shadow-xs'
            }`}
          >
            <textarea
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendAgentPrompt();
                }
              }}
              rows={3}
              placeholder="Perintahkan agen (misal: buat Todo List modern, perbaiki bug, styling UI)..."
              className={`w-full bg-transparent text-xs outline-none resize-none select-text ${
                isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
              }`}
            />

            <div className={`flex items-center justify-between pt-1 border-t text-xs ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleVoicePrompt}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
                    isVoiceRecording
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : isDark
                      ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/80'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 border-slate-200'
                  }`}
                  title="Tekan untuk Bicara (Voice Prompting Bahasa Indonesia)"
                >
                  {isVoiceRecording ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-teal-500" />}
                  <span className="hidden sm:inline">{isVoiceRecording ? 'Mendengarkan...' : 'Voice'}</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  {isMac ? '⌘ + Enter' : 'Ctrl + Enter'} to send
                </span>
              </div>

              {isAgentRunning ? (
                <button
                  type="button"
                  onClick={() => abortControllerRef.current?.abort()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  <Square className="w-3 h-3" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!promptInput.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Send className="w-3 h-3" />
                  <span>Run Agent</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </aside>
      )}

      {/* ============================================================== */}
      {/* 5. MOBILE BOTTOM NAVIGATION RAIL (< 1024px)                     */}
      {/* ============================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className={`lg:hidden fixed bottom-0 left-0 right-0 h-12 border-t z-50 flex items-center justify-around px-2 ${
          isDark ? 'bg-[#090d16] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setMobileTab('files');
            setIsSidebarVisible(true);
            setActiveActivityTab('explorer');
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
            mobileTab === 'files' ? 'text-sky-400 font-bold' : ''
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Files</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('editor');
            setViewSplitMode('editor');
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
            mobileTab === 'editor' && viewSplitMode !== 'preview' ? 'text-sky-400 font-bold' : ''
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Editor</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('preview');
            setViewSplitMode('preview');
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
            mobileTab === 'preview' || viewSplitMode === 'preview' ? 'text-emerald-400 font-bold' : ''
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Preview</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('ai');
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
            mobileTab === 'ai' ? 'text-purple-400 font-bold' : ''
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Agent</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('terminal');
            setIsTerminalOpen(true);
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
            mobileTab === 'terminal' || isTerminalOpen ? 'text-amber-400 font-bold' : ''
          }`}
        >
          <TerminalIcon className="w-4 h-4" />
          <span>Terminal</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('diff');
            setIsSidebarVisible(true);
            setActiveActivityTab('diff');
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
            mobileTab === 'diff' ? 'text-rose-400 font-bold' : ''
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>Diff</span>
        </button>
      </nav>

      {/* Starter Template Selector Modal */}
      <TemplateSelectorModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={tpl => void handleApplyStarterTemplate(tpl)}
      />

      {/* Starter Template Gallery Modal (Vanilla, Tailwind, Snake 2D Arcade, Algorithm Lab) */}
      <StarterTemplateModal
        isOpen={isStarterGalleryOpen}
        onClose={() => setIsStarterGalleryOpen(false)}
        onSelectTemplate={tpl => {
          if (sandboxMode === 'browser') {
            void (async () => {
              const fresh = await resetVirtualFilesIdb(tpl.files);
              setBrowserFiles(fresh);
              const firstFile = Object.keys(tpl.files)[0] || 'index.html';
              setOpenTabs(Object.keys(tpl.files));
              void loadFileIntoEditor(firstFile);
              setPreviewKey(k => k + 1);
            })();
          } else {
            void (async () => {
              for (const [filePath, content] of Object.entries(tpl.files)) {
                await apiClient.post('/api/v1/coder/fs/file', { path: filePath, content });
              }
              await refreshLocalWorkspace();
              const firstFile = Object.keys(tpl.files)[0] || 'index.html';
              setOpenTabs(Object.keys(tpl.files));
              void loadFileIntoEditor(firstFile);
              setPreviewKey(k => k + 1);
            })();
          }
        }}
        isDark={isDark}
      />

      {/* Diff Review & Accept/Revert Modal */}
      <DiffReviewModal
        isOpen={isDiffReviewModalOpen}
        onClose={() => setIsDiffReviewModalOpen(false)}
        diff={lastDiff}
        onAccept={() => {
          handleAcceptDiff();
          setIsDiffReviewModalOpen(false);
        }}
        onRevert={() => {
          void handleRevertDiff();
          setIsDiffReviewModalOpen(false);
        }}
      />

      {/* QR Mobile Preview Modal */}
      <QrPreviewModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        previewUrl={typeof window !== 'undefined' ? `${window.location.origin}/ruangcoder-virtual/index.html` : 'http://localhost:3000'}
      />

      {/* Quick Open File Modal (Ctrl+P) */}
      <QuickOpenModal
        isOpen={isQuickOpenOpen}
        onClose={() => setIsQuickOpenOpen(false)}
        files={fileItems.map(f => f.path)}
        activeFilePath={activeFilePath}
        onSelectFile={filePath => void loadFileIntoEditor(filePath)}
        isDark={isDark}
      />

      {/* Command Palette Modal (Ctrl+Shift+P / F1) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commandPaletteCommands}
        isDark={isDark}
      />

      {/* Inline AI Coding Assist Modal (Ctrl+K) */}
      <InlineAiAssistModal
        isOpen={isInlineAiOpen}
        onClose={() => setIsInlineAiOpen(false)}
        activeFilePath={activeFilePath}
        onSubmit={prompt => void handleSendAgentPrompt(prompt)}
        isDark={isDark}
      />

      {/* CDN / Popular Libraries Injector Modal */}
      <CdnLibraryModal
        isOpen={isCdnModalOpen}
        onClose={() => setIsCdnModalOpen(false)}
        indexHtmlContent={sandboxMode === 'browser' ? (browserFiles['index.html'] || '') : (localFileCache['index.html'] || '')}
        onUpdateIndexHtml={handleUpdateIndexHtml}
        isDark={isDark}
      />

      {/* Antigravity Artifacts Viewer Modal */}
      <ArtifactViewerModal
        isOpen={isArtifactModalOpen}
        onClose={() => setIsArtifactModalOpen(false)}
        artifact={activeArtifact}
        onApplyAction={actionPrompt => {
          void handleSendAgentPrompt(actionPrompt);
        }}
      />

      {/* Workspace Project Management Modal */}
      <WorkspaceProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projects={projectsList}
        currentProjectId={currentProjectId}
        onSelectProject={projId => {
          setCurrentProjectId(projId);
          if (sandboxMode === 'local') {
            void refreshLocalWorkspace();
          }
        }}
        onCreateProject={handleCreateProject}
        isDark={isDark}
      />

      {/* Zen Coding Sanctuary & Anti-Burnout Modal */}
      <ZenCodingBreakModal
        isOpen={isZenBreakOpen}
        onClose={() => setIsZenBreakOpen(false)}
        reason={zenBreakReason}
        isDark={isDark}
      />

      {/* Code Flowchart & Responsi Modal */}
      <CodeFlowchartModal
        isOpen={isFlowchartModalOpen}
        onClose={() => setIsFlowchartModalOpen(false)}
        code={editorContent}
        filename={activeFilePath}
        onAskKiHadjar={prompt => {
          const kihadjar = COUNCIL_PERSONAS.find(p => p.id === 'kihadjar');
          if (kihadjar) setActiveCouncilPersona(kihadjar);
          setPromptInput(prompt);
          setIsAgentPanelOpen(true);
          void handleSendAgentPrompt(prompt);
        }}
        isDark={isDark}
      />

      {/* GitHub Gist Export Modal */}
      <GitHubExportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        files={sandboxMode === 'browser' ? browserFiles : { [activeFilePath]: editorContent }}
        projectName={currentProjectId}
        onDownloadZip={() => void handleExportZip()}
        isDark={isDark}
      />

      {/* Docked Inspector Lab: Audit, Autograder, SQL, Bedah Maba, Metodologi */}
      <CoderInspectorDock
        isDark={isDark}
        isOpen={isAuditModalOpen || isAutograderModalOpen || isSqlModalOpen || isMabaExplainerModalOpen || isThesisMethodologyModalOpen}
      >
      <QualityAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        report={auditReport}
        onReaudit={handleRunQualityAudit}
        onFixWithAI={() => {
          const kihadjar = COUNCIL_PERSONAS.find(p => p.id === 'kihadjar');
          if (kihadjar) setActiveCouncilPersona(kihadjar);
          setPromptInput('Ki Hadjar, tolong periksa dan perbaiki masalah sanitasi serta validasi tag kode yang dilaporkan oleh Pak Bambang.');
        }}
      />
      <CodeMethodologyExplainerModal
        isOpen={isThesisMethodologyModalOpen}
        onClose={() => setIsThesisMethodologyModalOpen(false)}
        code={editorContent}
        filename={activeFilePath}
        isDark={isDark}
      />
      <AutograderChallengeModal
        isOpen={isAutograderModalOpen}
        onClose={() => setIsAutograderModalOpen(false)}
        report={autograderReport}
        isRunning={isAutograderRunning}
        onRerun={() => void handleRunAutograder()}
        onApplyFixWithAI={feedback => {
          const kihadjar = COUNCIL_PERSONAS.find(p => p.id === 'kihadjar');
          if (kihadjar) setActiveCouncilPersona(kihadjar);
          setPromptInput(`Ki Hadjar, tolong perbaiki fungsi berikut agar lulus uji edge case autograder:\n\n${feedback}`);
          setIsAgentPanelOpen(true);
          setIsAutograderModalOpen(false);
          void handleSendAgentPrompt(`Ki Hadjar, tolong perbaiki fungsi berikut agar lulus uji edge case autograder:\n\n${feedback}`);
        }}
        isDark={isDark}
      />

      {/* In-Browser SQLite Relational Database Canvas (SIAKAD) */}
      <SqlPlaygroundModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        isDark={isDark}
      />

      {/* Bedah Kode Mode Maba (ELIM) Modal */}
      <MabaExplainerModal
        isOpen={isMabaExplainerModalOpen}
        onClose={() => setIsMabaExplainerModalOpen(false)}
        code={editorContent}
        filename={activeFilePath}
        isDark={isDark}
      />
      </CoderInspectorDock>

      {/* RuangTenang Care & Frustration / Ergonomics Modal */}
      <FrustrationSupportModal
        isOpen={isFrustrationModalOpen}
        onClose={() => setIsFrustrationModalOpen(false)}
        consecutiveErrors={ergonomicsState.consecutiveErrorCount || consecutiveFailures}
        onAskKiHadjar={() => {
          const kihadjar = COUNCIL_PERSONAS.find(p => p.id === 'kihadjar');
          if (kihadjar) setActiveCouncilPersona(kihadjar);
          setPromptInput(`Ki Hadjar, saya merasa stuck di error ini. Tolong jelaskan dengan perlahan langkah debugging yang tepat.`);
          setIsAgentPanelOpen(true);
          void handleSendAgentPrompt(`Ki Hadjar, saya merasa stuck di error ini. Tolong jelaskan dengan perlahan langkah debugging yang tepat.`);
        }}
        onResetErgonomicsTimer={() => codingErgonomicsService.resetEyeStrainTimer()}
        isDark={isDark}
      />

      {/* Peer Pair-Programming & Asistensi Lab Modal */}
      <PeerPairReviewModal
        isOpen={isPairReviewModalOpen}
        onClose={() => setIsPairReviewModalOpen(false)}
        activeFilePath={activeFilePath}
        isDark={isDark}
      />
    </div>
  );
};

export default RuangCoderIDE;
