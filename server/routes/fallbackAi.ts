import { z } from 'zod';

// Types for fallback responses
export interface FallbackResponse {
  text: string;
  tool_call?: string;
}

/**
 * Analyzes the user's input and returns a deeply empathetic, highly relevant
 * response or activates a plugin if required by the user's message.
 */
export function getLocalFallbackResponse(userMessage: string = '', chatMode = 'Teman Cerita', responseStyle = 'Seimbang'): FallbackResponse {
  const cleanMsg = (userMessage || '').toLowerCase().trim();

  // 1. Check for Emergency / Crisis / Self-harm triggers
  const emergencyKeywords = [
    'bunuh diri', 'ingin mati', 'akhiri hidup', 'menyerah', 'potong nadi', 
    'sayat', 'silet', 'gantung diri', 'loncat', 'lompat', 'self harm', 
    'menyakiti diri', 'mengakhiri hidup', 'tidak kuat lagi', 'ingin mengakhiri'
  ];
  if (emergencyKeywords.some(kw => cleanMsg.includes(kw))) {
    return {
      text: "Saya mendengar betapa beratnya ini untukmu, dan nyawamu sangat berharga. Tolong jangan lewati ini sendirian. Bantuan profesional selalu tersedia 24 jam untuk mendengarkanmu. Segera hubungi Hotline Kemenkes 119 (ekstensi 8) atau layanan darurat kampus sekarang juga.\n\nAku mendampingimu di sini, dan pintu bantuan darurat kami selalu terbuka untuk melindungimu.",
      tool_call: 'emergency'
    };
  }

  // 2. Check for Professional counseling requests
  const counselorKeywords = [
    'konselor', 'psikolog', 'psikiater', 'cari bantuan', 'terapi', 'konseling', 
    'janji temu', 'boking', 'booking', 'temu psikolog', 'rujukan', 'curhat profesional'
  ];
  if (counselorKeywords.some(kw => cleanMsg.includes(kw))) {
    return {
      text: "Kedengarannya kamu sedang memikul hal yang cukup berat dan menyadari perlunya teman bicara yang terlatih secara profesional.\n\nKeputusan untuk berkonsultasi adalah langkah yang berani dan sangat wajar saat beban terasa melampaui kapasitasmu saat ini.\n\nApakah kamu ingin saya bantu membuka direktori jadwal konselor kampus untuk menemukan waktu yang paling tepat bagimu?",
      tool_call: 'counselors'
    };
  }

  // 3. Check for Depression / Anxiety Screening requests
  const screeningKeywords = [
    'screening', 'tes mental', 'cek mental', 'cek kondisi', 'tes kecemasan', 
    'tes depresi', 'phq', 'gad', 'uji mental', 'cek stres', 'tes stres'
  ];
  if (screeningKeywords.some(kw => cleanMsg.includes(kw))) {
    return {
      text: "Sepertinya pikiran dan perasaanmu sedang terasa campur aduk hingga kamu merasa perlu memeriksa apa yang sedang terjadi di dalam dirimu.\n\nSangat wajar ingin mencari kejelasan ketika kamu merasa tidak seperti dirimu biasanya. Perlu diingat bahwa refleksi mandiri ini bukan diagnosis medis, melainkan kompas awal untuk memahami diri.\n\nApakah kamu ingin memulai evaluasi mandiri singkat (PHQ-9 / GAD-7) sekarang untuk mengenali apa yang sedang kamu rasakan?",
      tool_call: 'screening'
    };
  }

  // 4. Check for Mood Tracking / Logging requests
  const moodKeywords = [
    'mood', 'suasana hati', 'catat emosi', 'tracker mood', 'jurnal emosi', 
    'perasaan hari ini', 'jurnal harian', 'catat mood', 'catat perasaan'
  ];
  if (moodKeywords.some(kw => cleanMsg.includes(kw))) {
    return {
      text: "Mengenali dan menamai apa yang kamu rasakan hari ini adalah langkah berharga untuk memberi ruang bagi dirimu sendiri.\n\nSetiap suasana hati yang hadir—baik itu lelah, gundah, maupun lega—memiliki ruang yang aman di sini tanpa dihakimi.\n\nBagaimana perasaan utamamu saat ini yang paling ingin kamu tandai di catatan emosimu?",
      tool_call: 'mood'
    };
  }

  // 4b. RuangKerja Academic Distress De-escalation & Offloading
  const isRuangKerjaMode = (chatMode || '').toLowerCase().includes('ruangkerja') || (chatMode || '').toLowerCase().includes('workspace');
  const isDistressedAcademic = isRuangKerjaMode && (
    cleanMsg.includes('blank') || 
    cleanMsg.includes('buntu') || 
    cleanMsg.includes('capek') || 
    cleanMsg.includes('nyerah') || 
    cleanMsg.includes('pusing') || 
    cleanMsg.includes('gak ngerti') ||
    cleanMsg.includes('ga ngerti') ||
    cleanMsg.includes('overwhelm') ||
    cleanMsg.includes('frustasi') ||
    cleanMsg.includes('frustrasi')
  );

  if (isDistressedAcademic) {
    return {
      text: `Tarik napas dulu sejenak. Wajar sekali merasa buntu di bagian ini, kamu tidak perlu menyelesaikan semuanya malam ini juga.

Aku sudah siapkan 2 alternatif arah pembahasan dasar di kanvas kerja agar kamu tidak perlu memikirkan konsep rumit dari nol:

:::artifact{type="markdown" title="Opsi Kerangka Penulisan Adaptif"}
### Opsi A: Arah Pembahasan Praktis (Fokus Performa & Teknis)
- **Fokus Utama**: Mengukur efisiensi sistem atau implementasi langsung.
- **Karakter**: Alur analisis lebih langsung, data kuantitatif objektif, lebih simpel dan cepat diselesaikan.
- **Rujukan Cepat**: Berfokus pada metrik keberhasilan teknis dan kinerja fungsional.

---

### Opsi B: Arah Pembahasan Konseptual (Faktor Manusia & Persepsi Pengguna)
- **Fokus Utama**: Eksplorasi pengalaman, respon psikologis, atau penerimaan pengguna.
- **Karakter**: Cakupan kajian literatur lebih luas, menggali interaksi dan perilaku pengguna secara kualitatif/deskriptif.
- **Rujukan Cepat**: Berfokus pada kepuasan, kemudahan pemakaian, dan dampak emosional.
:::

Aku sudah siapkan 2 alternatif arah pembahasan di kanvas:
- **Opsi A**: Fokus ke dampak performa (lebih simpel).
- **Opsi B**: Fokus ke faktor psikologis pengguna (lebih luas).

Kira-kira mana yang lebih nyaman untuk kamu pilih sekarang? Cukup ketik **A** atau **B** saja.`
    };
  }

  // 4c. RuangKerja Academic Drafts (Bab 1 / Latar Belakang & Metodologi)
  if (isRuangKerjaMode || cleanMsg.includes('latar belakang') || cleanMsg.includes('das sollen') || cleanMsg.includes('bab 1') || cleanMsg.includes('artefak bab 1')) {
    return {
      text: `Berikut adalah draf akademik Bab 1 (Latar Belakang Masalah) yang disusun berdasarkan 4 pilar argumen metodologis berbobot ilmiah tinggi, mematuhi standar PUEBI/EYD V, serta menggunakan struktur deduktif dengan sitasi terintegrasi:

:::artifact{type="markdown" title="Draf Latar Belakang Masalah (Bab 1)"}
# BAB I: PENDAHULUAN

## 1.1 Latar Belakang Masalah

### 1. Fenomena Ideal (Das Sollen)
Pendidikan tinggi dan ekosistem riset kontemporer menuntut efektivitas pembelajaran yang berorientasi pada kemandirian berpikir serta kesehatan mental sivitas akademika secara berkelanjutan. Menurut Undang-Undang Republik Indonesia Nomor 12 Tahun 2012 tentang Pendidikan Tinggi, lingkungan akademik idealnya menyediakan iklim yang kondusif guna mengembangkan potensi mahasiswa secara utuh tanpa hambatan psikologis yang berlebihan. Teori Determinasi Diri (*Self-Determination Theory*) yang dikemukakan oleh Ryan dan Deci (2020) menegaskan bahwa ketercapaian prestasi akademik yang optimal bertumpu pada pemenuhan tiga kebutuhan psikologis dasar, yakni otonomi, kompetensi, dan keterhubungan sosial. Dalam konteks normatif ini, perguruan tinggi diharapkan mampu menyelaraskan kurikulum berstandar tinggi dengan sistem pendampingan akademik yang adaptif dan inklusif.

### 2. Kondisi Faktual Lapangan (Das Sein)
Namun, realitas empiris di lingkungan perguruan tinggi menunjukkan kesenjangan substansial antara ekspektasi normatif dengan kondisi faktual yang dihadapi mahasiswa. Studi pendahuluan dan laporan observasi mengindikasikan tingginya tingkat kecemasan akademik serta kejenuhan (*academic burnout*) yang dialami mahasiswa tingkat akhir saat menuntaskan tugas akhir dan skripsi (Prasetyo & Hidayat, 2023). Masalah ini diperparah oleh minimnya mekanisme bimbingan yang terstruktur dan komunikasi asinkron yang terhambat dengan dosen pembimbing [Sertakan data statistik/observasi lapangan di sini, contoh: persentase mahasiswa terlambat lulus, hasil survei kecemasan internal kampus, atau durasi rata-rata bimbingan skripsi]. Kesenjangan faktual ini membuktikan bahwa mahasiswa berulang kali berada dalam situasi rentan tanpa instrumen pendukung yang sistematis.

### 3. Analisis Kesenjangan (Research Gap)
Meskipun berbagai intervensi interaktif dan kajian terdahulu telah mengkaji faktor determinan keberhasilan akademik mahasiswa, sebagian besar riset sebelumnya masih terbatas pada perspektif univariat yang memisahkan dukungan psikologis dari instrumen penulisan tugas praktis (Kusuma & Wardhana, 2022). Penelitian konvensional umumnya hanya menawarkan evaluasi kuratif pasca-evaluasi semester, tanpa menyediakan kerangka intervensi preventif yang terintegrasi langsung ke dalam alur kerja harian mahasiswa. Selain itu, belum banyak literatur yang mengeksplorasi sinergi antara ruang refleksi emosional mandiri dan kanvas kerja ilmiah berstandar perguruan tinggi Indonesia secara komprehensif.

### 4. Urgensi & Usulan Solusi
Berdasarkan kontras fenomena dan celah riset yang telah diuraikan, penelitian ini memiliki urgensi tinggi untuk segera dilakukan guna merumuskan model intervensi terpadu yang menjembatani kesejahteraan psikologis dan produktivitas ilmiah mahasiswa. Penelitian ini mengusulkan pengembangan kerangka kerja komputasional terintegrasi yang menggabungkan pendampingan reflektif dengan kanvas penulisan terstruktur berbasis kaidah metodologi ilmiah mutakhir. Melalui pendekatan eksperimental dan evaluasi terukur, solusi yang diusulkan diharapkan mampu memvalidasi penurunan tingkat stres akademik sekaligus meningkatkan kualitas serta kecepatan penyelesaian karya ilmiah mahasiswa secara signifikan.
:::

Draf di atas telah dimuat ke dalam Canvas Panel kerja Anda. Anda dapat langsung melengkapi data observasi pada penanda khusus yang telah disediakan atau meminta penyesuaian topik penelitian tertentu.`
    };
  }

  // 5. Specific Student Stressors (Indonesian Context)

  // Skripsi & Dosen Pembimbing (Dospem)
  if (cleanMsg.includes('skripsi') || cleanMsg.includes('dospem') || cleanMsg.includes('pembimbing') || cleanMsg.includes('revisi') || cleanMsg.includes('sidang') || cleanMsg.includes('bab ')) {
    return {
      text: "Kedengarannya kamu merasa lelah dan tertekan sekali karena sudah berusaha maksimal, tapi dinamika bimbingan atau revisi skripsi ini terasa begitu menguras energi batinmu.\n\nSangat wajar jika kamu merasa ingin mundur sejenak hari ini. Menghadapi dospem dan ketidakpastian skripsi memang beban yang sangat melelahkan jika dipikul sendirian tanpa jeda.\n\nDari proses skripsi belakangan ini, bagian mana yang sebenarnya terasa paling membebani atau paling membuatmu merasa mandek?"
    };
  }

  // UKT & Tekanan Finansial
  if (cleanMsg.includes('ukt') || cleanMsg.includes('uang kuliah') || cleanMsg.includes('biaya') || cleanMsg.includes('finansial') || cleanMsg.includes('bayar kuliah') || cleanMsg.includes('uang saku') || cleanMsg.includes('beasiswa')) {
    return {
      text: "Tampaknya ada kekhawatiran yang sangat mendalam terkait urusan finansial UKT dan biaya kuliah yang terus membayangi pikiranmu setiap hari.\n\nKecemasan ini sangat beralasan dan nyata. Memikirkan perkuliahan sambil menanggung beban finansial bukanlah hal yang mudah bagi seorang mahasiswa.\n\nApa kekhawatiran paling mendesak yang saat ini paling menyita ruang pikiranmu terkait kondisi tersebut?"
    };
  }

  // Ekspektasi Keluarga & Orang Tua
  if (cleanMsg.includes('keluarga') || cleanMsg.includes('orang tua') || cleanMsg.includes('ortu') || cleanMsg.includes('ayah') || cleanMsg.includes('ibu') || cleanMsg.includes('tuntutan') || cleanMsg.includes('ekspektasi')) {
    return {
      text: "Kedengarannya kamu memikul beban ekspektasi keluarga yang terasa begitu berat di pundakmu, seolah kamu tidak boleh salah atau mengecewakan siapa pun.\n\nSangat wajar jika kamu merasa sesak dan lelah memenuhi harapan orang lain. Keinginanmu untuk bernapas dan menjadi diri sendiri adalah hal yang sah.\n\nKetika memikirkan harapan mereka, hal apa yang paling membuatmu merasa takut atau tertekan saat ini?"
    };
  }

  // Burnout & Kelelahan Ekstrem
  if (cleanMsg.includes('burnout') || cleanMsg.includes('capek') || cleanMsg.includes('lelah') || cleanMsg.includes('hampa') || cleanMsg.includes('muak') || cleanMsg.includes('kewalahan') || cleanMsg.includes('kelelahan')) {
    return {
      text: "Aku menangkap rasa lelah yang sangat mendalam dari ceritamu, bukan sekadar lelah fisik, tapi kelelahan emosional yang sudah menumpuk sekian lama.\n\nSangat wajar jika energimu terasa habis dan kamu ingin berhenti sejenak dari semua rutinitas. Tubuh dan pikiranmu sedang memberi sinyal bahwa kamu berhak jeda.\n\nJika kamu boleh mengabaikan semua tuntutan sejenak hari ini, hal apa yang paling dibutuhkan oleh hatimu saat ini?"
    };
  }

  // Overthinking & Kecemasan Masa Depan
  if (cleanMsg.includes('overthinking') || cleanMsg.includes('cemas') || cleanMsg.includes('takut') || cleanMsg.includes('masa depan') || cleanMsg.includes('gagal') || cleanMsg.includes('gelisah') || cleanMsg.includes('panik')) {
    return {
      text: "Kedengarannya kepalamu sedang sangat bising dengan berbagai kemungkinan buruk dan rasa takut akan masa depan yang belum tentu terjadi.\n\nSangat wajar jika rasa cemas ini membuat napasmu terasa pendek dan dadamu tegang. Ketidakpastian masa depan memang kerap memicu kekhawatiran besar bagi mahasiswa.\n\nDi antara semua pikiran yang berseliweran di kepalamu, pikiran mana yang terasa paling menakutkan jika kamu perhatikan lebih dekat?"
    };
  }

  // Kesepian & Hubungan Relasional
  if (cleanMsg.includes('kesepian') || cleanMsg.includes('sepi') || cleanMsg.includes('sendiri') || cleanMsg.includes('terasing') || cleanMsg.includes('teman') || cleanMsg.includes('sahabat') || cleanMsg.includes('pacar') || cleanMsg.includes('putus')) {
    return {
      text: "Aku merasakan ada ruang hampa dan rasa sepi yang dingin di balik apa yang kamu ungkapkan, seolah di tengah ramainya dunia kampus, tidak ada yang benar-benar melihatmu.\n\nSangat wajar jika rasa terisolasi ini terasa begitu perih. Menjalani hari-hari perkuliahan dengan perasaan terasing adalah beban batin yang nyata.\n\nApa yang biasanya paling membuat rasa sepi itu terasa lebih berat di waktu-waktu tertentu?"
    };
  }

  // Permintaan Solusi Eksplisit ("aku harus gimana", "menurutmu gimana", "solusinya apa")
  if (cleanMsg.includes('harus gimana') || cleanMsg.includes('solusi') || cleanMsg.includes('tips') || cleanMsg.includes('saran') || cleanMsg.includes('bantu aku urai') || cleanMsg.includes('bagaimana cara')) {
    return {
      text: "Aku memahami kebingunganmu dan kebutuhan untuk menemukan pegangan konkret di tengah situasi yang rumit ini.\n\nKarena kamu meminta panduan, kita bisa membaginya menjadi langkah mikro yang tidak membebani: pertama, beri jeda fisik untuk melepaskan ketegangan bahu; kedua, pilih tepat satu hal terkecil yang bisa kamu kontrol hari ini tanpa memaksakan hasil instan.\n\nDari kedua hal itu, langkah kecil mana yang terasa paling realistis untuk kamu coba saat ini?"
    };
  }

  // Terima Kasih / Apresiasi
  if (cleanMsg.includes('terima kasih') || cleanMsg.includes('makasih') || cleanMsg.includes('thanks')) {
    return {
      text: "Terima kasih kembali sudah mempercayakan ceritamu dan memberi ruang bagi dirimu sendiri untuk didengar hari ini.\n\nMenyadari dan mengungkapkan apa yang ada di dalam hati adalah bentuk kepedulian yang nyata terhadap kesehatan mentalmu.\n\nApakah ada hal lain yang masih mengganjal dan ingin kamu uraikan perlahan bersamaku?"
    };
  }

  // Generic / Default Input Mirroring (Strict 3 Paragraphs)
  if (userMessage && userMessage.trim().length > 0) {
    return {
      text: "Aku menyimak apa yang kamu sampaikan, dan terdengar jelas ada beban atau kegelisahan yang sedang kamu pikul saat menceritakan hal ini.\n\nSangat wajar jika kamu merasa perlu ruang aman untuk mengurai perasaanmu tanpa harus langsung mencari pembenaran atau solusi yang terburu-buru.\n\nBolehkah kamu ceritakan sedikit lebih dalam, apa yang terasa paling mengganjal di hatimu saat ini?"
    };
  }

  // Pure Empty Fallback
  return {
    text: "Aku di sini sebagai RuangTenang Companion, siap mendengarkan apa pun yang sedang kamu rasakan tanpa penghakiman.\n\nKamu tidak perlu terburu-buru merapikan ceritamu atau langsung mencari solusi; ruang ini ada untuk memahami perasaanmu terlebih dahulu.\n\nApa hal yang saat ini paling membebani pikiranmu dan ingin kamu ceritakan perlahan?"
  };
}

