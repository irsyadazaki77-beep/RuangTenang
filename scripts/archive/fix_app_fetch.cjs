const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace await fetch with apiClient calls
if (!content.includes('import { apiClient }')) {
  content = content.replace(/import \{ useAuth \} from "\.\/contexts\/AuthContext";/, 'import { useAuth } from "./contexts/AuthContext";\nimport { apiClient } from "./lib/apiClient";');
}

// Lines 50, 89, 101, 117, 131, 147 
// These need manual conversion because of json parsing and .ok checks.
// Let's rewrite the functions in App.tsx.

// fetchChats
content = content.replace(/const res = await fetch\('\/api\/chat\/history', \{ credentials: 'include' \}\);\n\s*if \(res\.ok\) \{\n\s*const data = await res\.json\(\);\n\s*if \(Array\.isArray\(data\)\) setChats\(data\);\n\s*else setChats\(\[\]\);\n\s*\} else \{\n\s*setChats\(\[\]\);\n\s*if \(res\.status !== 401\) \{\n\s*console\.warn\('Fetch chats response status:', res\.status\);\n\s*\}\n\s*\}/g,
`const res = await apiClient.get<Chat[]>('/api/chat/history');
      if (res.success && Array.isArray(res.data)) {
        setChats(res.data);
      } else {
        setChats([]);
        if (res.status !== 401) {
          console.warn('Fetch chats failed:', res.error);
        }
      }`);

// handleDeleteChat
content = content.replace(/await fetch\(`\/api\/chat\/\$\{id\}`\, \{ method: 'DELETE', credentials: 'include' \}\);/g, `await apiClient.delete(\`/api/chat/\${id}\`);`);

// handleRenameChat
content = content.replace(/await fetch\(`\/api\/chat\/\$\{id\}\/title`, \{\n\s*method: 'PUT',\n\s*headers: \{ 'Content-Type': 'application\/json' \},\n\s*body: JSON\.stringify\(\{ title: newTitle \}\),\n\s*credentials: 'include',\n\s*\}\);/g,
`await apiClient.put(\`/api/chat/\${id}/title\`, { title: newTitle });`);

// handleTogglePin
content = content.replace(/await fetch\(`\/api\/chat\/\$\{id\}\/pin`, \{ method: 'PUT', credentials: 'include' \}\);/g,
`await apiClient.put(\`/api/chat/\${id}/pin\`);`);

// handleToggleArchive
content = content.replace(/await fetch\(`\/api\/chat\/\$\{id\}\/archive`, \{\n\s*method: 'PUT',\n\s*headers: \{ 'Content-Type': 'application\/json' \},\n\s*body: JSON\.stringify\(\{ isArchived \}\),\n\s*credentials: 'include'\n\s*\}\);/g,
`await apiClient.put(\`/api/chat/\${id}/archive\`, { isArchived });`);

// handleLogout
content = content.replace(/await fetch\('\/api\/auth\/logout', \{ method: 'POST', credentials: 'include' \}\);/g, `await apiClient.post('/api/auth/logout');`);

fs.writeFileSync('src/App.tsx', content);
