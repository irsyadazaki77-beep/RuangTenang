const fs = require('fs');
let c = fs.readFileSync('src/features/mood/UserProgressTracker.tsx', 'utf8');
c = c.replace(/interface UserProgressTrackerProps \{[\s\S]*?\}/, `interface UserProgressTrackerProps {
  onNavigateToPrograms?: () => void;
  onNavigateToSchedule?: () => void;
}`);
c = c.replace(/export default function UserProgressTracker\(.*?\)/, 'export default function UserProgressTracker({ onNavigateToPrograms, onNavigateToSchedule }: UserProgressTrackerProps)');
fs.writeFileSync('src/features/mood/UserProgressTracker.tsx', c);
