const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf-8');
content = content.replace(/opacity-0 group-hover:opacity-100/g, 'md:opacity-0 md:group-hover:opacity-100 opacity-100 focus-within:opacity-100');
fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
