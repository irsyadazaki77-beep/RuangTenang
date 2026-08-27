const fs = require('fs');
let content = fs.readFileSync('server/routes/chat.ts', 'utf-8');

// Replace history logic
content = content.replace(
  /const history = await prisma\.chatMessages\.findMany\(\{\s*where: \{ chatId: currentChatId \},\s*orderBy: \{ createdAt: 'asc' \},\s*take: 20 \/\/ Maintain healthy context window\s*\}\);/gs,
  `let history = await prisma.chatMessages.findMany({
        where: { chatId: currentChatId },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      history.reverse();`
);

content = content.replace(/import \{ getAiClient, DEFAULT_AI_MODEL, AVAILABLE_AI_MODELS \} from '\.\.\/config\/aiConfig\.js';/, `import { getAiClient, DEFAULT_AI_MODEL } from '../config/aiConfig.js';\nimport { AVAILABLE_AI_MODELS } from '../services/ai/aiModelRegistry.js';`);

fs.writeFileSync('server/routes/chat.ts', content);
