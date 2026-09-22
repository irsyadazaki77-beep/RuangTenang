import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { Chat } from '../../features/chat/types';

describe('Sidebar Overhaul Unit Tests', () => {
  const mockChats: Chat[] = [
    {
      id: 'chat-1',
      title: 'Curhat Cemas Skripsi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      isPinned: true,
      isArchived: false,
      workspaceMode: 'RUANG_TENANG'
    },
    {
      id: 'chat-2',
      title: 'Review Jurnal IEEE AI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      isPinned: false,
      isArchived: false,
      workspaceMode: 'RUANG_KERJA'
    }
  ];

  it('renders Dual-Mode switcher, New Chat button, and grouped chats correctly', () => {
    const setIsOpen = vi.fn();
    const onNewChat = vi.fn();
    const onSelectChat = vi.fn();
    const onDeleteChat = vi.fn();
    const onUpdateTitle = vi.fn();
    const onTogglePin = vi.fn();
    const onToggleArchive = vi.fn();
    const onSwitchMode = vi.fn();

    render(
      <ThemeProvider>
        <MemoryRouter>
          <Sidebar
            isOpen={true}
            setIsOpen={setIsOpen}
            chats={mockChats}
            currentChatId="chat-1"
            currentMode="RUANG_TENANG"
            onSwitchMode={onSwitchMode}
            onNewChat={onNewChat}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            onUpdateTitle={onUpdateTitle}
            onTogglePin={onTogglePin}
            onToggleArchive={onToggleArchive}
            user={{ name: 'Ahmad Fauzi', role: 'student' }}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

    // 1. Dual Mode Switcher Slider
    expect(screen.getAllByText('RuangTenang').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /RuangKerja/i })).toBeInTheDocument();

    // 2. Dynamic New Chat Icon Button
    expect(screen.getByRole('button', { name: /Chat Baru/i })).toBeInTheDocument();

    // 3. Pinned Header & Chat Items
    expect(screen.getByText('Disematkan')).toBeInTheDocument();
    expect(screen.getByText('Curhat Cemas Skripsi')).toBeInTheDocument();

    // 4. Emergency Button & User Profile
    expect(screen.getByText(/Bantuan Darurat \(SOS\)/i)).toBeInTheDocument();
    expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument();
  });

  it('filters chat list when mode switcher is clicked', () => {
    const onSwitchMode = vi.fn();
    const noop = vi.fn();

    const { rerender } = render(
      <ThemeProvider>
        <MemoryRouter>
          <Sidebar
            isOpen={true}
            setIsOpen={noop}
            chats={mockChats}
            currentMode="RUANG_TENANG"
            onSwitchMode={onSwitchMode}
            onNewChat={noop}
            onSelectChat={noop}
            onDeleteChat={noop}
            onUpdateTitle={noop}
            onTogglePin={noop}
            onToggleArchive={noop}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

    // In RUANG_TENANG mode, only RuangTenang chats are shown
    expect(screen.getByText('Curhat Cemas Skripsi')).toBeInTheDocument();
    expect(screen.queryByText('Review Jurnal IEEE AI')).not.toBeInTheDocument();

    // Click RuangKerja mode
    const kerjaBtn = screen.getByRole('button', { name: /^RuangKerja$/i });
    fireEvent.click(kerjaBtn);
    expect(onSwitchMode).toHaveBeenCalledWith('RUANG_KERJA');

    // Re-render in RUANG_KERJA mode
    rerender(
      <ThemeProvider>
        <MemoryRouter>
          <Sidebar
            isOpen={true}
            setIsOpen={noop}
            chats={mockChats}
            currentMode="RUANG_KERJA"
            onSwitchMode={onSwitchMode}
            onNewChat={noop}
            onSelectChat={noop}
            onDeleteChat={noop}
            onUpdateTitle={noop}
            onTogglePin={noop}
            onToggleArchive={noop}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

    // In RUANG_KERJA mode, only RuangKerja chats are shown
    expect(screen.getByText('Review Jurnal IEEE AI')).toBeInTheDocument();
    expect(screen.queryByText('Curhat Cemas Skripsi')).not.toBeInTheDocument();
  });

  it('triggers delete confirmation popover without window.confirm', () => {
    const onDeleteChat = vi.fn();
    const noop = vi.fn();

    render(
      <ThemeProvider>
        <MemoryRouter>
          <Sidebar
            isOpen={true}
            setIsOpen={noop}
            chats={mockChats}
            onNewChat={noop}
            onSelectChat={noop}
            onDeleteChat={onDeleteChat}
            onUpdateTitle={noop}
            onTogglePin={noop}
            onToggleArchive={noop}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

    const deleteButtons = screen.getAllByLabelText('Hapus Percakapan');
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    // Popover question appears
    expect(screen.getByText(/Hapus obrolan ini\?/i)).toBeInTheDocument();
    
    // Confirm button inside popover
    const confirmBtn = screen.getByRole('button', { name: /^Hapus$/i });
    fireEvent.click(confirmBtn);

    expect(onDeleteChat).toHaveBeenCalled();
  });
});

