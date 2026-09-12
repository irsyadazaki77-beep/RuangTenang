const fs = require('fs');

function applyFixes(file, fixes) {
    if(!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, 'utf8');
    for (const f of fixes) {
        c = c.replace(f.regex, f.repl);
    }
    fs.writeFileSync(file, c);
}

applyFixes('src/features/appointments/AppointmentScheduler.tsx', [
    { regex: /import \{\s*Clock,\s*/g, repl: 'import { ' },
    { regex: /,\s*CheckCircle2\s*\}/g, repl: ' }' },
    { regex: /const APPOINTMENTS_STORAGE_KEY.*?;/g, repl: '' },
    { regex: /const \{ data: counselors, refetch: refetchCounselors \} = useCounselors\(\);/g, repl: 'const { data: counselors } = useCounselors();' }
]);

applyFixes('src/features/chat/components/MainChat.tsx', [
    { regex: /import \{([^}]*)AlertTriangle([^}]*)\} from 'lucide-react';/g, repl: (match, p1, p2) => `import {${p1}${p2}} from 'lucide-react';` },
    { regex: /const \[isSummarizing, setIsSummarizing\] = useState\(false\);/g, repl: '' }
]);

applyFixes('src/features/mood/UserProgressTracker.tsx', [
    { regex: /import \{([^}]*)Clock([^}]*)\} from 'lucide-react';/g, repl: (match, p1, p2) => `import {${p1}${p2}} from 'lucide-react';` },
    { regex: /import \{([^}]*)Sparkles([^}]*)\} from 'lucide-react';/g, repl: (match, p1, p2) => `import {${p1}${p2}} from 'lucide-react';` }
]);

