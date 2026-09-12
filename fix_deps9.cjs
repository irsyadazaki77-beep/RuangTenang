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
    { regex: /const \{ data: counselors, refetch: refetchCounselors \} = useCounselors\(\);/g, repl: 'const { data: counselors } = useCounselors();' }
]);

applyFixes('src/features/appointments/BookingForm.tsx', [
    { regex: /import \{\s*Clock,\s*/g, repl: 'import { ' },
    { regex: /import type \{ CounselorSession.*?\n/g, repl: '' },
    { regex: /const \[selectedConcern, setSelectedConcern\] = useState\(null\);/g, repl: '' },
    { regex: /const \[mode, setMode\] = useState<"calendar" | "instant">.*\n?/g, repl: '' },
    { regex: /const \[reminderMinutes, setReminderMinutes\] = useState\(15\);/g, repl: '' },
    { regex: /let KEBUTUHAN_OPTIONS.*?;/g, repl: '' }
]);

applyFixes('src/features/appointments/VideoConsultationRoom.tsx', [
    { regex: /import \{\s*useRef\s*,\s*useEffect\s*\}/g, repl: 'import { useEffect }' }
]);

applyFixes('src/features/authentication/AuthModal.tsx', [
    { regex: /import \{ LoginForm \} from '\.\/LoginForm';\n/g, repl: '' },
    { regex: /const \[selectedRole, setSelectedRole\] = useState<"student" | "counselor">.*\n?/g, repl: '' }
]);

applyFixes('src/features/chat/components/EmptyChatState.tsx', [
    { regex: /,\s*ArrowRight\s*\}/g, repl: ' }' }
]);

applyFixes('src/features/counselors/CounselorDashboard.tsx', [
    { regex: /type AuditLogEntry = \{[\s\S]*?\};/m, repl: '' }
]);
