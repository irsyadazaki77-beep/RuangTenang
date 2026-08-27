const fs = require('fs');
let content = fs.readFileSync('src/features/chat/components/ChatComposer.tsx', 'utf-8');
content = content.replace(/text-\[15px\]/g, 'text-[16px]'); // prevent iOS zoom
content = content.replace(/safe-area-bottom/g, 'pb-[max(env(safe-area-inset-bottom),_0.75rem)]'); // add safe area inset
fs.writeFileSync('src/features/chat/components/ChatComposer.tsx', content);
