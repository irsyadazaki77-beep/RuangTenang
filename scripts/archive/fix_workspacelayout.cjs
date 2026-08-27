const fs = require('fs');
let content = fs.readFileSync('src/components/layout/WorkspaceLayout.tsx', 'utf-8');
content = content.replace(/className="flex-1 flex flex-col bg-slate-50\/50 relative min-w-0"/, 'className="flex-1 flex flex-col bg-slate-50/50 relative min-w-0 overflow-y-auto"');
fs.writeFileSync('src/components/layout/WorkspaceLayout.tsx', content);
