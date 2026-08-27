const fs = require('fs');

let content = fs.readFileSync('src/lib/crisisDetector.ts', 'utf-8');

// Find the start of the array
const startIndex = content.indexOf('export const VERIFIED_HELPLINES: VerifiedHelpline[] = [');
if (startIndex !== -1) {
  // Find the end of the array. It ends with "];\n\nexport const EMERGENCY_HELPLINES = VERIFIED_HELPLINES;"
  const endIndex = content.indexOf('];', startIndex);
  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex + 2);
  }
}

fs.writeFileSync('src/lib/crisisDetector.ts', content);
