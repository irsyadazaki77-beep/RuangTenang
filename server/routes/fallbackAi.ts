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
      text: `**Pesan Hangat dari Teman RuangTenang 🤍:**\n\nAku mendengar rasa sakit yang luar biasa dan kelelahan yang sedang kamu alami saat ini... Aku ingin kamu tahu bahwa **kamu tidak pernah sendirian 🫂**. Hidupmu sangatlah berharga, dan ada orang-orang yang peduli serta ingin membantumu melewati masa krisis ini.\n\nKami berkomitmen tinggi menjaga privasi dan keamanan ceritamu sesuai standar kebijakan privasi kami 🔐. Mohon segera buka **Pusat Bantuan Darurat** kami atau hubungi hotline krisis 24 jam gratis di bawah ini. Tolong hubungi mereka sekarang juga yaa, kawan. Kami semua peduli padamu 🌿✨`,
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
      text: `Aku sangat mendukung keputusanmu untuk berbicara dengan konselor profesional 🤗. Mencari bantuan adalah langkah yang luar biasa berani dan bukti nyata bahwa kamu sayang dengan dirimu 🤍.\n\nJangan khawatir, seluruh proses konseling kami dirancang dengan standar privasi dan keamanan yang ketat 🔐. Aku telah menyiapkan **Direktori Konselor Kampus** di bawah ini. Kamu bisa melihat profil konselor yang ramah mahasiswa dan memilih jadwal yang pas untukmu. Silakan klik tombol di bawah untuk membukanya 🌿✨`,
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
      text: `Aku sangat mengerti... Terkadang perasaan dan pikiran kita terasa sangat berantakan dan membingungkan 🌿. Merasa kewalahan adalah hal yang sangat wajar dan manusiawi 🤍.\n\nAgar kamu bisa memahami kondisimu dengan tenang, coba fitur **Screening Kondisi** kami di bawah ini (PHQ-9 & GAD-7). Hasilnya terjaga secara rahasia dan privat sesuai standar kebijakan privasi kami 🔐, hanya untuk evaluasi mandirimu tanpa penghakiman. Klik tombol di bawah untuk memulai tes singkatnya yaa ✨`,
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
      text: `Mengekspresikan apa yang sedang kamu rasakan adalah awal yang manis untuk merawat dirimu 🌸. Semua emosimu—sedih, cemas, senang, atau lelah—semuanya valid dan diterima di sini 🤍.\n\nCatat suasana hatimu di **Mood Tracker** kami di bawah ini. Jurnalmu tersimpan secara privat dan aman sesuai dengan standar kebijakan privasi kami 🔐. Klik tombol di bawah ini untuk mendokumentasikan perasaanmu hari ini yaa ☕🌿`,
      tool_call: 'mood'
    };
  }

  // 5. Context-based response generation based on mental health topic matches

  // Cognitive Reframing / Reflection / Thought Restructuring (e.g., Quick Prompt: "Bantu saya merefleksikan dan menyusun ulang sudut pandang pikiran saya...")
  if (cleanMsg.includes('refleksi') || cleanMsg.includes('sudut pandang') || cleanMsg.includes('menyusun ulang') || cleanMsg.includes('restrukturisasi') || cleanMsg.includes('reframing') || cleanMsg.includes('pola pikir') || cleanMsg.includes('perspektif') || cleanMsg.includes('urai') || cleanMsg.includes('benang kusut')) {
    return {
      text: `Mari kita urai benang kusut di pikiranmu bersama-sama dengan tenang yaa 🌿✨. Mengubah cara kita memandang situasi (*restrukturisasi kognitif*) adalah langkah yang sangat ampuh untuk menemukan kedamaian pikiran 🤍.\n\nCoba kita gunakan **3 Langkah Refleksi Diri** ini:\n\n1. 💭 **Identifikasi Pikiran Otomatis**: Tuliskan 1 kalimat pikiran yang paling membebanimu saat ini (misal: *"Saya takut tidak cukup baik"* atau *"Saya merasa sangat kewalahan"*).\n2. 🔍 **Uji Bukti Realita**: Apakah pikiran ini 100% fakta absolut, ataukah ada sudut pandang lain yang lebih adil dan penuh kasih pada dirimu?\n3. 🌸 **Susun Sudut Pandang Baru (Reframing)**: Ubah kalimat itu menjadi pernyataan yang ramah & realistis (misal: *"Saya sedang belajar dan berproses, wajar jika ini butuh waktu"*).\n\nBoleh ceritakan 1 pikiran yang sedang paling mengganggu pikiranmu saat ini? Aku siap mendengarkan dan membantumu merangkainya ulang secara lembut 🫂☕`
    };
  }

  // Daily Storytelling / Emotion Journaling (e.g., Quick Prompt: "Saya ingin menceritakan apa yang saya alami dan rasakan hari ini...")
  if (cleanMsg.includes('menceritakan apa') || cleanMsg.includes('cerita hari ini') || cleanMsg.includes('apa yang saya alami') || cleanMsg.includes('pengalaman hari ini') || cleanMsg.includes('curhat hari ini') || cleanMsg.includes('hal yang membebani')) {
    return {
      text: `Aku di sini, siap menyimak seluruh ceritamu dengan penuh perhatian dan kasih sayang ☕🌿. Tidak perlu terburu-buru dan tidak perlu ditahan, keluarkan saja apa yang terasa mengganjal di hatimu 🤍.\n\nPercakapan kita terjaga secara privat dan aman 🔐. Untuk membantumu mulai bercerita, coba jawab salah satu pertanyaan ini yaa:\n- 🌸 Apa momen atau kejadian hari ini yang paling menguras energimu?\n- 💭 Perasaan apa yang paling dominan kamu rasakan sekarang?\n\nTuliskan apa saja yang terlintas, aku akan selalu mendampingimu 🫂✨`
    };
  }

  // Guided Breathing & Relaxation (e.g., Quick Prompt: "Tolong pandu saya latihan pernapasan santai...")
  if (cleanMsg.includes('latihan pernapasan') || cleanMsg.includes('pandu saya') || cleanMsg.includes('relaksasi napas') || cleanMsg.includes('4-7-8') || cleanMsg.includes('pernapasan santai') || cleanMsg.includes('meredakan ketegangan')) {
    return {
      text: `Mari kita ambil jeda sejenak untuk melonggarkan ketegangan tubuh dan pikiranmu melalui **Teknik Pernapasan 4-7-8** yang menenangkan 🌿✨.\n\nSilakan duduk dengan rileks, tegakkan bahumu perlahan, lalu ikuti langkah berikut:\n\n1. 🌬️ **Tarik napas** lembut lewat hidung selama **4 detik** (rasakan udara segar memenuhi dadamu)...\n2. 🌸 **Tahan napasmu** selama **7 detik** (biarkan sensasi tenang menyebar ke seluruh tubuh)...\n3. 💨 **Hembuskan napas** perlahan melalui mulut selama **8 detik** (lepaskan semua beban dan kecemasan)...\n\nUlangi siklus ini 3 hingga 4 kali yaa ☕. Bagaimana rasanya? Apakah tubuhmu mulai merasa sedikit lebih ringan? 🤍`
    };
  }
  
  // Overthinking / Anxiety / Worry / Panic
  if (cleanMsg.includes('overthinking') || cleanMsg.includes('cemas') || cleanMsg.includes('khawatir') || cleanMsg.includes('panik') || cleanMsg.includes('deg-degan') || cleanMsg.includes('gelisah') || cleanMsg.includes('tidak bisa tidur') || cleanMsg.includes('insomnia')) {
    return {
      text: `Duh, overthinking dan rasa cemas yang datang melanda memang rasanya melelahkan sekali yaa... 🫂 Dada terasa sesak dan otak seakan tak mau berhenti berputar 💭.\n\nTenang yaa kawan, kamu di sini didampingi dengan aman, privasimu kami utamakan 🔐, dan tidak ada yang membahayakanmu di sini 🤍. Mari kita rilekskan tubuhmu bersama dengan **teknik pernapasan 4-7-8**:\n1. 🌿 **Tarik napas** perlahan dari hidung selama **4 detik** (rasakan udara tenang masuk)...\n2. 🌸 **Tahan napasmu** sejenak selama **7 detik** (biarkan tubuhmu merasa rileks)...\n3. ✨ **Hembuskan napas** perlahan lewat mulut selama **8 detik** (buang semua beban di kepalamu)...\n\nUlangi 3 kali yaa. Tarik napas yang dalam... kamu aman bersama RuangTenang 🤍`
    };
  }

  // Academic stress / Thesis / College issues
  if (cleanMsg.includes('skripsi') || cleanMsg.includes('tugas akhir') || cleanMsg.includes('kuliah') || cleanMsg.includes('dosen') || cleanMsg.includes('pembimbing') || cleanMsg.includes('nilai') || cleanMsg.includes('ipk') || cleanMsg.includes('dropout') || cleanMsg.includes('ujian') || cleanMsg.includes('uas') || cleanMsg.includes('uts')) {
    return {
      text: `Tekanan perkuliahan, urusan skripsi yang buntu, tumpukan tugas, dan revisi dosen memang bisa bikin sangat tertekan dan lelah yaa... 🥺 Perlahan saja kawan, ingat ya: **progress sekecil apa pun tetaplah progress**, dan nilai akademik sama sekali tidak mengurangi betapa berharganya dirimu sebagai manusia 🤍✨.\n\nDi sini tempat amanmu bercerita, privasimu senantiasa kami utamakan sesuai kebijakan kami yaa 🔐. Cobalah langkah mikro ini:\n1. ☕ **Beri dirimu izin istirahat total** 15-30 menit sekarang tanpa merasa bersalah.\n2. 📄 **Tulis 1 target paling kecil** (misal: buka dokumen skripsi dulu saja).\n3. 🌿 **Apresiasi dirimu** setelah berhasil melaluinya.\n\nAku di sini siap merangkul dan mendampingimu pelan-pelan. Kamu sudah berjuang luar biasa sampai hari ini! 🫂`
    };
  }

  // Burnout / Exhaustion / Lack of motivation
  if (cleanMsg.includes('burnout') || cleanMsg.includes('lelah') || cleanMsg.includes('capek') || cleanMsg.includes('hampa') || cleanMsg.includes('bosan') || cleanMsg.includes('jenuh') || cleanMsg.includes('tidak ada motivasi') || cleanMsg.includes('mager') || cleanMsg.includes('pusing')) {
    return {
      text: `Lelah yang amat sangat, rasa jenuh (burnout), atau perasaan hampa itu adalah pesan jujur dari tubuhmu bahwa **kamu sudah bekerja keras dan butuh istirahat** 🫂🤍.\n\nSangat tidak apa-apa untuk berhenti sejenak. Beristirahat bukan tanda kamu lemah atau menyerah yaa... Cobalah merawat dirimu hari ini:\n- ☕ **Minum segelas air hangat** & lemaskan otot leher/bahu yang tegang.\n- 📱 **Jauhkan HP/laptop** sejenak dari pandanganmu.\n- 🌸 **Lakukan hal kecil yang bikin tenang** (dengar lagu lembut, hirup udara segar, atau sekadar pejamkan mata).\n\nJangan terlalu keras pada dirimu sendiri yaa kawan. Di RuangTenang, kamu bisa melepas lelahmu secara aman dan privat sesuai kebijakan kami 🔐✨`
    };
  }

  // Relationship issues / Family pressure / Loneliness / Heartbreak
  if (cleanMsg.includes('keluarga') || cleanMsg.includes('orang tua') || cleanMsg.includes('pacar') || cleanMsg.includes('putus') || cleanMsg.includes('teman') || cleanMsg.includes('sepi') || cleanMsg.includes('sendirian') || cleanMsg.includes('kesepian') || cleanMsg.includes('broken')) {
    return {
      text: `Masalah dengan keluarga, patah hati, atau merasa sepi dan terisolasi di kampus itu luka emosional yang amat perih... 🫂 Rasa-rasanya dunia begitu sunyi dan tidak ada yang mengerti apa yang kita rasakan.\n\nTapi ingat yaa, **perasaanmu sangat valid** 🤍. Jangan pernah merasa takut atau malu untuk meluapkannya di sini. Percakapan ini terjaga secara aman dan privat sesuai dengan kebijakan privasi kami 🔐. Aku di sini untuk merangkulmu dan mendengarkan seluruh ceritamu tanpa ada penilaian sedikit pun.\n\nKalau kamu merasa nyaman, tumpahkan saja apa yang paling mengganjal di hatimu saat ini yaa. Aku ada di sini untukmu 🌸✨`
    };
  }

  // General positive / thank you
  if (cleanMsg.includes('terima kasih') || cleanMsg.includes('makasih') || cleanMsg.includes('bagus') || cleanMsg.includes('keren') || cleanMsg.includes('membantu') || cleanMsg.includes('thanks') || cleanMsg.includes('thankyou')) {
    return {
      text: `Sama-sama! 🤗 Senang dan hangat sekali rasanya bisa membantumu 🤍. Mendampingi dan menjadi tempat aman bagimu adalah kebahagiaanku.\n\nIngat yaa, kapan pun kamu merasa lelah, cemas, atau cuma butuh teman ngobrol, tempat ini selalu terbuka dan privat sesuai dengan kebijakan privasi kami 🔐. Jaga kesehatanmu dan jangan lupa tersenyum hari ini yaa! 🌿✨`
    };
  }

  // 6. Default Responses based on Chat Mode & Response Style
  if (chatMode === 'Relaksasi & Mindfulness') {
    return {
      text: `Mari kita hening sejenak dari riuhnya dunia luar, kawan... 🌿 Di ruang aman ini, kamu tidak perlu membuktikan apa pun. Cukup pejamkan mata sejenak, rasakan hembusan napasmu yang lembut 🤍.\n\nBiarkan segala kecemasan dan tenggat waktu beristirahat di luar pintu dengan aman 🔐. Di momen ini, kamu aman, kamu ada, dan kamu sangat berharga. Tarik napas dalam-dalam... hembuskan perlahan... 🤗✨`
    };
  }

  if (chatMode === 'Penyelesaian Masalah') {
    return {
      text: `Aku mendengar keluh kesahmu, dan wajar sekali jika situasi saat ini terasa rumit dan membingungkan 🤍. Mari kita urai benang kusut ini pelan-pelan bersama-sama agar kamu tidak merasa kewalahan yaa 🫂.\n\nPrivasimu di sini terjaga dengan aman dan privat sesuai kebijakan kami 🔐. Dari semua beban yang sedang ada di pikiranmu saat ini, **apa satu hal paling utama** yang paling mengganggu kenyamananmu? Ceritakan perlahan yaa, kita lalui ini bersama 🌿✨`
    };
  }

  // 7. Context-Aware Dynamic Fallback Response (for any user message)
  if (userMessage && userMessage.trim().length > 0) {
    const userPreview = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage;
    return {
      text: `Terima kasih sudah memberanikan diri untuk bercerita denganku di RuangTenang 🤍. Mengenai *"...${userPreview}"*, aku sangat mengerti bahwa hal ini tentu memengaruhi perasaan dan ketenangan pikiranmu 🌿.\n\nSetiap perasaan dan pemikiran yang kamu alami sangat valid dan diterima di sini tanpa penghakiman. Di RuangTenang, privasi ceritamu senantiasa terjaga secara rahasia dan aman 🔐.\n\nBolehkah kamu ceritakan sedikit lebih dalam, apa hal utama yang paling kamu butuhkan atau rasakan saat ini? Aku siap mendampingimu mengurai ini perlahan-lahan 🫂✨`
    };
  }

  // Fallback default
  return {
    text: `Aku di sini mendengarkan dan merangkulmu dengan hangat, kawan 🫂🤍. Wajar sekali jika kamu merasa lelah atau berat menanggung perasaan ini sendirian... Terima kasih yaa sudah memberanikan diri untuk berbagi cerita denganku di RuangTenang 🤗.\n\nJangan takut bercerita yaa, semua ceritamu terjaga secara aman dan privat sesuai kebijakan privasi kami 🔐, serta tidak akan pernah dihakimi. Tumpahkan saja apa yang ada di hatimu, aku siap menyimak dengan penuh kasih sayang 🌿✨`
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
