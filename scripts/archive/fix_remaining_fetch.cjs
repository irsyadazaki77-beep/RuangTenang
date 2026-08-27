const fs = require('fs');

function replaceFetchWithApiClient(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // App.tsx uses fetch for title and archive because they weren't caught correctly previously
  if (filePath === 'src/App.tsx') {
    content = content.replace(/await fetch\(`\/api\/v1\/chat\/\$\{id\}\/title`, \{\n\s*method: 'PUT',\n\s*headers: \{ 'Content-Type': 'application\/json' \},\n\s*body: JSON\.stringify\(\{ title: newTitle \}\),\n\s*credentials: 'include',\n\s*\}\);/g, 
      `await apiClient.put(\`/api/v1/chat/\${id}/title\`, { title: newTitle });`);
      
    content = content.replace(/await fetch\(`\/api\/v1\/chat\/\$\{id\}\/archive`, \{\n\s*method: 'PUT',\n\s*headers: \{ 'Content-Type': 'application\/json' \},\n\s*body: JSON\.stringify\(\{ isArchived \}\),\n\s*credentials: 'include'\n\s*\}\);/g,
      `await apiClient.put(\`/api/v1/chat/\${id}/archive\`, { isArchived });`);
  }
  
  if (filePath === 'src/contexts/AuthContext.tsx') {
    if (!content.includes('import { apiClient }')) {
      content = content.replace(/import React/, 'import { apiClient } from "../lib/apiClient";\nimport React');
    }
    content = content.replace(/const res = await fetch\('\/api\/v1\/auth\/me', \{ credentials: 'include' \}\);\n\s*if \(res\.ok\) \{\n\s*const data = await res\.json\(\);\n\s*setUser\(data\.user\);\n\s*\} else \{\n\s*setUser\(null\);\n\s*\}/g,
    `const res = await apiClient.get<any>('/api/v1/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }`);
      
    content = content.replace(/await fetch\('\/api\/v1\/auth\/logout', \{ method: 'POST', credentials: 'include' \}\);/g,
      `await apiClient.post('/api/v1/auth/logout');`);
  }

  if (filePath === 'src/components/AiQuotaBadge.tsx') {
    if (!content.includes('import { apiClient }')) {
      content = content.replace(/import React/, 'import { apiClient } from "../lib/apiClient";\nimport React');
    }
    content = content.replace(/const res = await fetch\(`\/api\/v1\/user\/usage-stats\?userId=\$\{userId\}&userTier=\$\{userTier\}`, \{ credentials: 'include' \}\);\n\s*if \(res\.ok\) \{\n\s*const data = await res\.json\(\);\n\s*setStats\(data\);\n\s*\}/g,
    `const res = await apiClient.get<any>(\`/api/v1/user/usage-stats?userId=\${userId}&userTier=\${userTier}\`);
      if (res.success && res.data) {
        setStats(res.data);
      }`);
  }

  if (filePath === 'src/features/mood/UserProgressTracker.tsx') {
    if (!content.includes('import { apiClient }')) {
      content = content.replace(/import React/, 'import { apiClient } from "../../lib/apiClient";\nimport React');
    }
    content = content.replace(/const res = await fetch\('\/api\/v1\/user\/usage-stats'\);\n\s*if \(res\.ok\) \{\n\s*const data = await res\.json\(\);\n\s*setUsageStats\(data\);\n\s*\}/g,
    `const res = await apiClient.get<any>('/api/v1/user/usage-stats');
      if (res.success && res.data) {
        setUsageStats(res.data);
      }`);
  }

  fs.writeFileSync(filePath, content);
}

replaceFetchWithApiClient('src/App.tsx');
replaceFetchWithApiClient('src/contexts/AuthContext.tsx');
replaceFetchWithApiClient('src/components/AiQuotaBadge.tsx');
replaceFetchWithApiClient('src/features/mood/UserProgressTracker.tsx');

