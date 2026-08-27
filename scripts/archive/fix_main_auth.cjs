const fs = require('fs');
let content = fs.readFileSync('src/main.tsx', 'utf-8');

content = content.replace(/import \{ ToastProvider \} from '\.\/components\/Toast';/, 'import { ToastProvider } from "./components/Toast";\nimport { AuthProvider } from "./contexts/AuthContext";');

content = content.replace(/<ToastProvider>\s*<App \/>\s*<\/ToastProvider>/, '<AuthProvider><ToastProvider>\n          <App />\n        </ToastProvider></AuthProvider>');

fs.writeFileSync('src/main.tsx', content);
