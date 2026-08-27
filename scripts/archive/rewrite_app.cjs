const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(/await fetch\(`\/api\/v1\/chat\/\$\{id\}\/title`, \{\n\s*method: 'PUT',\n\s*headers: \{ 'Content-Type': 'application\/json' \},\n\s*credentials: 'include',\n\s*body: JSON\.stringify\(\{ title \}\)\n\s*\}\);/g, 
`await apiClient.put(\`/api/v1/chat/\${id}/title\`, { title });`);

content = content.replace(/await fetch\(`\/api\/v1\/chat\/\$\{id\}\/archive`, \{\n\s*method: 'PUT',\n\s*headers: \{ 'Content-Type': 'application\/json' \},\n\s*credentials: 'include',\n\s*body: JSON\.stringify\(\{ isArchived: nextState \}\)\n\s*\}\);/g,
`await apiClient.put(\`/api/v1/chat/\${id}/archive\`, { isArchived: nextState });`);

fs.writeFileSync('src/App.tsx', content);
