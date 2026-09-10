const fs = require('fs');

let content = fs.readFileSync('src/features/privacy/PrivacyCenterModal.tsx', 'utf8');

const regex = /\{\/\* Mobile Horizontal Tabs \*\/\}.*?\{\/\* Desktop Navigation Sidebar \*\/\}/gs;

const replacement = `
        {/* Modal Layout: Sidebar + Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950">
          
          {/* Unified Navigation Sidebar */}
          <div className={\`w-full md:w-64 md:flex-col surface-muted border-r border-default p-2.5 space-y-1 shrink-0 overflow-y-auto \${showMobileDetail ? 'hidden md:flex' : 'flex flex-col'}\`}>
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMsg(null); setShowMobileDetail(true); }}
                  className={\`w-full text-left px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer active:scale-[0.98] \${
                    isActive
                      ? tab.id === 'erasure' ? 'bg-rose-600 text-white shadow-3xs' : 'bg-teal-600 text-white shadow-3xs'
                      : tab.id === 'erasure' ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'text-secondary hover:text-primary hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }\`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.fullLabel}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 md:hidden shrink-0" />
                </button>
              );
            })}
          </div>
`;

content = content.replace(regex, replacement);

const regex2 = /<div className="hidden md:flex md:w-60 md:flex-col.*?<\/div>/s;
content = content.replace(regex2, '');

const regex3 = /\{\/\* Main Content Area \*\/\}\s*<div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50\/50 dark:bg-slate-900\/50 relative">/g;

const replacement3 = `
          {/* Main Content Area */}
          <div className={\`flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 relative \${!showMobileDetail ? 'hidden md:block' : 'block'}\`}>
            {showMobileDetail && (
              <button 
                onClick={() => setShowMobileDetail(false)} 
                className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 px-3.5 py-2 mb-4 rounded-lg bg-teal-50 dark:bg-teal-900/40 cursor-pointer transition-all min-h-[44px] w-fit"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali ke Kategori
              </button>
            )}
`;

content = content.replace(regex3, replacement3);

// add ChevronRight, ChevronLeft imports if missing
if (!content.includes('ChevronRight')) {
  content = content.replace('X,', 'X, ChevronRight, ChevronLeft,');
}

fs.writeFileSync('src/features/privacy/PrivacyCenterModal.tsx', content);
