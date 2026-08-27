const fs = require('fs');
let content = fs.readFileSync('src/components/EmergencyCenter.tsx', 'utf-8');

if (!content.includes('import { EMERGENCY_CONTACTS }')) {
  content = content.replace(
    /import \{ VERIFIED_HELPLINES \} from "\.\.\/lib\/crisisDetector";/,
    `import { VERIFIED_HELPLINES } from "../lib/crisisDetector";\nimport { EMERGENCY_CONTACTS } from '../lib/emergencyResources';`
  );
}

fs.writeFileSync('src/components/EmergencyCenter.tsx', content);
