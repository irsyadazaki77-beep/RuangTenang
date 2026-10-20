import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'counselor-1', role: 'konselor', name: 'Konselor' } })
}));

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get, put: vi.fn() }
}));

import { CounselorPortal } from '../../features/counselor-portal/CounselorPortal';

describe('counselor portal loading state', () => {
  beforeEach(() => {
    get.mockRejectedValue(new Error('network unavailable'));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows partial data failure and lets the counselor retry', async () => {
    render(<CounselorPortal />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/antrean triase.*ringkasan analitik.*riwayat soap/i);
    const retry = screen.getByRole('button', { name: 'Coba Muat Ulang' });
    fireEvent.click(retry);

    await waitFor(() => expect(get).toHaveBeenCalledTimes(6));
  });
});
