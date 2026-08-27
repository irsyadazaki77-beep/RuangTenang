const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf-8');

content = content.replace(
  /phq9: \{\s*score: number;\s*severity: "Minimal" \| "Ringan" \| "Sedang" \| "Berat";/g,
  `phq9: {
    score: number;
    severity: "Minimal" | "Ringan" | "Sedang" | "Sedang-Berat" | "Berat";`
);

fs.writeFileSync('src/types.ts', content);
