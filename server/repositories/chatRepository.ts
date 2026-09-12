import { prisma } from "../database";

const HARD_MAX_PAGE_SIZE = 100;
const MAX_CHATS_PROCESSED_FOR_SEARCH = 500;
const SEARCH_RESULT_CAP = 50;

export const chatRepository = {
  async getUserChats(userId: string, limit = 100, offset = 0) {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);
    return await prisma.chats.findMany({
      where: { userId },
      orderBy: [
        { isPinned: "desc" },
        { updatedAt: "desc" },
        { id: "desc" }
      ],
      take,
      skip: offset,
      select: { 
        id: true, 
        title: true, 
        isPinned: true, 
        isArchived: true, 
        parentChatId: true,
        branchedFromMessageId: true,
        summary: true,
        useMemory: true,
        updatedAt: true 
      }
    });
  },

  async getChatMessages(chatId: string, limit = 50, cursor?: string) {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);
    
    return await prisma.chatMessages.findMany({
      where: { chatId },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
      ],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
  },

  async updateTitle(chatId: string, encryptedTitle: string) {
    return await prisma.chats.update({
      where: { id: chatId },
      data: { title: encryptedTitle }
    });
  },

  async findChatById(chatId: string) {
    return await prisma.chats.findUnique({
      where: { id: chatId }
    });
  },

  async updatePinStatus(chatId: string, isPinned: boolean) {
    return await prisma.chats.update({
      where: { id: chatId },
      data: { isPinned }
    });
  },

  async updateArchiveStatus(chatId: string, isArchived: boolean) {
    return await prisma.chats.update({
      where: { id: chatId },
      data: { isArchived }
    });
  },

  async deleteChat(chatId: string) {
    return await prisma.chats.delete({
      where: { id: chatId }
    });
  },

  async getChatSummary(chatId: string) {
    const chat = await prisma.chats.findUnique({
      where: { id: chatId },
      select: { summary: true }
    });
    return chat?.summary || null;
  },

  async saveChatSummary(chatId: string, summary: string) {
    return await prisma.chats.update({
      where: { id: chatId },
      data: { summary }
    });
  },

  async updateChatMemoryPreference(chatId: string, useMemory: boolean) {
    return await prisma.chats.update({
      where: { id: chatId },
      data: { useMemory }
    });
  },

  async getUserBookmarks(userId: string) {
    return await prisma.messageBookmarks.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        chat: {
          select: { id: true, title: true }
        },
        message: {
          select: { id: true, role: true, content: true, createdAt: true }
        }
      }
    });
  },

  async addBookmark(userId: string, chatId: string, messageId: string) {
    return await prisma.messageBookmarks.upsert({
      where: {
        userId_messageId: {
          userId,
          messageId
        }
      },
      update: {},
      create: {
        id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        chatId,
        messageId
      }
    });
  },

  async removeBookmark(userId: string, messageId: string) {
    return await prisma.messageBookmarks.deleteMany({
      where: {
        userId,
        messageId
      }
    });
  },

  async getUserBookmarkedMessageIds(userId: string, chatId?: string) {
    const bookmarks = await prisma.messageBookmarks.findMany({
      where: { 
        userId,
        ...(chatId ? { chatId } : {})
      },
      select: { messageId: true }
    });
    return bookmarks.map(b => b.messageId);
  },

  async getChatsForSearch(userId: string) {
    // Safety cap to prevent memory exhaustion
    return await prisma.chats.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: MAX_CHATS_PROCESSED_FOR_SEARCH,
      select: { id: true, title: true, isPinned: true, isArchived: true, updatedAt: true }
    });
  }
};
export { SEARCH_RESULT_CAP };
