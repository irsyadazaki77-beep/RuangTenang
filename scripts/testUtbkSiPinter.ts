import 'dotenv/config';
import { ollamaService } from '../server/services/ai/ollamaService.js';
import { refreshOllamaInventory, isLocalModelAvailable } from '../server/services/ai/ollamaRuntime.js';

interface UtbkTestCase {
  title: string;
  subtest: string;
  prompt: string;
  expectedKey: string;
  expectedKeyword: RegExp;
}

const UTBK_TEST_CASES: UtbkTestCase[] = [
  {
    title: 'Soal 1: Penalaran Matematika (Diskon Bertingkat / Aritmetika Sosial)',
    subtest: 'TPS - Penalaran Matematika',
    prompt: `[SOAL UTBK - PENALARAN MATEMATIKA]
Suatu toko buku memberikan diskon bertingkat untuk pembelian buku persiapan UTBK. Diskon pertama sebesar 20%, dan jika pembayaran menggunakan kartu debit mahasiswa, pembeli mendapat diskon tambahan sebesar 10% dari harga setelah diskon pertama.

Jika seorang siswa membayar Rp144.000 menggunakan kartu debit mahasiswa, berapakah harga asli buku tersebut sebelum dikenakan diskon sama sekali?
A. Rp180.000
B. Rp190.000
C. Rp200.000
D. Rp210.000
E. Rp220.000

Petunjuk: Tuliskan variabel yang diketahui, langkah aljabar penurunan secara runtut (step-by-step), sanity check, dan tentukan opsi jawaban yang benar.`,
    expectedKey: 'C',
    expectedKeyword: /200\.?000|opsi\s*c|pilihan\s*c|jawaban\s*(adalah\s*)?c/i
  },
  {
    title: 'Soal 2: Pengetahuan Kuantitatif (Kecukupan Data / Data Sufficiency)',
    subtest: 'TPS - Pengetahuan Kuantitatif',
    prompt: `[SOAL UTBK - PENGETAHUAN KUANTITATIF (KECUKUPAN DATA)]
Berapakah nilai dari (x + y)?

Putuskan apakah pernyataan (1) dan (2) berikut cukup untuk menjawab pertanyaan tersebut:
(1) 2x + 2y = 18
(2) x - y = 3

Pilihan:
A. Pernyataan (1) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (2) SAJA tidak cukup.
B. Pernyataan (2) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (1) SAJA tidak cukup.
C. DUA pernyataan BERSAMA-SAMA cukup untuk menjawab pertanyaan, tetapi SATU pernyataan SAJA tidak cukup.
D. Pernyataan (1) SAJA cukup untuk menjawab pertanyaan dan pernyataan (2) SAJA cukup.
E. Pernyataan (1) dan pernyataan (2) tidak cukup untuk menjawab pertanyaan.

Petunjuk: Uraikan analisis kecukupan dari pernyataan (1) saja, lalu pernyataan (2) saja, dan tentukan opsi jawaban yang benar.`,
    expectedKey: 'A',
    expectedKeyword: /opsi\s*a|pilihan\s*a|jawaban\s*(adalah\s*)?a|\(1\)\s*saja\s*cukup/i
  },
  {
    title: 'Soal 3: Penalaran Umum & Silogisme Logika Deduktif',
    subtest: 'TPS - Penalaran Umum',
    prompt: `[SOAL UTBK - PENALARAN UMUM & LOGIKA DEDUKTIF]
Perhatikan premis-premis berikut:
- Premis 1: Semua mahasiswa yang lulus UTBK dengan nilai tinggi rajin berlatih soal simulasi setiap hari.
- Premis 2: Beberapa mahasiswa yang rajin berlatih soal simulasi setiap hari tidak mengikuti bimbingan belajar berbayar.
- Premis 3: Andi adalah mahasiswa yang tidak rajin berlatih soal simulasi setiap hari.

Berdasarkan ketiga premis di atas, manakah kesimpulan yang PASTI BENAR secara logika formal?
A. Andi mengikuti bimbingan belajar berbayar.
B. Andi tidak mengikuti bimbingan belajar berbayar.
C. Andi tidak lulus UTBK dengan nilai tinggi.
D. Andi lulus UTBK tetapi nilainya pas-pasan.
E. Semua mahasiswa yang tidak mengikuti bimbingan belajar berbayar tidak lulus UTBK.

Petunjuk: Gunakan kaidah logika deduktif formal (Modus Tollens / Kontraposisi), eliminasi opsi yang keliru, dan tentukan opsi kesimpulan yang pasti benar.`,
    expectedKey: 'C',
    expectedKeyword: /opsi\s*c|pilihan\s*c|jawaban\s*(adalah\s*)?c|andi tidak lulus utbk dengan nilai tinggi/i
  }
];

async function runUtbkDrill() {
  console.log('========================================================================');
  console.log('   TRYOUT UTBK / SNBT SI PINTER (SUPREME LOCAL GENIUS DRILL)');
  console.log('========================================================================\n');

  await refreshOllamaInventory(true);
  const available = isLocalModelAvailable('si-pinter:latest') || isLocalModelAvailable('si-pinter');
  if (!available) {
    console.error('[FAIL] Model si-pinter tidak tersedia di Ollama lokal.');
    process.exit(1);
  }

  let totalScore = 0;
  for (let i = 0; i < UTBK_TEST_CASES.length; i++) {
    const test = UTBK_TEST_CASES[i];
    console.log(`------------------------------------------------------------------------`);
    console.log(`[NOMOR ${i + 1}] ${test.title}`);
    console.log(`Subtes: ${test.subtest}`);
    console.log(`Kunci Jawaban Resmi: Opsi ${test.expectedKey}`);
    console.log(`------------------------------------------------------------------------`);

    const start = Date.now();
    const res = await ollamaService.generateResponse({
      requestedModelId: 'ollama-si-pinter',
      prompt: test.prompt,
      maxOutputTokens: 500
    }, 'ollama-si-pinter');
    const elapsed = Date.now() - start;

    console.log('\n[JAWABAN SI PINTER]:');
    console.log(res.text.trim());
    console.log(`\n(Waktu Komputasi: ${(elapsed / 1000).toFixed(2)}s)`);

    const isMatch = test.expectedKeyword.test(res.text);
    if (isMatch) {
      console.log(`\n>>> HASIL EVALUASI: [BENAR / LULUS] (Skor: 100/100)`);
      totalScore += 100;
    } else {
      console.log(`\n>>> HASIL EVALUASI: [PERIKSA MANUAL] (Apakah opsi ${test.expectedKey} terjawab?)`);
    }
    console.log('\n');
  }

  const finalAvg = Math.round(totalScore / UTBK_TEST_CASES.length);
  console.log('========================================================================');
  console.log(`   REKAPITULASI TRYOUT UTBK SI PINTER: ${finalAvg}/100`);
  console.log('========================================================================');
}

runUtbkDrill().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
