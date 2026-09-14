const fs = require('fs');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

replaceInFile('src/components/layout/WorkspaceLayout.tsx', [
    [
        `className="flex-1 min-w-0 w-full"`,
        `className="flex-1 min-w-0 w-full pb-safe"`
    ],
    [
        `className="lg:hidden p-1.5 -ml-1 text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"`,
        `className="lg:hidden p-1.5 -ml-1 text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"`
    ],
    [
        `className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 rounded-lg transition-all group shrink-0 cursor-pointer min-h-[36px] md:min-h-[32px]"`,
        `className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 rounded-lg transition-all group shrink-0 cursor-pointer min-h-[44px] md:min-h-[32px]"`
    ],
    [
        `className="p-1.5 text-secondary hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"`,
        `className="p-1.5 text-secondary hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"`
    ],
    [
        `className="flex-1 flex flex-col h-full min-h-0 surface-page relative min-w-0 overflow-y-auto"`,
        `className="flex-1 flex flex-col h-[100dvh] min-h-0 surface-page relative min-w-0 overflow-y-auto"`
    ]
]);
