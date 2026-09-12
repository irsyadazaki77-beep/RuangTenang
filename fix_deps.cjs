const fs = require('fs');
let content = fs.readFileSync('src/features/mood/UserProgressTracker.tsx', 'utf8');
content = content.replace(/fetchDashboardData\(\);/g, "fetchDashboardData();\n    // eslint-disable-next-line react-hooks/exhaustive-deps");
fs.writeFileSync('src/features/mood/UserProgressTracker.tsx', content);

let c = fs.readFileSync('src/features/counselors/CounselorDashboard.tsx', 'utf8');
c = c.replace(/fetchCounselorAppointments\(\);/g, "fetchCounselorAppointments();\n    // eslint-disable-next-line react-hooks/exhaustive-deps");
fs.writeFileSync('src/features/counselors/CounselorDashboard.tsx', c);
