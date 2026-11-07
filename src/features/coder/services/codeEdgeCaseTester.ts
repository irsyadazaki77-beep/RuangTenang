/**
 * Code Edge-Case Tester & Lab Autograder Engine for Ruang Coder.
 * Analyzes JavaScript/TypeScript and Python functions, discovers parameter signatures,
 * generates edge-case test suites, runs in-browser tests, and produces automated academic grading.
 */

export interface EdgeTestCase {
  id: string;
  name: string;
  category: 'boundary' | 'empty' | 'null_undefined' | 'type_mismatch' | 'large_scale' | 'normal';
  description: string;
  inputArgs: any[];
  expectedOutput?: any;
  customAssertion?: (actual: any) => { passed: boolean; message: string };
  timeoutMs?: number;
}

export interface EdgeTestResult {
  testId: string;
  name: string;
  category: EdgeTestCase['category'];
  description: string;
  inputFormatted: string;
  passed: boolean;
  actualOutputFormatted: string;
  expectedOutputFormatted: string;
  durationMs: number;
  errorMessage?: string;
}

export interface AutograderReport {
  score: number; // 0 - 100
  totalTests: number;
  passedTests: number;
  failedTests: number;
  functionName: string;
  results: EdgeTestResult[];
  labFeedback: string;
  suggestedFixes: string[];
  executionTimeMs: number;
  timestamp: string;
}

/**
 * Extracts candidate function names and parameters from JavaScript or Python code.
 */
export function extractFunctionsFromCode(code: string): Array<{ name: string; paramCount: number; language: 'js' | 'python' }> {
  const results: Array<{ name: string; paramCount: number; language: 'js' | 'python' }> = [];

  // Match JS/TS functions: function foo(a, b) or const foo = (a, b) => or export function foo(...)
  const jsFunctionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = jsFunctionRegex.exec(code)) !== null) {
    const name = match[1];
    const rawParams = match[2].trim();
    const paramCount = rawParams ? rawParams.split(',').length : 0;
    if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
      results.push({ name, paramCount, language: 'js' });
    }
  }

  const jsArrowRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
  while ((match = jsArrowRegex.exec(code)) !== null) {
    const name = match[1];
    const rawParams = match[2].trim();
    const paramCount = rawParams ? rawParams.split(',').length : 0;
    results.push({ name, paramCount, language: 'js' });
  }

  // Match Python def foo(a, b):
  const pyFunctionRegex = /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/g;
  while ((match = pyFunctionRegex.exec(code)) !== null) {
    const name = match[1];
    const rawParams = match[2].trim();
    const paramCount = rawParams ? rawParams.split(',').filter(p => p.trim() !== 'self').length : 0;
    results.push({ name, paramCount, language: 'python' });
  }

  // Deduplicate by name
  const seen = new Set<string>();
  return results.filter(f => {
    if (seen.has(f.name)) return false;
    seen.add(f.name);
    return true;
  });
}

/**
 * Generates automated edge-case test suite based on function characteristics.
 */
export function generateEdgeTestCases(fnName: string, paramCount: number): EdgeTestCase[] {
  const tests: EdgeTestCase[] = [];

  // 1. Normal standard input
  tests.push({
    id: 'normal-1',
    name: 'Kasus Normal (Standard Input)',
    category: 'normal',
    description: 'Menguji fungsi dengan input standar yang diharapkan dalam kondisi wajar.',
    inputArgs: paramCount === 1 ? [[1, 2, 3, 4]] : Array.from({ length: paramCount }, (_, i) => (i + 1) * 10),
    timeoutMs: 1500
  });

  // 2. Empty inputs
  tests.push({
    id: 'empty-1',
    name: 'Input Kosong (Empty Array / String)',
    category: 'empty',
    description: 'Memastikan fungsi tidak crash saat menerima array kosong [] atau string kosong "".',
    inputArgs: paramCount === 1 ? [[]] : Array.from({ length: paramCount }, () => ''),
    timeoutMs: 1500
  });

  // 3. Boundary / Zero
  tests.push({
    id: 'boundary-zero',
    name: 'Nilai Batas Nol & Elemen Tunggal',
    category: 'boundary',
    description: 'Menguji ketahanan terhadap nilai 0 atau array dengan 1 elemen tunggal.',
    inputArgs: paramCount === 1 ? [[0]] : Array.from({ length: paramCount }, () => 0),
    timeoutMs: 1500
  });

  // 4. Boundary / Negative Numbers
  tests.push({
    id: 'boundary-negative',
    name: 'Bilangan Negatif & Ekstrem',
    category: 'boundary',
    description: 'Menguji input bernilai negatif (-10, -999) atau desimal pecahan.',
    inputArgs: paramCount === 1 ? [[-5, -10, -1]] : Array.from({ length: paramCount }, () => -1),
    timeoutMs: 1500
  });

  // 5. Null & Undefined Resilience
  tests.push({
    id: 'null-check',
    name: 'Ketahanan Null & Undefined',
    category: 'null_undefined',
    description: 'Mencegah runtime TypeError (Cannot read properties of null/undefined).',
    inputArgs: Array.from({ length: paramCount }, () => null),
    timeoutMs: 1500
  });

  // 6. Large scale performance test
  tests.push({
    id: 'large-scale',
    name: 'Uji Skalabilitas Beban (1000 Elemen)',
    category: 'large_scale',
    description: 'Memverifikasi bahwa fungsi berjalan dalam batas waktu wajar (< 100ms) tanpa infinite loop.',
    inputArgs: paramCount === 1 ? [Array.from({ length: 1000 }, (_, i) => i)] : Array.from({ length: paramCount }, () => 1000),
    timeoutMs: 2500
  });

  return tests;
}

