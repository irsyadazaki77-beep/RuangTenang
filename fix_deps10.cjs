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
    { regex: /,\s*CheckCircle2\s*/g, repl: '' }
]);

applyFixes('src/features/appointments/BookingForm.tsx', [
    { regex: /import \{\s*Clock,\s*/g, repl: 'import { ' }
]);

applyFixes('src/features/appointments/VideoConsultationRoom.tsx', [
    { regex: /useRef\s*,\s*/g, repl: '' }
]);

applyFixes('src/features/chat/components/EmptyChatState.tsx', [
    { regex: /,\s*ArrowRight\s*/g, repl: '' }
]);

applyFixes('src/features/counselors/CounselorDashboard.tsx', [
    { regex: /type AuditLogEntry[\s\S]*?\n/g, repl: '' }
]);
