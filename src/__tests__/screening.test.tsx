import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreeningModal } from '../features/screening/ScreeningModal';

describe('Screening Modal Unit Tests', () => {
  it('renders PHQ-9 & GAD-7 screening title and non-medical diagnosis disclaimer', () => {
    const onClose = vi.fn();
    const onComplete = vi.fn();

    render(<ScreeningModal isOpen={true} onClose={onClose} onComplete={onComplete} />);

    expect(screen.getByText(/Skrining Kesehatan Mental Mahasiswa/i)).toBeInTheDocument();
    expect(screen.getByText(/bukan diagnosis medis/i)).toBeInTheDocument();
  });
});
