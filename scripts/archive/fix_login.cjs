const fs = require('fs');
let content = fs.readFileSync('src/features/authentication/components/LoginForm.tsx', 'utf-8');
content = content.replace(/className="w-full pl-9 pr-3 py-2\.5 text-sm/g, 'className="w-full pl-9 pr-3 py-2.5 text-base sm:text-sm min-h-[44px]');
fs.writeFileSync('src/features/authentication/components/LoginForm.tsx', content);
