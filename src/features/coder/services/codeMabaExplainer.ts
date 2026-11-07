/**
 * "Explain Like I'm Maba" (ELIM) & Interactive Code Explainer for Ruang Coder.
 * Deconstructs programming logic with friendly Indonesian campus analogies
 * and distinctive cultural persona commentaries (Ki Hadjar, Pak Habibie, Bu Kartini).
 */

export interface MabaCodeBreakdownItem {
  lineNumber: number;
  codeLine: string;
  concept: string;
  analogy: string;
  explanation: string;
  category: 'variable' | 'loop' | 'condition' | 'function' | 'io' | 'misc';
}

export interface PersonaCommentary {
  personaId: 'kihadjar' | 'habibie' | 'kartini';
  personaName: string;
  avatar: string;
  quote: string;
  verdict: string;
}

export interface VariableTraceStep {
  step: number;
  lineNumber: number;
  action: string;
  variables: Record<string, any>;
}

export interface MabaExplanationReport {
  summary: string;
  primaryAnalogy: string;
  breakdown: MabaCodeBreakdownItem[];
  personas: PersonaCommentary[];
  variableTrace: VariableTraceStep[];
}

export function generateMabaExplanation(code: string, filename: string): MabaExplanationReport {
  const lines = code.split('\n');
  const breakdown: MabaCodeBreakdownItem[] = [];
  const trace: VariableTraceStep[] = [];
  const trackedVars: Record<string, any> = {};

  let stepCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    const lineNum = i + 1;

    // Detect Functions
    if (trimmed.match(/function\s+([a-zA-Z0-9_]+)|def\s+([a-zA-Z0-9_]+)/)) {
      breakdown.push({
        lineNumber: lineNum,
        codeLine: trimmed,
        concept: 'Pembuatan Fungsi (Resep Otomatis)',
        analogy: 'Mirip membuat cetakan martabak atau resep masakan. Sekali resep didefinisikan, kita bisa memakainya berkali-kali tanpa harus membuat ulang dari nol.',
        explanation: 'Fungsi mengelompokkan instruksi tertentu agar kode rapi, mudah dipelihara, dan tidak ada duplikasi.',
        category: 'function'
      });
      continue;
    }

    // Detect Variables
    if (trimmed.match(/(?:const|let|var|int|float|double)\s+([a-zA-Z0-9_]+)\s*=\s*(.+);?/) || trimmed.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/)) {
      const match = trimmed.match(/(?:const|let|var|int|float|double)?\s*([a-zA-Z0-9_]+)\s*=\s*(.+);?/);
      const varName = match ? match[1] : 'variabel';
      const rawVal = match ? match[2].replace(/;$/, '').trim() : '';

      trackedVars[varName] = rawVal;
      trace.push({
        step: stepCounter++,
        lineNumber: lineNum,
        action: `Inisialisasi ${varName} = ${rawVal}`,
        variables: { ...trackedVars }
      });

      breakdown.push({
        lineNumber: lineNum,
        codeLine: trimmed,
        concept: 'Kotak Penyimpanan (Variabel)',
        analogy: `Bayangkan loker kampus dengan label "${varName}". Kita menyimpan barang (${rawVal}) ke dalam loker tersebut agar sewaktu-waktu bisa diambil kembali.`,
        explanation: `Variabel '${varName}' dialokasikan di memori untuk menampung nilai sementara selama program berjalan.`,
        category: 'variable'
      });
      continue;
    }

    // Detect If/Else Conditionals
    if (trimmed.startsWith('if') || trimmed.startsWith('else if') || trimmed.startsWith('elif')) {
      breakdown.push({
        lineNumber: lineNum,
        codeLine: trimmed,
        concept: 'Percabangan Logika (Lampu Lalu Lintas / Pos Penjaga)',
        analogy: 'Seperti gerbang masuk kampus. Jika bawa KTM boleh masuk, jika tidak bawa maka harus lapor ke satpam terlebih dahulu.',
        explanation: 'Komputer mengevaluasi ekspresi boolean (benar/salah). Hanya blok kode yang bernilai True yang akan dieksekusi.',
        category: 'condition'
      });
      continue;
    }

    // Detect Loops
    if (trimmed.startsWith('for') || trimmed.startsWith('while')) {
      breakdown.push({
        lineNumber: lineNum,
        codeLine: trimmed,
        concept: 'Perulangan (Looping / Mesin Fotokopi)',
        analogy: 'Seperti tukang fotokopi yang mencetak 50 lembar tugas kuliah. Mesin akan terus berputar sampai batas lembar yang ditentukan tercapai.',
        explanation: 'Looping mengeksekusi blok kode berulang kali secara otomatis sampai kondisi berhenti terpenuhi.',
        category: 'loop'
      });
      continue;
    }

    // Detect Print / Console Output
    if (trimmed.includes('console.log') || trimmed.includes('print(') || trimmed.includes('printf(')) {
      breakdown.push({
        lineNumber: lineNum,
        codeLine: trimmed,
        concept: 'Keluaran Informasi (Layar Papan Pengumuman)',
        analogy: 'Mirip pengeras suara pengumuman di kampus yang mengabarkan informasi penting ke seluruh mahasiswa.',
        explanation: 'Mengirimkan teks atau hasil kalkulasi ke terminal agar dapat dibaca oleh pengguna.',
        category: 'io'
      });
    }
  }

  // Cultural Personas Commentary
  const personas: PersonaCommentary[] = [
    {
      personaId: 'kihadjar',
      personaName: 'Ki Hadjar Dewantara',
      avatar: '🧠',
      quote: '"Ing ngarso sung tulodo, ing madyo mangun karso, tut wuri handayani."',
      verdict: 'Logika kode ini dibangun dengan langkah runut. Bagi adik-adik mahasiswa baru, jangan terburu-buru menghafal sintaks, tapi resapilah bagaimana aliran data berpindah dari satu gerbang logika ke gerbang berikutnya.'
    },
    {
      personaId: 'habibie',
      personaName: 'Prof. B.J. Habibie',
      avatar: '📐',
      quote: '"Keberhasilan bukan milik orang pintar semata, melainkan milik mereka yang gigih dan presisi."',
      verdict: `Struktur file '${filename}' memperlihatkan pondasi rekayasa yang menjanjikan. Pastikan setiap variabel memiliki batasan nilai yang jelas (bounded) agar sistem tidak mengalami retakan logika (micro-crack).`
    },
    {
      personaId: 'kartini',
      personaName: 'R.A. Kartini',
      avatar: '💡',
      quote: '"Habis gelap terbitlah terang."',
      verdict: 'Kerapian dan nama variabel yang manusiawi membuat kode ini ramah dibaca rekan tim. Ingat, menulis kode bukan sekadar agar komputer mengerti, tetapi agar sesama manusia dapat bekerja sama dengan damai.'
    }
  ];

  return {
    summary: `Program pada '${filename}' terdiri dari ${lines.length} baris kode yang mencakup alur inisialisasi variabel, evaluasi logika, dan keluaran terminal.`,
    primaryAnalogy: 'Alur kerja kode ini dapat diibaratkan seperti sistem antrean di kafetaria kampus: bahan disiapkan di awal (variabel), diproses sesuai pesanan (fungsi & looping), dan disajikan ke meja kasir (output).',
    breakdown: breakdown.length > 0 ? breakdown : [
      {
        lineNumber: 1,
        codeLine: lines[0] || '// Kode kosong',
        concept: 'Skrip Pembuka',
        analogy: 'Halaman kosong di buku tulis yang siap diisi catatan kuliah.',
        explanation: 'Mulai tuliskan variabel atau fungsi dasar.',
        category: 'misc'
      }
    ],
    personas,
    variableTrace: trace.length > 0 ? trace : [
      { step: 1, lineNumber: 1, action: 'Program mulai dieksekusi', variables: { status: 'idle' } }
    ]
  };
}