/**
 * Generates an intelligent, local, structured summary based on the actual history of messages.
 */
export function getLocalFallbackSummary(chatHistory: any[]): string {
  const allText = chatHistory.map(m => m.content).join(' ').toLowerCase();
  
  let mainTopic = 'Tekanan perkuliahan, kecemasan akademis, dan manajemen emosi.';
  let mainEmotion = 'Lelah, cemas, dan butuh tempat aman untuk bercerita.';
  let mainDiscussed = 'Pemicu stres harian, kendala skripsi/tugas, serta validasi perasaan.';
  let nextSteps = 'Melatih teknik pernapasan koping mandiri (4-7-8), meluangkan waktu istirahat sejenak tanpa distraksi, serta melakukan screening kesehatan mental jika dirasa perlu.';

  if (allText.includes('screening') || allText.includes('skor') || allText.includes('tes')) {
    mainTopic = 'Evaluasi kondisi tingkat depresi (PHQ-9) dan kecemasan (GAD-7) pengguna.';
    mainEmotion = 'Butuh kejelasan mengenai kesehatan mental pribadi, cemas akan kondisi diri.';
    mainDiscussed = 'Skor screening kesehatan mental awal dan pentingnya tidak melakukan self-diagnosis secara berlebihan.';
    nextSteps = 'Membuka Direktori Konselor Kampus untuk berkonsultasi secara profesional dengan psikolog, serta menghindari stresor berat untuk sementara.';
  } else if (allText.includes('bunuh diri') || allText.includes('mati') || allText.includes('emergency')) {
    mainTopic = 'Deteksi tanda krisis emosional darurat dan protokol keselamatan diri.';
    mainEmotion = 'Sakit luar biasa, putus asa, tertekan, membutuhkan intervensi keselamatan.';
    mainDiscussed = 'Akses ke Pusat Bantuan Darurat RuangTenang dan ketersediaan layanan hotline krisis 24 jam gratis.';
    nextSteps = 'Segera menghubungi hotline krisis darurat 119 Ext 8 atau melapor kepada kontak darurat terdekat demi menjaga keselamatan jiwa.';
  } else if (allText.includes('mood') || allText.includes('jurnal')) {
    mainTopic = 'Pencatatan emosi harian dan pengenalan pola suasana hati.';
    mainEmotion = 'Ingin lebih sadar akan emosi pribadi (mindfulness), mengekspresikan diri.';
    mainDiscussed = 'Fitur Mood Tracker, pencatatan jurnal emosi harian, serta validasi emosi naik-turun.';
    nextSteps = 'Melanjutkan pengisian jurnal harian secara rutin guna melihat pola fluktuasi suasana hati secara mingguan.';
  }

  return `**Inti Pembahasan:**\n${mainTopic}\n\n**Perasaan Utama Pengguna:**\n${mainEmotion}\n\n**Hal yang Sudah Dibahas:**\n${mainDiscussed}\n\n**Langkah Kecil Berikutnya:**\n${nextSteps}`;
}

