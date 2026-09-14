const fs = require('fs');

let content = fs.readFileSync('server/routes/chat.ts', 'utf8');

const targetValidation = `          if (validation.isValid && validation.toolCall) {
            validToolCallParsed = { tool_call: validation.toolCall, parameters: validation.parameters || {} };
            if (!res.writableEnded) {`;

const replaceValidation = `          if (validation.isValid && validation.toolCall) {
            validToolCallParsed = { tool_call: validation.toolCall, parameters: validation.parameters || {} };
            
            if (validToolCallParsed.tool_call === 'ai_memory' && validToolCallParsed.parameters.action === 'save') {
               const memContent = validToolCallParsed.parameters.content;
               if (memContent && userId && !activeIsTemporary) {
                  try {
                    await prisma.userMemories.create({
                      data: {
                        id: \`mem_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
                        userId: userId,
                        content: encryptionService.encryptSensitive(memContent) || memContent
                      }
                    });
                  } catch(e) {}
               }
            }

            if (!res.writableEnded) {`;

if (content.includes(targetValidation)) {
    content = content.replace(targetValidation, replaceValidation);
    fs.writeFileSync('server/routes/chat.ts', content);
    console.log("Updated chat routes tool execution");
} else {
    console.log("Target not found");
}
