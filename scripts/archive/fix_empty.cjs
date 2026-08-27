const fs = require('fs');
let content = fs.readFileSync('src/features/chat/components/EmptyChatState.tsx', 'utf-8');
content = content.replace(/Apa yang sedang<br\/>kamu pikirkan,<br\/>\{userName \|\| 'Mahasiswa'\}\?/, 'Apa yang sedang kamu pikirkan, {userName || "Mahasiswa"}?');
content = content.replace(/text-\[26px\] leading-\[1\.15\]/, 'text-2xl md:text-[28px] leading-tight');
content = content.replace(/pt-7 pb-5/, 'pt-4 pb-4 md:pt-8 md:pb-6');
fs.writeFileSync('src/features/chat/components/EmptyChatState.tsx', content);
