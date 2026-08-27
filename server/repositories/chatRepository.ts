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
      select: { id: true, title: true, isPinned: true, isArchived: true, updatedAt: true }
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