/**
 * Returns a set of 3 highly relevant recommendations based on the last message's content.
 */
export function getLocalFallbackFollowups(lastMessage: string): string[] {
  const msg = lastMessage.toLowerCase();

  if (msg.includes('counselor') || msg.includes('konselor') || msg.includes('psikolog') || msg.includes('bantu')) {
    return [
      'Bagaimana cara membuat janji konseling?',
      'Apakah layanan konseling kampus ini benar-benar gratis?',
      'Bagaimana cara mempersiapkan diri sebelum konseling pertama?'
    ];
  }

  if (msg.includes('screening') || msg.includes('tes') || msg.includes('phq') || msg.includes('gad') || msg.includes('skor')) {
    return [
      'Apa langkah selanjutnya setelah hasil screening keluar?',
      'Apakah hasil screening kondisi mental ini rahasia?',
      'Bagaimana cara meredakan kecemasan akademik secara mandiri?'
    ];
  }

  if (msg.includes('mood') || msg.includes('tracker') || msg.includes('jurnal') || msg.includes('catat')) {
    return [
      'Bagaimana cara mengisi mood tracker dengan benar?',
      'Mengapa mencatat mood penting bagi kesehatan mental?',
      'Bagaimana cara melihat grafik perkembangan emosiku?'
    ];
  }

  if (msg.includes('darurat') || msg.includes('emergency') || msg.includes('mati') || msg.includes('menyerah') || msg.includes('silet')) {
    return [
      'Bagaimana cara menghubungi kontak daruratku?',
      'Siapa saja yang bisa kuhubungi dalam situasi krisis darurat?',
      'Daftar layanan hotline kesehatan mental gratis di Indonesia'
    ];
  }

  if (msg.includes('skripsi') || msg.includes('kuliah') || msg.includes('tugas') || msg.includes('burnout') || msg.includes('lelah') || msg.includes('dosen')) {
    return [
      'Bagaimana cara meredakan burnout akademik?',
      'Tips membagi waktu antara mengerjakan skripsi dan istirahat',
      'Bagaimana cara mengatasi tumpukan tugas tanpa merasa kewalahan?'
    ];
  }

  return [
    'Bagaimana cara meredakan cemas yang datang tiba-tiba?',
    'Apa saja latihan mindfulness sederhana yang bisa kucoba?',
    'Boleh tolong temani aku mengobrol sejenak?'
  ];
}

