const fs = require('fs');
let content = fs.readFileSync('src/features/chat/components/MessageBubble.tsx', 'utf-8');
content = content.replace(/className="prose prose-slate max-w-none/g, 'className="prose prose-slate max-w-none break-words overflow-hidden');
fs.writeFileSync('src/features/chat/components/MessageBubble.tsx', content);
