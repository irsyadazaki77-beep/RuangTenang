import { useMemo } from 'react';

export type DiffChangeType = 'added' | 'removed' | 'modified';

export interface DiffLineChange {
  lineNumber: number; // 1-based index in modified/after content
  type: DiffChangeType;
  originalText?: string;
  modifiedText?: string;
}

export interface MonacoDecorationItem {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  options: {
    isWholeLine: boolean;
    className: string;
    linesDecorationsClassName?: string;
    marginClassName?: string;
  };
}

export interface CoderInlineDiffResult {
  hasDiff: boolean;
  additions: number;
  deletions: number;
  lineChanges: DiffLineChange[];
  decorations: MonacoDecorationItem[];
}

/**
 * Computes an efficient line-level diff between beforeContent and afterContent.
 * Generates ready-to-use Monaco editor decorations for inline highlighting.
 */
export function computeLineDiff(
  beforeContent: string,
  afterContent: string
): CoderInlineDiffResult {
  if (beforeContent === afterContent) {
    return {
      hasDiff: false,
      additions: 0,
      deletions: 0,
      lineChanges: [],
      decorations: []
    };
  }

  const beforeLines = beforeContent ? beforeContent.split('\n') : [];
  const afterLines = afterContent ? afterContent.split('\n') : [];

  const lineChanges: DiffLineChange[] = [];
  const decorations: MonacoDecorationItem[] = [];
  let additions = 0;
  let deletions = 0;

  // Simple and robust LCS-based diff for lines
  // Fast check: prefix matching
  let prefixCount = 0;
  while (
    prefixCount < beforeLines.length &&
    prefixCount < afterLines.length &&
    beforeLines[prefixCount] === afterLines[prefixCount]
  ) {
    prefixCount++;
  }

  // Fast check: suffix matching
  let suffixCount = 0;
  while (
    suffixCount < beforeLines.length - prefixCount &&
    suffixCount < afterLines.length - prefixCount &&
    beforeLines[beforeLines.length - 1 - suffixCount] ===
      afterLines[afterLines.length - 1 - suffixCount]
  ) {
    suffixCount++;
  }

  const midBefore = beforeLines.slice(prefixCount, beforeLines.length - suffixCount);
  const midAfter = afterLines.slice(prefixCount, afterLines.length - suffixCount);

  deletions += midBefore.length;
  additions += midAfter.length;

  // Mark modified lines in afterLines
  for (let i = 0; i < midAfter.length; i++) {
    const lineNumber = prefixCount + i + 1; // 1-based
    const correspondingBefore = midBefore[i];

    const changeType: DiffChangeType = correspondingBefore !== undefined ? 'modified' : 'added';

    lineChanges.push({
      lineNumber,
      type: changeType,
      originalText: correspondingBefore,
      modifiedText: midAfter[i]
    });

    decorations.push({
      range: {
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: 1
      },
      options: {
        isWholeLine: true,
        className:
          changeType === 'modified'
            ? 'monaco-inline-diff-modified'
            : 'monaco-inline-diff-inserted',
        linesDecorationsClassName:
          changeType === 'modified'
            ? 'monaco-inline-diff-modified-gutter'
            : 'monaco-inline-diff-inserted-gutter'
      }
    });
  }

  return {
    hasDiff: additions > 0 || deletions > 0,
    additions,
    deletions,
    lineChanges,
    decorations
  };
}

export function useCoderInlineDiff(
  beforeContent: string = '',
  afterContent: string = ''
): CoderInlineDiffResult {
  return useMemo(() => {
    return computeLineDiff(beforeContent, afterContent);
  }, [beforeContent, afterContent]);
}
