import { CodeValidationResult } from './codeExecutionTypes';

/**
 * Validasi statis murni tanpa eksekusi kode (tidak menggunakan eval / new Function / runtime palsu).
 * Menyajikan feedback struktural yang jujur dan akurat.
 */
export function validateCodeStatically(code: string, languageRaw?: string): CodeValidationResult {
  const language = (languageRaw || 'plaintext').trim().toLowerCase();
  const warnings: string[] = [];
  const stderr: string[] = [];
  const stdout: string[] = [];

  const trimmed = code.trim();
  if (!trimmed) {
    return {
      mode: 'static',
      language,
      status: 'completed',
      stdout: [],
      stderr: [],
      warnings: ['Kode kosong (tidak ada konten untuk dianalisis).'],
      durationMs: 0,
      message: 'Kode kosong.'
    };
  }

  // 1. Analisis Keseimbangan Tanda Kurung / Kurawal (Bracket Balance Check)
  const bracketStack: { char: string; line: number; col: number }[] = [];
  const bracketPairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  const lines = code.split('\n');

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    inLineComment = false;

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      const prevChar = charIdx > 0 ? line[charIdx - 1] : '';
      const nextChar = charIdx < line.length - 1 ? line[charIdx + 1] : '';

      // Skip escaped characters inside strings
      if ((inSingleQuote || inDoubleQuote || inBacktick) && prevChar === '\\') {
        continue;
      }

      // Handle comments based on language
      if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
        if (!inBlockComment && char === '/' && nextChar === '/') {
          inLineComment = true;
          break; // Sisa baris adalah comment
        }
        if (!inBlockComment && (language.includes('python') || language === 'py' || language.includes('shell') || language.includes('bash') || language.includes('sh') || language.includes('r')) && char === '#') {
          inLineComment = true;
          break;
        }
        if (!inBlockComment && (language.includes('sql')) && char === '-' && nextChar === '-') {
          inLineComment = true;
          break;
        }
        if (!inBlockComment && char === '/' && nextChar === '*') {
          inBlockComment = true;
          charIdx++;
          continue;
        }
        if (inBlockComment && char === '*' && nextChar === '/') {
          inBlockComment = false;
          charIdx++;
          continue;
        }
      }

      if (inLineComment || inBlockComment) continue;

      // Handle quotes
      if (char === "'" && !inDoubleQuote && !inBacktick) {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (char === '"' && !inSingleQuote && !inBacktick) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inBacktick = !inBacktick;
        continue;
      }

      if (inSingleQuote || inDoubleQuote || inBacktick) continue;

      // Check brackets
      if (char === '(' || char === '{' || char === '[') {
        bracketStack.push({ char, line: lineIdx + 1, col: charIdx + 1 });
      } else if (char === ')' || char === '}' || char === ']') {
        const expectedOpen = bracketPairs[char];
        if (bracketStack.length === 0) {
          stderr.push(`Karakter kurung tutup '${char}' tidak berpasangan di baris ${lineIdx + 1}, kolom ${charIdx + 1}.`);
        } else {
          const lastOpen = bracketStack.pop()!;
          if (lastOpen.char !== expectedOpen) {
            stderr.push(
              `Kurung tidak cocok: '${lastOpen.char}' (baris ${lastOpen.line}) ditutup oleh '${char}' (baris ${lineIdx + 1}, kolom ${charIdx + 1}).`
            );
          }
        }
      }
    }
  }

  while (bracketStack.length > 0) {
    const unclosed = bracketStack.pop()!;
    stderr.push(`Karakter '${unclosed.char}' di baris ${unclosed.line}, kolom ${unclosed.col} belum ditutup.`);
  }

  // 2. Language-specific static inspections
  if (language.includes('python') || language === 'py') {
    // Check missing colons on def, class, if, elif, else, for, while, try, except, finally, with
    const compoundKeywords = ['def ', 'class ', 'if ', 'elif ', 'else:', 'for ', 'while ', 'try:', 'except', 'finally:', 'with '];
    lines.forEach((l, idx) => {
      const trimmedLine = l.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;

      for (const kw of compoundKeywords) {
        if (trimmedLine.startsWith(kw)) {
          // Remove comments at end of line
          const codePart = trimmedLine.split('#')[0].trim();
          if (!codePart.endsWith(':')) {
            stderr.push(`Baris ${idx + 1}: Pernyataan '${kw.trim()}' harus diakhiri dengan tanda titik dua ':'.`);
          }
          break;
        }
      }
    });

    stdout.push('Pemeriksaan statis struktur Python selesai.');
    warnings.push('Eksekusi Python belum tersedia di browser. Kode ini belum dijalankan di interpreter Python asli.');
  } else if (language.includes('sql')) {
    // Deteksi query destruktif secara statis
    const upper = code.toUpperCase();
    const destructiveTokens = ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE', 'DELETE FROM', 'ALTER TABLE'];
    const matchedDestructive = destructiveTokens.filter(t => upper.includes(t));

    if (matchedDestructive.length > 0) {
      warnings.push(`Perhatian: Query mengandung operasi berpotensi destruktif (${matchedDestructive.join(', ')}).`);
    }

    // Basic semicolon check
    if (!trimmed.endsWith(';')) {
      warnings.push('Saran: Query belum diakhiri dengan titik koma (;).');
    }

    stdout.push('Pemeriksaan statis SQL selesai.');
    warnings.push('Query SQL belum dijalankan ke database. Pemeriksaan hanya menganalisis struktur dasar.');
  } else if (language.includes('typescript') || language === 'ts') {
    stdout.push('Pemeriksaan struktur TypeScript dasar selesai.');
    warnings.push('Eksekusi TypeScript langsung belum tersedia di sandbox browser. Gunakan pemeriksaan statis.');
  } else if (language.includes('javascript') || language === 'js') {
    stdout.push('Pemeriksaan statis JavaScript selesai.');
  } else {
    stdout.push(`Pemeriksaan statis dasar untuk bahasa '${language}' selesai.`);
    warnings.push(`Runtime untuk bahasa '${language}' tidak tersedia. Pemeriksaan bersifat statis.`);
  }

  const hasErrors = stderr.length > 0;

  return {
    mode: 'static',
    language,
    status: hasErrors ? 'error' : 'completed',
    stdout,
    stderr,
    warnings,
    durationMs: 5,
    message: hasErrors
      ? 'Ditemukan potensi kesalahan struktural pada kode.'
      : 'Tidak ditemukan kesalahan struktural dasar.'
  };
}
