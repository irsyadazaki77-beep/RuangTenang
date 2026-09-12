const fs = require('fs');
let text = fs.readFileSync('src/features/mood/TimelineTasks.tsx', 'utf8');
text = text.replace(/.finally\(\(\) => \);/g, '');
fs.writeFileSync('src/features/mood/TimelineTasks.tsx', text);
