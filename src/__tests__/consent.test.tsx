import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyCenterModal } from '../features/privacy/PrivacyCenterModal';
import { UserSession } from '../types';

describe('Privacy & Consent Center Modal Tests', () => {
  it('renders privacy center title', () => {
    const onClose = vi.fn();
    const setUserSession = vi.fn();
    const onOpenAuth = vi.fn();
    const dummyUser: UserSession = {
      id: 'usr-1',
      name: 'Budi Santoso',
      email: 'budi@ui.ac.id',
      university: 'Universitas Indonesia',
      role: 'mahasiswa',
      tier: 'Free',
      usageStats: {
        chatMessagesSent: 0,
        appointmentsBooked: 0
      }
    };

    render(
      <PrivacyCenterModal
        isOpen={true}
        onClose={onClose}
        userSession={dummyUser}
        setUserSession={setUserSession}
        onOpenAuth={onOpenAuth}
      />
    );

    expect(screen.getByText(/Pusat Privasi & Hak Data Pengguna/i)).toBeInTheDocument();
  });
});
