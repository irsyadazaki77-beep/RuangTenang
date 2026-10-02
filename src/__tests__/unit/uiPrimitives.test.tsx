import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, IconButton } from '../../components/ui/primitives/Button';

describe('shared button primitives', () => {
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
});
