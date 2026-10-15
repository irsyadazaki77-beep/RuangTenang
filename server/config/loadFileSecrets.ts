import fs from 'fs';

/** Load Docker Compose mounted secrets before configuration modules read process.env. */
const localEnvironment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

for (const [name, filePath] of Object.entries(process.env)) {
  if (!name.endsWith('_FILE') || !filePath?.trim()) continue;
  const targetName = name.slice(0, -5);
  if (!targetName || (localEnvironment && process.env[targetName])) continue;

  try {
    process.env[targetName] = fs.readFileSync(filePath.trim(), 'utf8').replace(/\r?\n$/, '');
  } catch (error) {
    if (!localEnvironment) {
      throw new Error(`Required mounted secret file for ${targetName} could not be read.`);
    }
    console.warn(`[SECRETS] Optional local secret file for ${targetName} could not be read.`);
  }
}

if (!localEnvironment) {
  for (const required of ['JWT_SECRET', 'ENCRYPTION_KEY', 'BLIND_INDEX_SECRET', 'BACKUP_ENCRYPTION_KEY', 'DATABASE_URL']) {
    if (!process.env[`${required}_FILE`] || !process.env[required]) {
      throw new Error(`Required production secret ${required} must be provided through a mounted file.`);
    }
  }
}
