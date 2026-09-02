const fs = require('fs');
let file = fs.readFileSync('src/features/mood/UserProgressTracker.tsx', 'utf8');

const target = `            <div>
              <div className="text-2xl font-bold text-primary">{streakCount === 0 ? 'Belum ada data' : \`\${streakCount} hari\`}</div>
              <div className="text-[11px] text-secondary mt-1 font-medium">{totalActiveDays} hari aktif secara total</div>
            </div>
          </div>
            <div>
              <span className="text-2xl font-bold text-primary">{streakCount === 0 ? 'Belum ada data' : \`\${streakCount} hari\`}</span>
            </div>
          </div>`;

const replacement = `            <div>
              <div className="text-2xl font-bold text-primary">{streakCount === 0 ? 'Belum ada data' : \`\${streakCount} hari\`}</div>
              <div className="text-[11px] text-secondary mt-1 font-medium">{totalActiveDays} hari aktif secara total</div>
            </div>
          </div>`;

file = file.replace(target, replacement);

// And checking motion.div closure. Wait, the original `itemVariants` might be missing `</motion.div>` if I removed it? No, `</motion.div>` for the 5-grid was there.
fs.writeFileSync('src/features/mood/UserProgressTracker.tsx', file);
