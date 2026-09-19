import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { ScreeningModal } from '../../features/screening/ScreeningModal';
import { apiClient } from '../../lib/apiClient';
import * as AuthContextModule from '../../contexts/AuthContext';

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ success: true, data: [] }),
    post: vi.fn()
  }
}));

describe('Screening Modal Unit & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockResolvedValue({ success: true, data: [] });
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <MotionConfig reducedMotion="always">
        <MemoryRouter>{ui}</MemoryRouter>
      </MotionConfig>
    );
  };

  const completeAllQuestions = async () => {
    // Click "Mulai Cek Kondisi" or "Mulai Skrining Mandiri" from intro
    const startBtn = screen.getByRole('button', { name: /Mulai (Cek Kondisi|Skrining Mandiri)/i });
    fireEvent.click(startBtn);

    // Answer each of the 16 questions in the card swiper (0 = "Tidak sama sekali")
    for (let i = 0; i < 16; i++) {
      await screen.findByText(new RegExp(`Pertanyaan ${i + 1} dari 16`, 'i'));
      
      const options = await screen.findAllByRole('button', { name: /Tidak sama sekali/i });
      fireEvent.click(options[options.length - 1]);

      await waitFor(() => {
        const nextBtns = screen.getAllByRole('button', { name: /(Berikutnya|Lihat Hasil)/i });
        expect(nextBtns[nextBtns.length - 1]).not.toBeDisabled();
      });

      const nextBtns = screen.getAllByRole('button', { name: /(Berikutnya|Lihat Hasil)/i });
      fireEvent.click(nextBtns[nextBtns.length - 1]);
    }
  };

  it('renders PHQ-9 & GAD-7 screening title and non-medical diagnosis disclaimer', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      setUser: vi.fn(),
      loading: false,
      isOffline: false,
      refreshSession: vi.fn(),
      logout: vi.fn()
    });

    renderWithRouter(<ScreeningModal isOpen={true} onClose={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByText(/Cek Kondisi Mental Mahasiswa/i)).toBeInTheDocument();
    expect(screen.getByText(/bukan pengganti diagnosis medis/i)).toBeInTheDocument();
  });

  it('handles authenticated user submit with successful backend persistence', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'std-1', name: 'Budi Mahasiswa', email: 'budi@kampus.ac.id', role: 'mahasiswa', tier: 'Free', usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 } },
      setUser: vi.fn(),
      loading: false,
      isOffline: false,
      refreshSession: vi.fn(),
      logout: vi.fn()
    });

    (apiClient.post as any).mockResolvedValue({
      success: true,
      data: { id: 'scr-persisted-1' }
    });

    const onComplete = vi.fn();
    const onPersisted = vi.fn();

    renderWithRouter(<ScreeningModal isOpen={true} onClose={vi.fn()} onComplete={onComplete} onPersisted={onPersisted} />);

    await completeAllQuestions();

    // Verify local completion called immediately
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      phq9: expect.objectContaining({ score: 0, severity: 'Minimal' }),
      gad7: expect.objectContaining({ score: 0, severity: 'Minimal' })
    }));

    // Verify backend call made with correct screening payload
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/screenings', expect.objectContaining({
      phq9Score: 0,
      gad7Score: 0,
      phq9Severity: 'Minimal',
      gad7Severity: 'Minimal'
    }));

    // Verify persistence callback called once save succeeds
    await waitFor(() => {
      expect(onPersisted).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Hasil (berhasil disimpan|skrining tersimpan aman) ke (profil )?akun Anda/i)).toBeInTheDocument();
    });
  });

  it('handles authenticated user submit with backend error without claiming false persistence', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'std-1', name: 'Budi Mahasiswa', email: 'budi@kampus.ac.id', role: 'mahasiswa', tier: 'Free', usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 } },
      setUser: vi.fn(),
      loading: false,
      isOffline: false,
      refreshSession: vi.fn(),
      logout: vi.fn()
    });

    (apiClient.post as any).mockRejectedValue(new Error('Koneksi database bermasalah'));

    const onComplete = vi.fn();
    const onPersisted = vi.fn();

    renderWithRouter(<ScreeningModal isOpen={true} onClose={vi.fn()} onComplete={onComplete} onPersisted={onPersisted} />);

    await completeAllQuestions();

    // Local completion still works
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    // Persistence callback must NOT be called on error
    await waitFor(() => {
      expect(onPersisted).not.toHaveBeenCalled();
      expect(screen.getByText(/Koneksi database bermasalah|Pengecekan selesai, tetapi penyimpanan ke server gagal|Hasil screening selesai/i)).toBeInTheDocument();
      expect(screen.queryByText(/Hasil berhasil disimpan ke akun Anda/i)).not.toBeInTheDocument();
    });
  });

  it('handles guest user submit as local/session result without claiming account persistence', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'guest', name: 'Tamu', email: 'tamu@anon.id', role: 'guest', tier: 'Free', usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 } },
      setUser: vi.fn(),
      loading: false,
      isOffline: false,
      refreshSession: vi.fn(),
      logout: vi.fn()
    });

    const onComplete = vi.fn();
    const onPersisted = vi.fn();

    renderWithRouter(<ScreeningModal isOpen={true} onClose={vi.fn()} onComplete={onComplete} onPersisted={onPersisted} />);

    await completeAllQuestions();

    // Local completion works
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    // Should NOT post to /api/v1/screenings for guest persistence
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(onPersisted).not.toHaveBeenCalled();

    // Displays clear guest message
    expect(screen.getByText(/Mode Tamu: Hasil tidak disimpan/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hasil berhasil disimpan ke akun Anda/i)).not.toBeInTheDocument();
  });

  it('correctly behaves as a document page when isPageMode=true without modal trapping or closing on Escape', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      setUser: vi.fn(),
      loading: false,
      isOffline: false,
      refreshSession: vi.fn(),
      logout: vi.fn()
    });

    const handleClose = vi.fn();
    renderWithRouter(<ScreeningModal isOpen={true} onClose={handleClose} isPageMode={true} />);

    // In page mode, modal dialog role should not be present
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // In page mode, close (X) button should not be present
    expect(screen.queryByLabelText('Tutup')).not.toBeInTheDocument();

    // Escape should NOT call onClose in page mode
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('correctly behaves as an accessible dialog modal when isPageMode=false and handles Escape', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      setUser: vi.fn(),
      loading: false,
      isOffline: false,
      refreshSession: vi.fn(),
      logout: vi.fn()
    });

    const handleClose = vi.fn();
    renderWithRouter(<ScreeningModal isOpen={true} onClose={handleClose} isPageMode={false} />);

    // In modal mode, dialog role must be present with aria-modal="true"
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Close button should be present
    expect(screen.getByLabelText('Tutup')).toBeInTheDocument();

    // Escape must trigger onClose
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
