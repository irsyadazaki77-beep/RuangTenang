const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf-8');
content = content.replace(/<div className="flex-1 overflow-y-auto min-w-0">/, '<div className="flex-1 overflow-y-auto min-w-0 safe-area-bottom">');
fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
