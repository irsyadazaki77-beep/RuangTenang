const { execSync } = require('child_process');
try {
  execSync('npm run test:unit', { stdio: 'inherit' });
  console.log('UNIT TESTS PASSED');
} catch(e) {
  console.log('UNIT TESTS FAILED');
}
