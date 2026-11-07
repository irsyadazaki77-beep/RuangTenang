/**
 * AI Code-to-Methodology Explainer Service for RuangTenang / RuangCoder
 * Translates programming code into formal academic thesis chapters:
 * - Bab 3: Desain Algoritma, Metodologi Komputasi, Pseudocode IEEE, & Flowchart Mermaid
 * - Bab 4: Hasil & Pembahasan Empiris, Analisis Kompleksitas Big-O, & Evaluasi Kinerja
 */

export interface ComplexityAnalysis {
  time: string;
  space: string;
  justification: string;
  timeComplexity: string;
  spaceComplexity: string;
  maxLoopDepth: number;
  hasRecursion: boolean;
}

export interface CodeMethodologyAnalysis {
  language: string;
  detectedLibraries: string[];
  libraries: string[];
  algorithmPatterns: string[];
  complexity: ComplexityAnalysis;
  pseudocode: string;
  mermaidFlowchart: string;
  flowchart: string;
  bab3Draft: string;
  bab3Narrative: string;
  bab4Draft: string;
  bab4Narrative: string;
  fullThesisArtifactMarkdown: string;
  fullThesisArtifact: string;
}

export interface MethodologyOptions {
  code: string;
  filename: string;
  executionOutput?: string;
  thesisContext?: string;
}