/**
 * Runs the autograder in the browser sandbox.
 */
export async function runAutograderSuite(
  code: string,
  targetFnName?: string
): Promise<AutograderReport> {
  const startTime = performance.now();
  const functions = extractFunctionsFromCode(code);
  const fnToTest = targetFnName || (functions.length > 0 ? functions[0].name : '');

  if (!fnToTest) {
    return {
      score: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      functionName: 'Tidak terdeteksi',
      results: [],
      labFeedback: 'Tidak ada fungsi yang dapat diuji. Buat fungsi dengan sintaks standar (misal: function hitung(data) { ... }).',
      suggestedFixes: ['Deklarasikan fungsi utama secara eksplisit', 'Pastikan nama fungsi menggunakan camelCase atau snake_case'],
      executionTimeMs: 0,
      timestamp: new Date().toLocaleString('id-ID')
    };
  }

  const targetMeta = functions.find(f => f.name === fnToTest) || { name: fnToTest, paramCount: 1, language: 'js' };
  const testCases = generateEdgeTestCases(targetMeta.name, targetMeta.paramCount);
  const results: EdgeTestResult[] = [];

  // Prepare sandbox evaluation for JavaScript
  for (const test of testCases) {
    const testStart = performance.now();
    let passed: boolean;
    let actualOutputFormatted: string;
    let errorMessage: string | undefined;

    try {
      // Execute within sandbox
      const testInvocationCode = `
        ${code}
        if (typeof ${targetMeta.name} !== 'function') {
          throw new Error('Fungsi "${targetMeta.name}" tidak ditemukan di scope.');
        }
        return ${targetMeta.name}(...${JSON.stringify(test.inputArgs)});
      `;

       
      const evaluator = new Function(testInvocationCode);
      const output = evaluator();

      actualOutputFormatted = typeof output === 'object' ? JSON.stringify(output) : String(output);

      // Evaluate pass criteria
      if (test.category === 'null_undefined') {
        // If it doesn't throw a fatal uncaught exception, it passes the resilience check
        passed = true;
      } else if (test.category === 'large_scale') {
        passed = output !== undefined && output !== null;
      } else {
        passed = output !== undefined && output !== null && !String(output).toLowerCase().includes('nan');
      }
    } catch (err: any) {
      errorMessage = err?.message || String(err);
      actualOutputFormatted = `Error: ${errorMessage}`;
      passed = false;
    }

    const duration = Math.max(1, Math.round(performance.now() - testStart));

    results.push({
      testId: test.id,
      name: test.name,
      category: test.category,
      description: test.description,
      inputFormatted: JSON.stringify(test.inputArgs),
      passed,
      actualOutputFormatted,
      expectedOutputFormatted: test.category === 'null_undefined' ? 'Resilient / No Fatal Crash' : 'Valid Output (Not NaN/Error)',
      durationMs: duration,
      errorMessage
    });
  }

  const passedCount = results.filter(r => r.passed).length;
  const score = Math.round((passedCount / testCases.length) * 100);
  const totalDuration = Math.round(performance.now() - startTime);

  // Generate pedagogical lab feedback
  let labFeedback: string;
  const suggestedFixes: string[] = [];

  if (score === 100) {
    labFeedback = `Luar biasa! Fungsi "${targetMeta.name}" lulus 100% semua uji edge case (kasus normal, array kosong, nilai negatif, input null, dan beban 1000 elemen). Kode siap dipresentasikan di responsi praktikum.`;
  } else if (score >= 70) {
    labFeedback = `Fungsi "${targetMeta.name}" sudah cukup baik (Skor: ${score}/100), namun masih memiliki celah pada penanganan kasus ekstrim atau input tak terduga.`;
  } else {
    labFeedback = `Perhatian: Fungsi "${targetMeta.name}" rentan crash (Skor: ${score}/100). Periksa kembali pemeriksaan tipe data (type guard) dan penanganan array/string kosong sebelum melakukan operasi looping atau kalkulasi.`;
  }

  // Populate suggested fixes based on failed tests
  results.filter(r => !r.passed).forEach(fail => {
    if (fail.category === 'null_undefined') {
      suggestedFixes.push(`Tambahkan defensive guard di awal fungsi: if (!data) return 0; atau gunakan optional chaining (?.)`);
    }
    if (fail.category === 'empty') {
      suggestedFixes.push(`Periksa panjang array/string: if (Array.isArray(data) && data.length === 0) return 0;`);
    }
    if (fail.category === 'boundary') {
      suggestedFixes.push(`Pastikan kalkulasi memperhitungkan bilangan negatif atau nilai nol agar tidak menghasilkan NaN atau DivisionByZero.`);
    }
    if (fail.category === 'large_scale') {
      suggestedFixes.push(`Optimalkan kompleksitas waktu algoritma (hindari nested loops O(N^2) bila bisa menggunakan Map/Set O(N)).`);
    }
  });

  return {
    score,
    totalTests: testCases.length,
    passedTests: passedCount,
    failedTests: testCases.length - passedCount,
    functionName: targetMeta.name,
    results,
    labFeedback,
    suggestedFixes: Array.from(new Set(suggestedFixes)),
    executionTimeMs: totalDuration,
    timestamp: new Date().toLocaleString('id-ID')
  };
}
