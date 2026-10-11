// Portable (Windows/Linux) memory-diagnostic unit run. Logs only file paths and numbers.
const { spawnSync } = require('node:child_process');
const env = { ...process.env, VITEST_MEMORY_DIAG: '1', NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --expose-gc`.trim() };
const args = ['vitest', 'run', 'src/__tests__/unit', 'server/__tests__/unit', '--fileParallelism=false', ...process.argv.slice(2)];
const r = spawnSync('npx', args, { stdio: 'inherit', env, shell: true });
process.exit(r.status ?? 1);
