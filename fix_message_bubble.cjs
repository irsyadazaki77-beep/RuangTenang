const fs = require('fs');

let content = fs.readFileSync('src/features/chat/components/MessageBubble.tsx', 'utf8');

const targetPlugins = `{msg.plugin === 'articles' && <div className="mt-3"><ArticlesCard onAction={() => onOpenPlugin?.('articles')} /></div>}`;
const replacePlugins = `{msg.plugin === 'articles' && <div className="mt-3"><ArticlesCard onAction={() => onOpenPlugin?.('articles')} /></div>}
            {msg.plugin === 'ai_memory' && (
              <div className="mt-3 p-3 bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
                <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Konteks personalisasi disimpan ke memori jangka panjang untuk sesi mendatang.</span>
              </div>
            )}`;

if (!content.includes('Brain className=')) {
    content = content.replace(targetPlugins, replacePlugins);
    
    // Add Brain icon import if not present
    if (!content.includes('Brain')) {
        content = content.replace(`import { `, `import { Brain, `);
    }
    
    fs.writeFileSync('src/features/chat/components/MessageBubble.tsx', content);
    console.log("Updated MessageBubble");
} else {
    console.log("Already updated");
}
