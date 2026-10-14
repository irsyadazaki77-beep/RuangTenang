import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArtifactPresentationEditor, ArtifactTableEditor } from '../../features/workspace/components/ArtifactDataEditors';
import { mapMarkdownTextSelection } from '../../features/workspace/components/ArtifactCanvasEditor';

describe('Artifact Studio data editors', () => {
  it('maps visual selections through Markdown formatting and duplicate text to the correct source range', () => {
    const markdown = '# Title\n\nA **repeat** and repeat';
    const visible = 'Title\n\nA repeat and repeat';
    const expectedVisibleOffset = visible.lastIndexOf('repeat');
    const selection = mapMarkdownTextSelection(markdown, 'repeat', expectedVisibleOffset);

    expect(selection).not.toBeNull();
    expect(markdown.slice(selection!.start, selection!.end)).toBe('repeat');
    expect(selection!.start).toBe(markdown.lastIndexOf('repeat'));
    expect(mapMarkdownTextSelection(markdown, 'missing selection', 0)).toBeNull();
  });

  it('edits spreadsheet cells and adds/removes rows without evaluating formulas', () => {
    const onChange = vi.fn();
    const content = JSON.stringify({ type: 'table', title: 'Scores', columns: ['Group', 'Score'], rows: [{ Group: 'A', Score: 3 }], columnTypes: { Group: 'text', Score: 'number' }, sourceVersion: 'local' });
    const Harness = () => { const [value, setValue] = useState(content); return <ArtifactTableEditor content={value} onChange={next => { onChange(next); setValue(next); }} onBlur={vi.fn()} />; };
    render(<Harness />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Score, baris 1' }), { target: { value: '=1+1' } });
    const proposed = JSON.parse(onChange.mock.calls.at(-1)?.[0] as string) as { rows: Array<Record<string, unknown>> };
    expect(proposed.rows[0].Score).toBe('=1+1');
    expect(screen.getByRole('textbox', { name: 'Score, baris 1' })).toHaveAttribute('aria-invalid', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Baris' }));
    expect(JSON.parse(onChange.mock.calls.at(-1)?.[0] as string).rows).toHaveLength(2);
  });

  it('reorders slides and preserves notes and theme in the editable model', () => {
    const onChange = vi.fn();
    const content = JSON.stringify({ format: 'ruangtenang-presentation-v1', theme: 'professional', slides: [
      { id: 'one', title: 'Opening', body: 'Intro', notes: 'Say hello' },
      { id: 'two', title: 'Findings', body: 'Results', notes: 'Explain evidence' }
    ] });
    render(<ArtifactPresentationEditor content={content} title="Deck" onChange={onChange} onBlur={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pindah slide 2 ke atas' }));
    const deck = JSON.parse(onChange.mock.calls.at(-1)?.[0] as string);
    expect(deck.slides.map((slide: { title: string }) => slide.title)).toEqual(['Findings', 'Opening']);
    expect(deck.slides[0].notes).toBe('Explain evidence');
    expect(deck.theme).toBe('professional');
  });
});
