const fs = require('fs');
let content = fs.readFileSync('src/features/settings/SettingsPage.tsx', 'utf-8');
content = content.replace(/className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm/g, 'className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm min-h-[44px]');
fs.writeFileSync('src/features/settings/SettingsPage.tsx', content);
