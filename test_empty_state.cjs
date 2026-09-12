const fs = require('fs');

// The main issue in the UI trace was EmptyState having an undefined component, 
// usually caused by a typo in the import or icon map. The previous fix script for empty state 
// ran, but let's make sure it's strictly correct.
const es = fs.readFileSync('src/components/common/EmptyState.tsx', 'utf8');
console.log(es.includes('info: Info,'));
