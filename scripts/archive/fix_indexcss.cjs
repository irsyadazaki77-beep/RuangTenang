const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf-8');
content = content.replace(/overflow-x: hidden;/g, '');
fs.writeFileSync('src/index.css', content);
