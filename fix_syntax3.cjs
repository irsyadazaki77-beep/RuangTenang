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
    { regex: /export default function EmergencyCard\(\(\)\)/g, repl: 'export default function EmergencyCard()' }
]);

applyFixes('src/features/plugins/MoodCard.tsx', [
    { regex: /export default function MoodCard\(\(\)\)/g, repl: 'export default function MoodCard()' }
]);

applyFixes('src/features/mood/ScreeningTrend.tsx', [
    { regex: /\{ data \}: \{ data: HistoricalScore\[\]; : boolean \}/g, repl: '{ data }: { data: HistoricalScore[] }' },
    { regex: /\{ data \}: \{ data: any\[\], \?: boolean \}/g, repl: '{ data }: { data: any[] }' }
]);
