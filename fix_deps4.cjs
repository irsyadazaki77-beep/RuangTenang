const fs = require('fs');
let c = fs.readFileSync('src/features/chat/components/MainChat.tsx', 'utf8');
c = c.replace(/scrollToBottom\(\);\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, "scrollToBottom();");
c = c.replace(/handleSend\(msg\);\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, "handleSend(msg);");
c = c.replace(/loadedChatIdRef\.current = chatId;\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, "loadedChatIdRef.current = chatId;");
fs.writeFileSync('src/features/chat/components/MainChat.tsx', c);

c = fs.readFileSync('src/features/mood/UserProgressTracker.tsx', 'utf8');
c = c.replace(/fetchDashboardData\(\);\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, "fetchDashboardData();");
fs.writeFileSync('src/features/mood/UserProgressTracker.tsx', c);

c = fs.readFileSync('src/features/counselors/CounselorDashboard.tsx', 'utf8');
c = c.replace(/fetchCounselorAppointments\(\);\n {4}\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps/g, "fetchCounselorAppointments();");
fs.writeFileSync('src/features/counselors/CounselorDashboard.tsx', c);
