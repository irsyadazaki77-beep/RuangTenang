const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(/badge="Standar Medis"/g, 'badge="UNVERIFIED"');
content = content.replace(/Instrumen standar klinis untuk evaluasi tingkat stres, depresi, dan kecemasan/g, 'Instrumen skrining awal mandiri. BUKAN alat diagnosis medis.');

fs.writeFileSync('src/App.tsx', content);
