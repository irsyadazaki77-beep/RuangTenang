import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoderInspectorDock } from '../../features/coder/components/CoderInspectorDock';
import { SqlPlaygroundModal } from '../../features/coder/components/SqlPlaygroundModal';

describe('CoderInspectorDock', () => {
  it('collapses when no panel is open', () => {
    render(
      <CoderInspectorDock isOpen={false}>
        <SqlPlaygroundModal isOpen={false} onClose={() => {}} />
      </CoderInspectorDock>
    );
    const dock = screen.getByTestId('coder-inspector-dock');
    expect(dock.getAttribute('data-open')).toBe('false');
    expect(dock.className).toContain('h-0');
  });

  it('hosts an open panel inside the dock instead of a full-screen modal', () => {
    render(
      <CoderInspectorDock isOpen={true}>
        <SqlPlaygroundModal isOpen={true} onClose={() => {}} />
      </CoderInspectorDock>
    );
    const dock = screen.getByTestId('coder-inspector-dock');
    expect(dock.getAttribute('data-open')).toBe('true');
    expect(dock.className).toContain('h-[48vh]');
    expect(dock.style.transform).toContain('translateZ');
    expect(screen.getByText(/SQL Database Canvas/i)).toBeDefined();
  });
});
