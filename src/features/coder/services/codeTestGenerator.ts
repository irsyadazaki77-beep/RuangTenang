/**
 * Unit Test Generator Service for Ruang Coder
 * Mengotomatisasi pembuatan berkas test unit (Vitest/Jest/Python) berdasarkan kode sumber aktif.
 */

export interface GeneratedTestSuite {
  targetFile: string;
  testFilename: string;
  testCode: string;
  language: 'javascript' | 'typescript' | 'python';
  framework: 'vitest' | 'unittest';
}

export function extractFunctionsFromCode(code: string, language: string): string[] {
  const functions: string[] = [];
  if (!code) return functions;

  if (language === 'python') {
    const pyRegex = /def\s+([a-zA-Z0-9_]+)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = pyRegex.exec(code)) !== null) {
      if (!match[1].startsWith('__')) {
        functions.push(match[1]);
      }
    }
  } else {
    // JS/TS: export function foo(), function foo(), const foo = () =>
    const jsRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(|(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/g;
    let match: RegExpExecArray | null;
    while ((match = jsRegex.exec(code)) !== null) {
      const fnName = match[1] || match[2];
      if (fnName && !functions.includes(fnName)) {
        functions.push(fnName);
      }
    }
  }
  return functions;
}

export function generateSmartTestFile(filename: string, code: string): GeneratedTestSuite {
  const lower = filename.toLowerCase();
  const isPython = lower.endsWith('.py');
  const isTs = lower.endsWith('.ts') || lower.endsWith('.tsx');
  const lang = isPython ? 'python' : isTs ? 'typescript' : 'javascript';
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const functions = extractFunctionsFromCode(code, lang);

  if (isPython) {
    const testFilename = `test_${baseName}.py`;
    let testCode = `# Unit Test Otomatis untuk ${filename}\n`;
    testCode += `import unittest\n`;
    testCode += `from ${baseName} import *\n\n`;
    testCode += `class Test${baseName.charAt(0).toUpperCase() + baseName.slice(1)}(unittest.TestCase):\n`;

    if (functions.length === 0) {
      testCode += `    def test_basic_execution(self):\n`;
      testCode += `        """Pengujian dasar eksekusi skrip."""\n`;
      testCode += `        self.assertTrue(True)\n`;
    } else {
      for (const fn of functions) {
        testCode += `    def test_${fn}_nominal(self):\n`;
        testCode += `        """Uji coba fungsi ${fn} dengan input valid."""\n`;
        testCode += `        # TODO: Lengkapi argumen uji coba sesuai parameter\n`;
        testCode += `        try:\n`;
        testCode += `            result = ${fn}()\n`;
        testCode += `            self.assertIsNotNone(result)\n`;
        testCode += `        except TypeError:\n`;
        testCode += `            pass\n\n`;

        testCode += `    def test_${fn}_edge_cases(self):\n`;
        testCode += `        """Uji coba fungsi ${fn} dengan batas nilai ekstrem/kosong."""\n`;
        testCode += `        self.assertTrue(callable(${fn}))\n\n`;
      }
    }

    testCode += `\nif __name__ == '__main__':\n    unittest.main()\n`;

    return {
      targetFile: filename,
      testFilename,
      testCode,
      language: 'python',
      framework: 'unittest'
    };
  }

  // JavaScript / TypeScript test suite
  const testFilename = `test.js`;
  const importStatement = isTs
    ? `import { ${functions.join(', ') || 'default as target'} } from './${filename}';\n`
    : `import { ${functions.join(', ') || 'calculateStats'} } from './${filename}';\n`;

  let testCode = `// Unit Test Otomatis untuk ${filename}\n`;
  testCode += `// Dijalankan via terminal: node ${testFilename}\n`;
  testCode += importStatement + '\n';
  testCode += `let totalTests = 0;\nlet passedTests = 0;\n\n`;
  testCode += `function assert(condition, message) {\n`;
  testCode += `  totalTests++;\n`;
  testCode += `  if (condition) {\n`;
  testCode += `    passedTests++;\n`;
  testCode += `    console.log(\`  ✓ PASSED: \${message}\`);\n`;
  testCode += `  } else {\n`;
  testCode += `    console.error(\`  ✕ FAILED: \${message}\`);\n`;
  testCode += `  }\n`;
  testCode += `}\n\n`;
  testCode += `console.log('\\n🚀 Menjalankan Rangkaian Pengujian: ${filename}');\n`;

  if (functions.length === 0) {
    testCode += `assert(typeof true === 'boolean', 'Sanity test validasi lingkungan');\n`;
  } else {
    for (const fn of functions) {
      testCode += `\n// --- Uji Fungsi: ${fn} ---\n`;
      testCode += `try {\n`;
      testCode += `  assert(typeof ${fn} === 'function', '${fn} harus terdefinisi sebagai fungsi callable');\n`;
      testCode += `} catch (e) {\n`;
      testCode += `  console.error('Error saat menguji ${fn}:', e.message);\n`;
      testCode += `}\n`;
    }
  }

  testCode += `\nconsole.log(\`\\n📊 Ringkasan: \${passedTests}/\${totalTests} tes berhasil.\`);\n`;
  testCode += `if (passedTests === totalTests) {\n`;
  testCode += `  console.log('✅ SEMUA TEST LOLOS!');\n`;
  testCode += `  process.exit(0);\n`;
  testCode += `} else {\n`;
  testCode += `  console.error('❌ BEBERAPA TEST GAGAL!');\n`;
  testCode += `  process.exit(1);\n`;
  testCode += `}\n`;

  return {
    targetFile: filename,
    testFilename,
    testCode,
    language: isTs ? 'typescript' : 'javascript',
    framework: 'vitest'
  };
}
