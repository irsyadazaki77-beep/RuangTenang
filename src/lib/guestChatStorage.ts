import { safeLocalStorage } from './storage';
import type { Chat, Message } from '../features/chat/types';

export const GUEST_CHATS_STORAGE_KEY = 'ruangtenang_guest_chats';
export const GUEST_MESSAGES_STORAGE_PREFIX = 'ruangtenang_guest_messages_';
export const GUEST_CHATS_UPDATED_EVENT = 'ruangtenang_guest_chats_updated';

function notifyGuestChatsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GUEST_CHATS_UPDATED_EVENT));
  }
}

export function getGuestChats(): Chat[] {
  try {
    const raw = safeLocalStorage.getItem(GUEST_CHATS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  } catch (err) {
    console.warn('[GUEST_STORAGE] Failed to load guest chats:', err);
    return [];
  }
}

export function saveGuestChats(chats: Chat[]): void {
  try {
    safeLocalStorage.setItem(GUEST_CHATS_STORAGE_KEY, JSON.stringify(chats));
    notifyGuestChatsUpdated();
  } catch (err) {
    console.warn('[GUEST_STORAGE] Failed to save guest chats:', err);
  }
}

export function createGuestChat(firstMessageSnippet?: string): Chat {
  const timestamp = Date.now();
  const id = `guest_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;

  let title = 'Percakapan Tamu';
  if (firstMessageSnippet && firstMessageSnippet.trim()) {
    const clean = firstMessageSnippet.trim().replace(/\s+/g, ' ');
    title = clean.length > 32 ? clean.substring(0, 32) + '...' : clean;
  }

  const newChat: Chat = {
    id,
    title,
    isPinned: false,
    isArchived: false,
    workspaceMode: 'RUANG_TENANG',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existingChats = getGuestChats();
  const updatedChats = [newChat, ...existingChats];
  saveGuestChats(updatedChats);

  return newChat;
}

export function getGuestMessages(chatId: string): Message[] {
  if (!chatId) return [];
  try {
    const raw = safeLocalStorage.getItem(`${GUEST_MESSAGES_STORAGE_PREFIX}${chatId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`[GUEST_STORAGE] Failed to load messages for ${chatId}:`, err);
    return [];
  }
}

export function saveGuestMessages(chatId: string, messages: Message[]): void {
  if (!chatId) return;
  try {
    safeLocalStorage.setItem(`${GUEST_MESSAGES_STORAGE_PREFIX}${chatId}`, JSON.stringify(messages));
  } catch (err) {
    console.warn(`[GUEST_STORAGE] Failed to save messages for ${chatId}:`, err);
  }
}

export function appendGuestMessage(chatId: string, message: Message): void {
  if (!chatId) return;
  const currentMessages = getGuestMessages(chatId);

  // Avoid duplicate message appending
  const exists = currentMessages.some(m => m.id === message.id);
  const updatedMessages = exists
    ? currentMessages.map(m => m.id === message.id ? message : m)
    : [...currentMessages, message];

  saveGuestMessages(chatId, updatedMessages);

  // Update chat updatedAt timestamp in the chat list
  const existingChats = getGuestChats();
  const chatIndex = existingChats.findIndex(c => c.id === chatId);
  if (chatIndex !== -1) {
    existingChats[chatIndex] = {
      ...existingChats[chatIndex],
      updatedAt: new Date().toISOString()
    };
    saveGuestChats(existingChats);
  }
}

export function updateGuestChatTitle(chatId: string, title: string): void {
  const existingChats = getGuestChats();
  const updated = existingChats.map(c => c.id === chatId ? { ...c, title, updatedAt: new Date().toISOString() } : c);
  saveGuestChats(updated);
}

export function togglePinGuestChat(chatId: string): void {
  const existingChats = getGuestChats();
  const updated = existingChats.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c);
  saveGuestChats(updated);
}

export function toggleArchiveGuestChat(chatId: string, isArchived: boolean): void {
  const existingChats = getGuestChats();
  const updated = existingChats.map(c => c.id === chatId ? { ...c, isArchived } : c);
  saveGuestChats(updated);
}

export function deleteGuestChat(chatId: string): void {
  const existingChats = getGuestChats();
  const filtered = existingChats.filter(c => c.id !== chatId);
  saveGuestChats(filtered);
  safeLocalStorage.removeItem(`${GUEST_MESSAGES_STORAGE_PREFIX}${chatId}`);
}

export function clearAllGuestChats(): void {
  const existingChats = getGuestChats();
  for (const chat of existingChats) {
    safeLocalStorage.removeItem(`${GUEST_MESSAGES_STORAGE_PREFIX}${chat.id}`);
  }
  safeLocalStorage.removeItem(GUEST_CHATS_STORAGE_KEY);
  notifyGuestChatsUpdated();
}
