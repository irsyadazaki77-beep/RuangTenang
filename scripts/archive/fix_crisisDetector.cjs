const fs = require('fs');

let content = fs.readFileSync('src/lib/crisisDetector.ts', 'utf-8');

// Remove the import from the middle
content = content.replace(/import \{ VERIFIED_HELPLINES \} from '\.\/emergencyResources';\n?/g, '');

// If not at the top, add it
if (!content.includes('import { VERIFIED_HELPLINES } from \'./emergencyResources\';')) {
  content = content.replace(
    /import \{ VerifiedHelpline \} from '\.\.\/types';/,
    `import { VerifiedHelpline } from '../types';\nimport { VERIFIED_HELPLINES } from './emergencyResources';`
  );
}

fs.writeFileSync('src/lib/crisisDetector.ts', content);
