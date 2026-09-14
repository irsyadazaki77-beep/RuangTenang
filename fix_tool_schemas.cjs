const fs = require('fs');

let content = fs.readFileSync('server/services/ai/aiToolSchemas.ts', 'utf8');

const target = `export const aiMemoryToolSchema = z.object({
  reason: z.string().max(200).optional(),
  action: z.enum(['retrieve', 'summarize']).optional()
}).strict();`;

const replacement = `export const aiMemoryToolSchema = z.object({
  reason: z.string().max(200).optional(),
  action: z.enum(['retrieve', 'summarize', 'save']).optional(),
  content: z.string().max(200).optional()
}).strict();`;

content = content.replace(target, replacement);
fs.writeFileSync('server/services/ai/aiToolSchemas.ts', content);
console.log("Updated aiMemoryToolSchema");
