import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Editor, { loader, type OnMount, type Monaco } from '@monaco-editor/react';
import { Loader2, RefreshCw } from 'lucide-react';
import { generateGhostCompletion } from '../services/ghostCompletionProvider';
import type { MonacoDecorationItem } from '../hooks/useCoderInlineDiff';

export interface EditorProblemMarker {
  severity: number;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  source?: string;
  code?: string | number;
}

interface RuangMonacoEditorProps {
  filePath: string;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onTriggerInlineAi?: (selectedCode: string) => void;
  onMarkersChange?: (markers: EditorProblemMarker[]) => void;
  onCursorChange?: (line: number, column: number) => void;
  isDark?: boolean;
  readOnly?: boolean;
  diffDecorations?: MonacoDecorationItem[];
}

export function detectMonacoLanguage(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return 'javascript';
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.sql')) return 'sql';
  if (lower.endsWith('.sh') || lower.endsWith('.bash')) return 'shell';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
  return 'plaintext';
}

/**
 * High-performance, zero-latency native code editor fallback.
 * Used when Monaco CDN is slow, unreachable, or running in pure offline mode.
 */
const NativeCodeEditor: React.FC<{
  filePath: string;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onTriggerInlineAi?: (selectedCode: string) => void;
  isDark?: boolean;
  readOnly?: boolean;
  onRetryMonaco?: () => void;
  diffDecorations?: MonacoDecorationItem[];
}> = ({ value, onChange, onSave, onTriggerInlineAi, isDark = true, readOnly = false, onRetryMonaco, diffDecorations }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushChange = useCallback((val: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    onChangeRef.current?.(val);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const lines = useMemo(() => localValue.split('\n'), [localValue]);

  const changedLineNumbers = useMemo(() => {
    const set = new Set<number>();
    if (diffDecorations) {
      for (const d of diffDecorations) {
        set.add(d.range.startLineNumber);
      }
    }
    return set;
  }, [diffDecorations]);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      flushChange(localValue);
      onSave?.();
      return;
    }

    // Trigger inline AI assist on Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      flushChange(localValue);
      const textarea = textareaRef.current;
      let selected = '';
      if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
        selected = localValue.substring(textarea.selectionStart, textarea.selectionEnd);
      }
      onTriggerInlineAi?.(selected || localValue);
      return;
    }

    // Indent / dedent 2 spaces on Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        // Dedent
        const before = localValue.substring(0, start);
        const after = localValue.substring(end);
        if (before.endsWith('  ')) {
          const nextVal = before.slice(0, -2) + after;
          setLocalValue(nextVal);
          flushChange(nextVal);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(0, start - 2);
          }, 0);
        }
      } else {
        // Insert 2 spaces
        const nextVal = localValue.substring(0, start) + '  ' + localValue.substring(end);
        setLocalValue(nextVal);
        flushChange(nextVal);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
      return;
    }
  };

  const handleTextChange = (val: string) => {
    setLocalValue(val);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      onChangeRef.current?.(val);
    }, 120);
  };

  return (
    <div className={`w-full h-full flex flex-col relative overflow-hidden select-text ${isDark ? 'bg-[#090d16]' : 'bg-[#ffffff]'}`}>
      {/* Editor Body with Line Numbers */}
      <div className="flex-1 flex min-h-0 relative font-mono text-xs">
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className={`w-12 py-3 px-2 text-right select-none overflow-hidden shrink-0 border-r ${
            isDark
              ? 'bg-[#0b0f19] border-[#1f293d]/60 text-slate-600'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}
          style={{ lineHeight: '1.5rem' }}
        >
          {lines.map((_, i) => {
            const isChanged = changedLineNumbers.has(i + 1);
            return (
              <div
                key={i}
                className={isChanged ? 'text-emerald-400 font-bold bg-emerald-500/20 rounded-xs' : undefined}
              >
                {i + 1}
              </div>
            );
          })}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={e => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={`flex-1 p-3 bg-transparent outline-none resize-none overflow-auto font-mono text-xs leading-6 ${
            isDark ? 'text-slate-200 caret-sky-400' : 'text-slate-900 caret-sky-600'
          }`}
          style={{
            fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, "Courier New", monospace',
            lineHeight: '1.5rem',
            tabSize: 2
          }}
        />
        {onRetryMonaco && (
          <div
            className={`absolute bottom-2 right-4 px-2.5 py-1 rounded-md text-[10px] flex items-center gap-1.5 transition-all z-20 shadow-xs ${
              isDark
                ? 'bg-slate-900/90 text-slate-300 border border-slate-700/80 backdrop-blur-xs'
                : 'bg-white/95 text-slate-600 border border-slate-200/90 shadow-2xs backdrop-blur-xs'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-medium text-slate-400">Editor Cepat</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <button
              type="button"
              onClick={onRetryMonaco}
              className={`flex items-center gap-1 font-semibold cursor-pointer hover:underline ${
                isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'
              }`}
              title="Beralih ke Monaco Full Editor"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Ganti ke Monaco</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const RuangMonacoEditor: React.FC<RuangMonacoEditorProps> = ({
  filePath,
  value,
  onChange,
  onSave,
  onTriggerInlineAi,
  onMarkersChange,
  onCursorChange,
  isDark = true,
  readOnly = false,
  diffDecorations
}) => {
  const onCursorChangeRef = useRef(onCursorChange);
  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const onSaveRef = useRef(onSave);
  const onTriggerInlineAiRef = useRef(onTriggerInlineAi);
  const onMarkersChangeRef = useRef(onMarkersChange);
  const onChangeRef = useRef(onChange);
  const diffDecorationsCollectionRef = useRef<any>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onTriggerInlineAiRef.current = onTriggerInlineAi;
  }, [onTriggerInlineAi]);

  useEffect(() => {
    onMarkersChangeRef.current = onMarkersChange;
  }, [onMarkersChange]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const latestValueRef = useRef(value);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const changeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markersTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingChange = useCallback(() => {
    if (changeTimerRef.current) {
      clearTimeout(changeTimerRef.current);
      changeTimerRef.current = null;
    }
    onChangeRef.current?.(latestValueRef.current);
  }, []);

  // Flush any pending text update on unmount or file switch to ensure zero data loss
  useEffect(() => {
    return () => {
      if (changeTimerRef.current) {
        clearTimeout(changeTimerRef.current);
        changeTimerRef.current = null;
        onChangeRef.current?.(latestValueRef.current);
      }
      if (markersTimerRef.current) {
        clearTimeout(markersTimerRef.current);
        markersTimerRef.current = null;
      }
    };
  }, [filePath]);

  const handleEditorChange = useCallback((val: string | undefined) => {
    const nextVal = val ?? '';
    latestValueRef.current = nextVal;
    if (changeTimerRef.current) {
      clearTimeout(changeTimerRef.current);
    }
    // 120ms debounce: allows native 120FPS Monaco typing without re-rendering parent tree on each keystroke
    changeTimerRef.current = setTimeout(() => {
      changeTimerRef.current = null;
      onChangeRef.current?.(latestValueRef.current);
    }, 120);
  }, []);

  const [hasMonacoMounted, setHasMonacoMounted] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Apply or update diff decorations in Monaco
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    try {
      if (diffDecorations && diffDecorations.length > 0) {
        if (typeof editor.createDecorationsCollection === 'function') {
          if (!diffDecorationsCollectionRef.current) {
            diffDecorationsCollectionRef.current = editor.createDecorationsCollection(diffDecorations);
          } else {
            diffDecorationsCollectionRef.current.set(diffDecorations);
          }
        } else if (typeof editor.deltaDecorations === 'function') {
          const oldIds = diffDecorationsCollectionRef.current || [];
          diffDecorationsCollectionRef.current = editor.deltaDecorations(oldIds, diffDecorations);
        }
      } else {
        if (diffDecorationsCollectionRef.current) {
          if (typeof diffDecorationsCollectionRef.current.clear === 'function') {
            diffDecorationsCollectionRef.current.clear();
          } else if (typeof editor.deltaDecorations === 'function') {
            editor.deltaDecorations(diffDecorationsCollectionRef.current, []);
          }
          diffDecorationsCollectionRef.current = null;
        }
      }
    } catch {
      // ignore
    }
  }, [diffDecorations]);

  // Preload Monaco and fallback gracefully if CDN is unreachable (3.5s timeout or load error)
  useEffect(() => {
    if (hasMonacoMounted || useFallback) return;

    let isMounted = true;
    loader
      .init()
      .then(() => {
        if (isMounted) setHasMonacoMounted(true);
      })
      .catch(err => {
        console.warn('[RuangMonacoEditor] Failed to load Monaco CDN, activating native fallback editor:', err);
        if (isMounted) setUseFallback(true);
      });

    const timer = setTimeout(() => {
      if (isMounted && !hasMonacoMounted) {
        setUseFallback(true);
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hasMonacoMounted, useFallback]);

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      setHasMonacoMounted(true);

      editor.onDidChangeCursorPosition?.((ev: any) => {
        onCursorChangeRef.current?.(ev.position.lineNumber, ev.position.column);
      });

      // Register Ctrl+S / Cmd+S save action inside Monaco instance using ref to prevent stale closures
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const currentVal = editor.getModel()?.getValue() ?? latestValueRef.current;
        latestValueRef.current = currentVal;
        flushPendingChange();
        onSaveRef.current?.();
      });

      // Register Ctrl+K / Cmd+K inline AI assist command
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
        flushPendingChange();
        const selection = editor.getSelection();
        const model = editor.getModel();
        let selectedCode = '';
        if (selection && model && !selection.isEmpty()) {
          selectedCode = model.getValueInRange(selection);
        } else if (model) {
          const pos = editor.getPosition();
          if (pos) selectedCode = model.getLineContent(pos.lineNumber);
        }
        onTriggerInlineAiRef.current?.(selectedCode || latestValueRef.current);
      });

      // Apply initial diff decorations if already computed
      if (diffDecorations && diffDecorations.length > 0) {
        try {
          if (typeof editor.createDecorationsCollection === 'function') {
            diffDecorationsCollectionRef.current = editor.createDecorationsCollection(diffDecorations);
          } else if (typeof editor.deltaDecorations === 'function') {
            diffDecorationsCollectionRef.current = editor.deltaDecorations([], diffDecorations);
          }
        } catch {
          // ignore
        }
      }

      // Configure editor settings
      editor.updateOptions({
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        inlineSuggest: { enabled: true }
      });

      // Listen for Diagnostics & Marker Changes (Problems / Linting) with 350ms debounce
      try {
        if (typeof (monaco.editor as any).onDidChangeMarkers === 'function') {
          (monaco.editor as any).onDidChangeMarkers(() => {
            if (markersTimerRef.current) clearTimeout(markersTimerRef.current);
            markersTimerRef.current = setTimeout(() => {
              markersTimerRef.current = null;
              const model = editor.getModel();
              if (model) {
                const markers = monaco.editor.getModelMarkers({ resource: model.uri });
                onMarkersChangeRef.current?.(markers as any[]);
              }
            }, 350);
          });
        }
      } catch (e) {
        // silently ignore marker listener setup if unsupported
      }

      // Register Smart AI Inline Completion Provider (Ghost Text)
      try {
        const lang = detectMonacoLanguage(filePath);
        monaco.languages.registerInlineCompletionsProvider(lang, {
          provideInlineCompletions: (model, position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const suggestion = generateGhostCompletion(filePath, lineContent, position.column);

            if (!suggestion) return { items: [] };

            return {
              items: [
                {
                  insertText: suggestion,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  )
                }
              ]
            };
          },
          freeInlineCompletions: () => {}
        });
      } catch (e) {
        // silently ignore ghost provider setup if unsupported
      }
    },
    [filePath, flushPendingChange, diffDecorations]
  );

  const language = useMemo(() => detectMonacoLanguage(filePath), [filePath]);

  if (useFallback) {
    return (
      <NativeCodeEditor
        filePath={filePath}
        value={value}
        onChange={onChange}
        onSave={onSave}
        onTriggerInlineAi={onTriggerInlineAi}
        isDark={isDark}
        readOnly={readOnly}
        diffDecorations={diffDecorations}
        onRetryMonaco={() => {
          setUseFallback(false);
          setHasMonacoMounted(false);
        }}
      />
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-transparent select-text">
      <Editor
        height="100%"
        width="100%"
        path={filePath}
        language={language}
        value={value}
        theme={isDark ? 'vs-dark' : 'light'}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 font-mono text-xs select-none">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Memuat Monaco Editor...</span>
            </div>
            <button
              type="button"
              onClick={() => setUseFallback(true)}
              className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-colors cursor-pointer"
            >
              Gunakan Editor Mandiri Cepat
            </button>
          </div>
        }
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, "Courier New", monospace',
          fontLigatures: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          minimap: {
            enabled: true,
            scale: 1,
            showSlider: 'mouseover',
            maxColumn: 60
          },
          bracketPairColorization: {
            enabled: true
          },
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          formatOnPaste: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fixedOverflowWidgets: true,
          overviewRulerBorder: false
        }}
      />
    </div>
  );
};
