const fs = require('fs');

let content = fs.readFileSync('src/features/chat/components/MainChat.tsx', 'utf-8');

const editMessageFn = `
  const handleEditMessage = async (msgId: string, newContent: string) => {
    if (!newContent.trim()) return;
    
    // Optimistic update
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx === -1) return prev;
      
      const updated = [...prev];
      updated[idx] = { ...updated[idx], content: newContent, isEdited: true };
      
      // Remove all messages after this one if it's the last user message before assistant
      // In a real app, this would fork the conversation, but here we just truncate.
      return updated.slice(0, idx + 1);
    });

    try {
      if (chatId) {
        await apiClient.post(\`/api/v1/chat/truncate-history\`, { chatId, messageId: msgId });
      }
      handleSend(newContent);
    } catch (err) {
      showToast('Gagal mengedit pesan', 'error');
      fetchMessages(); // Revert
    }
  };
`;

content = content.replace(/const handleCommand = async /, editMessageFn + '\n  const handleCommand = async ');

content = content.replace(/onOpenPlugin=\{handleOpenPlugin\}/, 'onOpenPlugin={handleOpenPlugin}\n                onEditMessage={handleEditMessage}');

content = content.replace(/if \(lastUser\) handleSend\(lastUser\.content\);/, 'if (lastUser) { if (chatId) handleEditMessage(lastUser.id, lastUser.content); else handleSend(lastUser.content); }');

fs.writeFileSync('src/features/chat/components/MainChat.tsx', content);
