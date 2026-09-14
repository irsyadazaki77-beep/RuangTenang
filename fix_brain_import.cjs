const fs = require('fs');

let content = fs.readFileSync('src/features/chat/components/MessageBubble.tsx', 'utf8');

if (!content.includes('import { Brain')) {
    if (content.includes('import { Check')) {
        content = content.replace('import { Check', 'import { Check, Brain');
    } else {
        content = `import { Brain } from 'lucide-react';\n` + content;
    }
    fs.writeFileSync('src/features/chat/components/MessageBubble.tsx', content);
    console.log("Added Brain to imports");
} else {
    console.log("Brain already imported");
}
