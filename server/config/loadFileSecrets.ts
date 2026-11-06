import fs from 'fs';

/** Load Docker Compose mounted secrets or local /secrets/* files before configuration modules read process.env. */
try {
  for (const [name, filePath] of Object.entries(process.env)) {
    if (!name.endsWith('_FILE') || !filePath?.trim()) continue;
    const targetName = name.slice(0, -5);
    if (!targetName || process.env[targetName]?.trim()) continue;

    try {
      if (fs.existsSync(filePath.trim())) {
        process.env[targetName] = fs.readFileSync(filePath.trim(), 'utf8').trim();
      }
    } catch {
      // Benign warning for optional secret file in dev/container
    }
  }

  // Additional secret resolution if needed
} catch {
  // Ignore top-level secret resolution errors
}
