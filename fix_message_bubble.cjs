const fs = require('fs');
const path = 'src/features/chat/components/MessageBubble.tsx';

let content = fs.readFileSync(path, 'utf8');

if (!content.includes('FileText')) {
  content = content.replace("import { CheckCircle2,", "import { CheckCircle2, FileText, Image as ImageIcon, Download,");
}

const attachmentsUI = `
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-1">
                {message.attachments.map(att => (
                  <div key={att.id || att.filename} className="flex items-center gap-2 p-1.5 pr-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 text-xs max-w-xs">
                    <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-black/5 dark:bg-white/10 overflow-hidden">
                      {(att.mimeType || '').startsWith('image/') && att.data ? (
                        <img src={att.data.startsWith('data:') ? att.data : 'data:' + att.mimeType + ';base64,' + att.data} alt="Attachment" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-4 h-4 opacity-70" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate opacity-90">{att.filename}</div>
                      <div className="text-[10px] opacity-60">{(att.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
`;

content = content.replace(
  "{message.plugin === 'emergency_trigger' && (",
  attachmentsUI + "\n            {message.plugin === 'emergency_trigger' && ("
);

fs.writeFileSync(path, content);
console.log('Modified MessageBubble.tsx');
