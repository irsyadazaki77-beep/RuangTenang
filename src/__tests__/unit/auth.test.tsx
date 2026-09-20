import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AuthModal } from '../../features/authentication/AuthModal';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

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

describe('HttpOnly Cookie Auth Lifecycle & Bootstrap Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('bootstraps session via GET /api/v1/auth/me without reading token from localStorage', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/csrf-token')) {
        return Promise.resolve({ success: true, data: { csrfToken: 'mock-csrf' } });
      }
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          success: true,
          data: {
            user: {
              id: 'user-boot-1',
              name: 'Mahasiswa Beriman',
              email: 'mhs@ui.ac.id',
              role: 'mahasiswa',
              tier: 'Free'
            }
          }
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    let contextUser: any = null;
    const TestConsumer = () => {
      const { user } = useAuth();
      contextUser = user;
      return <div>User: {user.name}</div>;
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextUser?.role).toBe('mahasiswa');
      expect(contextUser?.email).toBe('mhs@ui.ac.id');
    });

    // Verify GET /api/v1/auth/me was called
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/me/));

    // Verify localStorage was NOT used to load JWT token
    const tokenLookups = getItemSpy.mock.calls.filter(([key]) => key === 'token' || key === 'rt_auth_token');
    expect(tokenLookups.length).toBe(0);
  });

  it('logs out by calling POST /api/auth/logout and resetting state without localStorage', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/csrf-token')) {
        return Promise.resolve({ success: true, data: { csrfToken: 'mock-csrf' } });
      }
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          success: true,
          data: {
            user: {
              id: 'user-logout-1',
              name: 'User In Session',
              email: 'logout@test.com',
              role: 'mahasiswa',
              tier: 'Free'
            }
          }
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });
    vi.mocked(apiClient.post).mockResolvedValueOnce({ success: true });

    let logoutFn: any;
    let currentUser: any;

    const TestLogoutConsumer = () => {
      const { user, logout } = useAuth();
      currentUser = user;
      logoutFn = logout;
      return <button onClick={logout}>Keluar</button>;
    };

    render(
      <AuthProvider>
        <TestLogoutConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(currentUser?.role).toBe('mahasiswa');
    });

    // Execute logout
    await act(async () => {
      await logoutFn();
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout');
    expect(currentUser?.role).toBe('guest');
  });
});

