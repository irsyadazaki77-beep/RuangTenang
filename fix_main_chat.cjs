const fs = require('fs');
const path = 'src/features/chat/components/MainChat.tsx';

let content = fs.readFileSync(path, 'utf8');

// Modify handleSend signature
content = content.replace(
  "const handleSend = async (content: string, pluginResult?: string) => {",
  "const handleSend = async (content: string, pluginResult?: string, attachments?: any[]) => {"
);

// Modify early return condition
content = content.replace(
  "if (!content.trim() && !pluginResult) return;",
  "if (!content.trim() && !pluginResult && (!attachments || attachments.length === 0)) return;"
);

// Add attachments to temp message
content = content.replace(
  "setMessages(prev => [...prev, { id: tempId, role: 'user', content }]);",
  "setMessages(prev => [...prev, { id: tempId, role: 'user', content, attachments: attachments ? attachments.map(a => ({ id: a.id, filename: a.file.name, mimeType: a.file.type, size: a.file.size, data: a.base64 })) : undefined }]);"
);

// Add attachments to streamMessage payload
content = content.replace(
  "aiModel\n      },",
  "aiModel,\n        attachments: attachments ? attachments.map(a => ({ filename: a.file.name, mimeType: a.file.type, size: a.file.size, base64: a.base64 })) : undefined\n      },"
);

// We should also render attachments in MessageBubble
// but first save MainChat
fs.writeFileSync(path, content);
console.log('Modified MainChat.tsx');
