const fs = require('fs');

let content = fs.readFileSync('src/lib/crisisDetector.ts', 'utf-8');
content = content.replace(/export \{ VERIFIED_HELPLINES \} from '\.\/emergencyResources';/, 'import { VERIFIED_HELPLINES } from \'./emergencyResources\';\nexport { VERIFIED_HELPLINES };');
fs.writeFileSync('src/lib/crisisDetector.ts', content);

let emergency = fs.readFileSync('src/components/EmergencyCenter.tsx', 'utf-8');
if (!emergency.includes('VERIFIED_HELPLINES')) {
  emergency = emergency.replace(/import \{ EMERGENCY_CONTACTS \} from '\.\.\/lib\/emergencyResources';/, 'import { EMERGENCY_CONTACTS, VERIFIED_HELPLINES } from \'../lib/emergencyResources\';');
} else {
  // Just ensure VERIFIED_HELPLINES is imported
  if (!emergency.includes('import { VERIFIED_HELPLINES }')) {
    emergency = emergency.replace(/import \{ EMERGENCY_CONTACTS \} from '\.\.\/lib\/emergencyResources';/, 'import { EMERGENCY_CONTACTS, VERIFIED_HELPLINES } from \'../lib/emergencyResources\';');
  }
}
fs.writeFileSync('src/components/EmergencyCenter.tsx', emergency);

