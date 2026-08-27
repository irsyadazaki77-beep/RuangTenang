import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthModal } from '../features/authentication/AuthModal';

describe('Auth Component Tests', () => {
  it('renders auth modal with login form by default', () => {
    const onClose = vi.fn();
    const onLogin = vi.fn();
    const onLogout = vi.fn();

    render(
      <AuthModal
        isOpen={true}
        onClose={onClose}
        currentSession={null}
        onLogin={onLogin}
        onLogout={onLogout}
      />
    );

    expect(screen.getAllByText(/RuangTenang/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Email Kampus/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Kata Sandi/i)[0]).toBeInTheDocument();
  });

  it('switches to Register tab mode', () => {
    const onClose = vi.fn();
    const onLogin = vi.fn();
    const onLogout = vi.fn();

    render(
      <AuthModal
        isOpen={true}
        onClose={onClose}
        currentSession={null}
        onLogin={onLogin}
        onLogout={onLogout}
      />
    );

    const registerTab = screen.getByRole('button', { name: /Registrasi/i });
    fireEvent.click(registerTab);

    expect(screen.getByText(/Nama Lengkap/i)).toBeInTheDocument();
  });
});
