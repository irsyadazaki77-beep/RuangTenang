const fs = require('fs');
const path = 'server/services/ai/aiRequestService.ts';

let content = fs.readFileSync(path, 'utf8');

// Add attachments to AiRequestOptions
content = content.replace(
  "history?: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>;",
  "history?: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>;\n  attachments?: any[];"
);

// Destructure attachments
content = content.replace(
  "prompt, history = [], systemInstruction, abortSignal } = options;",
  "prompt, history = [], systemInstruction, abortSignal, attachments = [] } = options;"
);
// In generateStreamResponse
content = content.replace(
  "prompt, history = [], systemInstruction, abortSignal } = options;",
  "prompt, history = [], systemInstruction, abortSignal, attachments = [] } = options;"
);

// Add attachments to contents
const convertAttachments = `
    const userParts: any[] = [{ text: sanitizedPrompt }];
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        if (att.base64) {
          const base64Data = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
          userParts.push({
            inlineData: {
              data: base64Data,
              mimeType: att.mimeType
            }
          });
        }
      });
    }
`;

content = content.replace(
  "const isAnonymous = !userId || userId === 'guest';",
  convertAttachments + "\n    const isAnonymous = !userId || userId === 'guest';"
);

// Replace the contents array in generateContent and generateContentStream calls
// For generateContent
content = content.replace(
  "contents: [...sanitizedHistory, { role: 'user', parts: [{ text: sanitizedPrompt }] }],",
  "contents: [...sanitizedHistory, { role: 'user', parts: userParts }],"
);

// For generateContentStream (primary)
content = content.replace(
  "contents: [...sanitizedHistory, { role: 'user', parts: [{ text: sanitizedPrompt }] }],",
  "contents: [...sanitizedHistory, { role: 'user', parts: userParts }],"
);
// For generateContentStream (fallback)
content = content.replace(
  "contents: [...sanitizedHistory, { role: 'user', parts: [{ text: sanitizedPrompt }] }],",
  "contents: [...sanitizedHistory, { role: 'user', parts: userParts }],"
);

fs.writeFileSync(path, content);
console.log('Modified aiRequestService.ts');
