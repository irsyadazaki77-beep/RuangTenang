const { execSync } = require('child_process');
try {
  execSync('npm run test:e2e', { stdio: 'inherit' });
  console.log('E2E TESTS PASSED');
} catch(e) {
  console.log('E2E TESTS FAILED');
}
