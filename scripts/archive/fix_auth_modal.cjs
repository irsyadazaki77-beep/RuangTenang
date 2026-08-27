const fs = require('fs');
let content = fs.readFileSync('src/features/authentication/AuthModal.tsx', 'utf-8');

// Replace the LoginForm render part
content = content.replace(
  /<form onSubmit=\{handleLoginSubmit\} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">[\s\S]*?<\/form>/,
  `<LoginForm 
              onSuccess={(user) => {
                onLogin(user);
                onClose();
              }}
              onRequireMfa={(userId, token) => {
                setPendingUserId(userId);
                setMfaToken(token);
                setActiveTab('mfa');
              }}
              onForgotPassword={() => setActiveTab('forgot')}
              setGlobalError={setErrorMsg}
            />`
);

if (!content.includes('import { LoginForm }')) {
  content = content.replace(/import \{ apiClient \} from '\.\.\/\.\.\/lib\/apiClient';/, `import { apiClient } from '../../lib/apiClient';\nimport { LoginForm } from './components/LoginForm';`);
}

fs.writeFileSync('src/features/authentication/AuthModal.tsx', content);
