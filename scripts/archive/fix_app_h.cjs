const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/return \(\n\s*<div className="flex w-full bg-white text-slate-900 font-sans relative">/, 
  'return (\n    <div className="flex w-full h-[100dvh] bg-white text-slate-900 font-sans relative overflow-hidden">');
fs.writeFileSync('src/App.tsx', content);
