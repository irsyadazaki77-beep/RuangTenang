import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiteratureMatrixModal } from '../../features/workspace/components/LiteratureMatrixModal';
import type { WorkspaceFileAttachment } from '../../features/workspace/types';

vi.mock('../../../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

describe('LiteratureMatrixModal component', () => {
  const mockAttachments: WorkspaceFileAttachment[] = [
    {
      id: 'att-1',
      name: 'Penelitian_A.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      status: 'ready',
      content: 'Temuan menunjukkan korelasi positif yang signifikan r=0.72.'
    },
    {
      id: 'att-2',
      name: 'Penelitian_B.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      status: 'ready',
      content: 'Metode kuantitatif survei terhadap 150 mahasiswa.'
    }
  ];

  it('renders modal with attachments and generates synthesis matrix', () => {
    render(
      <LiteratureMatrixModal
        isOpen={true}
        onClose={vi.fn()}
        chatId="chat-123"
        attachments={mockAttachments}
      />
    );

    expect(screen.getByText('Matriks Sintesis Literatur Ilmiah')).toBeInTheDocument();
    expect(screen.getByText('Penelitian_A.pdf')).toBeInTheDocument();
    expect(screen.getByText('Penelitian_B.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Matriks Bab 2/i })).toBeInTheDocument();
  });

  it('allows toggling document selection checkboxes', () => {
    render(
      <LiteratureMatrixModal
        isOpen={true}
        onClose={vi.fn()}
        chatId="chat-123"
        attachments={mockAttachments}
      />
    );

    const docBtn = screen.getByText('Penelitian_A.pdf');
    fireEvent.click(docBtn);
    // Toggled off
    expect(screen.getByText(/1 dari 2 berkas dipilih/)).toBeInTheDocument();

    fireEvent.click(docBtn);
    // Toggled back on
    expect(screen.getByText(/2 dari 2 berkas dipilih/)).toBeInTheDocument();
  });

  it('renders empty state when no attachments exist', () => {
    render(
      <LiteratureMatrixModal
        isOpen={true}
        onClose={vi.fn()}
        chatId="chat-123"
        attachments={[]}
      />
    );

    expect(screen.getByText(/Belum ada berkas PDF yang diunggah/i)).toBeInTheDocument();
  });
});
