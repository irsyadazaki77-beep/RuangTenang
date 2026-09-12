const fs = require('fs');
const path = 'src/features/chat/components/ChatComposer.tsx';

let content = fs.readFileSync(path, 'utf8');

// Add imports
if (!content.includes('Paperclip')) {
  content = content.replace("Send, Plus, Square, Sparkles }", "Send, Plus, Square, Sparkles, Paperclip, X, FileText, Image as ImageIcon }");
}
if (!content.includes('Attachment')) {
  content = content.replace("import { CHAT_COMMANDS, CHAT_PLUGINS } from '../constants/commands';", "import { CHAT_COMMANDS, CHAT_PLUGINS } from '../constants/commands';\nimport { Attachment } from '../types';");
}

// Add attachments state
content = content.replace(
  "const [input, setInput] = useState('');",
  "const [input, setInput] = useState('');\n  const [attachments, setAttachments] = useState<Attachment[]>([]);\n  const fileInputRef = useRef<HTMLInputElement>(null);"
);

// Add file handling logic
const fileHandlingLogic = `
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    if (attachments.length + files.length > 3) {
      alert('Maksimal 3 lampiran diperbolehkan.');
      return;
    }

    const newAttachments = files.map(file => {
      if (file.size > MAX_FILE_SIZE) {
        return {
          id: Math.random().toString(36).substring(7),
          file,
          status: 'error' as const,
          errorMessage: 'Ukuran file terlalu besar (Max 5MB)'
        };
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
         return {
          id: Math.random().toString(36).substring(7),
          file,
          status: 'error' as const,
          errorMessage: 'Tipe file tidak diizinkan'
        };
      }

      const id = Math.random().toString(36).substring(7);
      const isImage = file.type.startsWith('image/');
      
      const newAttachment: Attachment = {
        id,
        file,
        status: 'uploading' as const,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined
      };

      // Read as base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'success', base64 } : a));
      };
      reader.onerror = () => {
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error', errorMessage: 'Gagal membaca file' } : a));
      };
      reader.readAsDataURL(file);

      return newAttachment;
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowPlugins(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => {
      if (a.id === id && a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      return a.id !== id;
    }));
  };
`;

content = content.replace("const handleExecuteCommand =", fileHandlingLogic + "\n  const handleExecuteCommand =");

// Modify handleSend
content = content.replace(
  "onSend(input);",
  "onSend(input, undefined, attachments.filter(a => a.status === 'success'));\n    setAttachments([]);"
);

// Allow send if there are attachments
content = content.replace(
  "if (!input.trim() || isTyping) return;",
  "if ((!input.trim() && attachments.length === 0) || isTyping) return;"
);
content = content.replace(
  "disabled={!input.trim()}",
  "disabled={!input.trim() && attachments.length === 0}"
);
content = content.replace(
  "input.trim()\n                  ? 'bg-teal-600",
  "(input.trim() || attachments.length > 0)\n                  ? 'bg-teal-600"
);

// Add attachments UI above textarea
const attachmentsUI = `
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-2">
            {attachments.map(att => (
              <div key={att.id} className="relative flex items-center gap-2 p-1.5 pr-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-xs">
                {att.previewUrl ? (
                  <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-slate-100">
                    <img src={att.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0 max-w-[120px]">
                  <div className="font-medium text-slate-700 dark:text-slate-300 truncate">{att.file.name}</div>
                  {att.status === 'uploading' && <div className="text-[10px] text-teal-600">Memuat...</div>}
                  {att.status === 'error' && <div className="text-[10px] text-red-500 truncate">{att.errorMessage}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
`;

content = content.replace(
  "{/* Input Bar: Clean Floating Capsule */}",
  attachmentsUI + "\n        {/* Input Bar: Clean Floating Capsule */}"
);

// Add upload button in showPlugins
const uploadButton = `
              <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2.5 py-1">
                Lampiran
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-left transition-colors cursor-pointer mb-1"
                role="menuitem"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Paperclip className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[12.5px] text-slate-800 dark:text-slate-200">Unggah File</div>
                  <div className="text-[11px] text-slate-400 truncate">PDF, Gambar, Teks (Max 5MB)</div>
                </div>
              </button>
`;
content = content.replace(
  '<div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2.5 py-1">\n                Layanan & Fitur\n              </div>',
  uploadButton + '\n              <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2.5 py-1">\n                Layanan & Fitur\n              </div>'
);

// Add hidden file input
content = content.replace(
  '<textarea',
  '<input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,image/*,.txt,.md,.doc,.docx" onChange={handleFileSelect} />\n          <textarea'
);

fs.writeFileSync(path, content);
console.log('Modified ChatComposer.tsx');
