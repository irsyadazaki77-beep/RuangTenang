const fs = require('fs');

function applyFixes(file, fixes) {
    if(!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, 'utf8');
    for (const f of fixes) {
        c = c.replace(f.regex, f.repl);
    }
    fs.writeFileSync(file, c);
}

applyFixes('src/features/appointments/BookingForm.tsx', [
    { regex: /const \[selectedConcern, setSelectedConcern\] = useState\(null\);/g, repl: '' },
    { regex: /const \[mode, setMode\] = useState<"calendar" | "instant">.*\n?/g, repl: '' },
    { regex: /const \[reminderMinutes, setReminderMinutes\] = useState\(15\);/g, repl: '' },
    { regex: /const \[isLoadingSlots, setIsLoadingSlots\] = useState\(false\);/g, repl: '' },
    { regex: /let KEBUTUHAN_OPTIONS.*?;/g, repl: '' },
    { regex: /import \{\s*Clock,\s*/g, repl: 'import { ' },
    { regex: /,\s*Calendar\s*/g, repl: '' },
    { regex: /,\s*User\s*/g, repl: '' },
    { regex: /,\s*BookOpen\s*/g, repl: '' },
    { regex: /,\s*HeartHandshake\s*/g, repl: '' }
]);

applyFixes('src/features/appointments/VideoConsultationRoom.tsx', [
    { regex: /import \{\s*useRef\s*,\s*useEffect\s*/g, repl: 'import { useEffect ' },
    { regex: /,\s*Maximize\s*\}/g, repl: ' }' }
]);

applyFixes('src/features/authentication/AuthModal.tsx', [
    { regex: /import \{\s*HeartHandshake,\s*/g, repl: 'import { ' },
    { regex: /,\s*ShieldAlert\s*\}/g, repl: ' }' },
    { regex: /import \{ LoginForm \} from '\.\/LoginForm';\n/g, repl: '' },
    { regex: /const \[selectedRole, setSelectedRole\] = useState<"student" | "counselor">.*\n?/g, repl: '' }
]);

applyFixes('src/features/chat/components/EmptyChatState.tsx', [
    { regex: /,\s*ArrowRight\s*\}/g, repl: ' }' },
    { regex: /catch \(err\)/g, repl: 'catch' }
]);

applyFixes('src/features/mood/MoodTracker.tsx', [
    { regex: /import \{\s*SmilePlus,\s*/g, repl: 'import { ' },
    { regex: /,\s*TrendingUp\s*\}/g, repl: ' }' }
]);
