/**
 * Mock Defense Model & Simulation Engine for RuangKerja (RuangTenang Kampus)
 * Provides interactive thesis defense simulations with examiner personas,
 * scoring matrices, counter-argument recommendations, and voice integration.
 */

export type DefenseExamType = 'SEMINAR_PROPOSAL' | 'SEMINAR_HASIL' | 'SIDANG_SKRIPSI';

export interface DefenseExaminer {
  id: string;
  name: string;
  title: string;
  role: 'Ketua Penguji' | 'Sekretaris' | 'Penguji Ahli';
  focusArea: string;
  avatarBg: string;
  avatarText: string;
}

export interface DefenseQuestion {
  id: string;
  examinerId: string;
  chapterTag: string; // e.g. "Bab 1: Urgensi Masalah", "Bab 3: Validitas Instrumen"
  question: string;
  contextHint: string;
  expectedKeyPoints: string[];
  suggestedCounterDefense: string;
}

export interface DefenseAnswerEvaluation {
  questionId: string;
  studentAnswer: string;
  score: number; // 0 - 100
  grade: 'A' | 'B+' | 'B' | 'C' | 'Perlu Perbaikan';
  confidenceScore: number; // 0 - 100
  theoryScore: number; // 0 - 100
  defenseLogicScore: number; // 0 - 100
  critique: string;
  strengths: string[];
  weaknesses: string[];
  suggestedImprovement: string;
}

export interface MockDefenseSession {
  id: string;
  examType: DefenseExamType;
  thesisTitle: string;
  studentName?: string;
  examiners: DefenseExaminer[];
  questions: DefenseQuestion[];
  evaluations: Record<string, DefenseAnswerEvaluation>;
  startedAt: string;
  completedAt?: string;
  finalScore?: number;
  finalGrade?: string;
  summaryVerdict?: string;
}

export const DEFAULT_EXAMINERS: DefenseExaminer[] = [
  {
    id: 'examiner-1',
    name: 'Dr. Ir. Hendra Suhartono, M.Kom.',
    title: 'Dosen Senior Bidang Metodologi & Riset Kuantitatif',
    role: 'Ketua Penguji',
    focusArea: 'Metodologi, Validitas Instrumen, Pengambilan Sampel, dan Analisis Bias',
    avatarBg: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    avatarText: 'HS'
  },
  {
    id: 'examiner-2',
    name: 'Prof. Dr. Ratna Kusuma Dewi, M.Si.',
    title: 'Guru Besar Bidang Teori & Kajian Literatur',
    role: 'Penguji Ahli',
    focusArea: 'Landasan Teori, State-of-the-Art, Research Gap, dan Kebaruan Ilmiah',
    avatarBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    avatarText: 'RK'
  },
  {
    id: 'examiner-3',
    name: 'Dra. Hj. Nurul Hidayati, M.Pd.',
    title: 'Dosen Pembimbing & Sekretaris Sidang',
    role: 'Sekretaris',
    focusArea: 'Sistematika Penulisan, Konsistensi Temuan, Etika Penelitian, dan Solusi Revisi',
    avatarBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    avatarText: 'NH'
  }
];

