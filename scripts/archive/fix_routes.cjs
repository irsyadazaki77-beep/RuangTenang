const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

// Remove duplicate legacy routes
content = content.replace(/ {2}app\.use\('\/api\/auth', authRouter\);\n/, '');
content = content.replace(/ {2}app\.use\('\/api\/appointments', appointmentsRouter\);\n/, '');
content = content.replace(/ {2}app\.use\('\/api\/screenings', screeningRouter\);\n/, '');
content = content.replace(/ {2}app\.use\('\/api\/privacy', privacyRouter\);\n/, '');

fs.writeFileSync('server.ts', content);
