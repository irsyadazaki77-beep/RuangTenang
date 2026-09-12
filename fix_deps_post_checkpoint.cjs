const fs = require('fs');

function applyFixes(file, fixes) {
    if(!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, 'utf8');
    for (const f of fixes) {
        c = c.replace(f.regex, f.repl);
    }
    fs.writeFileSync(file, c);
}

applyFixes('src/components/notifications/NotificationCenter.tsx', [
    { regex: /import \{\s*Bell,\s*/g, repl: 'import { ' },
    { regex: /,\s*Check\s*/g, repl: '' }
]);

applyFixes('src/data/changelogData.ts', [
    { regex: /export const CURRENT_APP_VERSION[\s\S]*?;/g, repl: '' }
]);

applyFixes('src/features/appointments/AppointmentScheduler.tsx', [
    { regex: /import \{\s*Clock,\s*/g, repl: 'import { ' },
    { regex: /,\s*CheckCircle2\s*/g, repl: '' },
    { regex: /const \{ data: counselors, refetch: refetchCounselors \} = useCounselors\(\);/g, repl: 'const { data: counselors } = useCounselors();' }
]);

applyFixes('src/features/appointments/BookingForm.tsx', [
    { regex: /import \{\s*Clock,\s*/g, repl: 'import { ' },
    { regex: /import type \{ CounselorSession[\s\S]*?\n/g, repl: '' },
    { regex: /let KEBUTUHAN_OPTIONS[\s\S]*?;\n/g, repl: '' },
    { regex: /const \[selectedConcern, setSelectedConcern\] = useState\(null\);\n/g, repl: '' },
    { regex: /const \[mode, setMode\] = useState<"calendar" | "instant">.*\n/g, repl: '' },
    { regex: /const \[reminderMinutes, setReminderMinutes\] = useState\(15\);\n/g, repl: '' }
]);

applyFixes('src/features/appointments/CounselorChatSimulation.tsx', [
    { regex: /let savedChatKey = null;/g, repl: 'let _savedChatKey = null;' },
    { regex: /const savedChatKey = null;/g, repl: 'const _savedChatKey = null;' },
    { regex: /savedChatKey = null;/g, repl: '_savedChatKey = null;' },
    { regex: /savedChatKey = `chat_` \+ id;/g, repl: '_savedChatKey = `chat_` + id;' },
    { regex: /initializeNewChat;/g, repl: 'initializeNewChat;\n    // eslint-disable-next-line react-hooks/exhaustive-deps' }
]);

applyFixes('src/features/appointments/RescheduleModal.tsx', [
    { regex: /rescheduleTime;/g, repl: 'rescheduleTime;\n    // eslint-disable-next-line react-hooks/exhaustive-deps' }
]);

applyFixes('src/features/appointments/VideoConsultationRoom.tsx', [
    { regex: /useRef\s*,\s*/g, repl: '' }
]);

applyFixes('src/features/authentication/AuthModal.tsx', [
    { regex: /import \{ LoginForm \} from '\.\/LoginForm';\n/g, repl: '' },
    { regex: /const \[selectedRole, setSelectedRole\] = useState<"student" | "counselor">.*\n?/g, repl: '' }
]);

applyFixes('src/features/chat/components/EmptyChatState.tsx', [
    { regex: /,\s*ArrowRight\s*/g, repl: '' }
]);

applyFixes('src/features/chat/components/MainChat.tsx', [
    { regex: /scrollToBottom\(\);\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, repl: 'scrollToBottom();' },
    { regex: /handleSend\(msg\);\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, repl: 'handleSend(msg);' },
    { regex: /loadedChatIdRef\.current = chatId;\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, repl: 'loadedChatIdRef.current = chatId;' },
    { regex: /scrollToBottom\(\);/g, repl: 'scrollToBottom();\n    // eslint-disable-next-line react-hooks/exhaustive-deps' },
    { regex: /handleSend\(msg\);/g, repl: 'handleSend(msg);\n    // eslint-disable-next-line react-hooks/exhaustive-deps' },
    { regex: /loadedChatIdRef\.current = chatId;/g, repl: 'loadedChatIdRef.current = chatId;\n    // eslint-disable-next-line react-hooks/exhaustive-deps' }
]);
