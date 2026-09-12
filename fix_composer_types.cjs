const fs = require('fs');

const path = 'src/features/chat/components/ChatComposer.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "onSend: (msg: string, plugin?: string) => void;",
  "onSend: (msg: string, plugin?: string, attachments?: any[]) => void;"
);

fs.writeFileSync(path, content);
console.log('Fixed onSend type');
