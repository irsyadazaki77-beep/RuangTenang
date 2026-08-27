const fs = require('fs');

let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf-8');

content = content.replace(/const res = await fetch\('\/api\/health'\);\n\s*setIsOffline\(!res\.ok\);/g, 
`const res = await apiClient.get('/api/health');
        setIsOffline(!res.success);`);

content = content.replace(/const res = await fetch\('\/api\/v1\/auth\/me', \{ credentials: 'include' \}\);\n\s*if \(res\.ok\) \{\n\s*const data = await res\.json\(\);\n\s*setUser\(data\.user \|\| null\);\n\s*\} else \{\n\s*setUser\(null\);\n\s*\}/g,
`const res = await apiClient.get<any>('/api/v1/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }`);

fs.writeFileSync('src/contexts/AuthContext.tsx', content);
