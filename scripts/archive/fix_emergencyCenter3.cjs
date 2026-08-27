const fs = require('fs');

let content = fs.readFileSync('src/components/EmergencyCenter.tsx', 'utf-8');
content = content.replace(/import \{ VERIFIED_HELPLINES \} from "\.\.\/lib\/crisisDetector";\n?/, '');
fs.writeFileSync('src/components/EmergencyCenter.tsx', content);

let crisis = fs.readFileSync('src/lib/crisisDetector.ts', 'utf-8');
crisis = crisis.replace(/import \{ VERIFIED_HELPLINES \} from '\.\/emergencyResources';/, 'export { VERIFIED_HELPLINES } from \'./emergencyResources\';');
fs.writeFileSync('src/lib/crisisDetector.ts', crisis);
