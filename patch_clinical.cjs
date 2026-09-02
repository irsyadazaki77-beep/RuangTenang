const fs = require('fs');
let file = fs.readFileSync('src/features/screening/ScreeningModal.tsx', 'utf8');

file = file.replace(/SKOR DEPRESI AKADEMIS/g, 'PHQ-9 (Skor Gejala Depresi)');
file = file.replace(/SKOR KECEMASAN AKADEMIS/g, 'GAD-7 (Skor Gejala Kecemasan)');

fs.writeFileSync('src/features/screening/ScreeningModal.tsx', file);

let progressFile = fs.readFileSync('src/features/mood/UserProgressTracker.tsx', 'utf8');

progressFile = progressFile.replace(/Skor Depresi Akademis/g, 'PHQ-9 (Gejala Depresi)');
progressFile = progressFile.replace(/Skor Kecemasan Akademis/g, 'GAD-7 (Gejala Kecemasan)');
progressFile = progressFile.replace(/Depresi Akademis/g, 'Gejala Depresi');
progressFile = progressFile.replace(/Kecemasan Akademis/g, 'Gejala Kecemasan');

fs.writeFileSync('src/features/mood/UserProgressTracker.tsx', progressFile);
