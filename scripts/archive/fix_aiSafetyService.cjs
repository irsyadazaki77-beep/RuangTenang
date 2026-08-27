const fs = require('fs');

let content = fs.readFileSync('server/services/ai/aiSafetyService.ts', 'utf-8');
content = `import { EMERGENCY_CONTACTS } from '../../../src/lib/emergencyResources.js';\n` + content;
fs.writeFileSync('server/services/ai/aiSafetyService.ts', content);
