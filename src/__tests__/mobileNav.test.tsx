import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('Mobile Navigation Drawer Unit Tests', () => {
  it('renders sidebar drawer when isOpen is true', () => {
    const setIsOpen = vi.fn();
    const onNewChat = vi.fn();
    const onSelectChat = vi.fn();
    const onDeleteChat = vi.fn();
    const onUpdateTitle = vi.fn();
    const onTogglePin = vi.fn();
    const onToggleArchive = vi.fn();

    render(
      <ThemeProvider>
        <MemoryRouter>
          <Sidebar
            isOpen={true}
            setIsOpen={setIsOpen}
            chats={[]}
            onNewChat={onNewChat}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            onUpdateTitle={onUpdateTitle}
            onTogglePin={onTogglePin}
            onToggleArchive={onToggleArchive}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /Mulai Chat Baru/i })).toBeInTheDocument();
  });
});
