import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Replace,
  ChevronDown,
  ChevronRight,
  FileCode,
  CaseSensitive,
  WholeWord,
  Regex
} from 'lucide-react';

export interface SearchMatchLine {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchLength: number;
}

export interface FileSearchResult {
  filePath: string;
  matches: SearchMatchLine[];
}

interface GlobalSearchPanelProps {
  files: Record<string, string>;
  isDark?: boolean;
  onNavigateToFile: (filePath: string, lineNumber?: number) => void;
  onReplaceInFile: (filePath: string, updatedContent: string) => void;
  onReplaceAllFiles: (updates: Record<string, string>) => void;
}

export const GlobalSearchPanel: React.FC<GlobalSearchPanelProps> = ({
  files,
  isDark = true,
  onNavigateToFile,
  onReplaceInFile: _onReplaceInFile,
  onReplaceAllFiles
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [fileFilter, setFileFilter] = useState('');
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  // Compute search matches across all files
  const searchResults: FileSearchResult[] = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];

    let regex: RegExp;
    try {
      let pattern = searchTerm;
      if (!isRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, isCaseSensitive ? 'g' : 'gi');
    } catch {
      return [];
    }

    const results: FileSearchResult[] = [];

    for (const [filePath, content] of Object.entries(files)) {
      if (fileFilter && fileFilter.trim()) {
        const ext = fileFilter.trim().replace(/^\*\./, '.');
        if (!filePath.endsWith(ext)) continue;
      }

      const lines = content.split('\n');
      const matches: SearchMatchLine[] = [];

      lines.forEach((line, idx) => {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          matches.push({
            lineNumber: idx + 1,
            lineContent: line,
            matchStart: match.index,
            matchLength: match[0].length
          });
          if (!regex.global) break;
        }
      });

      if (matches.length > 0) {
        results.push({ filePath, matches });
      }
    }

    return results;
  }, [files, searchTerm, isCaseSensitive, isWholeWord, isRegex, fileFilter]);

  const totalMatchesCount = useMemo(() => {
    return searchResults.reduce((acc, curr) => acc + curr.matches.length, 0);
  }, [searchResults]);

  const toggleCollapse = useCallback((filePath: string) => {
    setCollapsedFiles(prev => ({
      ...prev,
      [filePath]: !prev[filePath]
    }));
  }, []);

  const handleReplaceAll = useCallback(() => {
    if (!searchTerm || searchResults.length === 0) return;

    let regex: RegExp;
    try {
      let pattern = searchTerm;
      if (!isRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, isCaseSensitive ? 'g' : 'gi');
    } catch {
      return;
    }

    const updates: Record<string, string> = {};
    for (const res of searchResults) {
      const original = files[res.filePath];
      if (original !== undefined) {
        updates[res.filePath] = original.replace(regex, replaceTerm);
      }
    }

    onReplaceAllFiles(updates);
  }, [searchTerm, replaceTerm, isRegex, isWholeWord, isCaseSensitive, searchResults, files, onReplaceAllFiles]);

  return (
    <div className={`flex flex-col h-full text-xs select-none ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-800/80 space-y-2">
        <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span>Search Workspace</span>
          </span>
          {totalMatchesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px]">
              {totalMatchesCount} matches
            </span>
          )}
        </div>

        {/* Search input with match options */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search (Ctrl+Shift+F)"
            className={`w-full pl-2.5 pr-20 py-1.5 rounded-lg border text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
          <div className="absolute right-1 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsCaseSensitive(p => !p)}
              className={`p-1 rounded transition-colors ${
                isCaseSensitive
                  ? 'bg-sky-500 text-white'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Match Case (Aa)"
            >
              <CaseSensitive className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsWholeWord(p => !p)}
              className={`p-1 rounded transition-colors ${
                isWholeWord
                  ? 'bg-sky-500 text-white'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Match Whole Word (\b)"
            >
              <WholeWord className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsRegex(p => !p)}
              className={`p-1 rounded transition-colors ${
                isRegex
                  ? 'bg-sky-500 text-white'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Use Regular Expression (.*)"
            >
              <Regex className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Replace Input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={replaceTerm}
            onChange={e => setReplaceTerm(e.target.value)}
            placeholder="Replace with..."
            className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
          <button
            type="button"
            onClick={handleReplaceAll}
            disabled={totalMatchesCount === 0}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              totalMatchesCount > 0
                ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-xs'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
            title="Replace All across Workspace"
          >
            <Replace className="w-3 h-3" />
            <span>Replace All</span>
          </button>
        </div>

        {/* File extension filter */}
        <input
          type="text"
          value={fileFilter}
          onChange={e => setFileFilter(e.target.value)}
          placeholder="Filter files (e.g. *.js, *.css)"
          className={`w-full px-2.5 py-1 rounded-md border text-[11px] focus:outline-hidden ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 text-slate-300 placeholder-slate-500'
              : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400'
          }`}
        />
      </div>

      {/* Results Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 select-text">
        {searchResults.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs italic">
            {searchTerm ? 'Tidak ada kecocokan yang ditemukan.' : 'Ketik kata kunci untuk mencari di seluruh berkas proyek.'}
          </div>
        ) : (
          searchResults.map(res => {
            const isCollapsed = collapsedFiles[res.filePath];
            return (
              <div key={res.filePath} className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-900/30">
                {/* File Header */}
                <div
                  onClick={() => toggleCollapse(res.filePath)}
                  className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-900/80 hover:bg-slate-800' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                    <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-semibold text-xs truncate text-slate-300">{res.filePath}</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                    {res.matches.length}
                  </span>
                </div>

                {/* Match Lines */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-800/40">
                    {res.matches.map((match, mIdx) => {
                      const before = match.lineContent.substring(0, match.matchStart);
                      const matched = match.lineContent.substring(match.matchStart, match.matchStart + match.matchLength);
                      const after = match.lineContent.substring(match.matchStart + match.matchLength);

                      return (
                        <div
                          key={`${res.filePath}-${match.lineNumber}-${mIdx}`}
                          onClick={() => onNavigateToFile(res.filePath, match.lineNumber)}
                          className={`flex items-center gap-2 px-3 py-1 font-mono text-[11px] cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-slate-500 w-7 text-right shrink-0">{match.lineNumber}:</span>
                          <span className="truncate flex-1">
                            <span className="text-slate-400">{before}</span>
                            <span className="bg-amber-400/30 text-amber-300 font-bold px-0.5 rounded-xs">{matched}</span>
                            <span className="text-slate-400">{after}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
