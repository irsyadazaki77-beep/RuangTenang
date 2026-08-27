const fs = require('fs');
let content = fs.readFileSync('src/components/AiQuotaBadge.tsx', 'utf-8');
content = content.replace(/max-w-\[100px\] sm:max-w-none/g, 'max-w-[65px] sm:max-w-none');
content = content.replace(/✦ <strong className="font-bold">\{remaining\}<\/strong> Pesan/g, '✦ <strong className="font-bold">{remaining}</strong><span className="hidden sm:inline"> Pesan</span>');
fs.writeFileSync('src/components/AiQuotaBadge.tsx', content);
