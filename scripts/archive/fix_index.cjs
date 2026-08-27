const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf-8');
content = content.replace(/maximum-scale=1\.0, user-scalable=no, /, '');
fs.writeFileSync('index.html', content);
