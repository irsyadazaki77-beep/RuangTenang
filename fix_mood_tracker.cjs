const fs = require('fs');

const lines = fs.readFileSync('src/features/mood/MoodTracker.tsx', 'utf8').split('\n');

// 1. Find the start of Right Column
const rightColStartIdx = lines.findIndex(l => l.includes('{/* Right Column: Check-in Form */}'));
// 2. Find the end of Mobile Modal
const logHistoryStartIdx = lines.findIndex(l => l.includes('{/* LOG HISTORY & SEARCH */}'));

if (rightColStartIdx === -1 || logHistoryStartIdx === -1) {
  console.log('Could not find markers');
  process.exit(1);
}

// 3. Extract the Right Column + Mobile Modal
// Wait! The line before rightColStartIdx is the premature `</div>` (at line 542)
// We want to remove that `</div>` too!
const extraDivIdx = rightColStartIdx - 1;
if (!lines[extraDivIdx].includes('</div>')) {
  console.log('Expected </div> at', extraDivIdx);
}

// Extract block from rightColStartIdx to logHistoryStartIdx - 1
const extractedBlock = lines.slice(rightColStartIdx, logHistoryStartIdx).join('\n');

// 4. Remove the premature </div> AND the extracted block from their original position
// Splice out from extraDivIdx up to logHistoryStartIdx - 1
lines.splice(extraDivIdx, logHistoryStartIdx - extraDivIdx);

// 5. Now find the end of the file to insert the extracted block
// We want to insert BEFORE the final `</div>` (which is before `</div>\n  );\n};`)
const fileStr = lines.join('\n');
const fixedStr = fileStr.replace(
  '      </div>\n    </div>\n  );\n};',
  '      </div>\n' + extractedBlock + '\n    </div>\n  );\n};'
);

fs.writeFileSync('src/features/mood/MoodTracker.tsx', fixedStr);
console.log('Fixed MoodTracker.tsx');
