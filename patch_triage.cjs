const fs = require('fs');
let file = fs.readFileSync('src/features/mood/UserProgressTracker.tsx', 'utf8');

file = file.replace(
  /triage: \(d\.phq9Score >= 15 \|\| d\.gad7Score >= 15\) \? 'Krisis' : \(d\.phq9Score >= 10 \|\| d\.gad7Score >= 10 \? 'Prioritas' : 'Ringan'\)/g,
  `triage: (d.hasSelfHarmRisk || (d.item9Score !== undefined && d.item9Score > 0) || d.riskLevel === 'Tinggi' || d.riskCategory === 'KRISIS_SANGAT_TINGGI' || d.riskCategory === 'RISIKO_MENYAKITI_DIRI') ? 'Krisis' : (d.phq9Score >= 15 || d.gad7Score >= 15 ? 'Prioritas' : 'Ringan')`
);

fs.writeFileSync('src/features/mood/UserProgressTracker.tsx', file);
