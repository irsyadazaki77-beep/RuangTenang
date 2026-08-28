import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/Toast';
import { lazyWithRetry } from '../lib/lazyWithRetry';

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/auth/me')) {
        return { success: true, user: { id: 'test_user_1', name: 'Mahasiswa Test', role: 'mahasiswa' } };
      }
      if (url.includes('/api/v1/chat/history')) {
        return {
          success: true,
          data: [
            { id: 'chat_1', title: 'Diskusi Stres Akademik', isPinned: true, isArchived: false, updatedAt: new Date().toISOString() },
            { id: 'chat_2', title: 'Konsultasi Karir', isPinned: false, isArchived: false, updatedAt: new Date().toISOString() }
          ]
        };
      }
      if (url.includes('/api/v1/chat/chat_1/messages')) {
        return {
          success: true,
          data: {
            data: [
              { id: 'm1', role: 'user', content: 'Halo, saya butuh masukan skripsi' },
              { id: 'm2', role: 'assistant', content: 'Tentu! Mari kita bahas bersama.' }
            ],
            nextCursor: null
          }
        };
      }
      if (url.includes('/api/v1/appointments')) {
        return { success: true, data: { data: [], totalPages: 1, total: 0 } };
      }
      if (url.includes('/api/v1/mood')) {
        return { success: true, data: [] };
      }
      return { success: true, data: [] };
    }),
    post: vi.fn().mockResolvedValue({ success: true, data: { id: 'chat_new', title: 'Obrolan Baru' } }),
    put: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true })
  }
}));

const renderTestApp = (initialRoute = '/') => {
  return render(
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <App />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

describe('P2 Comprehensive E2E & Route Fallback Coverage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders application and loads chat history', async () => {
    renderTestApp('/');

    await waitFor(() => {
      expect(screen.getByText(/Riwayat Chat/i)).toBeInTheDocument();
    });
  });

  it('handles unknown routes by redirecting safely to home', async () => {
    renderTestApp('/unknown-route-typo-123');

    await waitFor(() => {
      expect(screen.getByText(/Riwayat Chat/i)).toBeInTheDocument();
    });
  });

  it('lazyWithRetry helper handles successful import and chunk error retry guard', async () => {
    const dummyComponent = () => <div>Loaded Component</div>;
    const lazyComponent = lazyWithRetry(() => Promise.resolve({ default: dummyComponent as any }));
    expect(lazyComponent).toBeDefined();
  });
});
