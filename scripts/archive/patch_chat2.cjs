const fs = require('fs');
let content = fs.readFileSync('server/routes/chat.ts', 'utf-8');

content = content.replace(
  /const aiRes = await aiRequestService\.generateStreamResponse\(\{\s*userId,\s*prompt: message \|\| pluginResult \|\| '',\s*history: messagesToSend,\s*systemInstruction,\s*tier: 'PRIMARY'\s*\}\);/gs,
  `const aiRes = await aiRequestService.generateStreamResponse({
           userId,
           userTier,
           requestedModelId: aiModel,
           prompt: message || pluginResult || '',
           history: messagesToSend,
           systemInstruction
       });`
);

content = content.replace(
  /const response = await aiRequestService\.generateChatResponse\(\{([\s\S]*?)tier: 'FAST'\s*\}\);/g,
  `const response = await aiRequestService.generateChatResponse({$1requestedModelId: 'gemini-3.1-flash-lite', userTier: 'Free'});`
);

fs.writeFileSync('server/routes/chat.ts', content);
