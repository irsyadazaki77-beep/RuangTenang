import fs from 'fs';
let content = fs.readFileSync('server/__tests__/aiAbusePrevention.test.ts', 'utf8');
content = content.replace("expect(resNormal.status).not.toBe(429);", "console.log(resNormal.body); expect(resNormal.status).not.toBe(429);");
fs.writeFileSync('server/__tests__/aiAbusePrevention.test.ts', content);
