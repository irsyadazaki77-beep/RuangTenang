import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  const completeAllQuestions = () => {
    // Click "Mulai Cek Kondisi" from intro
    const startBtn = screen.getByRole('button', { name: /Mulai Cek Kondisi/i });
    fireEvent.click(startBtn);

    // PHQ-9 (9 questions): click first option (Tidak sama sekali = 0) for each
    const phqButtons = screen.getAllByRole('button', { name: /Tidak sama sekali/i });
    phqButtons.forEach(btn => fireEvent.click(btn));

    // Next to GAD-7
    const nextBtn = screen.getByRole('button', { name: /Lanjut ke GAD-7/i });
    fireEvent.click(nextBtn);

    // GAD-7 (7 questions): click first option (Tidak sama sekali = 0) for each
    const gadButtons = screen.getAllByRole('button', { name: /Tidak sama sekali/i });
    gadButtons.forEach(btn => fireEvent.click(btn));

    // Click "Lihat Hasil"
    const submitBtn = screen.getByRole('button', { name: /Lihat Hasil/i });
    fireEvent.click(submitBtn);
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

    render(<ScreeningModal isOpen={true} onClose={vi.fn()} onComplete={vi.fn()} />);

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

    render(<ScreeningModal isOpen={true} onClose={vi.fn()} onComplete={onComplete} onPersisted={onPersisted} />);

    completeAllQuestions();

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
      expect(screen.getByText(/Hasil berhasil disimpan ke akun Anda/i)).toBeInTheDocument();
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

    render(<ScreeningModal isOpen={true} onClose={vi.fn()} onComplete={onComplete} onPersisted={onPersisted} />);

    completeAllQuestions();

    // Local completion still works
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Persistence callback must NOT be called on error
    await waitFor(() => {
      expect(onPersisted).not.toHaveBeenCalled();
      expect(screen.getByText(/Koneksi database bermasalah|Hasil screening selesai, tetapi penyimpanan ke server gagal/i)).toBeInTheDocument();
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

    render(<ScreeningModal isOpen={true} onClose={vi.fn()} onComplete={onComplete} onPersisted={onPersisted} />);

    completeAllQuestions();

    // Local completion works
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Should NOT post to /api/v1/screenings for guest persistence
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(onPersisted).not.toHaveBeenCalled();

    // Displays clear guest message
    expect(screen.getByText(/Mode Tamu: Hasil tersimpan di perangkat ini/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hasil berhasil disimpan ke akun Anda/i)).not.toBeInTheDocument();
  });
});
