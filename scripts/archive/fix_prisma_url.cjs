const fs = require('fs');

let content = fs.readFileSync('prisma/schema.prisma', 'utf-8');
content = content.replace(/url {6}= "file:\.\.\/data\/ruangtenang_sqlite\.db"/, 'url      = "file:./ruangtenang_sqlite.db"');
fs.writeFileSync('prisma/schema.prisma', content);
