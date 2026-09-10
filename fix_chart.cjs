const fs = require('fs');

let content = fs.readFileSync('src/features/mood/ScreeningTrend.tsx', 'utf8');

content = content.replace(
  /\) : chartType === 'line' \? \(\s*<div className="relative h-52 sm:h-64 w-full">/,
  `) : chartType === 'line' ? (
    <div className="overflow-x-auto custom-scrollbar w-full">
      <div className="relative h-52 sm:h-64 min-w-[500px] w-full">`
);

content = content.replace(
  /<\/div>\n\s*\) : \(\n\s*\/\* BAR CHART VIEW \*\//,
  `    </div>\n          </div>\n        ) : (\n          /* BAR CHART VIEW */`
);

content = content.replace(
  /\/\* BAR CHART VIEW \*\/\n\s*<div className="flex items-end justify-between h-52 sm:h-64 pb-8 pt-4 px-2 relative w-full">/,
  `/* BAR CHART VIEW */
          <div className="overflow-x-auto custom-scrollbar w-full">
            <div className="flex items-end justify-between h-52 sm:h-64 pb-8 pt-4 px-2 relative min-w-[500px] w-full">`
);

content = content.replace(
  /<\/div>\n\s*\{!isShowingFullHistory && screenHistory\.length > 4 && \(/,
  `    </div>\n          </div>\n        {!isShowingFullHistory && screenHistory.length > 4 && (`
);

fs.writeFileSync('src/features/mood/ScreeningTrend.tsx', content);
