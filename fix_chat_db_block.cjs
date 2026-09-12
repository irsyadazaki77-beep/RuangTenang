const fs = require('fs');
const path = 'server/routes/chat.ts';

let content = fs.readFileSync(path, 'utf8');

const oldBlock = `        if (!pluginResult) {
          const msgResult = await prisma.chatMessages.create({
            data: {
              id: \`msg_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
              chatId: currentChatId,
              role: 'user',
              content: encryptionService.encryptSensitive(cleanMessage) || cleanMessage
            }
          });
          
          if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            for (const att of attachments) {
              try {
                await prisma.attachments.create({
                  data: {
                    id: \`att_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`,
                    messageId: msgResult.id,
                    chatId: currentChatId,
                    userId: userId,
                    filename: att.filename.substring(0, 255),
                    mimeType: att.mimeType.substring(0, 100),
                    size: att.size || 0,
                    data: att.base64 || ''
                  }
                });
              } catch (e) { console.error('Failed to save attachment', e); }
            }
          }
          
          if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            for (const att of attachments) {
              try {
                await prisma.attachments.create({
                  data: {
                    id: \`att_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`,
                    messageId: msgResult.id,
                    chatId: currentChatId,
                    userId: userId,
                    filename: att.filename.substring(0, 255),
                    mimeType: att.mimeType.substring(0, 100),
                    size: att.size || 0,
                    data: att.base64 || ''
                  }
                });
              } catch (e) { console.error('Failed to save attachment', e); }
            }
          }
          });
          await prisma.chats.update({
            where: { id: currentChatId },
            data: { updatedAt: new Date() }
          });
        } else {
          await prisma.chatMessages.create({
            data: {
               id: \`msg_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
               chatId: currentChatId,
               role: 'user',
               content: encryptionService.encryptSensitive(pluginResult) || pluginResult,
               plugin: 'system_plugin_result'
            }
          });
        }`;

const newBlock = `        if (!pluginResult) {
          const msgResult = await prisma.chatMessages.create({
            data: {
              id: \`msg_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
              chatId: currentChatId,
              role: 'user',
              content: encryptionService.encryptSensitive(cleanMessage) || cleanMessage
            }
          });
          
          if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            for (const att of attachments) {
              try {
                await prisma.attachments.create({
                  data: {
                    id: \`att_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`,
                    messageId: msgResult.id,
                    chatId: currentChatId,
                    userId: userId,
                    filename: att.filename.substring(0, 255),
                    mimeType: att.mimeType.substring(0, 100),
                    size: att.size || 0,
                    data: att.base64 || ''
                  }
                });
              } catch (e) { console.error('Failed to save attachment', e); }
            }
          }
          
          await prisma.chats.update({
            where: { id: currentChatId },
            data: { updatedAt: new Date() }
          });
        } else {
          await prisma.chatMessages.create({
            data: {
               id: \`msg_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
               chatId: currentChatId,
               role: 'user',
               content: encryptionService.encryptSensitive(pluginResult) || pluginResult,
               plugin: 'system_plugin_result'
            }
          });
        }`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
} else {
  // Manual regex if exact string mismatch
  content = content.replace(/if \(!pluginResult\) \{[\s\S]*?\} else \{[\s\S]*?\}\n        \}/, newBlock);
}

fs.writeFileSync(path, content);
console.log('Fixed syntax error in chat.ts');
