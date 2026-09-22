import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat } from '../../features/chat/types';
import { WorkspaceMode } from '../../features/workspace/types';
import { apiClient } from '../../lib/apiClient';
import { getNotifications } from '../../lib/notificationStore';
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  }, [search]);

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
          setIsCollapsed(prev => !prev);
        } else {
          setIsOpen(!isOpen);
        }
      } 
      // Focus Search (Cmd/Ctrl + K or forward slash '/')
      else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !isInput)) {
        e.preventDefault();
        setIsOpen(true);
        setIsCollapsed(false);
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
  }, [isOpen, setIsOpen, onNewChat, search]);

  // Lock body scroll on mobile when sidebar drawer is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

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
        id="ruangtenang-main-sidebar"
        className={`fixed lg:sticky lg:top-0 lg:h-[100dvh] inset-y-0 left-0 z-50 shrink-0 bg-[#f8fafc] dark:bg-[#121316] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col pt-safe pb-safe transform transition-all duration-200 ease-in-out select-none shadow-sm lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-[72px] w-[280px]' : 'w-[280px]'
        }`}
      >
        {/* Header (Brand Logo, Mode Switcher, + New Chat, Instant Search) */}
        <SidebarHeader
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
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
