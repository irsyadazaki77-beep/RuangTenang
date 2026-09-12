const fs = require('fs');
let c = fs.readFileSync('src/features/appointments/CounselorChatSimulation.tsx', 'utf8');
c = c.replace(/catch \(e\)/g, "catch");
c = c.replace(/savedChatKey = null/g, "_savedChatKey = null");
c = c.replace(/savedChatKey = `chat_` \+ id/g, "_savedChatKey = `chat_` + id");
c = c.replace(/const savedChatKey = null;/g, "const _savedChatKey = null;");
c = c.replace(/let savedChatKey = null;/g, "let _savedChatKey = null;");
fs.writeFileSync('src/features/appointments/CounselorChatSimulation.tsx', c);
