const fs = require('fs');
let content = fs.readFileSync('src/features/chat/types.ts', 'utf-8');

content = content.replace(/export interface Message \{/, 'export interface Message {\n  isEdited?: boolean;');

fs.writeFileSync('src/features/chat/types.ts', content);
