const { execSync } = require('child_process');

try {
  execSync('npm run typecheck', { stdio: 'inherit' });
  console.log('TYPECHECK PASSED');
} catch(e) {
  console.log('TYPECHECK FAILED');
}
