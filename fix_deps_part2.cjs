const fs = require('fs');

function applyFixes(file, fixes) {
    if(!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, 'utf8');
    for (const f of fixes) {
        c = c.replace(f.regex, f.repl);
    }
    fs.writeFileSync(file, c);
}

applyFixes('src/features/chat/components/MessageBubble.tsx', [
    { regex: /onSendPluginResult,\n/g, repl: '' }
]);

applyFixes('src/features/chat/constants/commands.ts', [
    { regex: /import \{\s*FileText,\s*/g, repl: 'import { ' }
]);

applyFixes('src/features/counselors/CounselorDashboard.tsx', [
    { regex: /type AuditLogEntry[\s\S]*?\n/g, repl: '' }
]);

applyFixes('src/features/mood/MoodTracker.tsx', [
    { regex: /import \{\s*SmilePlus,\s*/g, repl: 'import { ' },
    { regex: /,\s*TrendingUp\s*\}/g, repl: ' }' }
]);

applyFixes('src/features/mood/ScreeningTrend.tsx', [
    { regex: /isLowerBetter,\n/g, repl: '' },
    { regex: /\(_, i\)/g, repl: '()' }
]);

applyFixes('src/features/mood/TimelineTasks.tsx', [
    { regex: /const \[loading, setLoading\] = useState\(true\);\n/g, repl: '' }
]);

applyFixes('src/features/mood/UserProgressTracker.tsx', [
    { regex: /screeningResult,\n/g, repl: '' },
    { regex: /onOpenScreening\n/g, repl: '' },
    { regex: /catch \(err\)/g, repl: 'catch' }
]);

applyFixes('src/features/plugins/EmergencyCard.tsx', [
    { regex: /onAction,\n/g, repl: '' }
]);

applyFixes('src/features/plugins/MoodCard.tsx', [
    { regex: /onAction,\n/g, repl: '' }
]);

applyFixes('src/hooks/useCounselorAnalytics.ts', [
    { regex: /import type \{([^}]*)RiskAlert([^}]*)\} from/g, repl: (match, p1, p2) => {
        const imports = [p1, p2].join('').split(',').map(s=>s.trim()).filter(Boolean);
        if (imports.length === 0) return '';
        return `import type { ${imports.join(', ')} } from`;
    } }
]);

applyFixes('src/lib/clientCrypto.ts', [
    { regex: /catch \(e\)/g, repl: 'catch' }
]);

applyFixes('src/lib/crisisDetector.ts', [
    { regex: /export type VerifiedHelpline[\s\S]*?\};\n/g, repl: '' }
]);

applyFixes('src/utils/tests.ts', [
    { regex: /chatInputSchema,\n/g, repl: '' },
    { regex: /chatInputSchema /g, repl: '' }
]);
