const fs = require('fs');
const path = 'server/routes/chat.ts';

let content = fs.readFileSync(path, 'utf8');

// Include attachments in stream history
content = content.replace(
  "where: { chatId: currentChatId },\n          orderBy: { createdAt: 'desc' },\n          take: 20",
  "where: { chatId: currentChatId },\n          orderBy: { createdAt: 'desc' },\n          take: 20,\n          include: { attachments: true }"
);

// Map history attachments to messagesToSend
const mapHistoryOld = "messagesToSend.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: decryptedContent }] });";
const mapHistoryNew = `
            const parts: any[] = [{ text: decryptedContent }];
            if (msg.attachments && msg.attachments.length > 0) {
              msg.attachments.forEach(att => {
                if (att.data) {
                  const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
                  parts.push({
                    inlineData: {
                      data: base64Data,
                      mimeType: att.mimeType
                    }
                  });
                }
              });
            }
            messagesToSend.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
`;

content = content.replace(mapHistoryOld, mapHistoryNew);

fs.writeFileSync(path, content);
console.log('Fixed stream history attachments');
