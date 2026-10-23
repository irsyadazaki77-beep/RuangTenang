import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat } from '../../features/chat/types';
import { WorkspaceMode } from '../../features/workspace/types';
import { apiClient } from '../../lib/apiClient';
import { getNotifications } from '../../lib/notificationStore';
import { safeLocalStorage } from '../../lib/storage';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { SidebarChatList } from './sidebar/SidebarChatList';
import { SidebarNavLinks } from './sidebar/SidebarNavLinks';
import { SidebarFooter } from './sidebar/SidebarFooter';

export interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNewChat: () => void;
  chats: Chat[];
  currentChatId?: string;
  currentMode?: WorkspaceMode;
  onSwitchMode?: (mode: WorkspaceMode) => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
  onOpenChangelog?: () => void;
  onOpenNotifications?: () => void;
  user?: any;
  isLoading?: boolean;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  onNewChat,
  chats,
  currentChatId,
  currentMode = 'RUANG_TENANG',
  onSwitchMode,
  onSelectChat,
  onDeleteChat,
  onUpdateTitle,
  onTogglePin,
  onToggleArchive,
  onLogout,
  onOpenSettings,
  onOpenAuth,
  onOpenNotifications,
  user,
  isLoading
}: SidebarProps) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = safeLocalStorage.getItem('ruangtenang_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        safeLocalStorage.setItem('ruangtenang_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const sidebarRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Responsive breakpoint tracking
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Sync unread notifications count
  useEffect(() => {
    const updateUnread = () => {
      try {
        const list = getNotifications();
        setUnreadNotificationsCount(list.filter(n => !n.read).length);
      } catch (err) {
        console.warn(err);
      }
    };
    updateUnread();
    window.addEventListener('ruangtenang_notifications_updated', updateUnread);
    return () => window.removeEventListener('ruangtenang_notifications_updated', updateUnread);
  }, []);

  // Real-time server search with debouncing
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    if (!user || user.role === 'guest') {
      const q = search.trim().toLowerCase();
      const matched = chats.filter(c => c.title.toLowerCase().includes(q));
      setSearchResults(matched);
      return;
    }

    let isCancelled = false;
    const delay = setTimeout(() => {
      apiClient.get(`/api/v1/chat/search?q=${encodeURIComponent(search.trim())}`)
        .then(res => {
          if (!isCancelled) {
            if (res.success && Array.isArray(res.data)) {
              setSearchResults(res.data);
            } else {
              setSearchResults([]);
            }
          }
        })
        .catch(err => {
          if (!isCancelled) {
            console.error('Failed to search chats:', err);
            setSearchResults([]);
          }
        });
    }, 250);
    return () => {
      isCancelled = true;
      clearTimeout(delay);
    };
  }, [search, chats, user]);

  // Global keyboard shortcuts: Cmd+B (collapse/toggle), Cmd+K or / (search), Cmd+N (new chat), Esc (close)
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;

      // Toggle Sidebar (Cmd/Ctrl + B)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        // On desktop toggle collapsed; on mobile toggle isOpen
        if (window.innerWidth >= 1024) {
          toggleCollapsed();
        } else {
          setIsOpen(!isOpen);
        }
      }
      // Focus Search via Cmd/Ctrl + K or forward slash '/'
      else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !isInput)) {
        e.preventDefault();
        setIsOpen(true);
        if (isCollapsed) {
          setIsCollapsed(false);
          try {
            safeLocalStorage.setItem('ruangtenang_sidebar_collapsed', 'false');
          } catch {}
        }
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      // New Chat (Cmd/Ctrl + N)
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        if (!isInput) {
          e.preventDefault();
          onNewChat();
          if (window.innerWidth < 1024) setIsOpen(false);
        }
      }
      // Escape
      else if (e.key === 'Escape') {
        if (search) {
          setSearch('');
        } else if (isOpen && window.innerWidth < 1024) {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, setIsOpen, onNewChat, search, isCollapsed]);

  // Mobile drawer focus containment and focus restoration
  useEffect(() => {
    if (!isMobile) return;

    if (isOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      const handleTrapTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !sidebarRef.current) return;
        const focusable = Array.from(
          sidebarRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(
          (el) =>
            !el.hasAttribute('hidden') &&
            el.getAttribute('aria-hidden') !== 'true' &&
            el.getClientRects().length > 0
        );

        if (focusable.length === 0) {
          e.preventDefault();
          sidebarRef.current.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === first || !sidebarRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !sidebarRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTrapTab);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleTrapTab);
        document.body.style.overflow = originalOverflow;
        previousFocusRef.current?.focus?.();
      };
    }
  }, [isOpen, isMobile]);

  const handleSwitchModeAndNavigate = (mode: WorkspaceMode) => {
    onSwitchMode?.(mode);
    if (mode === 'RUANG_KERJA') {
      navigate('/workspace');
    } else {
      navigate('/');
    }
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const handleNewChatWrapped = () => {
    onNewChat();
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const handleSelectChatWrapped = (id: string) => {
    onSelectChat(id);
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* 1. Mobile Backdrop Blur Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200 animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 2. Main Sidebar Container */}
      <aside
        ref={sidebarRef as any}
        id="ruangtenang-main-sidebar"
        inert={isMobile && !isOpen ? true : undefined}
        aria-hidden={isMobile && !isOpen ? true : undefined}
        className={`fixed lg:sticky lg:top-0 lg:h-[100dvh] inset-y-0 left-0 z-50 shrink-0 bg-[var(--color-surface-sidebar-light)] dark:bg-[var(--color-surface-sidebar-dark)] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col overflow-y-auto lg:overflow-y-hidden pt-safe pb-safe transform transition-all duration-200 ease-in-out select-none shadow-sm lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-[72px] w-[280px]' : 'w-[280px] lg:w-[272px]'
        }`}
      >
        {/* Header (Brand Logo, Mode Switcher, + New Chat, Instant Search) */}
        <SidebarHeader
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapsed}
          onCloseMobile={() => setIsOpen(false)}
          currentMode={currentMode}
          onSwitchMode={handleSwitchModeAndNavigate}
          onNewChat={handleNewChatWrapped}
          search={search}
          onSearchChange={setSearch}
          searchInputRef={searchInputRef}
          showArchived={showArchived}
          onToggleArchiveView={() => setShowArchived(prev => !prev)}
        />

        {/* Chat History (Grouped, Searchable, Inline Rename, Pinned, Popover Delete) */}
        <SidebarChatList
          isCollapsed={isCollapsed}
          chats={chats}
          currentChatId={currentChatId}
          currentMode={currentMode}
          search={search}
          searchResults={searchResults}
          isLoading={isLoading}
          showArchived={showArchived}
          onToggleArchiveView={() => setShowArchived(false)}
          onSelectChat={handleSelectChatWrapped}
          onDeleteChat={onDeleteChat}
          onUpdateTitle={onUpdateTitle}
          onTogglePin={onTogglePin}
          onToggleArchive={onToggleArchive}
        />

        {/* Ecosystem Nav Links (Mental Health & Academic Tools) */}
        <SidebarNavLinks
          isCollapsed={isCollapsed}
          currentMode={currentMode}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={onOpenNotifications}
          onCloseMobile={() => setIsOpen(false)}
          onSwitchMode={handleSwitchModeAndNavigate}
        />

        {/* User Profile, Theme & Emergency SOS Footer */}
        <SidebarFooter
          isCollapsed={isCollapsed}
          user={user}
          onOpenSettings={onOpenSettings}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          onCloseMobile={() => setIsOpen(false)}
        />
      </aside>
    </>
  );
}
