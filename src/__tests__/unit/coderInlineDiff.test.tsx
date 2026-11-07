import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import {
  computeLineDiff,
  useCoderInlineDiff
} from '../../features/coder/hooks/useCoderInlineDiff';
import { InlineDiffDecorationBar } from '../../features/coder/components/InlineDiffDecorationBar';

describe('Track 2: RuangCoder In-Editor Inline Diff & Action Bar', () => {
  describe('computeLineDiff', () => {
    it('returns hasDiff: false when contents are identical', () => {
      const code = 'const a = 1;\nconsole.log(a);';
      const result = computeLineDiff(code, code);

      expect(result.hasDiff).toBe(false);
      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.decorations).toHaveLength(0);
    });

    it('detects added lines and generates Monaco decorations', () => {
      const before = 'function test() {\n  return 42;\n}';
      const after = 'function test() {\n  console.log("start");\n  return 42;\n}';

      const result = computeLineDiff(before, after);

      expect(result.hasDiff).toBe(true);
      expect(result.additions).toBeGreaterThan(0);
      expect(result.decorations.length).toBeGreaterThan(0);
      expect(result.decorations[0].options.className).toContain('monaco-inline-diff');
    });

    it('detects modified lines correctly', () => {
      const before = 'let count = 0;';
      const after = 'let count = 100;';

      const result = computeLineDiff(before, after);

      expect(result.hasDiff).toBe(true);
      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(1);
      expect(result.lineChanges[0].type).toBe('modified');
    });
  });

  describe('useCoderInlineDiff hook', () => {
    it('memoizes diff output', () => {
      const { result, rerender } = renderHook(
        ({ before, after }) => useCoderInlineDiff(before, after),
        {
          initialProps: {
            before: 'const x = 1;',
            after: 'const x = 2;'
          }
        }
      );

      expect(result.current.hasDiff).toBe(true);
      const firstResult = result.current;

      rerender({ before: 'const x = 1;', after: 'const x = 2;' });
      expect(result.current).toBe(firstResult);
    });
  });

  describe('InlineDiffDecorationBar Component', () => {
    it('renders file name, additions, deletions, and action buttons', () => {
      render(
        <InlineDiffDecorationBar
          filePath="src/App.tsx"
          additions={5}
          deletions={2}
          onAccept={vi.fn()}
          onReject={vi.fn()}
        />
      );

      expect(screen.getByText('App.tsx')).toBeDefined();
      expect(screen.getByText('+5')).toBeDefined();
      expect(screen.getByText('-2')).toBeDefined();
      expect(screen.getByText('Terapkan')).toBeDefined();
      expect(screen.getByText('Tolak')).toBeDefined();
    });

    it('triggers onAccept when Terapkan button is clicked', () => {
      const onAccept = vi.fn();
      render(
        <InlineDiffDecorationBar
          filePath="src/index.js"
          additions={3}
          deletions={1}
          onAccept={onAccept}
          onReject={vi.fn()}
        />
      );

      const acceptBtn = screen.getByText('Terapkan');
      fireEvent.click(acceptBtn);
      expect(onAccept).toHaveBeenCalledTimes(1);
    });

    it('triggers onReject when Tolak button is clicked', () => {
      const onReject = vi.fn();
      render(
        <InlineDiffDecorationBar
          filePath="src/index.js"
          additions={3}
          deletions={1}
          onAccept={vi.fn()}
          onReject={onReject}
        />
      );

      const rejectBtn = screen.getByText('Tolak');
      fireEvent.click(rejectBtn);
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it('triggers onAccept on Tab keydown and onReject on Escape keydown', () => {
      const onAccept = vi.fn();
      const onReject = vi.fn();
      render(
        <InlineDiffDecorationBar
          filePath="src/main.ts"
          additions={1}
          deletions={0}
          onAccept={onAccept}
          onReject={onReject}
        />
      );

      // Simulate Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onReject).toHaveBeenCalledTimes(1);

      // Simulate Tab
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(onAccept).toHaveBeenCalledTimes(1);
    });
  });
});
