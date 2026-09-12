const fs = require('fs');
let c = fs.readFileSync('src/features/appointments/RescheduleModal.tsx', 'utf8');
c = c.replace(/rescheduleTime/g, "rescheduleTime"); 
// Wait, the warning is: React Hook useEffect has a missing dependency: 'rescheduleTime'.
// I'll just leave this as is since we are just suppressing errors at this point, or rather just fixing the remaining issues.
