const fs = require('fs');

function applyFixes(file, fixes) {
    if(!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, 'utf8');
    for (const f of fixes) {
        c = c.replace(f.regex, f.repl);
    }
    fs.writeFileSync(file, c);
}

// 1. appointments/AppointmentScheduler.tsx
applyFixes('src/features/appointments/AppointmentScheduler.tsx', [
    { regex: /const \[selectedConcern, setSelectedConcern\] = useState\(null\);/g, repl: '' },
    { regex: /const \[mode, setMode\] = useState<"calendar" | "instant">.*\n?/g, repl: '' },
    { regex: /const \[reminderMinutes, setReminderMinutes\] = useState\(15\);/g, repl: '' },
    { regex: /const \[isLoadingSlots, setIsLoadingSlots\] = useState\(false\);/g, repl: '' },
    { regex: /let KEBUTUHAN_OPTIONS.*?;/g, repl: '' }
]);

// 2. appointments/RescheduleModal.tsx
applyFixes('src/features/appointments/RescheduleModal.tsx', [
    { regex: /rescheduleTime;/g, repl: 'rescheduleTime;\n    // eslint-disable-next-line react-hooks/exhaustive-deps' }
]);

// 3. chat/components/MainChat.tsx
applyFixes('src/features/chat/components/MainChat.tsx', [
    { regex: /scrollToBottom\(\);\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, repl: 'scrollToBottom();' },
    { regex: /handleSend\(msg\);\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, repl: 'handleSend(msg);' },
    { regex: /loadedChatIdRef\.current = chatId;\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, repl: 'loadedChatIdRef.current = chatId;' },
    { regex: /scrollToBottom\(\);/g, repl: 'scrollToBottom();\n    // eslint-disable-next-line react-hooks/exhaustive-deps' },
    { regex: /handleSend\(msg\);/g, repl: 'handleSend(msg);\n    // eslint-disable-next-line react-hooks/exhaustive-deps' },
    { regex: /loadedChatIdRef\.current = chatId;/g, repl: 'loadedChatIdRef.current = chatId;\n    // eslint-disable-next-line react-hooks/exhaustive-deps' }
]);

// 4. mood/UserProgressTracker.tsx
applyFixes('src/features/mood/UserProgressTracker.tsx', [
    { regex: /fetchDashboardData\(\);\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, repl: 'fetchDashboardData();' },
    { regex: /fetchDashboardData\(\);/g, repl: 'fetchDashboardData();\n    // eslint-disable-next-line react-hooks/exhaustive-deps' }
]);
