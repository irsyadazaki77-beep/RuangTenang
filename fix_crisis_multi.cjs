const fs = require('fs');
const path = 'server/services/ai/aiSafetyService.ts';

let content = fs.readFileSync(path, 'utf8');

// Modify detectCrisis to take history
const oldDetect = "detectCrisis(text: string): { isCrisis: boolean; reason?: string } {";
const newDetect = "detectCrisis(text: string, history: Array<any> = []): { isCrisis: boolean; reason?: string } {";
content = content.replace(oldDetect, newDetect);

const oldLogic = `const textLower = text.toLowerCase();
    for (const keyword of CRISIS_KEYWORDS) {
      if (textLower.includes(keyword)) {
        return { isCrisis: true, reason: \`Matched keyword: \${keyword}\` };
      }
    }
    return { isCrisis: false };`;

const newLogic = `const textLower = text.toLowerCase();
    
    // Check current message
    for (const keyword of CRISIS_KEYWORDS) {
      if (textLower.includes(keyword)) {
        return { isCrisis: true, reason: \`Matched keyword: \${keyword}\` };
      }
    }
    
    // Multi-turn context check for crisis escalation (simple heuristic)
    if (history && history.length > 0) {
      const recentHistoryText = history.slice(-3).map(h => (h.parts?.[0]?.text || '').toLowerCase()).join(' ');
      const escalationKeywords = ['tidak tahan', 'terlalu berat', 'ingin menyerah', 'putus asa', 'mati saja'];
      let matches = 0;
      for (const keyword of escalationKeywords) {
        if (textLower.includes(keyword) || recentHistoryText.includes(keyword)) {
          matches++;
        }
      }
      if (matches >= 2) {
         return { isCrisis: true, reason: 'Multi-turn crisis escalation detected' };
      }
    }
    
    return { isCrisis: false };`;

content = content.replace(oldLogic, newLogic);

// Call it with history
content = content.replace("const crisisCheck = this.detectCrisis(redactedInput);", "const crisisCheck = this.detectCrisis(redactedInput, input.history);");

fs.writeFileSync(path, content);
console.log('Fixed crisis detection');
