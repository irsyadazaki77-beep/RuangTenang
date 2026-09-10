const fs = require('fs');
let code = fs.readFileSync('src/features/mood/MoodTracker.tsx', 'utf8');
code = code.replace(
  '      </div>\n      </div>\n      {/* Right Column: Check-in Form */}',
  '      </div>\n      {/* Right Column: Check-in Form */}'
);
fs.writeFileSync('src/features/mood/MoodTracker.tsx', code);
