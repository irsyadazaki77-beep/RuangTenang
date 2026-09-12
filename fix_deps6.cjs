const fs = require('fs');

function applyFixes(file, fixes) {
    if(!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, 'utf8');
    for (const f of fixes) {
        c = c.replace(f.regex, f.repl);
    }
    fs.writeFileSync(file, c);
}

applyFixes('src/features/mood/UserProgressTracker.tsx', [
    { regex: /,\s*,\s*/g, repl: ', ' },
    { regex: /import \{\s*,\s*/g, repl: 'import { ' }
]);

