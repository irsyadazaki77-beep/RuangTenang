const fs = require('fs');
let content = fs.readFileSync('server/routes/emergency.ts', 'utf-8');

content = content.replace(
  /await aiModelRouter\.executeWithFallback\('FAST',\s*async \(modelName\) =>/g,
  `await aiModelRouter.executeWithFallback('gemini-3.1-flash-lite', 'Free', async (modelName) =>`
);

fs.writeFileSync('server/routes/emergency.ts', content);
