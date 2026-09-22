/**
 * Lightweight Visual Diff Engine for Artifact Versions
 * Computes line-by-line and inline word diffs for clean visual comparison in RuangKerja.
 */

export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNumberOld?: number;
  lineNumberNew?: number;
}

/**
 * Computes line-based diff using Longest Common Subsequence (LCS)
 */
export function computeLineDiff(oldText: string, newText: string): DiffChange[] {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  const n = oldLines.length;
  const m = newLines.length;

  // Build DP table for LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  let i = n;
  let j = m;

  const stack: DiffChange[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({
        type: 'unchanged',
        value: oldLines[i - 1],
        lineNumberOld: i,
        lineNumberNew: j
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({
        type: 'added',
        value: newLines[j - 1],
        lineNumberNew: j
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      stack.push({
        type: 'removed',
        value: oldLines[i - 1],
        lineNumberOld: i
      });
      i--;
    }
  }

  return stack.reverse();
}

/**
 * Computes word-level diff for inline highlighting
 */
export function computeWordDiff(oldText: string, newText: string): DiffChange[] {
  const oldWords = oldText ? oldText.split(/(\s+|[.,;!?()[\]{}"])/).filter(Boolean) : [];
  const newWords = newText ? newText.split(/(\s+|[.,;!?()[\]{}"])/).filter(Boolean) : [];

  const n = oldWords.length;
  const m = newWords.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const stack: DiffChange[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      stack.push({
        type: 'unchanged',
        value: oldWords[i - 1]
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({
        type: 'added',
        value: newWords[j - 1]
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      stack.push({
        type: 'removed',
        value: oldWords[i - 1]
      });
      i--;
    }
  }

  return stack.reverse();
}
