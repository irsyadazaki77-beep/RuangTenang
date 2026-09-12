const fs = require('fs');
let text = fs.readFileSync('src/components/common/EmptyState.tsx', 'utf8');
text = text.replace(
  "import { Inbox, FileText, Calendar, Users, Activity, Sparkles } from 'lucide-react';",
  "import { Inbox, FileText, Calendar, Users, Activity, Sparkles, Info } from 'lucide-react';"
);
text = text.replace(
  "export type EmptyStateIconType = 'inbox' | 'document' | 'calendar' | 'users' | 'activity' | 'ai';",
  "export type EmptyStateIconType = 'inbox' | 'document' | 'calendar' | 'users' | 'activity' | 'ai' | 'info';"
);
text = text.replace(
  "  ai: Sparkles,",
  "  ai: Sparkles,\n  info: Info,"
);
fs.writeFileSync('src/components/common/EmptyState.tsx', text);
