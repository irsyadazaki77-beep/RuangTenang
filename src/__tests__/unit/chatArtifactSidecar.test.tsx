import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatArtifactSidecar, inspectArtifactContent } from '../../features/chat/components/ChatArtifactSidecar';
import { InteractiveSourcePills } from '../../features/chat/components/InteractiveSourcePills';
import { TopModeSwitcherPill } from '../../components/layout/TopModeSwitcherPill';

describe('inspectArtifactContent', () => {
  it('detects fenced HTML blocks', () => {
    const res = inspectArtifactContent('Berikut kodenya:\n```html\n<h1>Halo</h1>\n```');
    expect(res.kind).toBe('html');
    expect(res.extractedCode).toBe('<h1>Halo</h1>');
  });

  it('detects fenced code blocks', () => {
    const res = inspectArtifactContent('```python\nprint("ok")\n```');
    expect(res.kind).toBe('code');
    expect(res.language).toBe('python');
  });

  it('falls back to markdown document', () => {
    const res = inspectArtifactContent('# Bab 1 Pendahuluan\nParagraf isi.');
    expect(res.kind).toBe('markdown');
  });
});

describe('ChatArtifactSidecar', () => {
  it('renders nothing when artifact is null', () => {
    const { container } = render(
      <MemoryRouter>
        <ChatArtifactSidecar artifact={null} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('switches between preview, source, and edit tabs and calls handlers', () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();
    render(
      <MemoryRouter>
        <ChatArtifactSidecar
          artifact={{ title: 'Draf Esai', content: '# Judul\nIsi esai' }}
          onClose={onClose}
          onUpdateContent={onUpdate}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Draf Esai')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Sumber'));
    expect(screen.getByText(/# Judul/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit'));
    const editor = screen.getByLabelText('Editor Konten Artefak');
    fireEvent.change(editor, { target: { value: '# Baru' } });
    expect(onUpdate).toHaveBeenCalledWith('# Baru');

    fireEvent.click(screen.getByLabelText('Tutup Canvas'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('InteractiveSourcePills', () => {
  it('expands source details when a citation pill is clicked', () => {
    render(
      <InteractiveSourcePills
        sources={[
          {
            citationId: 'SRC-1',
            documentId: 'doc-1',
            filename: 'jurnal_psikologi.pdf',
            page: 12,
            sourceRef: 'jurnal_psikologi.pdf#12',
            snippet: 'Teknik pernapasan diafragma menurunkan kortisol.'
          }
        ]}
      />
    );

    const pill = screen.getByRole('button', { name: /SRC-1/i });
    fireEvent.click(pill);
    expect(screen.getByRole('region', { name: 'Detail kutipan sumber' })).toBeInTheDocument();
    expect(screen.getByText(/Teknik pernapasan diafragma/)).toBeInTheDocument();
  });
});

describe('TopModeSwitcherPill', () => {
  it('highlights current mode and triggers onSwitchMode', () => {
    const onSwitch = vi.fn();
    render(
      <MemoryRouter initialEntries={['/']}>
        <TopModeSwitcherPill activeMode="RUANG_TENANG" onSwitchMode={onSwitch} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle('Beralih ke RuangKerja'));
    expect(onSwitch).toHaveBeenCalledWith('RUANG_KERJA');
  });
});
