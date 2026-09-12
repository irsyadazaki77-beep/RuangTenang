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
    { regex: / {2}: React.Dispatch<React.SetStateAction<UserSession>>;/g, repl: '  setUserSession?: React.Dispatch<React.SetStateAction<any>>;' },
    { regex: / {2}: Appointment\[\];/g, repl: '  appointments?: any[];' }
]);

applyFixes('src/features/chat/components/MessageBubble.tsx', [
    { regex: / {2}: \(result: any\) => void;/g, repl: '  onSendPluginResult?: (result: any) => void;' },
    { regex: /: \{\n {2}message: Message;\n {2}: \(result: any\) => void;\n\}/g, repl: ': { message: any }' }
]);

applyFixes('src/features/mood/UserProgressTracker.tsx', [
    { regex: / {2}: ScreeningResult | null;/g, repl: '  screeningResult?: any | null;' },
    { regex: / {2}: \(\) => void;/g, repl: '  onOpenScreening?: () => void;' }
]);
