const fs = require('fs');
const path = 'server/routes/chat.ts';

let content = fs.readFileSync(path, 'utf8');

// The msgResult variable is scoped inside the block. We need to hoist it.
// Actually, since we only need to skip the last message if it's the exact same prompt, let's just pop it if it matches, or easier:
// let's hoist `msgResult` ID.

content = content.replace("let activeIsTemporary = isTemporary === true;", "let activeIsTemporary = isTemporary === true;\n    let currentMessageId: string | undefined;");

content = content.replace("const msgResult = await prisma.chatMessages.create({", "const msgResult = await prisma.chatMessages.create({\n");
content = content.replace("id: msgResult.id,", "id: msgResult.id,");
// We can just capture currentMessageId inside the block:
content = content.replace("const msgResult = await prisma.chatMessages.create({", "const msgResult = await prisma.chatMessages.create({");
content = content.replace("if (attachments && Array.isArray(attachments) && attachments.length > 0) {", "currentMessageId = msgResult.id;\n          if (attachments && Array.isArray(attachments) && attachments.length > 0) {");

content = content.replace("for (const msg of history) {", "for (const msg of history) {\n          if (msg.id === currentMessageId) continue; // Skip duplicating the current prompt");

fs.writeFileSync(path, content);
console.log('Fixed duplicated prompt in history');
