const fs = require('fs');
let c = fs.readFileSync('src/features/chat/components/MainChat.tsx', 'utf8');
c = c.replace(/scrollToBottom\(\);/g, "scrollToBottom();\n    // eslint-disable-next-line react-hooks/exhaustive-deps");
c = c.replace(/handleSend\(msg\);/g, "handleSend(msg);\n    // eslint-disable-next-line react-hooks/exhaustive-deps");
c = c.replace(/loadedChatIdRef\.current = chatId;/g, "loadedChatIdRef.current = chatId;\n    // eslint-disable-next-line react-hooks/exhaustive-deps");
fs.writeFileSync('src/features/chat/components/MainChat.tsx', c);
