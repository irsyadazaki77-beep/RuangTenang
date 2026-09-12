const fs = require('fs');
const path = 'src/features/chat/components/ChatComposer.tsx';

let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "if (draft) setInput(draft);\n  }, [chatId]);",
  "if (draft) setInput(draft);\n    setAttachments([]); // Clear attachments when switching chat\n  }, [chatId]);"
);

fs.writeFileSync(path, content);
console.log('Fixed composer attachment state on chat switch');
