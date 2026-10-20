import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Avatar } from '../../components/ui/primitives/Surfaces';
import { BookingForm } from '../../features/appointments/BookingForm';
import { CampusAdminPortal } from '../../features/campus-admin/CampusAdminPortal';
import { Counselor } from '../../types';

// Mock apiClient
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'c1',
      name: 'Dr. Sarah',
      email: 'sarah@kampus.ac.id',
      role: 'konselor',
      tier: 'Free',
      usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 },
    },
    logout: vi.fn(),
  }),
}));

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ success: true, data: { campus: { id: 'ui', name: 'Universitas Indonesia', slug: 'ui', timeZone: 'Asia/Jakarta', referralContacts: [] }, events: [], counselors: [] } }),
    post: vi.fn().mockResolvedValue({ success: true, data: {} }),
    patch: vi.fn().mockResolvedValue({ success: true, data: {} }),
    put: vi.fn().mockResolvedValue({ success: true, data: {} }),
    delete: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

// Mock counselor hooks
const mockCounselor: Counselor = {
  id: 'c1',
  name: 'Dr. Sarah Amalia, M.Psi',
  title: 'Psikolog Klinis Dewasa',
  university: 'Universitas Indonesia',
  specialties: ['Kecemasan', 'Manajemen Stres'],
  avatar: 'https://images.unsplash.com/photo-broken.jpg',
  rating: 4.9,
  reviewsCount: 12,
  experienceYears: 8,
  isFreeForStudents: true,
  price: 0,
  consultationType: ['video_call', 'in_person'],
  contactPhone: '08123456789',
  contactWhatsapp: '08123456789',
  availableDays: ['Senin', 'Rabu', 'Jumat'],
  nextAvailableSlot: 'Besok, 10:00 WIB',
  availableToday: true,
  languages: ['Indonesia', 'Inggris'],
  bio: 'Psikolog berpengalaman menangani stres akademik.',
  isDemoData: false,
  licenseNumber: '12345/HIMPSI/2020',
  location: 'Pusat Konseling UI',
};

vi.mock('../../hooks/useCounselors', () => ({
  useCounselors: () => ({
    counselors: [mockCounselor],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('Tahap 3 UI/UX Remediation Tests (F11 - F16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('F16: Avatar Component Resilience & Fallbacks', () => {
    it('renders image when src is valid, and falls back to initials upon image error', () => {
      render(<Avatar name="Budi Santoso" src="https://example.com/photo.jpg" />);
      const img = screen.getByRole('img');
      expect(img).toBeDefined();

      // Trigger error event
      fireEvent.error(img);

      // Now fallback initials should appear
      expect(screen.getByText('BS')).toBeDefined();
    });

    it('renders initials immediately when no src is provided', () => {
      render(<Avatar name="Ruang Tenang" shape="rounded" size="lg" />);
      expect(screen.getByText('RT')).toBeDefined();
    });
  });

  describe('F13: BookingForm Step Flow Consistency', () => {
    const mockUserSession = {
      id: 'mhs-1',
      name: 'Ahmad Mahasiswa',
      email: 'ahmad@kampus.ac.id',
      role: 'mahasiswa' as const,
      tier: 'Free' as const,
      usageStats: { chatMessagesSent: 5, appointmentsBooked: 1 },
      campusId: 'ui',
    };

    it('starts at Step 2 (Pilih Jadwal) with counselor summary and Ganti button when selectedCounselorFromDir is provided', async () => {
      render(
        <MemoryRouter>
          <BookingForm
            isOpen={true}
            onClose={vi.fn()}
            selectedCounselorFromDir={mockCounselor}
            userSession={mockUserSession}
            onAddAppointment={vi.fn()}
            showToast={vi.fn()}
            onShowLimitModal={vi.fn()}
          />
        </MemoryRouter>
      );

      // Should be on Step 2
      expect(await screen.findByText(`Sesi dengan ${mockCounselor.name}`)).toBeDefined();

      // Should have a "Ganti" button
      const changeBtn = screen.getByRole('button', { name: 'Ganti' });
      expect(changeBtn).toBeDefined();

      // Clicking Ganti takes user to Step 1
      fireEvent.click(changeBtn);
      expect(await screen.findByText('Pilih psikolog atau konselor kampus yang ingin Anda temui:')).toBeDefined();
    });
  });

  describe('F14: Campus Admin Friendly Form Controls', () => {
    it('renders structured emergency contact controls and timezone select', async () => {
      render(
        <MemoryRouter>
          <CampusAdminPortal userName="Admin Kampus" onLogout={vi.fn()} />
        </MemoryRouter>
      );

      // Wait for or check for the timezone label/select
      expect(await screen.findByText('Zona waktu kampus')).toBeDefined();
      expect(screen.getByLabelText('Pilih zona waktu kampus')).toBeDefined();

      // Should display structured emergency contacts section
      expect(screen.getByText('Kontak Rujukan Darurat & Krisis Kampus')).toBeDefined();
      expect(screen.getByRole('button', { name: /tambah kontak rujukan/i })).toBeDefined();
    });
  });

  describe('F12: Horizontal Tabs Affordance & ARIA Tablist', () => {
    it('verifies tablist role and aria-selected support on navigation panels', async () => {
      const { CounselorPortal } = await import('../../features/counselor-portal/CounselorPortal');
      await act(async () => {
        render(
          <MemoryRouter>
            <CounselorPortal />
          </MemoryRouter>
        );
      });

      const tablist = screen.getByRole('tablist', { name: 'Navigasi Fitur Portal Konselor' });
      expect(tablist).toBeDefined();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThanOrEqual(4);
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    }, 15000);
  });

  describe('F15: Accessible Landmarks & Skip Links', () => {
    it('renders skip link and main landmark in CounselorShell', async () => {
      const { CounselorShell } = await import('../../components/CounselorShell');
      const mockCounselorUser = {
        id: 'c-1',
        name: 'Dr. Sarah',
        email: 'sarah@kampus.ac.id',
        role: 'konselor' as const,
        tier: 'Free' as const,
        usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 },
      };

      render(
        <MemoryRouter>
          <CounselorShell
            user={mockCounselorUser}
            setUser={vi.fn()}
            handleLogout={vi.fn()}
            isSettingsOpen={false}
            setIsSettingsOpen={vi.fn()}
            isAuthModalOpen={false}
            setIsAuthModalOpen={vi.fn()}
            isLegalDocsOpen={false}
            setIsLegalDocsOpen={vi.fn()}
            isChangelogOpen={false}
            setIsChangelogOpen={vi.fn()}
            isNotificationOpen={false}
            setIsNotificationOpen={vi.fn()}
            showOnboarding={false}
            setShowOnboarding={vi.fn()}
          />
        </MemoryRouter>
      );

      const skipLink = screen.getByText('Lewati ke konten utama');
      expect(skipLink).toBeDefined();
      expect(skipLink.getAttribute('href')).toBe('#main-content');

      const mainLandmark = screen.getByRole('main');
      expect(mainLandmark).toBeDefined();
      expect(mainLandmark.id).toBe('main-content');
    });
  });
});
