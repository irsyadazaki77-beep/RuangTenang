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
    { regex: /TIER_LIMITS\[userSession\.tier\]\.;/g, repl: 'TIER_LIMITS[userSession.tier].appointments;' }
]);

applyFixes('src/features/chat/components/MessageBubble.tsx', [
    { regex: / {2}\?: \(result: string\) => void;\n/g, repl: '' }
]);
