const fs = require('fs');
let content = fs.readFileSync('src/features/screening/ScreeningModal.tsx', 'utf-8');

// Add clinical scoring imports
content = content.replace(
  /import \{ ScreeningResult \} from '\.\.\/\.\.\/types';/,
  `import { ScreeningResult } from '../../types';\nimport { getPhq9Severity, getGad7Severity, CLINICAL_DISCLAIMER } from '../../lib/clinicalScoring';`
);

// Replace severity logic inside calculateResults
content = content.replace(
  /const getPhqSeverity = [\s\S]*?const getGadSeverity = [\s\S]*?return 'Berat';\s*\};/,
  `const getPhqSeverity = getPhq9Severity;\n    const getGadSeverity = getGad7Severity;`
);

// Replace UI text
content = content.replace(
  /Berdasarkan evaluasi mandiri, tingkat depresi Anda termasuk kategori/g,
  `Berdasarkan skrining awal ini, tingkat depresi (PHQ-9) menunjukkan indikasi`
);
content = content.replace(
  /Berdasarkan evaluasi mandiri, tingkat kecemasan Anda termasuk kategori/g,
  `Berdasarkan skrining awal ini, tingkat kecemasan (GAD-7) menunjukkan indikasi`
);

// We need to inject CLINICAL_DISCLAIMER into the UI somewhere visible, like after the result cards
content = content.replace(
  /\{\/\* Primary Action Buttons \*\/\}/g,
  `<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] mb-4">
                  <span className="font-semibold block mb-1">Penting:</span>
                  {CLINICAL_DISCLAIMER}
                </div>
                {/* Primary Action Buttons */}`
);

fs.writeFileSync('src/features/screening/ScreeningModal.tsx', content);
