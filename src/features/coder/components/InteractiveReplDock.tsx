import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Code2,
  Send,
  Trash2,
  Cpu,
  Database
} from 'lucide-react';
import { evaluateJavaScript, evaluatePythonLite, ReplOutputEntry } from '../services/replSandbox';
import { executeStudentCCode, CExecutionResult } from '../services/cRunner';
import { InMemorySqlEngine, SqlQueryResult } from '../services/sqliteRunner';
import { EditorProblemMarker } from './RuangMonacoEditor';

export interface InteractiveReplDockProps {
  currentTab: 'js_repl' | 'python_repl' | 'c_runner' | 'sql_runner' | 'problems';
  activeFilePath: string;
  problemMarkers: Record<string, EditorProblemMarker[]>;
  isDark?: boolean;
  onNavigateToProblem?: (filePath: string, line: number, col: number) => void;
}

export const InteractiveReplDock: React.FC<InteractiveReplDockProps> = ({
  currentTab,
  activeFilePath: _activeFilePath,
  problemMarkers,
  isDark = true,
  onNavigateToProblem
}) => {
  // Shared SQL Engine instance
  const [sqlEngine] = useState(() => new InMemorySqlEngine());

  // REPL State
  const [replInput, setReplInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [entries, setEntries] = useState<ReplOutputEntry[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize greeting per tab
  useEffect(() => {
    let greeting = '';
    if (currentTab === 'js_repl') {
      greeting = '⚡ Ruang Coder JavaScript REPL Sandbox siap. Ketik ekspresi JS atau panggil console.log().';
    } else if (currentTab === 'python_repl') {
      greeting = '🐍 Ruang Coder Python Simulator siap. Ketik script Python dasar seperti print(), variabel, atau fungsi.';
    } else if (currentTab === 'c_runner') {
      greeting = '⚙️ Ruang Coder C/C++ Student Simulator siap. Ketik instruksi C seperti int main() { printf("Halo Dunia\\n"); return 0; }';
    } else if (currentTab === 'sql_runner') {
      greeting = '🗄️ Ruang Coder SQLite Canvas siap. Ketik kueri SQL (misal: SELECT * FROM mahasiswa;)';
    }

    if (greeting) {
      setEntries([
        {
          id: `init-${Date.now()}`,
          type: 'system',
          content: greeting,
          timestamp: new Date().toLocaleTimeString('id-ID')
        }
      ]);
    }
  }, [currentTab]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const handleExecuteRepl = useCallback(() => {
    const trimmed = replInput.trim();
    if (!trimmed) return;

    const inputEntry: ReplOutputEntry = {
      id: `in-${Date.now()}`,
      type: 'input',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString('id-ID')
    };

    let result: { output: string; isError: boolean; chartSvg?: string } = {
      output: '',
      isError: false
    };

    if (currentTab === 'js_repl') {
      result = evaluateJavaScript(trimmed);
    } else if (currentTab === 'python_repl') {
      result = evaluatePythonLite(trimmed);
    } else if (currentTab === 'c_runner') {
      const cRes: CExecutionResult = executeStudentCCode(
        trimmed.includes('main') ? trimmed : `int main() { ${trimmed}; return 0; }`
      );
      let memorySummary = '';
      if (cRes.memoryLayout.length > 0) {
        memorySummary = '\n[Tabel Memori Virtual Stack]:\n' + cRes.memoryLayout.map(c => `  ${c.address} -> ${c.type} ${c.variableName} = ${c.value}`).join('\n');
      }
      result = {
        output: (cRes.isError ? cRes.compilationOutput : cRes.stdout) + memorySummary,
        isError: cRes.isError
      };
    } else if (currentTab === 'sql_runner') {
      try {
        const sqlRes: SqlQueryResult = sqlEngine.execute(trimmed);
        let tableOutput = '';
        if (sqlRes.columns.length > 0) {
          tableOutput = sqlRes.columns.join(' | ') + '\n' + sqlRes.columns.map(() => '---').join(' | ') + '\n';
          tableOutput += sqlRes.rows.map(r => r.join(' | ')).join('\n');
        } else {
          tableOutput = sqlRes.message || 'Eksekusi selesai.';
        }
        result = {
          output: `[${sqlRes.statementType}] ${sqlRes.rowCount} baris (${sqlRes.executionDurationMs}ms)\n${tableOutput}`,
          isError: false
        };
      } catch (err: any) {
        result = {
          output: `SQL Error: ${err?.message || String(err)}`,
          isError: true
        };
      }
    }

    const outputEntry: ReplOutputEntry = {
      id: `out-${Date.now()}`,
      type: result.isError ? 'error' : 'output',
      content: result.output,
      chartSvg: result.chartSvg,
      timestamp: new Date().toLocaleTimeString('id-ID')
    };

    setEntries(prev => [...prev, inputEntry, outputEntry]);
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    setReplInput('');
  }, [replInput, currentTab, sqlEngine]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecuteRepl();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setReplInput(commandHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setReplInput('');
      } else {
        setHistoryIndex(nextIdx);
        setReplInput(commandHistory[nextIdx]);
      }
    }
  };

  // Aggregated problems
  const allProblems = Object.entries(problemMarkers).flatMap(([file, markers]) =>
    markers.map(m => ({ ...m, file }))
  );

  const errorCount = allProblems.filter(p => p.severity === 8).length;
  const warningCount = allProblems.filter(p => p.severity === 4).length;

  if (currentTab === 'problems') {
    return (
      <div className={`h-full flex flex-col font-mono text-xs select-text ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {/* Problems Header Toolbar */}
        <div className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <XCircle className="w-3.5 h-3.5" />
              <span>{errorCount} Errors</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{warningCount} Warnings</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-sans">
            Klik item untuk melompat ke baris yang bersangkutan
          </span>
        </div>

        {/* Problems List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {allProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-xs gap-1.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <span>Tidak ada masalah sintaks atau diagnostic error yang terdeteksi di workspace.</span>
            </div>
          ) : (
            allProblems.map((p, idx) => {
              const isErr = p.severity === 8;
              return (
                <div
                  key={`${p.file}-${p.startLineNumber}-${idx}`}
                  onClick={() => onNavigateToProblem?.(p.file, p.startLineNumber, p.startColumn)}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-slate-850' : 'hover:bg-slate-100'
                  }`}
                >
                  {isErr ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${isErr ? 'text-rose-200 font-medium' : 'text-amber-200'}`}>
                      {p.message}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="text-sky-400">{p.file}</span>
                      <span>Line {p.startLineNumber}, Col {p.startColumn}</span>
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // REPL View (JS / Python / C / SQL)
  const getTabLabel = () => {
    if (currentTab === 'js_repl') return 'JavaScript Interactive Evaluator';
    if (currentTab === 'python_repl') return 'Python Web Simulator';
    if (currentTab === 'c_runner') return 'C/C++ Student Simulator & Memory Inspector';
    if (currentTab === 'sql_runner') return 'SQLite Relational Canvas';
    return 'Interactive REPL';
  };

  const getPlaceholder = () => {
    if (currentTab === 'js_repl') return "Ketik kode JS (misal: 10 + 20 atau [1,2,3].reverse())...";
    if (currentTab === 'python_repl') return "Ketik print('Halo') atau x = 5...";
    if (currentTab === 'c_runner') return 'Ketik int main() { printf("Halo C\\n"); return 0; }...';
    if (currentTab === 'sql_runner') return 'Ketik SELECT * FROM mahasiswa WHERE ipk >= 3.5;...';
    return 'Ketik perintah...';
  };

  return (
    <div className={`h-full flex flex-col font-mono text-xs ${isDark ? 'bg-[#070a12] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Action Bar */}
      <div className={`px-3 py-1 border-b flex items-center justify-between text-[11px] ${
        isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-600'
      }`}>
        <span className="font-semibold text-sky-400 flex items-center gap-1.5">
          {currentTab === 'sql_runner' ? (
            <Database className="w-3.5 h-3.5 text-indigo-400" />
          ) : currentTab === 'c_runner' ? (
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Code2 className="w-3.5 h-3.5" />
          )}
          <span>{getTabLabel()}</span>
        </span>
        <button
          type="button"
          onClick={() => setEntries([])}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          <span>Bersihkan</span>
        </button>
      </div>

      {/* Output Console Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 select-text font-mono">
        {entries.map(entry => (
          <div key={entry.id} className="space-y-0.5 leading-relaxed">
            {entry.type === 'system' ? (
              <div className="text-slate-500 italic text-[11px]">{entry.content}</div>
            ) : entry.type === 'input' ? (
              <div className="flex items-start gap-1.5 text-sky-400">
                <span className="select-none font-bold">&gt;</span>
                <span className="whitespace-pre-wrap">{entry.content}</span>
              </div>
            ) : entry.type === 'error' ? (
              <div className="flex items-start gap-1.5 text-rose-400 pl-4 bg-rose-950/20 py-1 rounded">
                <span className="select-none">✕</span>
                <span className="whitespace-pre-wrap">{entry.content}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-1.5 text-emerald-300 pl-4">
                  <span className="select-none font-bold text-emerald-500">←</span>
                  <span className="whitespace-pre-wrap">{entry.content}</span>
                </div>
                {entry.chartSvg && (
                  <div
                    className="p-2 pl-4 rounded-lg bg-slate-950/60 border border-sky-500/30 overflow-x-auto max-w-xl"
                    dangerouslySetInnerHTML={{ __html: entry.chartSvg }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Prompt Box */}
      <div className={`p-2 border-t flex items-center gap-2 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-200 border-slate-300'
      }`}>
        <span className="text-sky-400 font-bold select-none">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={replInput}
          onChange={e => setReplInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className={`flex-1 px-2 py-1 bg-transparent border-0 focus:outline-hidden text-xs font-mono ${
            isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
          }`}
        />
        <button
          type="button"
          onClick={handleExecuteRepl}
          className="p-1 rounded bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer"
          title="Jalankan ekspresi (Enter)"
        >
          <Send className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
