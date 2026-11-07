/**
 * Mock Defense Model & Simulation Engine for RuangKerja (RuangTenang Kampus)
 * Provides interactive thesis defense simulations with examiner personas,
 * scoring matrices, and counter-argument recommendations.
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
        suggestedCounterDefense: 'Izin menjawab Dr. Hendra. Kami menggunakan stratified random sampling untuk memastikan seluruh karakteristik populasi terwakili proporsional. Ukuran sampel dihitung menggunakan margin of error 5%, dan kami mengantisipasi non-response bias dengan menyiapkan cadangan oversampling sebesar 15% serta uji non-response bias komparatif.'
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

  let baseScore = 65 + (hits * 10);
  if (wordCount > 40) baseScore += 5;
  if (wordCount > 80) baseScore += 5;
  const score = Math.min(96, Math.max(50, baseScore));

  const confidenceScore = Math.min(95, Math.max(55, score + (wordCount > 60 ? 5 : -5)));
  const theoryScore = Math.min(98, Math.max(50, 60 + (hits * 12)));
  const defenseLogicScore = Math.min(95, Math.max(50, Math.round((score + confidenceScore) / 2)));

  let grade: DefenseAnswerEvaluation['grade'] = 'C';
  if (score >= 85) grade = 'A';
  else if (score >= 78) grade = 'B+';
  else if (score >= 70) grade = 'B';

  const strengths = [
    'Penyampaian sopan dan menjunjung etika sidang akademik',
    ...(hits > 0 ? [`Mencakup poin kunci: ${matchedPoints.join(', ')}`] : ['Berusaha mengaitkan konteks jawaban']),
    ...(wordCount > 50 ? ['Elaborasi argumen cukup komprehensif'] : [])
  ];

  const weaknesses = [
    ...(hits < question.expectedKeyPoints.length ? ['Ada aspek pertanyaan yang belum terjawab tuntas'] : []),
    ...(wordCount < 35 ? ['Bisa diperkuat dengan data statistik atau nama ahli'] : [])
  ];

  return {
    questionId: question.id,
    studentAnswer: clean,
    score,
    grade,
    confidenceScore,
    theoryScore,
    defenseLogicScore,
    critique: score >= 80
      ? 'Pertahanan argumen yang sangat solid! Saudara mampu menjawab dengan kepala dingin, terminologi ilmiah yang tepat, dan tidak defensif berlebihan.'
      : 'Jawaban saudara sudah berada di arah yang tepat, namun disarankan menyertakan rujukan literatur atau justifikasi metodologis yang lebih tegas saat sidang sesungguhnya.',
    strengths,
    weaknesses,
    suggestedImprovement: question.suggestedCounterDefense
  };
}

export function generateDefenseReportMarkdown(session: MockDefenseSession): string {
  const evalList = Object.values(session.evaluations);
  const avgScore = evalList.length > 0
    ? Math.round(evalList.reduce((acc, cur) => acc + cur.score, 0) / evalList.length)
    : 0;

  const letterGrade = avgScore >= 85 ? 'A (Sangat Memuaskan)' : avgScore >= 75 ? 'B+ (Memuaskan)' : avgScore >= 68 ? 'B (Cukup)' : 'Revisi Mayor';

  return `:::artifact{type="markdown" title="Berita Acara & Evaluasi Simulasi Sidang (${session.examType === 'SEMINAR_PROPOSAL' ? 'Sempro' : 'Skripsi'})"}
# 🎓 Berita Acara Evaluasi Simulasi Ujian Sidang
**Judul Naskah:** ${session.thesisTitle}  
**Jenis Ujian:** ${session.examType.replace(/_/g, ' ')}  
**Tanggal Simulasi:** ${new Date(session.startedAt).toLocaleDateString('id-ID', { dateStyle: 'full' })}  
**Nilai Akhir Rata-rata:** **${avgScore}/100 (${letterGrade})**

---

### 🏛️ Tim Dewan Penguji Simulasi
${session.examiners.map(e => `- **${e.name}** (${e.role}) — *Fokus: ${e.focusArea}*`).join('\n')}

---

### 📊 Rekapitulasi Penilaian Butir Pertanyaan
${session.questions.map((q, idx) => {
  const ev = session.evaluations[q.id];
  return `#### Pertanyaan ${idx + 1} (${q.chapterTag})
*Dosen Penguji: ${session.examiners.find(e => e.id === q.examinerId)?.name || 'Penguji'}*
> "${q.question}"

**Jawaban Mahasiswa:**  
"${ev ? ev.studentAnswer : '(Belum dijawab)'}"

**Hasil Evaluasi Penguji:**
- Skor: **${ev ? ev.score : 0}/100** | Grade: **${ev ? ev.grade : '-'}**
- Ketepatan Teori: ${ev ? ev.theoryScore : 0}% | Logika Sanggahan: ${ev ? ev.defenseLogicScore : 0}% | Kepercayaan Diri: ${ev ? ev.confidenceScore : 0}%
- **Komentar Penguji:** ${ev ? ev.critique : '-'}

💡 **Rekomendasi Pembelaan Ilmiah Ideal:**
> "${q.suggestedCounterDefense}"

---
`;
}).join('\n')}

### 📝 Catatan Perbaikan Sebelum Hari Sidang
1. Latih artikulasi intonasi agar tidak terburu-buru saat menjawab cecaran penguji.
2. Selalu siapkan slide cadangan (*appendix slides*) yang memuat data statistik mentah, uji normalitas, atau instrumen kuesioner.
3. Gunakan frasa pembuka etis: *"Terima kasih atas pertanyaan kritis yang sangat mencerahkan dari Bapak/Ibu Dewan Penguji..."*
:::
`;
}