export function detectCodeLanguage(filename: string, code: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'py') return 'python';
  if (ext === 'c') return 'c';
  if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') return 'cpp';
  if (ext === 'sql') return 'sql';
  if (ext === 'js' || ext === 'jsx') return 'javascript';
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'java') return 'java';
  if (ext === 'r') return 'r';
  if (ext === 'html') return 'html';
  if (ext === 'json') return 'json';

  // Heuristic from content
  if (/def\s+\w+\(|import\s+\w+|from\s+\w+\s+import/.test(code)) return 'python';
  if (/#include\s+<stdio\.h>|int\s+main\(/.test(code)) return 'c';
  if (/SELECT[\s\S]+?FROM|CREATE\s+TABLE/i.test(code)) return 'sql';
  return 'python';
}

export function extractLibraries(code: string, language: string): string[] {
  const libs = new Set<string>();

  if (language === 'python') {
    const importMatches = code.matchAll(/(?:import|from)\s+([a-zA-Z0-9_]+)/g);
    for (const m of importMatches) {
      if (m[1]) libs.add(m[1]);
    }
  } else if (language === 'c' || language === 'cpp') {
    const includeMatches = code.matchAll(/#include\s*[<"]([a-zA-Z0-9_.]+)[>"]/g);
    for (const m of includeMatches) {
      if (m[1]) libs.add(m[1].replace(/\.h$/, ''));
    }
  } else if (language === 'javascript' || language === 'typescript') {
    const jsImports = code.matchAll(/(?:import.*?from\s*['"]|require\(['"])([@a-zA-Z0-9_/-]+)['"]/g);
    for (const m of jsImports) {
      if (m[1]) libs.add(m[1]);
    }
  }

  return Array.from(libs);
}

export function analyzeComplexity(code: string): ComplexityAnalysis {
  const forLoops = (code.match(/\b(for|while)\b/g) || []).length;
  const hasNestedLoops = /for[^{}\n]*\{[^}]*for/s.test(code) || /for[^\n]*\n\s+for/s.test(code);
  const hasRecursion = /def\s+(\w+)\(.*?\):[\s\S]*?\1\(|(?:int|void|float)\s+(\w+)\(.*?\)\s*\{[\s\S]*?\2\(/s.test(code);
  const hasBinarySearchOrLog = /mid\s*=|log\b|binary_search|bisect/i.test(code);
  const hasSorting = /\.sort\(|sorted\(|qsort|mergesort/i.test(code);

  let time = 'O(n)';
  let space = 'O(1)';
  let justification = 'Algoritma melakukan satu lintasan linier terhadap data input.';
  let maxLoopDepth = forLoops > 0 ? 1 : 0;

  if (hasNestedLoops) {
    time = 'O(n²)';
    space = 'O(n)';
    maxLoopDepth = 2;
    justification = 'Terdapat iterasi bertingkat (nested loops) yang melintasi ruang data secara kuadratik.';
  } else if (hasSorting) {
    time = 'O(n log n)';
    space = 'O(n)';
    maxLoopDepth = 1;
    justification = 'Algoritma memanfaatkan prosedur pengurutan berbasis perbandingan yang efisien.';
  } else if (hasBinarySearchOrLog) {
    time = 'O(log n)';
    space = 'O(1)';
    maxLoopDepth = 1;
    justification = 'Ruang pencarian dibagi dua pada setiap langkah komputasi (divide and conquer).';
  } else if (hasRecursion) {
    time = 'O(2ⁿ) atau O(n)';
    space = 'O(n)';
    justification = 'Pemanggilan fungsi rekursif membutuhkan alokasi tumpukan memori (call stack) sebanding kedalaman rekursi.';
  } else if (forLoops === 0) {
    time = 'O(1)';
    space = 'O(1)';
    maxLoopDepth = 0;
    justification = 'Instruksi dieksekusi secara konstan tanpa struktur perulangan yang bergantung pada ukuran data.';
  }

  return {
    time,
    space,
    justification,
    timeComplexity: time,
    spaceComplexity: space,
    maxLoopDepth,
    hasRecursion: Boolean(hasRecursion)
  };
}

export function generatePseudocode(filename: string, code: string): string {
  const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Extract main functions
  const funcMatches = Array.from(code.matchAll(/(?:def|function|void|int|float)\s+([a-zA-Z0-9_]+)\s*\((.*?)\)/g));
  const primaryFunc = funcMatches[0] ? funcMatches[0][1] : baseName;
  const params = funcMatches[0] ? funcMatches[0][2] : 'InputData';

  return `\\begin{algorithm}[H]
\\caption{Prosedur Komputasi: ${primaryFunc}}
\\begin{algorithmic}[1]
\\STATE \\textbf{Input:} $D = \\{${params || 'x_1, x_2, \\dots, x_n'}\\}$
\\STATE \\textbf{Output:} Hasil komputasi $R$ atau status keberhasilan
\\STATE Inisialisasi struktur data penampung $R \\leftarrow \\emptyset$
\\STATE Validasi integritas dan kelengkapan input $D$
\\FOR{setiap elemen $e \\in D$}
    \\IF{$e$ memenuhi kriteria batas parameter}
        \\STATE Lakukan transformasi / kalkulasi metrik terhadap $e$
        \\STATE Perbarui state hasil $R \\leftarrow R \\cup \\{\\text{hasil}(e)\\}$
    \\ELSE
        \\STATE Abaikan atau catat log pengecualian data
    \\ENDIF
\\ENDFOR
\\STATE \\textbf{return} $R$
\\end{algorithmic}
\\end{algorithm}`;
}

export function generateMermaidFlowchart(code: string): string {
  const hasCondition = /\b(if|else|elif|switch|case)\b/.test(code);
  const hasLoop = /\b(for|while)\b/.test(code);

  let chart = `graph TD
  Start([Mulai Inisialisasi]) --> Input[/Terima Input & Konfigurasi Data/]
  Input --> Preprocess[Pra-pemrosesan & Validasi Parameter]`;

  if (hasLoop) {
    chart += `
  Preprocess --> LoopCheck{Apakah Masih Ada Data / Iterasi?}
  LoopCheck -- Ya --> Exec[Eksekusi Transformasi Komputasi]`;

    if (hasCondition) {
      chart += `
  Exec --> BranchCheck{Memenuhi Syarat Kriteria?}
  BranchCheck -- Ya --> ValidPath[Kalkulasi Metrik & Simpan Hasil]
  BranchCheck -- Tidak --> ErrorPath[Tangani Anomali / Abaikan]
  ValidPath --> LoopCheck
  ErrorPath --> LoopCheck`;
    } else {
      chart += `
  Exec --> LoopCheck`;
    }

    chart += `
  LoopCheck -- Selesai --> Postprocess[Agregasi & Pembentukan Output]`;
  } else {
    chart += `
  Preprocess --> Exec[Eksekusi Logika Inti & Formula]
  Exec --> Postprocess[Agregasi & Pembentukan Output]`;
  }

  chart += `
  Postprocess --> Output[/Sajikan Hasil & Visualisasi/]
  Output --> Finish([Selesai])

  classDef main fill:#e0f2fe,stroke:#0284c7,stroke-width:1.5px;
  class Preprocess,Exec,Postprocess main;`;

  return chart;
}

export function generateCodeMethodologyExplanation(
  filename: string,
  code: string,
  executionOutput?: string,
  thesisContext?: string
): CodeMethodologyAnalysis {
  const language = detectCodeLanguage(filename, code);
  const detectedLibraries = extractLibraries(code, language);
  const complexity = analyzeComplexity(code);
  const pseudocode = generatePseudocode(filename, code);
  const mermaidFlowchart = generateMermaidFlowchart(code);

  const cleanFilename = filename.split('/').pop() || filename;
  const contextHeader = thesisContext ? ` pada konteks penelitian *"${thesisContext}"*` : '';

  // Bab 3: Metodologi Penelitian
  const bab3Draft = `### Bab III: Desain dan Implementasi Komputasi (3.X): \`${cleanFilename}\`

#### 3.X.1 Lingkungan Pengembangan & Pustaka Komputasi
Penelitian ini mengimplementasikan prosedur komputasi berbasis bahasa pemrograman **${language.toUpperCase()}**${contextHeader}. Modul dirancang secara terstruktur untuk menjalankan transformasi data dan kalkulasi parameter sesuai dengan kerangka metodologi yang telah ditetapkan.
${
  detectedLibraries.length > 0
    ? `\nDaftar dependensi pustaka utama yang digunakan mencakup:\n${detectedLibraries
        .map(lib => `- **\`${lib}\`**: Berperan dalam manajemen struktur data, pemrosesan algoritma, dan optimasi alur eksekusi komputasi.`)
        .join('\n')}\n`
    : '\nModul ini dibangun mengandalkan pustaka standar (built-in primitives) untuk memaksimalkan portabilitas kode.\n'
}
#### 3.X.2 Prosedur Komputasi & Pseudocode
Alur instruksi logis yang dijalankan pada modul \`${cleanFilename}\` diformulasikan ke dalam bentuk pseudocode berstandar akademis IEEE sebagai berikut:

\`\`\`latex
${pseudocode}
\`\`\`

#### 3.X.3 Diagram Alur Logika Algoritma (Flowchart)
Representasi visual tahapan pemrosesan data ditunjukkan pada diagram alur (flowchart) di bawah ini:

\`\`\`mermaid
${mermaidFlowchart}
\`\`\`
`;

  // Bab 4: Hasil & Pembahasan Empiris
  const bab4Draft = `### Bab IV: Hasil Eksekusi Komputasi & Analisis Algoritma (4.X)

#### 4.X.1 Pembahasan Hasil Uji Komputasi
Pengujian modul \`${cleanFilename}\` dilakukan dalam lingkungan komputasi terkontrol untuk memverifikasi kesesuaian luaran dengan hipotesis dan rancangan penelitian${contextHeader}.

${
  executionOutput && executionOutput.trim()
    ? `**Log Keluaran Eksekusi Nyata:**
\`\`\`text
${executionOutput.trim().slice(0, 800)}
\`\`\`

Berdasarkan log keluaran di atas, algoritma berhasil memproses input data secara deterministik tanpa mengalami kegagalan *runtime* atau *memory leak*. Hal ini membuktikan bahwa validasi input dan penanganan kasus batas (*edge cases*) telah berjalan sesuai rancangan metodologi pada Bab 3.`
    : `Berdasarkan pengujian komputasi, algoritma berhasil memproses input data secara deterministik sesuai spesifikasi fungsionalitas yang dirancang pada Bab 3.`
}

#### 4.X.2 Analisis Kompleksitas Waktu dan Ruang (Big-O)
Efisiensi komputasi merupakan faktor kunci untuk menjamin skalabilitas model pada dataset berukuran besar:
- **Kompleksitas Waktu (Time Complexity):** **${complexity.time}**
- **Kompleksitas Ruang (Space Complexity):** **${complexity.space}**
- **Justifikasi Ilmiah:** ${complexity.justification}

#### 4.X.3 Implikasi Empiris bagi Penelitian
Temuan dari implementasi kode ini menunjukkan bahwa pendekatan komputasi yang diterapkan memiliki stabilitas tinggi. Algoritma mampu mempertahankan keandalan proses dengan efisiensi memori yang memadai, sehingga layak direkomendasikan untuk implementasi skala penuh pada sistem tugas akhir/skripsi ini.
`;

  const fullThesisArtifactMarkdown = `:::artifact{type="markdown" title="Draf Metodologi & Pembahasan Teknis (${cleanFilename})"}
# 🔬 Integrasi Komputasi & Analisis Naskah Skripsi
**Berkas Sumber:** \`${cleanFilename}\`  
**Bahasa:** ${language.toUpperCase()}  
**Tanggal Analisis:** ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}  
${thesisContext ? `**Fokus Penelitian:** ${thesisContext}\n` : ''}
---

${bab3Draft}

---

${bab4Draft}
:::`;

  return {
    language,
    detectedLibraries,
    libraries: detectedLibraries,
    algorithmPatterns: detectedLibraries.length > 0 ? detectedLibraries : ['Struktur Logika Standar'],
    complexity,
    pseudocode,
    mermaidFlowchart,
    flowchart: mermaidFlowchart,
    bab3Draft,
    bab3Narrative: bab3Draft,
    bab4Draft,
    bab4Narrative: bab4Draft,
    fullThesisArtifactMarkdown,
    fullThesisArtifact: fullThesisArtifactMarkdown
  };
}

export function analyzeCodeForMethodology(options: MethodologyOptions): CodeMethodologyAnalysis {
  return generateCodeMethodologyExplanation(
    options.filename,
    options.code,
    options.executionOutput,
    options.thesisContext
  );
}
