const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Use AuthContext instead
content = content.replace(/export default function App\(\) \{/, 'import { useAuth } from "./contexts/AuthContext";\nexport default function App() {');
content = content.replace(/const \[user, setUser\] = useState<any>\(null\);\n?/, '');
content = content.replace(/const \[loading, setLoading\] = useState\(true\);\n?/, '');
content = content.replace(/const \[isOffline, setIsOffline\] = useState\(false\);\n?/, '');

// Inside App(), replace local check session with useAuth ones.
// Actually, App is wrapped in AuthProvider? Let's check main.tsx.
