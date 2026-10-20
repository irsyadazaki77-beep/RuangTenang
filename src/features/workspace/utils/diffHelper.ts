/**
 * Line-based diff helpers for comparing Canvas artifact versions.
 *
 * The exact LCS implementation uses quadratic memory. Large inputs therefore
 * keep common and uniquely anchored lines, then fall back to a clearly marked
 * remove/add section when an exact local comparison would exceed the budget.
 */

export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNumberOld?: number;
  lineNumberNew?: number;
}

export interface LineDiffResult {
  changes: DiffChange[];
  exact: boolean;
}

const MAX_EXACT_DIFF_CELLS = 250_000;
const MAX_ANCHOR_DEPTH = 32;

interface LineAnchor {
  oldIndex: number;
  newIndex: number;
}

interface AnchorSearchResult {
  anchors: LineAnchor[];
  hasAmbiguousCommonLines: boolean;
}

function findUniqueCommonAnchors(oldLines: string[], newLines: string[]): AnchorSearchResult {
  const oldOccurrences = new Map<string, number>();
  const newOccurrences = new Map<string, number>();
  const newIndexes = new Map<string, number>();

  oldLines.forEach(line => {
    oldOccurrences.set(line, (oldOccurrences.get(line) || 0) + 1);
  });
  newLines.forEach((line, index) => {
    newOccurrences.set(line, (newOccurrences.get(line) || 0) + 1);
    newIndexes.set(line, index);
  });

  const candidates: LineAnchor[] = [];
  let hasAmbiguousCommonLines = false;
  oldLines.forEach((line, oldIndex) => {
    const oldCount = oldOccurrences.get(line) || 0;
    const newCount = newOccurrences.get(line) || 0;
    if (oldCount > 0 && newCount > 0 && (oldCount > 1 || newCount > 1)) hasAmbiguousCommonLines = true;
    if (oldCount === 1 && newCount === 1) {
      const newIndex = newIndexes.get(line);
      if (newIndex !== undefined) candidates.push({ oldIndex, newIndex });
    }
  });

  // Patience-diff style longest increasing subsequence: retain common unique
  // lines whose order is consistent in both versions.
  const tails: number[] = [];
  const tailCandidateIndexes: number[] = [];
  const previousCandidateIndexes = new Array<number>(candidates.length).fill(-1);

  candidates.forEach((candidate, candidateIndex) => {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (tails[middle] < candidate.newIndex) low = middle + 1;
      else high = middle;
    }

    tails[low] = candidate.newIndex;
    previousCandidateIndexes[candidateIndex] = low > 0 ? tailCandidateIndexes[low - 1] : -1;
    tailCandidateIndexes[low] = candidateIndex;
  });

  if (tails.length === 0) return { anchors: [], hasAmbiguousCommonLines };

  const anchors: LineAnchor[] = [];
  let candidateIndex = tailCandidateIndexes[tails.length - 1];
  while (candidateIndex >= 0) {
    anchors.push(candidates[candidateIndex]);
    candidateIndex = previousCandidateIndexes[candidateIndex];
  }
  return { anchors: anchors.reverse(), hasAmbiguousCommonLines };
}

function computeExactLineDiff(
  oldLines: string[],
  newLines: string[],
  oldOffset: number,
  newOffset: number
): DiffChange[] {
  const n = oldLines.length;
  const m = newLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  let i = n;
  let j = m;
  const reversed: DiffChange[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      reversed.push({ type: 'unchanged', value: oldLines[i - 1], lineNumberOld: oldOffset + i, lineNumberNew: newOffset + j });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ type: 'added', value: newLines[j - 1], lineNumberNew: newOffset + j });
      j -= 1;
    } else {
      reversed.push({ type: 'removed', value: oldLines[i - 1], lineNumberOld: oldOffset + i });
      i -= 1;
    }
  }
  return reversed.reverse();
}

