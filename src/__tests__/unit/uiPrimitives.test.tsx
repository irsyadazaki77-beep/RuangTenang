import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Button, IconButton } from '../../components/ui/primitives/Button';
import { Kbd } from '../../components/ui/primitives/Feedback';
import { CommandPalette } from '../../components/CommandPalette';

describe('shared button & feedback primitives', () => {
  it('announces and disables a loading action', () => {
    render(<Button isLoading>Simpan</Button>);
    const button = screen.getByRole('button', { name: 'Simpan' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('requires a stable accessible label on icon actions', () => {
    render(<IconButton aria-label="Tutup"><span aria-hidden="true">×</span></IconButton>);
    expect(screen.getByRole('button', { name: 'Tutup' })).toBeInTheDocument();
  });

  it('renders keyboard shortcut badge primitive cleanly', () => {
    render(<Kbd>⌘K</Kbd>);
    expect(screen.getByText('⌘K').tagName.toLowerCase()).toBe('kbd');
  });

  it('renders grouped command palette with accessible listbox and keyboard navigation', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={onClose} chats={[]} />
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog', { name: /Command Palette/i })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: /Daftar perintah/i })).toBeInTheDocument();
    expect(screen.getAllByText('Mode & Ruang').length).toBeGreaterThan(0);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
