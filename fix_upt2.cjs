const fs = require('fs');
let c = fs.readFileSync('src/features/mood/UserProgressTracker.tsx', 'utf8');
c = c.replace(/interface MoodLog \{[\s\S]*?\}/, `interface MoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  emotions: string[];
  notes: string;
  factors: string[];
  sleepHours: number | null;
  sleepQuality: 'very_poor' | 'poor' | 'fair' | 'good' | 'excellent' | null;
}`);
fs.writeFileSync('src/features/mood/UserProgressTracker.tsx', c);
