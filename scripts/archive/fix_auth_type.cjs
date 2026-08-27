const fs = require('fs');

let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf-8');
content = content.replace(/export interface UserSession \{[\s\S]*?\}/, "import { UserSession } from '../types';");

fs.writeFileSync('src/contexts/AuthContext.tsx', content);
