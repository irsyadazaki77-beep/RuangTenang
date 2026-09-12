const fs = require('fs');
const path = 'server/routes/chat.ts';

let content = fs.readFileSync(path, 'utf8');

const oldElse = `    } else {
      if (!pluginResult) {
        messagesToSend.push({ role: 'user', parts: [{ text: cleanMessage }] });
      } else {
        messagesToSend.push({ role: 'user', parts: [{ text: \`[PLUGIN_RESULT]\\n\${pluginResult}\` }] });
      }
    }`;

const newElse = `    } else {
      const parts: any[] = [{ text: pluginResult ? \`[PLUGIN_RESULT]\\n\${pluginResult}\` : cleanMessage }];
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        attachments.forEach(att => {
          if (att.base64) {
            const base64Data = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: att.mimeType
              }
            });
          }
        });
      }
      messagesToSend.push({ role: 'user', parts });
    }`;

content = content.replace(oldElse, newElse);

// Also need to handle the catch (e) block for DB failures!
const oldCatch = `      } catch (e) {
        if (!pluginResult) {
          messagesToSend.push({ role: 'user', parts: [{ text: cleanMessage }] });
        } else {
          messagesToSend.push({ role: 'user', parts: [{ text: \`[PLUGIN_RESULT]\\n\${pluginResult}\` }] });
        }
      }`;
const newCatch = `      } catch (e) {
        const parts: any[] = [{ text: pluginResult ? \`[PLUGIN_RESULT]\\n\${pluginResult}\` : cleanMessage }];
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
          attachments.forEach(att => {
            if (att.base64) {
              const base64Data = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
              parts.push({
                inlineData: {
                  data: base64Data,
                  mimeType: att.mimeType
                }
              });
            }
          });
        }
        messagesToSend.push({ role: 'user', parts });
      }`;
content = content.replace(oldCatch, newCatch);

fs.writeFileSync(path, content);
console.log('Fixed temporary/catch attachments');
