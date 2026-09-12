const fs = require('fs');

// Fix 1: chat.ts (currentMessageId hoisting and attachments missing on UnifiedPipelineInput)
let chatTs = fs.readFileSync('server/routes/chat.ts', 'utf8');
chatTs = chatTs.replace(
  "let currentMessageId: string | undefined;\nconst msgResult = await prisma.chatMessages.create({",
  "let currentMessageId: string | undefined;\n          const msgResult = await prisma.chatMessages.create({"
);
chatTs = chatTs.replace(
  "        history: messagesToSend,\n        pluginResult,\n        attachments,\n        isStreaming: true,",
  "        history: messagesToSend,\n        pluginResult,\n        isStreaming: true,"
);
fs.writeFileSync('server/routes/chat.ts', chatTs);

// Fix 2: aiRequestService.ts (userParts missing in generateContent and fallback stream)
let aiReqTs = fs.readFileSync('server/services/ai/aiRequestService.ts', 'utf8');
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
aiReqTs = aiReqTs.replace(
  "    const isAnonymous = !userId || userId === 'guest';\n    const outputTokens = isAnonymous ? 300 : 800;",
  convertAttachments + "    const isAnonymous = !userId || userId === 'guest';\n    const outputTokens = isAnonymous ? 300 : 800;"
);
fs.writeFileSync('server/services/ai/aiRequestService.ts', aiReqTs);

console.log('Fixed typescript errors');
