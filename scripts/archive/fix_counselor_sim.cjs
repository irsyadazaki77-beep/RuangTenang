const fs = require('fs');
let content = fs.readFileSync('src/features/appointments/CounselorChatSimulation.tsx', 'utf-8');
content = content.replace(/text-sm focus:outline-none/g, 'text-base sm:text-sm focus:outline-none');
fs.writeFileSync('src/features/appointments/CounselorChatSimulation.tsx', content);
