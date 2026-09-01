import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmergencyCenter } from '../../components/EmergencyCenter';
import { CounselorDirectory } from '../../features/counselors/CounselorDirectory';
import { ScreeningModal } from '../../features/screening/ScreeningModal';

describe('P1 Integration Workflows & Callbacks', () => {
  it('counselor directory selection triggers callback with counselor object', () => {
    const onSelect = vi.fn();
    render(<CounselorDirectory onSelectCounselorForBooking={onSelect} />);

    const selectButtons = screen.getAllByRole('button');
    const targetBtn = selectButtons.find(b => b.textContent?.includes('Jadwalkan') || b.textContent?.includes('Pilih'));
    if (targetBtn) {
      fireEvent.click(targetBtn);
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String)
      }));
    }
  });

  it('screening modal displays non-medical diagnosis disclaimer', () => {
    const onClose = vi.fn();
    const onComplete = vi.fn();
    render(<ScreeningModal isOpen={true} onClose={onClose} onComplete={onComplete} />);

    expect(screen.getByText(/bukan pengganti diagnosis medis/i)).toBeInTheDocument();
  });

  it('emergency center triggers SOS callback and disables button during dispatch', async () => {
    const onTrigger = vi.fn();
    render(<EmergencyCenter onTriggerSOS={onTrigger} />);

    const sosButton = screen.getByRole('button', { name: /Kirim Sinyal Darurat|Mengirim/i });
    expect(sosButton).not.toBeDisabled();

    fireEvent.click(sosButton);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(sosButton).toBeDisabled());
  });
});
