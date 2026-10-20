import { describe, it, expect, beforeEach } from 'vitest';
import { safeLocalStorage } from '../../lib/storage';
import {
  createGuestChat,
  getGuestChats,
  getGuestMessages,
  saveGuestMessages,
  appendGuestMessage,
  updateGuestChatTitle,
  togglePinGuestChat,
  toggleArchiveGuestChat,
  deleteGuestChat,
  clearAllGuestChats,
  GUEST_CHATS_STORAGE_KEY,
  GUEST_MESSAGES_STORAGE_PREFIX
} from '../../lib/guestChatStorage';

describe('guestChatStorage', () => {
  beforeEach(() => {
    safeLocalStorage.clear();
  });

  it('creates and persists a new guest chat with snippet-based title', () => {
    const chat = createGuestChat('Halo RuangTenang, aku merasa sangat cemas hari ini.');
    expect(chat.id).toMatch(/^guest_/);
    expect(chat.title).toBe('Halo RuangTenang, aku merasa san...');
    expect(chat.workspaceMode).toBe('RUANG_TENANG');
    expect(chat.isPinned).toBe(false);

    const allChats = getGuestChats();
    expect(allChats.length).toBe(1);
    expect(allChats[0].id).toBe(chat.id);
  });

  it('stores and appends messages per guest chatId and updates updatedAt', () => {
    const chat = createGuestChat('Percakapan pertama');
    const initialUpdatedAt = chat.updatedAt;

    const userMsg = {
      id: 'msg_1',
      role: 'user' as const,
      content: 'Halo apa kabar?',
      createdAt: new Date().toISOString()
    };
    appendGuestMessage(chat.id, userMsg);

    const asstMsg = {
      id: 'msg_2',
      role: 'assistant' as const,
      content: 'Halo, saya baik. Ada yang bisa dibantu?',
      createdAt: new Date().toISOString()
    };
    appendGuestMessage(chat.id, asstMsg);

    const msgs = getGuestMessages(chat.id);
    expect(msgs.length).toBe(2);
    expect(msgs[0].content).toBe('Halo apa kabar?');
    expect(msgs[1].content).toBe('Halo, saya baik. Ada yang bisa dibantu?');

    const updatedChats = getGuestChats();
    expect(updatedChats[0].updatedAt).toBeDefined();
  });

  it('renames, pins, and archives guest chats correctly', () => {
    const chat = createGuestChat('Obrolan A');

    updateGuestChatTitle(chat.id, 'Judul Baru');
    let chats = getGuestChats();
    expect(chats[0].title).toBe('Judul Baru');

    togglePinGuestChat(chat.id);
    chats = getGuestChats();
    expect(chats[0].isPinned).toBe(true);

    toggleArchiveGuestChat(chat.id, true);
    chats = getGuestChats();
    expect(chats[0].isArchived).toBe(true);
  });

  it('deletes a single guest chat and removes its stored messages', () => {
    const chat1 = createGuestChat('Chat 1');
    const chat2 = createGuestChat('Chat 2');

    appendGuestMessage(chat1.id, {
      id: 'm1',
      role: 'user',
      content: 'Pesan chat 1'
    });

    deleteGuestChat(chat1.id);

    const remainingChats = getGuestChats();
    expect(remainingChats.length).toBe(1);
    expect(remainingChats[0].id).toBe(chat2.id);

    const msgsChat1 = getGuestMessages(chat1.id);
    expect(msgsChat1.length).toBe(0);
  });

  it('clears all guest chats and messages', () => {
    const chat1 = createGuestChat('Chat 1');
    const chat2 = createGuestChat('Chat 2');
    appendGuestMessage(chat1.id, { id: 'm1', role: 'user', content: 'Halo 1' });
    appendGuestMessage(chat2.id, { id: 'm2', role: 'user', content: 'Halo 2' });

    clearAllGuestChats();

    expect(getGuestChats().length).toBe(0);
    expect(getGuestMessages(chat1.id).length).toBe(0);
    expect(getGuestMessages(chat2.id).length).toBe(0);
  });
});
