const fs = require('fs');
let content = fs.readFileSync('server/services/ai/aiSafetyService.ts', 'utf8');

const targetInstruction = `Daftar nama_plugin yang valid: "screening", "mood", "counselors", "emergency", "articles".`;
const replaceInstruction = `Daftar nama_plugin yang valid: "screening", "mood", "counselors", "emergency", "articles", "ai_memory". 
Jika pengguna meminta kamu mengingat sesuatu atau kamu menemukan informasi personal yang penting untuk diingat jangka panjang, gunakan tool "ai_memory" dengan parameter {"action": "save", "content": "fakta singkat", "reason": "Menyimpan konteks penting"}.`;

content = content.replace(targetInstruction, replaceInstruction);
fs.writeFileSync('server/services/ai/aiSafetyService.ts', content);
console.log("Updated aiSafetyService");
