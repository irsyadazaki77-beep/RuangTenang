const fs = require('fs');
let file = fs.readFileSync('src/features/mood/UserProgressTracker.tsx', 'utf8');

const regex = /<div className="surface-card p-5 rounded-2xl flex flex-col justify-between">\s*<div className="flex items-center justify-between mb-4">\s*<span className="text-secondary text-sm font-medium">Total Hari Aktif[\s\S]*?<div className="surface-card p-5 rounded-2xl flex flex-col justify-between">\s*<div className="flex items-center justify-between mb-4">\s*<span className="text-secondary text-sm font-medium">Streak Saat Ini[\s\S]*?<\/div>\s*<\/div>/g;

file = file.replace(regex, `<div className="surface-card p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-secondary text-sm font-medium">Streak Saat Ini</span>
              <div className="p-2 bg-orange-50 dark:bg-orange-950/50 rounded-lg text-orange-600 dark:text-orange-400"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{streakCount === 0 ? 'Belum ada data' : \`\${streakCount} hari\`}</div>
              <div className="text-[11px] text-secondary mt-1 font-medium">{totalActiveDays} hari aktif secara total</div>
            </div>
          </div>`);

fs.writeFileSync('src/features/mood/UserProgressTracker.tsx', file);
