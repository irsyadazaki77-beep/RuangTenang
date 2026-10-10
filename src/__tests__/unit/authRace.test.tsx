import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth, DEFAULT_GUEST_USER } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

describe('Auth Session Race Conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prevents old refreshSession from overwriting a newer login session', async () => {
    let resolveRefresh: (val: any) => void;
    const refreshPromise = new Promise(res => { resolveRefresh = res; });
    
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url === '/api/v1/auth/me') {
        return refreshPromise as any;
      }
      return Promise.resolve({ success: false });
    });

    let currentContextUser: any = null;

    let triggerSetUser: (u: any) => void;

    const TestComponent = () => {
      const { user, setUser } = useAuth();
      currentContextUser = user;
      triggerSetUser = setUser;
      return null;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(currentContextUser?.role).toBe('guest');
    });

    // Simulate login -> sets user to 'mahasiswa' and increments authVersionRef
    act(() => {
      triggerSetUser({
        id: 'user1',
        role: 'mahasiswa',
        name: 'New User',
        email: 'test@ui.ac.id',
        tier: 'Free',
        usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
      });
    });

    expect(currentContextUser?.role).toBe('mahasiswa');

    // Now resolve the old refreshSession (which found the user as guest or failed)
    await act(async () => {
      resolveRefresh({ success: false });
    });

    // The state should NOT be overwritten back to guest
    expect(currentContextUser?.role).toBe('mahasiswa');
  });

  it('invalidates a stale tab and reloads identity from the server after another tab changes accounts', async () => {
    const accountB = {
      id: 'shared-browser-user-b',
      role: 'mahasiswa',
      name: 'User B',
      email: 'user-b@test.com',
      tier: 'Free',
      usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 },
    };
    let returnAccountB = false;
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url === '/api/csrf-token') return Promise.resolve({ success: true }) as any;
      if (url === '/api/auth/me' && returnAccountB) {
        return Promise.resolve({ success: true, data: { user: accountB } }) as any;
      }
      return Promise.resolve({ success: false }) as any;
    });

    let currentContext: ReturnType<typeof useAuth> | undefined;
    let triggerSetUser: ReturnType<typeof useAuth>['setUser'];
    const TestComponent = () => {
      currentContext = useAuth();
      triggerSetUser = currentContext.setUser;
      return null;
    };

    render(<AuthProvider><TestComponent /></AuthProvider>);
    await waitFor(() => expect(currentContext?.loading).toBe(false));
    act(() => {
      triggerSetUser({
        id: 'shared-browser-user-a',
        role: 'mahasiswa',
        name: 'User A',
        email: 'user-a@test.com',
        tier: 'Free',
        usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 },
      });
    });

    returnAccountB = true;
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'rt_active_user_id',
        oldValue: 'shared-browser-user-a',
        newValue: 'shared-browser-user-b',
      }));
    });

    await waitFor(() => {
      expect(currentContext?.user?.id).toBe('shared-browser-user-b');
      expect(currentContext?.authLifecycle).toBe('authenticated');
    });
    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me');
  });
});
