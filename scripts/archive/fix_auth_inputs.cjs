const fs = require('fs');
let content = fs.readFileSync('src/features/authentication/AuthModal.tsx', 'utf-8');
content = content.replace(/text-sm text-slate-900/g, 'text-base sm:text-sm text-slate-900 min-h-[44px]');
fs.writeFileSync('src/features/authentication/AuthModal.tsx', content);
