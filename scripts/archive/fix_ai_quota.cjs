const fs = require('fs');

let content = fs.readFileSync('src/components/AiQuotaBadge.tsx', 'utf-8');

content = content.replace(/const res = await fetch\(`\/api\/v1\/user\/usage-stats\?userId=\$\{userId\}&userTier=\$\{userTier\}`, \{ credentials: 'include' \}\);\n\s*if \(res\.ok\) \{\n\s*const data = await res\.json\(\);\n\s*setStats\(data\);\n\s*\}/g,
`const res = await apiClient.get<any>(\`/api/v1/user/usage-stats?userId=\${userId}&userTier=\${userTier}\`);
      if (res.success && res.data) {
        setStats(res.data);
      }`);

fs.writeFileSync('src/components/AiQuotaBadge.tsx', content);
