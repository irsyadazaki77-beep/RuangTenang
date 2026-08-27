const fs = require('fs');
let content = fs.readFileSync('server/routes/chat.ts', 'utf-8');

// Replace history logic
content = content.replace(
  /const history = await prisma\.chatMessages\.findMany\(\{\s*where: \{ chatId: currentChatId \},\s*orderBy: \{ createdAt: 'asc' \},\s*take: 20.*?\s*\}\);/gs,
  `let history = await prisma.chatMessages.findMany({
        where: { chatId: currentChatId },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      history.reverse();`
);

// We should also look for other places where `take: 20` and `orderBy: { createdAt: 'asc' }` is used.
content = content.replace(
  /take: 20 \/\/ Maintain healthy context window/g,
  `take: 20`
);

// We need to change how it calls generateStreamResponse
// currently chat.ts might not be calling generateStreamResponse, let's see.
fs.writeFileSync('server/routes/chat.ts', content);
