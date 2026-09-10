const fs = require('fs');
const content = fs.readFileSync('eslint.config.js', 'utf8');
const replacement = `    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['src/__tests__/**/*', 'server/__tests__/**/*', 'server/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
);`;
const updated = content.replace(/ {4}settings: {[\s\S]*? {4}}\n {2}}\n\);/, replacement);
fs.writeFileSync('eslint.config.js', updated);
