const fs = require('fs');

let test1 = fs.readFileSync('server/__tests__/privacy.test.ts', 'utf-8');
test1 = `process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 'a').toString('base64');\n` + test1;
fs.writeFileSync('server/__tests__/privacy.test.ts', test1);

let test2 = fs.readFileSync('server/__tests__/encryptionService.test.ts', 'utf-8');
test2 = `process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 'a').toString('base64');\n` + test2;
fs.writeFileSync('server/__tests__/encryptionService.test.ts', test2);

