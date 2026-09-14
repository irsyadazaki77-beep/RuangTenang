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
    } else {
        console.log(`No changes made to ${filePath}`);
    }
}

// 1. MainChat.tsx
replaceInFile('src/features/chat/components/MainChat.tsx', [
    [
        `className="flex-1 overflow-y-auto w-full min-w-0 flex flex-col px-3 sm:px-4 py-3 sm:py-4" ref={scrollContainerRef}>`,
        `className="flex-1 overflow-y-auto w-full min-w-0 flex flex-col px-3 sm:px-4 py-3 sm:py-4 pb-safe" ref={scrollContainerRef}>`
    ]
]);

// 2. WorkspaceLayout.tsx
replaceInFile('src/components/layout/WorkspaceLayout.tsx', [
    [
        `className="flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden relative">`,
        `className="flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden relative pb-safe">`
    ],
    [
        `className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">`,
        `className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-safe">`
    ]
]);

// 3. Sidebar.tsx
replaceInFile('src/components/layout/Sidebar.tsx', [
    [
        `className="flex flex-col h-full bg-white dark:bg-slate-900/95 backdrop-blur-xl border-r border-default shadow-[2px_0_12px_rgba(0,0,0,0.02)] dark:shadow-[2px_0_12px_rgba(0,0,0,0.2)]">`,
        `className="flex flex-col h-full bg-white dark:bg-slate-900/95 backdrop-blur-xl border-r border-default shadow-[2px_0_12px_rgba(0,0,0,0.02)] dark:shadow-[2px_0_12px_rgba(0,0,0,0.2)] pt-safe pb-safe">`
    ],
    [
        `className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer text-sm shadow-sm"`,
        `className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-3 py-2.5 min-h-[44px] rounded-xl font-medium transition-colors cursor-pointer text-sm shadow-sm"`
    ]
]);

// 4. ModalShell.tsx
replaceInFile('src/components/ui/ModalShell.tsx', [
    [
        `className="w-full max-w-lg bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"`,
        `className="w-full max-w-lg bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh] relative"`
    ],
    [
        `className="px-4 sm:px-6 py-4 overflow-y-auto min-h-0 custom-scrollbar flex-1 relative">`,
        `className="px-4 sm:px-6 py-4 overflow-y-auto min-h-0 custom-scrollbar flex-1 relative pb-safe">`
    ],
    [
        `className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">`,
        `className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 pb-safe">`
    ],
    [
        `className="p-2 -mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"`,
        `className="p-2 -mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"`
    ]
]);

