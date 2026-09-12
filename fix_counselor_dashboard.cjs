const fs = require('fs');
let c = fs.readFileSync('src/features/counselors/CounselorDashboard.tsx', 'utf8');
c = c.replace(/import {([^}]+)} from 'lucide-react';/, (match, p1) => {
    let imports = p1.split(',').map(s => s.trim());
    const unused = ['CheckCircle2', 'Filter', 'PieChart', 'ArrowUpRight', 'FileText', 'ShieldCheck', 'Activity', 'Globe', 'Award', 'Terminal', 'Lock'];
    imports = imports.filter(i => !unused.includes(i));
    return `import { ${imports.join(', ')} } from 'lucide-react';`;
});
c = c.replace(/type AuditLogEntry = \{[\s\S]*?\};/m, '');
fs.writeFileSync('src/features/counselors/CounselorDashboard.tsx', c);
