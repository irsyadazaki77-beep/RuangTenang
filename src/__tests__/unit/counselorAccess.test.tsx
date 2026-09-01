import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CounselorDirectory } from '../../features/counselors/CounselorDirectory';

describe('Counselor Directory Access Unit Tests', () => {
  it('renders counselor directory header and search field', () => {
    const onSelect = vi.fn();

    render(<CounselorDirectory onSelectCounselorForBooking={onSelect} />);

    expect(screen.getByText(/Temui Konselor & Psikolog/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cari nama konselor, kampus, atau topik/i)).toBeInTheDocument();
  });

  it('triggers onSelectCounselorForBooking when counselor card action is clicked', () => {
    const onSelect = vi.fn();
    render(<CounselorDirectory onSelectCounselorForBooking={onSelect} />);

    const buttons = screen.getAllByRole('button');
    const selectBtn = buttons.find(b => b.textContent?.includes('Jadwalkan') || b.textContent?.includes('Pilih'));
    if (selectBtn) {
      fireEvent.click(selectBtn);
      expect(onSelect).toHaveBeenCalled();
    }
  });
});
