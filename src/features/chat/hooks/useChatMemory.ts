import { useState, useEffect } from 'react';
import { Chat } from '../types';

export function useChatMemory(currentChat: Chat | undefined) {
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [useMemoryForChat, setUseMemoryForChat] = useState(true);

  useEffect(() => {
    if (currentChat) {
      setUseMemoryForChat(currentChat.useMemory !== false);
    }
  }, [currentChat]);

  return {
    isMemoryModalOpen,
    setIsMemoryModalOpen,
    useMemoryForChat,
    setUseMemoryForChat
  };
}
