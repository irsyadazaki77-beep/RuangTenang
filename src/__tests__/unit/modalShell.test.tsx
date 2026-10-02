import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ModalShell } from '../../components/ui/ModalShell';

describe('ModalShell', () => {
  afterEach(cleanup);

  it('keeps backdrop dismissal enabled by default', () => {
    const onClose = vi.fn();
    const { container } = render(<ModalShell isOpen title="Dialog" onClose={onClose}>Konten</ModalShell>);
    const backdrop = container.querySelector('.fixed.inset-0');

    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('can disable backdrop dismissal while preserving the dialog semantics', () => {
    const onClose = vi.fn();
    const { container } = render(<ModalShell isOpen title="Dialog" onClose={onClose} closeOnBackdropClick={false}>Konten</ModalShell>);
    const backdrop = container.querySelector('.fixed.inset-0');

    expect(screen.getByRole('dialog', { name: 'Dialog' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.click(backdrop!);
    expect(onClose).not.toHaveBeenCalled();
  });
});
