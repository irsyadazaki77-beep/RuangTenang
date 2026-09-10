const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const distDir = path.join(__dirname, '../dist/assets');
if (!fs.existsSync(distDir)) {
  console.log('Dist assets directory not found.');
  process.exit(0);
}

const files = fs.readdirSync(distDir);
let totalGzipSize = 0;
let largestChunkSize = 0;
let largestChunkName = '';

files.forEach(file => {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(path.join(distDir, file));
    const gzipped = zlib.gzipSync(content);
    totalGzipSize += gzipped.length;
    if (gzipped.length > largestChunkSize) {
      largestChunkSize = gzipped.length;
      largestChunkName = file;
    }
  }
});

const totalKb = Math.round(totalGzipSize / 1024);
const largestKb = Math.round(largestChunkSize / 1024);

console.log(`========================================`);
console.log(`PERFORMANCE BUDGET CHECK (GZIPPED)`);
console.log(`========================================`);
console.log(`Total JS Compressed Size: ${totalKb} KB`);
console.log(`Largest Chunk (${largestChunkName}): ${largestKb} KB`);

const TOTAL_BUDGET_KB = 500; // Target is <500 KB total compressed for a rich React app
const CHUNK_BUDGET_KB = 150; // Max chunk size compressed

let failed = false;

if (totalKb > TOTAL_BUDGET_KB) {
  console.error(`❌ ERROR: Total JS compressed size (${totalKb} KB) exceeds budget of ${TOTAL_BUDGET_KB} KB!`);
  failed = true;
} else {
  console.log(`✅ Total JS compressed size is within budget (${TOTAL_BUDGET_KB} KB).`);
}

if (largestKb > CHUNK_BUDGET_KB) {
  console.error(`❌ ERROR: Largest chunk size (${largestKb} KB) exceeds budget of ${CHUNK_BUDGET_KB} KB!`);
  failed = true;
} else {
  console.log(`✅ Largest chunk size is within budget (${CHUNK_BUDGET_KB} KB).`);
}

if (failed) {
  process.exit(1);
} else {
  console.log(`Performance budget check passed.`);
  process.exit(0);
}
