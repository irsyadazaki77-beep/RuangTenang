const fs = require('fs');

let content = fs.readFileSync('src/lib/crisisDetector.ts', 'utf-8');
content = content.replace(/119 Ext 8 \/ LISA Helpline/g, 'Layanan Kemenkes / LISA Helpline');
content = content.replace(/119 Ext 8 \/ LISA/g, 'Layanan Darurat Nasional / LISA');
content = content.replace(/119 Ext 8/g, 'Hotline Kemenkes 119');

fs.writeFileSync('src/lib/crisisDetector.ts', content);
