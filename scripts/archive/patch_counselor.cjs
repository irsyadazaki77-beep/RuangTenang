const fs = require('fs');
let content = fs.readFileSync('server/routes/counselorChat.ts', 'utf-8');

content = content.replace(
  /tier: 'PRIMARY'/g,
  `userTier: (req.user as any)?.tier || 'Free',\n        requestedModelId: 'gemini-3.7-flash'`
);

fs.writeFileSync('server/routes/counselorChat.ts', content);