export function generateMockQuestions(thesisTitle: string, examType: DefenseExamType, _contextText?: string): DefenseQuestion[] {
  const title = thesisTitle.trim() || 'Penelitian Skripsi Mahasiswa';
  const hasSempro = examType === 'SEMINAR_PROPOSAL';

  if (hasSempro) {
    return [
      {
        id: 'q-sempro-1',
        examinerId: 'examiner-2',
        chapterTag: 'Bab 1: Fenomena & Research Gap',
        question: `Saudara meneliti tentang "${title}". Pertanyaan mendasar saya: apa research gap konkret yang saudara temukan dari 5 tahun literatur terakhir sehingga penelitian ini mutlak harus dikerjakan saat ini?`,
        contextHint: 'Fokuskan jawaban pada perbedaan atau limitasi penelitian terdahulu yang belum terjawab.',
        expectedKeyPoints: [
          'Menyebutkan 2-3 rujukan literatur terdahulu',
          'Menjelaskan batasan atau kelemahan temuan lama',
          'Menguraikan urgensi dan posisi kebaruan (novelty) penelitian saudara'
        ],
        suggestedCounterDefense: 'Terima kasih atas pertanyaannya Prof. Ratna. Berdasarkan telaah literatur 5 tahun terakhir, penelitian sebelumnya mayoritas hanya berfokus pada variabel X secara parsial. Terdapat gap empiris di mana konteks Y belum pernah diuji secara terintegrasi pada target populasi ini. Oleh karena itu, kebaruan penelitian ini mengisi kekosongan tersebut.'
      },
      {
        id: 'q-sempro-2',
        examinerId: 'examiner-1',
        chapterTag: 'Bab 3: Desain Metodologi & Sampling',
        question: 'Mengapa saudara memilih teknik pengambilan sampel dan ukuran sampel tersebut? Bagaimana saudara menjamin sampel tersebut representatif dan bebas dari ancaman non-response bias?',
        contextHint: 'Jelaskan rumus perhitungan sampel (cth: Slovin/G*Power) dan justifikasi teknik sampling.',
        expectedKeyPoints: [
          'Rasionalitas teknik sampling (probability vs purposive)',
          'Formula penentuan jumlah sampel minimum',
          'Langkah mitigasi jika responden tidak merespons (oversampling)'
        ],
        suggestedCounterDefense: 'Izin menjawab Dr. Hendra. Kami menggunakan stratified random sampling untuk memastikan seluruh karakteristik populasi terwakili proporsional. Ukuran sampel dihitung menggunakan rumus Slovin dengan margin of error 5%, dan kami mengantisipasi non-response bias dengan menyiapkan cadangan oversampling sebesar 15% serta uji non-response bias komparatif.'
      },
      {
        id: 'q-sempro-3',
        examinerId: 'examiner-1',
        chapterTag: 'Bab 3: Validitas & Reliabilitas Instrumen',
        question: 'Bagaimana saudara memvalidasi instrumen atau kuesioner yang digunakan? Apakah instrumen ini diadopsi atau dikembangkan sendiri, dan bagaimana validitas konstruknya dibuktikan?',
        contextHint: 'Sebutkan uji validitas isi (expert judgment) dan validitas konstruk (uji coba statistik).',
        expectedKeyPoints: [
          'Asal instrumen (adopsi/modifikasi/mandiri)',
          'Uji validitas isi oleh para ahli',
          'Teknik korelasi butir atau analisis faktor untuk validitas konstruk'
        ],
        suggestedCounterDefense: 'Instrumen ini diadaptasi dari skala standar yang telah divalidasi secara internasional, kemudian melalui proses back-translation dan telaah ahli (expert judgment). Sebelum disebar penuh, kami melakukan pilot testing pada 30 responden untuk menguji validitas butir dan reliabilitas Cronbach Alpha di atas 0.70.'
      },
      {
        id: 'q-sempro-4',
        examinerId: 'examiner-3',
        chapterTag: 'Bab 1-3: Timeline & Kelayakan Lapangan',
        question: 'Sebagai pembimbing, saya ingin memastikan: sejauh mana kesiapan perizinan lapangan dan jadwal kerja saudara agar penyusunan skripsi ini dapat tuntas tepat waktu dalam 1 semester?',
        contextHint: 'Jelaskan tahapan perizinan instansi, kontak awal, dan jadwal mitigasi waktu.',
        expectedKeyPoints: [
          'Jadwal tahapan riset yang terukur',
          'Status perizinan etik/lokasi penelitian',
          'Rencana kontingensi jika izin tertunda'
        ],
        suggestedCounterDefense: 'Terima kasih Ibu Nurul. Draf surat izin penelitian telah kami siapkan dan kontak awal dengan instansi telah dilakukan secara informal. Kami mengalokasikan 4 minggu untuk pengambilan data dengan jadwal cadangan 2 minggu jika ada kendala di lapangan.'
      }
    ];
  }

  // Sidang Skripsi / Seminar Hasil
  return [
    {
      id: 'q-sidang-1',
      examinerId: 'examiner-1',
      chapterTag: 'Bab 4: Anomali Data & Validitas Hasil',
      question: `Pada data hasil analisis saudara untuk topik "${title}", apakah ada temuan atau data outlier yang bertentangan dengan hipotesis awal? Bagaimana saudara menjelaskan anomali tersebut secara ilmiah?`,
      contextHint: 'Jangan tutupi anomali; jelaskan mengapa hal tersebut terjadi berdasarkan konteks lapangan.',
      expectedKeyPoints: [
        'Pengakuan terhadap adanya variasi data/outlier',
        'Justifikasi kondisi kontekstual lapangan',
        'Korelasi penjelasan dengan teori pendukung alternatif'
      ],
      suggestedCounterDefense: 'Terima kasih atas kecermatan Dr. Hendra. Memang terdapat anomali pada sub-kelompok X yang tidak sejalan dengan hipotesis utama. Hal ini terjadi karena faktor eksternal kondisi lapangan saat pengambilan data. Justru anomali ini menjadi temuan baru yang memperkaya diskusi Bab 4 dan membuka peluang riset lanjutan.'
    },
    {
      id: 'q-sidang-2',
      examinerId: 'examiner-2',
      chapterTag: 'Bab 2 & 4: Kontribusi Teoretis & Implikasi',
      question: 'Bagaimana temuan empiris saudara dalam penelitian ini berkontribusi terhadap pengembangan teori yang saudara jadikan grand theory di Bab 2?',
      contextHint: 'Kaitkan temuan kuantitatif/kualitatif dengan penguatan, modifikasi, atau penolakan premis teori.',
      expectedKeyPoints: [
        'Sebutkan grand theory yang digunakan',
        'Jelaskan apakah temuan memperkuat atau memberi nuansa baru pada teori tersebut',
        'Sebutkan implikasi praktis bagi pemangku kepentingan'
      ],
      suggestedCounterDefense: 'Temuan kami secara empiris memperkuat grand theory yang digunakan, namun dengan catatan bahwa dalam konteks mahasiswa saat ini, terdapat variabel mediasi baru yang belum tercakup dalam teori klasik. Ini menjadi kontribusi teoretis utama skripsi ini.'
    },
    {
      id: 'q-sidang-3',
      examinerId: 'examiner-1',
      chapterTag: 'Bab 5: Keterbatasan & Saran Riset Lanjutan',
      question: 'Apa kelemahan paling krusial dari penelitian saudara yang dapat membatasi generalisasi hasil, dan bagaimana saudara merekomendasikan perbaikannya untuk peneliti selanjutnya?',
      contextHint: 'Tunjukkan sikap ilmiah yang rendah hati dan kritis terhadap batasan penelitian sendiri.',
      expectedKeyPoints: [
        'Mengakui keterbatasan lingkup/waktu/geografis',
        'Menyatakan batasan generalisasi dengan jelas',
        'Memberikan saran yang spesifik dan terukur (actionable)'
      ],
      suggestedCounterDefense: 'Keterbatasan utama penelitian ini adalah pengambilan data yang terbatas pada satu institusi dalam satu kurun semester, sehingga generalisasi pada sektor lain perlu kehati-hatian. Kami menyarankan penelitian mendatang menggunakan studi longitudinal lintas kampus dengan metode campuran (mixed methods).'
    },
    {
      id: 'q-sidang-4',
      examinerId: 'examiner-3',
      chapterTag: 'Etika & Manfaat Aplikatif Hasil Riset',
      question: 'Bagaimana saudara menjamin kerahasiaan data responden selama penelitian, dan apa manfaat aplikatif langsung rekomendasi saudara bagi subjek penelitian?',
      contextHint: 'Jelaskan informed consent, anonimitas data, dan implikasi kebijakan praktis.',
      expectedKeyPoints: [
        'Prosedur informed consent tertulis',
        'Anonimitas dan enkripsi data responden',
        'Rekomendasi aplikatif untuk institusi terkait'
      ],
      suggestedCounterDefense: 'Seluruh responden menandatangani lembar persetujuan (informed consent) dan identitas disamarkan menggunakan kode anonim. Data disimpan terenkripsi dan hasil penelitian ini kami rangkum dalam bentuk executive summary sebagai masukan praktis bagi institusi terkait.'
    }
  ];
}

