const fs = require('fs');
const path = 'server/routes/chat.ts';

let content = fs.readFileSync(path, 'utf8');

// Add attachments to destructuring
content = content.replace(
  "aiModel = DEFAULT_AI_MODEL\n    } = req.body;",
  "aiModel = DEFAULT_AI_MODEL,\n      attachments\n    } = req.body;"
);

// Save attachments in DB when creating message
content = content.replace(
  "id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,\n              chatId: currentChatId,\n              role: 'user',\n              content: encryptionService.encryptSensitive(cleanMessage) || cleanMessage\n            }",
  "id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,\n              chatId: currentChatId,\n              role: 'user',\n              content: encryptionService.encryptSensitive(cleanMessage) || cleanMessage\n            }\n          });\n          \n          if (attachments && Array.isArray(attachments) && attachments.length > 0) {\n            for (const att of attachments) {\n              try {\n                await prisma.attachments.create({\n                  data: {\n                    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,\n                    messageId: msgResult.id,\n                    chatId: currentChatId,\n                    userId: userId,\n                    filename: att.filename.substring(0, 255),\n                    mimeType: att.mimeType.substring(0, 100),\n                    size: att.size || 0,\n                    data: att.base64 || ''\n                  }\n                });\n              } catch (e) { console.error('Failed to save attachment', e); }\n            }\n          }"
);
content = content.replace(
  "await prisma.chatMessages.create({\n            data: {\n              id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,\n              chatId: currentChatId,\n              role: 'user',\n              content: encryptionService.encryptSensitive(cleanMessage) || cleanMessage\n            }\n          });",
  "const msgResult = await prisma.chatMessages.create({\n            data: {\n              id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,\n              chatId: currentChatId,\n              role: 'user',\n              content: encryptionService.encryptSensitive(cleanMessage) || cleanMessage\n            }\n          });\n          \n          if (attachments && Array.isArray(attachments) && attachments.length > 0) {\n            for (const att of attachments) {\n              try {\n                await prisma.attachments.create({\n                  data: {\n                    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,\n                    messageId: msgResult.id,\n                    chatId: currentChatId,\n                    userId: userId,\n                    filename: att.filename.substring(0, 255),\n                    mimeType: att.mimeType.substring(0, 100),\n                    size: att.size || 0,\n                    data: att.base64 || ''\n                  }\n                });\n              } catch (e) { console.error('Failed to save attachment', e); }\n            }\n          }"
);

// Pass attachments to history
content = content.replace(
  "pluginResult,\n        isStreaming: true,",
  "pluginResult,\n        attachments,\n        isStreaming: true,"
);

fs.writeFileSync(path, content);
console.log('Modified chat.ts');
