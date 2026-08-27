const fs = require('fs');

function replaceInFile(file, regex, replacement) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
}

replaceInFile('src/contexts/AuthContext.tsx', /\/api\/auth\//g, '/api/v1/auth/');
replaceInFile('src/App.tsx', /\/api\/auth\//g, '/api/v1/auth/');
replaceInFile('src/App.tsx', /\/api\/chat\//g, '/api/v1/chat/');

