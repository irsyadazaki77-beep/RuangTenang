const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== 'dist' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
        callback(path.join(dir, f));
      }
    }
  });
}

walkDir(__dirname + '/..', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  content = content.replace(/catch \((err|e|error|innerErr|fallbackErr): unknown\)/g, 'catch ($1: any)');
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Reverted in', filePath);
  }
});
