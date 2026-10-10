import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from '../../components/CommandPalette';
import { useGlobalShortcuts } from '../../app/hooks/useGlobalShortcuts';
import { WorkspaceSourcePreview } from '../../features/workspace/components/WorkspaceSourcePreview';
import { initialWorkspaceViewState, workspaceTabForInspector, workspaceViewReducer } from '../../features/workspace/hooks/workspaceViewState';
import { WORKSPACE_COMMAND_EVENT } from '../../features/workspace/utils/workspaceCommandEvents';
import { readWorkspacePromptDraft, writeWorkspacePromptDraft } from '../../features/workspace/utils/workspacePromptDraft';
import type { FileSourceReference } from '../../../shared/contracts/files';

const source: FileSourceReference = {
  citationId: 'SRC_1',
  documentId: 'attachment-1',
  filename: 'Metode.pdf',
  page: 4,
  sourceRef: 'Metode.pdf [Hal. 4]',
  snippet: 'Instrumen diuji melalui validitas isi.'
};

describe('Workspace interaction model', () => {
  it('keeps exactly one inspector active and scopes source, file, and task selection to the view state', () => {
    const withSource = workspaceViewReducer(initialWorkspaceViewState, { type: 'select-source', source });
    expect(withSource.inspector).toBe('sources');
    expect(workspaceTabForInspector(withSource.inspector)).toBe('sources');

    const withPlan = workspaceViewReducer(withSource, { type: 'open-inspector', inspector: 'plan' });
    expect(withPlan.inspector).toBe('plan');
    expect(withPlan.selectedSource).toEqual(source);
    expect(workspaceTabForInspector(withPlan.inspector)).toBe('context');

    const withFilePreview = workspaceViewReducer(withPlan, { type: 'preview-attachment', attachmentId: 'attachment-2' });
    expect(withFilePreview.inspector).toBe('plan');
    expect(withFilePreview.previewAttachmentId).toBe('attachment-2');
    expect(workspaceViewReducer(withFilePreview, { type: 'reset-workspace-view' })).toEqual(initialWorkspaceViewState);
  });

  it('shows the exact citation location and excerpt, and opens its source document', () => {
    const onOpenDocument = vi.fn();
    const onClose = vi.fn();
    render(<WorkspaceSourcePreview source={source} onOpenDocument={onOpenDocument} onClose={onClose} />);
    expect(screen.getByText(/Lokasi yang tersedia: Metode.pdf \[Hal\. 4\]/)).toBeInTheDocument();
    expect(screen.getByText('Instrumen diuji melalui validitas isi.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buka dokumen' }));
    expect(onOpenDocument).toHaveBeenCalledWith('attachment-1');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup pratinjau sumber' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('exposes live workspace commands only in an active workspace and dispatches real view actions', () => {
    const onClose = vi.fn();
    const listener = vi.fn();
    window.addEventListener(WORKSPACE_COMMAND_EVENT, listener);
    const { unmount } = render(<MemoryRouter initialEntries={['/workspace/c/chat-1']}>
      <CommandPalette isOpen onClose={onClose} />
    </MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Buka Canvas/ }));
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('open-canvas');
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    window.removeEventListener(WORKSPACE_COMMAND_EVENT, listener);

    render(<MemoryRouter initialEntries={['/workspace']}>
      <CommandPalette isOpen onClose={vi.fn()} />
    </MemoryRouter>);
    expect(screen.getByRole('button', { name: /Workspace baru/ })).toBeInTheDocument();
  });

  it('does not open the global command palette while typing in an editor', () => {
    const toggle = vi.fn();
    const Probe = () => {
      useGlobalShortcuts(toggle);
      return <textarea aria-label="Editor" />;
    };
    render(<MemoryRouter><Probe /></MemoryRouter>);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Editor' }), { key: 'k', ctrlKey: true });
    expect(toggle).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    expect(toggle).toHaveBeenCalledOnce();
  });

  it('preserves composer drafts per Workspace without sharing them across routes', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
    writeWorkspacePromptDraft(storage, 'chat:workspace-a', 'Draf A');
    writeWorkspacePromptDraft(storage, 'chat:workspace-b', 'Draf B');
    expect(readWorkspacePromptDraft(storage, 'chat:workspace-a')).toBe('Draf A');
    expect(readWorkspacePromptDraft(storage, 'chat:workspace-b')).toBe('Draf B');
    writeWorkspacePromptDraft(storage, 'chat:workspace-a', '');
    expect(readWorkspacePromptDraft(storage, 'chat:workspace-a')).toBe('');
    expect(readWorkspacePromptDraft(storage, 'chat:workspace-b')).toBe('Draf B');
  });
});
