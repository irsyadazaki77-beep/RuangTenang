const fs = require('fs');

function removeMatches(file, replacements) {
    if(!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, 'utf8');
    for (const r of replacements) {
        c = c.replace(r, '');
    }
    fs.writeFileSync(file, c);
}

removeMatches('src/components/ErrorBoundary.tsx', [
    /,\s*ShieldAlert\s*/g,
    /ShieldAlert\s*,\s*/g
]);

removeMatches('src/components/MentalHealthArticles.tsx', [
    /,\s*BookmarkCheck\s*/g,
    /,\s*ThumbsUp\s*/g,
    /,\s*BookMarked\s*/g,
    /BookmarkCheck\s*,\s*/g,
    /ThumbsUp\s*,\s*/g,
    /BookMarked\s*,\s*/g
]);

removeMatches('src/components/changelog/ChangelogModal.tsx', [
    /,\s*Share2\s*/g,
    /,\s*RefreshCw\s*/g,
    /,\s*Tag\s*/g,
    /Share2\s*,\s*/g,
    /RefreshCw\s*,\s*/g,
    /Tag\s*,\s*/g,
    /initialSelectedVersion\s*=\s*null,?\s*/g
]);

removeMatches('src/components/notifications/NotificationCenter.tsx', [
    /import type \{\s*NotificationType\s*\}\s*from\s*'..\/..\/types';\n/g
]);

removeMatches('src/features/appointments/AppointmentScheduler.tsx', [
    /,\s*Clock\s*/g,
    /Clock\s*,\s*/g,
    /,\s*refetch:\s*refetchCounselors\s*/g
]);

removeMatches('src/features/appointments/BookingForm.tsx', [
    /,\s*Clock\s*/g,
    /Clock\s*,\s*/g,
    /import type \{\s*CounselorSession\s*\}\s*from\s*'..\/..\/types';\n/g,
    /let KEBUTUHAN_OPTIONS.*?;/g,
    /const \[selectedConcern, setSelectedConcern\] = useState\(null\);\n/g,
    /const \[mode, setMode\] = useState<"calendar" | "instant">.*\n/g,
    /const \[reminderMinutes, setReminderMinutes\] = useState\(15\);\n/g,
    /setUserSession,?\s*/g,
    /appointments,?\s*/g
]);

removeMatches('src/features/appointments/CounselorChatSimulation.tsx', [
    /let savedChatKey = null;/g,
    /const savedChatKey = null;/g,
    /savedChatKey = null;/g,
    /savedChatKey = `chat_` \+ id;/g
]);

removeMatches('src/features/appointments/VideoConsultationRoom.tsx', [
    /useRef\s*,\s*/g,
    /,\s*useRef\s*/g
]);

removeMatches('src/features/authentication/AuthModal.tsx', [
    /import \{\s*LoginForm\s*\}\s*from\s*'\.\/LoginForm';\n/g,
    /const \[selectedRole, setSelectedRole\] = useState<"student" | "counselor">.*\n?/g
]);

removeMatches('src/features/chat/components/MessageBubble.tsx', [
    /onSendPluginResult,?\s*/g
]);

removeMatches('src/features/chat/constants/commands.ts', [
    /,\s*FileText\s*/g,
    /FileText\s*,\s*/g
]);

removeMatches('src/features/counselors/CounselorDashboard.tsx', [
    /type AuditLogEntry = \{[\s\S]*?\};\n/g
]);

removeMatches('src/features/mood/MoodTracker.tsx', [
    /,\s*SmilePlus\s*/g,
    /,\s*TrendingUp\s*/g,
    /SmilePlus\s*,\s*/g,
    /TrendingUp\s*,\s*/g
]);

removeMatches('src/features/mood/ScreeningTrend.tsx', [
    /isLowerBetter,?\s*/g,
    /\(_, i\)/g
]);

removeMatches('src/features/mood/UserProgressTracker.tsx', [
    /onOpenScreening,?\s*/g,
    /catch \(err\)/g
]);

removeMatches('src/features/plugins/EmergencyCard.tsx', [
    /onAction,?\s*/g
]);

removeMatches('src/features/plugins/MoodCard.tsx', [
    /onAction,?\s*/g
]);

removeMatches('src/hooks/useCounselorAnalytics.ts', [
    /,\s*RiskAlert\s*/g,
    /RiskAlert\s*,\s*/g
]);

removeMatches('src/lib/clientCrypto.ts', [
    /catch \(e\)/g
]);

removeMatches('src/lib/crisisDetector.ts', [
    /export type VerifiedHelpline = \{[\s\S]*?\};\n/g
]);

removeMatches('src/utils/tests.ts', [
    /export const chatInputSchema = z.object\(\{[\s\S]*?\}\);\n/g
]);
