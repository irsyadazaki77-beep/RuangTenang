const fs = require('fs');
let code = fs.readFileSync('src/features/mood/MoodTracker.tsx', 'utf8');
code = code.replace(
  '      </div>\n  );\n};',
  '      </div>\n    </div>\n  );\n};'
);
fs.writeFileSync('src/features/mood/MoodTracker.tsx', code);