export function evaluateDefenseAnswer(question: DefenseQuestion, answer: string): DefenseAnswerEvaluation {
  const clean = answer.trim();
  const wordCount = clean.split(/\s+/).filter(Boolean).length;

  if (wordCount < 10) {
    return {
      questionId: question.id,
      studentAnswer: clean,
      score: 45,
      grade: 'Perlu Perbaikan',
      confidenceScore: 35,
      theoryScore: 40,
      defenseLogicScore: 45,
      critique: 'Jawaban terlalu singkat dan belum memuat justifikasi ilmiah yang meyakinkan penguji. Penguji sidang membutuhkan penjelasan kausalitas dan bukti metodologis.',
      strengths: ['Berani merespons pertanyaan awal'],
      weaknesses: ['Argumen belum didukung rujukan teori', 'Kurang elaborasi teknis'],
      suggestedImprovement: question.suggestedCounterDefense
    };
  }

  // Scoring heuristic based on expected keypoints and depth
  const lower = clean.toLowerCase();
  let hits = 0;
  const matchedPoints: string[] = [];

  for (const kp of question.expectedKeyPoints) {
    const keywords = kp.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const hasKeyword = keywords.some(k => lower.includes(k));
    if (hasKeyword) {
      hits++;
      matchedPoints.push(kp);
    }
  }

  let baseScore = 65 + (hits * 8);
  if (wordCount > 35) baseScore += 5;
  if (wordCount > 70) baseScore += 5;
  const score = Math.min(96, Math.max(50, baseScore));

  const confidenceScore = Math.min(95, Math.max(55, score + (wordCount > 50 ? 5 : -5)));
  const theoryScore = Math.min(98, Math.max(50, baseScore + (hits > 1 ? 5 : -5)));
  const defenseLogicScore = Math.min(95, Math.max(52, score));

  let grade: DefenseAnswerEvaluation['grade'];
  if (score >= 85) grade = 'A';
  else if (score >= 78) grade = 'B+';
  else if (score >= 68) grade = 'B';
  else if (score >= 58) grade = 'C';
  else grade = 'Perlu Perbaikan';

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (hits >= 2) {
    strengths.push('Menguasai premis utama yang ditanyakan penguji');
  } else {
    weaknesses.push('Belum menyentuh seluruh poin ekspektasi jawaban');
  }

  if (wordCount >= 40) {
    strengths.push('Artikulasi argumen cukup mendalam dan terstruktur');
  } else {
    weaknesses.push('Elaborasi argumen masih dapat diperdalam lagi');
  }

  if (lower.includes('terima kasih') || lower.includes('izin menjawab') || lower.includes('pertanyaan')) {
    strengths.push('Sikap santun dan profesional dalam merespons dewan penguji');
  }

  const critique = score >= 80
    ? 'Argumen saudara kuat dan terartikulasi dengan baik. Penguji menghargai ketegasan ilmiah serta rujukan konkret yang saudara paparkan.'
    : 'Jawaban saudara sudah pada jalur yang benar, namun perlu penekanan lebih kuat pada metodologi atau rujukan teori agar tidak terkesan spekulatif.';

  return {
    questionId: question.id,
    studentAnswer: clean,
    score,
    grade,
    confidenceScore,
    theoryScore,
    defenseLogicScore,
    critique,
    strengths,
    weaknesses,
    suggestedImprovement: question.suggestedCounterDefense
  };
}

