const fs = require('fs');
let content = fs.readFileSync('server/services/ai/aiContextBuilder.ts', 'utf8');

const targetImport = `import { consentService } from '../consentService.js';`;
const replaceImport = `import { consentService } from '../consentService.js';\nimport { MemoryService } from '../memoryService.js';`;
content = content.replace(targetImport, replaceImport);

const targetMemory = `      // Relevance Scoring for Memory
      const allMemories = await prisma.userMemories.findMany({
        where: { userId, isActive: true },
        take: 20
      });
      
      let memories = allMemories;
      if (allMemories.length > 2 && currentMessage) {
        const queryTerms = currentMessage.toLowerCase().split(/\\s+/).filter(t => t.length > 3);
        const scoredMemories = allMemories.map(m => {
          const contentStr = (encryptionService.decryptSensitive(m.content) || m.content).toLowerCase();
          let score = 0;
          for (const term of queryTerms) {
            if (contentStr.includes(term)) score += 2;
          }
          return { memory: m, score };
        });
        
        // Sort by score desc, then by date desc (default)
        scoredMemories.sort((a, b) => b.score - a.score || b.memory.createdAt.getTime() - a.memory.createdAt.getTime());
        memories = scoredMemories.slice(0, 3).map(s => s.memory);
      } else {
        memories = allMemories.slice(0, 3);
      }`;

const replaceMemory = `      // Enhanced Relevance Scoring for Memory
      let memories = await MemoryService.getRelevantMemories(userId, currentMessage, 3);`;

content = content.replace(targetMemory, replaceMemory);
fs.writeFileSync('server/services/ai/aiContextBuilder.ts', content);
console.log("Updated aiContextBuilder");
