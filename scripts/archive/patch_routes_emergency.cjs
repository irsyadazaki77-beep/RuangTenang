const fs = require('fs');

let content = fs.readFileSync('server/routes/emergency.ts', 'utf-8');
content = content.replace(/119 Ext 8/g, 'Hotline Kemenkes 119');
fs.writeFileSync('server/routes/emergency.ts', content);

let testContent = fs.readFileSync('server/aiGovernance.test.ts', 'utf-8');
testContent = testContent.replace(/119 Ext 8/g, 'Hotline Kemenkes 119');
fs.writeFileSync('server/aiGovernance.test.ts', testContent);
