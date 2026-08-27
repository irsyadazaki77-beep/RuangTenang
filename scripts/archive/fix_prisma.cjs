const fs = require('fs');
const files = [
  'server/services/ai/aiContextBuilder.ts',
  'server/services/chatService.ts',
  'server/routes/userData.ts',
  'server/routes/chat.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \{ PrismaClient \} from ['"]@prisma\/client['"];\n/g, '');
  content = content.replace(/const prisma = new PrismaClient\(\);\n?/g, '');
  
  // Calculate relative path to server/database.ts
  const depth = file.split('/').length - 2;
  let relativePath = '';
  for (let i = 0; i < depth; i++) relativePath += '../';
  relativePath += 'database.js';
  
  content = `import { prisma } from '${relativePath}';\n` + content;
  fs.writeFileSync(file, content);
}
