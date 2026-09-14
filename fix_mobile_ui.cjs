const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        if (typeof search === 'string') {
            content = content.split(search).join(replace);
        } else {
            content = content.replace(search, replace);
        }
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

// 1. ChatComposer
replaceInFile('src/features/chat/components/ChatComposer.tsx', [
    // Safe area bottom
    [
        `className="w-full px-3 sm:px-4 pb-3 sm:pb-4 pt-1 sticky bottom-0 z-20 shrink-0 bg-gradient-to-t from-stone-50 via-stone-50/95 to-transparent dark:from-[#0c1117] dark:via-[#0c1117]/95"`,
        `className="w-full px-3 sm:px-4 pb-3 sm:pb-4 pt-1 sticky bottom-0 z-20 shrink-0 bg-gradient-to-t from-stone-50 via-stone-50/95 to-transparent dark:from-[#0c1117] dark:via-[#0c1117]/95 pb-safe"`
    ],
    // Increase plus button size
    [
        `className=\`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer`,
        `className=\`w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer`
    ],
    // Increase send/stop button size
    [
        `className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900`,
        `className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-slate-900`
    ],
    [
        `className=\`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 transition-all`,
        `className=\`w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all`
    ],
    // Make textarea container taller implicitly by having larger buttons, and add safe area
    [
        `px-2 py-1.5 sm:p-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)]`,
        `p-1.5 sm:p-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)]` // remove px-2 so buttons fit better
    ]
]);

// 2. MainChat
replaceInFile('src/features/chat/components/MainChat.tsx', [
    // Ensure viewport height uses dvh correctly
    [
        `className="flex-1 overflow-y-auto w-full px-2 sm:px-4 py-4 min-h-0 scroll-smooth custom-scrollbar relative"`,
        `className="flex-1 overflow-y-auto w-full px-2 sm:px-4 py-4 min-h-0 scroll-smooth custom-scrollbar relative pb-safe"`
    ]
]);

// 3. WorkspaceLayout
replaceInFile('src/components/layout/WorkspaceLayout.tsx', [
    [
        `className="flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden relative"`,
        `className="flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden relative pb-safe"`
    ],
    [
        `className="flex-1 overflow-y-auto min-h-0 custom-scrollbar"`,
        `className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-safe"`
    ]
]);

// 4. Topbar
replaceInFile('src/components/layout/Topbar.tsx', [
    [
        `className="h-14 border-b border-default flex items-center justify-between px-3 sm:px-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-10 w-full min-w-0 shrink-0"`,
        `className="h-14 border-b border-default flex items-center justify-between px-3 sm:px-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-10 w-full min-w-0 shrink-0 pt-safe"` // Add pt-safe in case of top notch
    ],
    [
        `className="lg:hidden p-2 -ml-1 text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl shrink-0 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"`,
        `className="lg:hidden p-2 -ml-1 text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl shrink-0 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"`
    ]
]);

// 5. Sidebar
replaceInFile('src/components/layout/Sidebar.tsx', [
    [
        `className="flex flex-col h-full bg-white dark:bg-slate-900/95 backdrop-blur-xl border-r border-default shadow-[2px_0_12px_rgba(0,0,0,0.02)] dark:shadow-[2px_0_12px_rgba(0,0,0,0.2)]"`,
        `className="flex flex-col h-full bg-white dark:bg-slate-900/95 backdrop-blur-xl border-r border-default shadow-[2px_0_12px_rgba(0,0,0,0.02)] dark:shadow-[2px_0_12px_rgba(0,0,0,0.2)] pt-safe pb-safe"`
    ],
    // increase new chat button size
    [
        `className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer text-sm shadow-sm"`,
        `className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-3 py-2.5 min-h-[44px] rounded-xl font-medium transition-colors cursor-pointer text-sm shadow-sm"`
    ]
]);

// 6. ModalShell
replaceInFile('src/components/ui/ModalShell.tsx', [
    [
        `className="w-full max-w-lg bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"`,
        `className="w-full max-w-lg bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh] relative"`
    ],
    [
        `className="px-4 sm:px-6 py-4 overflow-y-auto min-h-0 custom-scrollbar flex-1 relative"`,
        `className="px-4 sm:px-6 py-4 overflow-y-auto min-h-0 custom-scrollbar flex-1 relative pb-safe"`
    ],
    [
        `className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0"`,
        `className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 pb-safe"`
    ],
    [
        `className="p-2 -mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"`,
        `className="p-2 -mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"`
    ]
]);

// 7. MessageBubble (Touch targets for actions)
replaceInFile('src/features/chat/components/MessageBubble.tsx', [
    [
        `className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"`,
        `className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"`
    ],
    [
        `className=\`p-1.5 rounded-md transition-colors cursor-pointer`,
        `className=\`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-colors cursor-pointer`
    ]
]);