function computeBoundedLineDiff(oldText: string, newText: string): LineDiffResult {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];
  const changes: DiffChange[] = [];
  let exact = true;

  const addUnchanged = (value: string, oldIndex: number, newIndex: number) => {
    changes.push({ type: 'unchanged', value, lineNumberOld: oldIndex + 1, lineNumberNew: newIndex + 1 });
  };

  const compareRange = (oldStart: number, oldEnd: number, newStart: number, newEnd: number, depth: number): void => {
    while (oldStart < oldEnd && newStart < newEnd && oldLines[oldStart] === newLines[newStart]) {
      addUnchanged(oldLines[oldStart], oldStart, newStart);
      oldStart += 1;
      newStart += 1;
    }

    const suffix: LineAnchor[] = [];
    while (oldStart < oldEnd && newStart < newEnd && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
      oldEnd -= 1;
      newEnd -= 1;
      suffix.push({ oldIndex: oldEnd, newIndex: newEnd });
    }

    const oldMiddle = oldLines.slice(oldStart, oldEnd);
    const newMiddle = newLines.slice(newStart, newEnd);
    const cellCount = (oldMiddle.length + 1) * (newMiddle.length + 1);

    if (oldMiddle.length === 0) {
      for (let index = newStart; index < newEnd; index += 1) {
        changes.push({ type: 'added', value: newLines[index], lineNumberNew: index + 1 });
      }
    } else if (newMiddle.length === 0) {
      for (let index = oldStart; index < oldEnd; index += 1) {
        changes.push({ type: 'removed', value: oldLines[index], lineNumberOld: index + 1 });
      }
    } else if (cellCount <= MAX_EXACT_DIFF_CELLS) {
      changes.push(...computeExactLineDiff(oldMiddle, newMiddle, oldStart, newStart));
    } else {
      const anchorSearch = depth < MAX_ANCHOR_DEPTH
        ? findUniqueCommonAnchors(oldMiddle, newMiddle)
        : { anchors: [], hasAmbiguousCommonLines: false };

      if (anchorSearch.anchors.length > 0) {
        // Duplicate common lines can yield a longer global LCS across anchor
        // boundaries. Preserve useful anchors, but do not call that result exact.
        if (anchorSearch.hasAmbiguousCommonLines) exact = false;
        let oldCursor = oldStart;
        let newCursor = newStart;
        for (const anchor of anchorSearch.anchors) {
          const oldAnchorIndex = oldStart + anchor.oldIndex;
          const newAnchorIndex = newStart + anchor.newIndex;
          compareRange(oldCursor, oldAnchorIndex, newCursor, newAnchorIndex, depth + 1);
          addUnchanged(oldLines[oldAnchorIndex], oldAnchorIndex, newAnchorIndex);
          oldCursor = oldAnchorIndex + 1;
          newCursor = newAnchorIndex + 1;
        }
        compareRange(oldCursor, oldEnd, newCursor, newEnd, depth + 1);
      } else {
        exact = false;
        for (let index = oldStart; index < oldEnd; index += 1) {
          changes.push({ type: 'removed', value: oldLines[index], lineNumberOld: index + 1 });
        }
        for (let index = newStart; index < newEnd; index += 1) {
          changes.push({ type: 'added', value: newLines[index], lineNumberNew: index + 1 });
        }
      }
    }

    for (let index = suffix.length - 1; index >= 0; index -= 1) {
      const anchor = suffix[index];
      addUnchanged(oldLines[anchor.oldIndex], anchor.oldIndex, anchor.newIndex);
    }
  };

  compareRange(0, oldLines.length, 0, newLines.length, 0);
  return { changes, exact };
}

/**
 * Computes an LCS diff for manageable regions and a patience-anchored,
 * explicitly approximate diff when unmatched regions exceed the cell budget.
 */
export function computeLineDiff(oldText: string, newText: string): LineDiffResult {
  return computeBoundedLineDiff(oldText, newText);
}

/**
 * Computes word-level diff for inline highlighting.
 */
export function computeWordDiff(oldText: string, newText: string): DiffChange[] {
  const oldWords = oldText ? oldText.split(/(\s+|[.,;!?()[\]{}"])/).filter(Boolean) : [];
  const newWords = newText ? newText.split(/(\s+|[.,;!?()[\]{}"])/).filter(Boolean) : [];

  const n = oldWords.length;
  const m = newWords.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      dp[i][j] = oldWords[i - 1] === newWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const reversed: DiffChange[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      reversed.push({ type: 'unchanged', value: oldWords[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ type: 'added', value: newWords[j - 1] });
      j -= 1;
    } else {
      reversed.push({ type: 'removed', value: oldWords[i - 1] });
      i -= 1;
    }
  }
  return reversed.reverse();
}
