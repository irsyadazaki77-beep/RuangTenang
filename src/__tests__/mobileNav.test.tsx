import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';

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
    );

    expect(screen.getByText(/RuangTenang V2/i)).toBeInTheDocument();
  });
});
