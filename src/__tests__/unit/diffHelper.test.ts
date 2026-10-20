import { describe, expect, it } from 'vitest';
import { computeLineDiff } from '../../features/workspace/utils/diffHelper';

describe('computeLineDiff', () => {
  it('returns an exact diff with original line numbers for a small edit', () => {
    const result = computeLineDiff('judul\nbaris lama\npenutup', 'judul\nbaris baru\npenutup');

    expect(result.exact).toBe(true);
    expect(result.changes).toEqual([
      { type: 'unchanged', value: 'judul', lineNumberOld: 1, lineNumberNew: 1 },
      { type: 'removed', value: 'baris lama', lineNumberOld: 2 },
      { type: 'added', value: 'baris baru', lineNumberNew: 2 },
      { type: 'unchanged', value: 'penutup', lineNumberOld: 3, lineNumberNew: 3 }
    ]);
  });

  it('reconstructs both source line sequences for deterministic small inputs', () => {
    let seed = 73;
    const next = () => {
      seed = (seed * 16_807) % 2_147_483_647;
      return seed;
    };

    for (let sample = 0; sample < 60; sample += 1) {
      const oldLines = Array.from({ length: next() % 18 }, () => `line-${next() % 9}`);
      const newLines = Array.from({ length: next() % 18 }, () => `line-${next() % 9}`);
      const result = computeLineDiff(oldLines.join('\n'), newLines.join('\n'));

      expect(result.exact).toBe(true);
      expect(result.changes.filter(change => change.type !== 'added').map(change => change.value)).toEqual(oldLines);
      expect(result.changes.filter(change => change.type !== 'removed').map(change => change.value)).toEqual(newLines);
    }
  });

  it('keeps a large document exact by anchoring repeated sections around local changes', () => {
    const oldLines: string[] = [];
    const newLines: string[] = [];
    for (let index = 0; index < 600; index += 1) {
      oldLines.push(`Bagian ${index}`, `isi lama ${index}`);
      newLines.push(`Bagian ${index}`, `isi baru ${index}`);
    }

    const result = computeLineDiff(oldLines.join('\n'), newLines.join('\n'));

    expect(result.exact).toBe(true);
    expect(result.changes).toHaveLength(1_800);
    expect(result.changes.filter(change => change.type === 'unchanged')).toHaveLength(600);
    expect(result.changes.filter(change => change.type === 'removed')).toHaveLength(600);
    expect(result.changes.filter(change => change.type === 'added')).toHaveLength(600);
    expect(result.changes[0]).toMatchObject({ type: 'unchanged', value: 'Bagian 0', lineNumberOld: 1, lineNumberNew: 1 });
    expect(result.changes.at(-1)).toMatchObject({ type: 'added', value: 'isi baru 599', lineNumberNew: 1_200 });
  });

  it('bounds a large region without common anchors and preserves its exact boundary lines', () => {
    const oldText = ['judul sama', ...Array.from({ length: 520 }, (_, index) => `lama ${index}`), 'penutup sama'].join('\n');
    const newText = ['judul sama', ...Array.from({ length: 520 }, (_, index) => `baru ${index}`), 'penutup sama'].join('\n');

    const result = computeLineDiff(oldText, newText);

    expect(result.exact).toBe(false);
    expect(result.changes).toHaveLength(1_042);
    expect(result.changes[0]).toMatchObject({ type: 'unchanged', value: 'judul sama', lineNumberOld: 1, lineNumberNew: 1 });
    expect(result.changes[1]).toMatchObject({ type: 'removed', value: 'lama 0', lineNumberOld: 2 });
    expect(result.changes[521]).toMatchObject({ type: 'added', value: 'baru 0', lineNumberNew: 2 });
    expect(result.changes.at(-1)).toMatchObject({ type: 'unchanged', value: 'penutup sama', lineNumberOld: 522, lineNumberNew: 522 });
  });

  it('marks large regions with repeated common lines as approximate even when unique anchors exist', () => {
    const oldText = ['awal', 'anchor', 'ulang', 'ulang', ...Array.from({ length: 500 }, (_, index) => `lama ${index}`), 'akhir'].join('\n');
    const newText = ['awal', 'anchor', ...Array.from({ length: 500 }, (_, index) => `baru ${index}`), 'ulang', 'ulang', 'akhir'].join('\n');

    const result = computeLineDiff(oldText, newText);

    expect(result.exact).toBe(false);
    expect(result.changes.filter(change => change.type !== 'added').map(change => change.value)).toEqual(oldText.split('\n'));
    expect(result.changes.filter(change => change.type !== 'removed').map(change => change.value)).toEqual(newText.split('\n'));
  });
});
