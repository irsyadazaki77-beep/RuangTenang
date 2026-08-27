import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CounselorDirectory } from '../features/counselors/CounselorDirectory';

describe('Counselor Directory Access Unit Tests', () => {
  it('renders counselor directory header and search field', () => {
    const onSelect = vi.fn();

    render(<CounselorDirectory onSelectCounselorForBooking={onSelect} />);

    expect(screen.getByText(/Temui Konselor & Psikolog Kampus/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cari nama konselor, kampus, atau topik/i)).toBeInTheDocument();
  });
});
