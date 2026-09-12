const fs = require('fs');

function applyFixes(file, fixes) {
    if(!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, 'utf8');
    for (const f of fixes) {
        c = c.replace(f.regex, f.repl);
    }
    fs.writeFileSync(file, c);
}

applyFixes('src/features/plugins/EmergencyCard.tsx', [
    { regex: /\{ \}: \{ \?: \(\) => void \}/g, repl: '()' }
]);

applyFixes('src/features/plugins/MoodCard.tsx', [
    { regex: /\{ \}: \{ \?: \(\) => void \}/g, repl: '()' }
]);

applyFixes('src/features/mood/ScreeningTrend.tsx', [
    { regex: /\{ data, {2}\}: \{ data: any\[\], \?: boolean \}/g, repl: '{ data }: { data: any[] }' },
    { regex: /\{ data, {2}\}:/g, repl: '{ data }:' },
    { regex: /isLowerBetter\?: boolean/g, repl: '' }
]);

applyFixes('src/features/chat/components/MessageBubble.tsx', [
    { regex: /\{ message, {2}\}: \{ message: any, \?: \(r: any\) => void \}/g, repl: '{ message }: { message: any }' },
    { regex: /\{ message, {2}\}:/g, repl: '{ message }:' },
    { regex: /onSendPluginResult\?: \(result: any\) => void;/g, repl: '' }
]);

applyFixes('src/features/appointments/BookingForm.tsx', [
    { regex: /export default function BookingForm\(\{ onSubmit, counselors, timeSlot, {2}\}: \{ onSubmit: \(data: any\) => void; counselors: any\[\]; timeSlot: Date | null; \?: any; \}\)/g, repl: 'export default function BookingForm({ onSubmit, counselors, timeSlot }: { onSubmit: (data: any) => void; counselors: any[]; timeSlot: Date | null; })' },
    { regex: /\{ onSubmit, counselors, timeSlot, {2}\}: \{[\s\S]*?\}/g, repl: '{ onSubmit, counselors, timeSlot }: any' }
]);

applyFixes('src/features/mood/UserProgressTracker.tsx', [
    { regex: /\{ \}: \{ \?: any; \?: \(\) => void; \}/g, repl: '()' }
]);
