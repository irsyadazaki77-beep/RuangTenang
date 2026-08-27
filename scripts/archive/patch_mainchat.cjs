const fs = require('fs');
let content = fs.readFileSync('src/features/chat/components/MainChat.tsx', 'utf-8');

content = content.replace(
  /\{AVAILABLE_AI_MODELS\.filter\(m => m\.category === 'Gemini 3\.x Series'\)\.map\(m => \(/g,
  `{AVAILABLE_AI_MODELS.filter(m => m.category === 'Gemini 3.x Series' && m.allowedTiers.includes(user?.tier || 'Free')).map(m => (`
);

content = content.replace(
  /\{AVAILABLE_AI_MODELS\.filter\(m => m\.category === 'Gemini 2\.5 Series'\)\.map\(m => \(/g,
  `{AVAILABLE_AI_MODELS.filter(m => m.category === 'Gemini 2.5 Series' && m.allowedTiers.includes(user?.tier || 'Free')).map(m => (`
);

fs.writeFileSync('src/features/chat/components/MainChat.tsx', content);
