const fs = require('fs');
const path = 'server/services/ai/aiContextBuilder.ts';

let content = fs.readFileSync(path, 'utf8');

const oldMemoryBlock = `      const memories = await prisma.userMemories.findMany({
        where: { userId, isActive: true },
        take: 2
      });`;

const newMemoryBlock = `      // Relevance Scoring for Memory
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

content = content.replace(oldMemoryBlock, newMemoryBlock);

fs.writeFileSync(path, content);
console.log('Added relevance scoring to aiContextBuilder');
