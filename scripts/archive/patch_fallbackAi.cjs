const fs = require('fs');
let content = fs.readFileSync('server/routes/fallbackAi.ts', 'utf-8');

content = content.replace(
  /Fitur ini menggunakan tes PHQ-9 \(Depresi\) & GAD-7 \(Kecemasan\) standar psikologis\./g,
  `Fitur ini menyediakan instrumen skrining awal adaptasi (PHQ-9 & GAD-7) untuk evaluasi mandiri (bukan diagnosis medis).`
);

fs.writeFileSync('server/routes/fallbackAi.ts', content);
