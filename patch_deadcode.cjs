const fs = require('fs');
let file = fs.readFileSync('src/features/counselors/CounselorDirectory.tsx', 'utf8');

file = file.replace(/const \[languageFilter, setLanguageFilter\] = useState<string>\("Semua"\);\n/g, '');
file = file.replace(/const matchesLanguage = languageFilter === "Semua" \|\| \(c\.languages && c\.languages\.includes\(languageFilter\)\);\n/g, '');
file = file.replace(/return matchesSearch && matchesConcern && matchesMethod && matchesCost && matchesCampus && matchesLanguage && matchesAvailability;/g, 'return matchesSearch && matchesConcern && matchesMethod && matchesCost && matchesCampus && matchesAvailability;');
file = file.replace(/setLanguageFilter\("Semua"\);\n/g, '');

fs.writeFileSync('src/features/counselors/CounselorDirectory.tsx', file);
