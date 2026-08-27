const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/h-screen/g, 'h-[100dvh]');
fs.writeFileSync('src/App.tsx', content);
