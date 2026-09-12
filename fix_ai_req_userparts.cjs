const fs = require('fs');
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
// Remove duplicates
const firstIdx = reqTs.indexOf(userPartsFix);
if (firstIdx !== -1) {
   const secondIdx = reqTs.indexOf(userPartsFix, firstIdx + 1);
   if (secondIdx !== -1) {
       reqTs = reqTs.substring(0, secondIdx) + reqTs.substring(secondIdx + userPartsFix.length);
   }
}

fs.writeFileSync('server/services/ai/aiRequestService.ts', reqTs);
console.log('Fixed double userParts');
