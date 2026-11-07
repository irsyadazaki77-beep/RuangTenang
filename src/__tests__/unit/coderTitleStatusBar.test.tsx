import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoderCommandTitleBar } from '../../features/coder/components/CoderCommandTitleBar';
import { CoderStatusBar } from '../../features/coder/components/CoderStatusBar';

const titleProps = () => ({
  projectName: 'proyek-a',
  activeFilePath: 'index.html',
  isMac: false,
  isSidebarVisible: true,
  isDockOpen: false,
  isAgentOpen: true,
  onOpenSearch: vi.fn(),
  onRun: vi.fn(),
  onRunTests: vi.fn(),
  onToggleSidebar: vi.fn(),
  onToggleDock: vi.fn(),
  onToggleAgent: vi.fn()
});

describe('CoderCommandTitleBar', () => {
  it('fires search, run and layout toggles', () => {
    const p = titleProps();
    render(<CoderCommandTitleBar {...p} />);
    fireEvent.click(screen.getByLabelText('Cari file atau perintah'));
    fireEvent.click(screen.getByLabelText('Run'));
    fireEvent.click(screen.getByLabelText('Sidebar'));
    fireEvent.click(screen.getByLabelText('Panel bawah'));
    fireEvent.click(screen.getByLabelText('Agent AI'));
    expect(p.onOpenSearch).toHaveBeenCalled();
    expect(p.onRun).toHaveBeenCalled();
    expect(p.onToggleSidebar).toHaveBeenCalled();
    expect(p.onToggleDock).toHaveBeenCalled();
    expect(p.onToggleAgent).toHaveBeenCalled();
    expect(screen.getByLabelText('Agent AI').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Panel bawah').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('CoderStatusBar', () => {
  it('shows counts, cursor and opens problems', () => {
    const onOpenProblems = vi.fn();
    render(
      <CoderStatusBar
        errorCount={2}
        warningCount={1}
        cursor={{ line: 12, column: 4 }}
        language="typescript"
        aiLabel="Ollama Lokal"
        onOpenProblems={onOpenProblems}
        onOpenGit={() => {}}
      />
    );
    expect(screen.getByTestId('status-errors').textContent).toBe('2');
    expect(screen.getByTestId('status-warnings').textContent).toBe('1');
    expect(screen.getByTestId('status-cursor').textContent).toContain('Ln 12, Col 4');
    fireEvent.click(screen.getByTitle('Buka Problems'));
    expect(onOpenProblems).toHaveBeenCalled();
  });
});