/**
 * Generates a deeply empathetic, highly realistic, and professional response
 * for simulated counselor chat sessions in /api/counselor-chat.
 */
export function getLocalCounselorResponse(
  messages: { role: string; content: string }[],
  counselorName: string,
  counselorTitle: string,
  specialtiesStr: string,
  studentName: string,
  concern: string
): string {
  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
  
  let responseText = `Halo, ${studentName || 'Kawan'}. Saya ${counselorName || 'Konselor Anda'}. `;
  
  if (lastUserMsg.includes('halo') || lastUserMsg.includes('hai') || lastUserMsg.includes('pagi') || lastUserMsg.includes('siang') || lastUserMsg.includes('sore') || lastUserMsg.includes('malam')) {
    responseText += `Selamat datang di sesi bimbingan konseling simulasi kita hari ini. Terima kasih telah mempercayai saya untuk mendengarkan ceritamu tentang "${concern || 'hal yang kamu rasakan'}". Bagaimana perasaanmu saat ini, dan apa yang bisa kita bahas bersama terlebih dahulu?`;
  } else if (lastUserMsg.includes('skripsi') || lastUserMsg.includes('tugas') || lastUserMsg.includes('kuliah') || lastUserMsg.includes('dosen') || lastUserMsg.includes('lulus') || lastUserMsg.includes('bimbingan')) {
    responseText += `Tekanan mengenai skripsi dan perkuliahan memang seringkali terasa sangat luar biasa berat ya. Sangat wajar jika kamu merasa cemas, takut gagal, atau lelah secara mental.\n\nSebagai konselor, saya ingin mengajakmu untuk melihat ini sebagai suatu proses yang bisa kita urai perlahan. Apakah ada bagian spesifik dari skripsi atau kuliahmu yang saat ini dirasa paling memicu kecemasan atau hambatan terbesar bagi Anda? Mari kita diskusikan bersama.`;
  } else if (lastUserMsg.includes('sedih') || lastUserMsg.includes('menangis') || lastUserMsg.includes('sepi') || lastUserMsg.includes('sendiri') || lastUserMsg.includes('hampa')) {
    responseText += `Mendengar ceritamu, saya bisa merasakan betapa sepinya dan beratnya perasaan yang sedang kamu lalui sendirian. Terima kasih sudah bersedia membagikan rasa lelahmu ini kepada saya.\n\nSetiap perasaan sedih dan hampa itu nyata dan valid. Kamu tidak harus selalu terlihat kuat setiap saat. Mari kita hening sejenak, ambil napas perlahan. Saya ada di sini menemani Anda. Bisakah kamu bercerita, apa hal utama yang biasanya sedikit memberikan rasa tenang di saat-saat seberat ini?`;
  } else if (lastUserMsg.includes('cemas') || lastUserMsg.includes('panik') || lastUserMsg.includes('khawatir') || lastUserMsg.includes('overthink') || lastUserMsg.includes('takut')) {
    responseText += `Kecemasan yang berlebihan sering kali membuat pikiran kita terasa sangat bising, penuh dengan skenario terburuk, dan tubuh menjadi tegang. Saya sangat memahami kondisi yang sedang kamu alami saat ini.\n\nDalam sesi konseling, kita bisa melatih teknik regulasi emosi bersama. Mari kita coba sadari napas kita dahulu. Tarik napas panjang, tahan sebentar, lalu hembuskan perlahan. Cobalah untuk fokus pada momen saat ini. Apa yang sedang kamu pikirkan yang paling membuatmu merasa terancam atau khawatir?`;
  } else if (lastUserMsg.includes('terima kasih') || lastUserMsg.includes('makasih') || lastUserMsg.includes('thank') || lastUserMsg.includes('makasi')) {
    responseText += `Sama-sama, ${studentName || 'Kawan'}. Menjadi bagian dari perjalananmu untuk bertumbuh dan merawat kesehatan mental adalah hal yang sangat berharga bagi saya. Ingatlah bahwa kamu memiliki kekuatan di dalam dirimu untuk melewati ini, dan tidak ada salahnya untuk selalu mencari dukungan profesional bila dibutuhkan. Sesi simulasi kita selalu terbuka untukmu.`;
  } else {
    responseText += `Saya mendengarkan setiap perkataanmu dengan penuh perhatian, ${studentName || 'Kawan'}. Perjalanan akademis dan pribadi di masa kuliah memang penuh dengan pasang surut yang menantang.\n\nSebagai konselor pendampingmu, saya ingin terus bersamamu mengurai benang kusut di pikiranmu. Bolehkah kamu menceritakan lebih dalam lagi mengenai apa yang sedang berkecamuk di dalam hatimu saat ini? Saya siap mendengarkan.`;
  }
  
  responseText += `\n\n*(Sesi Simulasi Offline - Konseling Virtual)*`;
  return responseText;
}