export function generateDefenseReportMarkdown(session: MockDefenseSession): string {
  const evals = Object.values(session.evaluations);
  const totalScore = evals.reduce((acc, curr) => acc + curr.score, 0);
  const avgScore = evals.length ? Math.round(totalScore / evals.length) : 0;
  
  let finalGrade: string;
  if (avgScore >= 85) finalGrade = 'A (Lulus Memuaskan)';
  else if (avgScore >= 78) finalGrade = 'B+ (Lulus Baik Sekali)';
  else if (avgScore >= 70) finalGrade = 'B (Lulus Cukup)';
  else finalGrade = 'C (Perlu Sidang Ulang / Revisi Mayor)';

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `# BERITA ACARA SIMULASI ${session.examType.replace(/_/g, ' ')}
**Ekosistem RuangTenang & RuangKerja Kampus**

---

### I. Data Pelaksanaan
- **Judul Penelitian:** ${session.thesisTitle}
- **Tanggal Simulasi:** ${dateStr}
- **Bentuk Evaluasi:** Simulasi Sidang Interaktif (AI Mock Defense Drill)
- **Status Akhir:** **${finalGrade}** (Nilai Rata-rata: **${avgScore}/100**)

---

### II. Susunan Dewan Penguji AI
1. **${session.examiners[0]?.name || 'Dr. Ir. Hendra Suhartono, M.Kom.'}** (Ketua Penguji - Metodologi & Sampling)
2. **${session.examiners[1]?.name || 'Prof. Dr. Ratna Kusuma Dewi, M.Si.'}** (Penguji Ahli - Teori & Research Gap)
3. **${session.examiners[2]?.name || 'Dra. Hj. Nurul Hidayati, M.Pd.'}** (Sekretaris - Sistematika & Konsistensi)

---

### III. Rekapitulasi Penilaian Butir Pertanyaan

${session.questions.map((q, idx) => {
  const ev = session.evaluations[q.id];
  const ex = session.examiners.find(e => e.id === q.examinerId) || session.examiners[0];
  if (!ev) return `#### ${idx + 1}. [${q.chapterTag}] *(Belum dijawab)*\n\n`;

  return `#### ${idx + 1}. [${q.chapterTag}] - Penguji: ${ex.name}
**Pertanyaan:**
> "${q.question}"

**Jawaban Mahasiswa:**
"${ev.studentAnswer}"

**Hasil Penilaian:**
- **Skor:** ${ev.score}/100 (Predikat: **${ev.grade}**)
- **Kekuatan:** ${ev.strengths.join(', ') || '-'}
- **Catatan Evaluasi:** ${ev.critique}
- **Rekomendasi Argumen Balik (Counter-Defense):**
  > *"${ev.suggestedImprovement}"*

---
`;
}).join('\n')}

### IV. Catatan Dewan Penguji untuk Revisi Naskah
1. Perkuat konsistensi antara rumusan masalah di Bab 1 dengan teknik sampling di Bab 3.
2. Pastikan argumentasi tidak spekulatif dan selalu ditopang rujukan buku teks atau artikel jurnal bereputasi.
3. Latih ketenangan intonasi suara saat menjawab cecaran penguji dengan memulai dari penegasan fakta.

*(Dokumen ini dihasilkan secara otomatis oleh RuangKerja AI Mock Defense Engine untuk persiapan mental dan ketangguhan argumen akademik mahasiswa).*
`;
}
