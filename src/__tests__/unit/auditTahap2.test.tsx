import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CounselorShell } from '../../components/CounselorShell';
import { EmptyChatState } from '../../features/chat/components/EmptyChatState';
import { ChatHeader } from '../../features/chat/components/ChatHeader';
import { UserSession } from '../../types';

import { ThemeProvider } from '../../contexts/ThemeContext';

describe('Audit Tahap 2 Remediation (F05 – F10)', () => {
  const mockCounselorUser: UserSession = {
    id: 'counselor-1',
    name: 'Dr. Sarah Amalia, M.Psi., Psikolog Klinis',
    email: 'sarah@kampus.ac.id',
    role: 'konselor',
    tier: 'Pro',
    usageStats: {
      chatMessagesSent: 0,
      appointmentsBooked: 0
    }
  };

  it('F08: CounselorShell renders responsive two-tier mobile header with truncated names and accessible actions', () => {
    render(
      <MemoryRouter>
        <CounselorShell
          user={mockCounselorUser}
          setUser={() => {}}
          isSettingsOpen={false}
          setIsSettingsOpen={() => {}}
          isAuthModalOpen={false}
          setIsAuthModalOpen={() => {}}
          isLegalDocsOpen={false}
          setIsLegalDocsOpen={() => {}}
          isChangelogOpen={false}
          setIsChangelogOpen={() => {}}
          isNotificationOpen={false}
          setIsNotificationOpen={() => {}}
          showOnboarding={false}
          setShowOnboarding={() => {}}
          handleLogout={() => {}}
        />
      </MemoryRouter>
    );

    // Header brand and counselor name
    expect(screen.getByText('RuangTenang Konselor')).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Sarah Amalia/)).toBeInTheDocument();

    // NavLink tabs for both views are rendered
    expect(screen.getByText('Dashboard & Antrean')).toBeInTheDocument();
    expect(screen.getByText('Portal SOAP & Triase')).toBeInTheDocument();

    // Settings and logout buttons with accessible labels
    const settingsButtons = screen.getAllByRole('button', { name: /Pengaturan/i });
    expect(settingsButtons.length).toBeGreaterThanOrEqual(1);

    const logoutButtons = screen.getAllByRole('button', { name: /Keluar/i });
    expect(logoutButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('F06: EmptyChatState has non-clipping structure for short screens and landscape mode', () => {
    const { container } = render(
      <EmptyChatState
        userName="Ahmad"
        onSelectPrompt={() => {}}
        onOpenBreathing={() => {}}
      />
    );

    expect(screen.getByText(/Hai Ahmad, ada yang ingin diceritakan\?/i)).toBeInTheDocument();
    expect(screen.getByText('Jeda hening 1 menit')).toBeInTheDocument();

    // Ensure the container does not use forced my-auto that pushes top offscreen
    const rootEl = container.firstElementChild as HTMLElement;
    expect(rootEl.className).toContain('my-0');
    expect(rootEl.className).toContain('sm:my-auto');
  });

  it('F07: ChatHeader model popover button is present with accessible controls', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ChatHeader
            user={mockCounselorUser}
            aiModel="tenang-core"
            setAiModel={() => {}}
            isTemporary={false}
            setIsTemporary={() => {}}
            onOpenSidebar={() => {}}
            activePlugin={null}
            setActivePlugin={() => {}}
            isBranch={false}
            parentChatTitle={undefined}
          />
        </ThemeProvider>
      </MemoryRouter>
    );

    const modelTrigger = screen.getByTitle('Pilih Model dan Preferensi');
    expect(modelTrigger).toBeInTheDocument();
    expect(screen.getByText('RuangTenang')).toBeInTheDocument();
  });
});
