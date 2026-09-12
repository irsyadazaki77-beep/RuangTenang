const fs = require('fs');

// 1. server/routes/chat.ts
let chatTs = fs.readFileSync('server/routes/chat.ts', 'utf8');
chatTs = chatTs.replace(/let currentMessageId: string \| undefined;/g, '');
chatTs = chatTs.replace(/currentMessageId = msgResult\.id;/g, '');
chatTs = chatTs.replace(/if \(msg\.id === currentMessageId\) continue;/g, '');
chatTs = chatTs.replace(/attachments,/g, '');
fs.writeFileSync('server/routes/chat.ts', chatTs);

// 2. server/services/ai/aiRequestService.ts
let reqTs = fs.readFileSync('server/services/ai/aiRequestService.ts', 'utf8');
const userPartsFix = `const userParts: any[] = [{ text: sanitizedPrompt }];
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
    }`;
if (!reqTs.includes('const userParts: any[] = [{ text: sanitizedPrompt }];')) {
  reqTs = reqTs.replace("const isAnonymous = !userId || userId === 'guest';", userPartsFix + "\n    const isAnonymous = !userId || userId === 'guest';");
}
fs.writeFileSync('server/services/ai/aiRequestService.ts', reqTs);

console.log('Fixed chat and reqts');
