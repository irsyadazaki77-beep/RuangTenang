const fs = require('fs');
const path = 'server/controllers/chatController.ts';

let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "orderBy: { createdAt: 'asc' }",
  "orderBy: { createdAt: 'asc' }, include: { attachments: true } // Fetch attachments"
);

// Map attachments to response
content = content.replace(
  "content: encryptionService.decryptSensitive(m.content) || m.content",
  "content: encryptionService.decryptSensitive(m.content) || m.content,\n          attachments: m.attachments ? m.attachments.map(a => ({ id: a.id, filename: a.filename, mimeType: a.mimeType, size: a.size, data: a.data })) : undefined"
);

fs.writeFileSync(path, content);
console.log('Modified ChatController.ts');
