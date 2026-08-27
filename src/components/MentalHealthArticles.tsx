import { useEscapeKey } from '../hooks/useEscapeKey';
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  ExternalLink, 
  Bookmark, 
  Clock, 
  CheckCircle2, 
  X, 
  BookmarkCheck, 
  Share2, 
  ThumbsUp, 
  Check, 
  BookMarked,
  Sparkles
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  source: string;
  content: string;
  imageUrl: string;
  tips: string[];
}

const ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Mengenal Burnout Akademik: Tanda dan Cara Mengatasinya',
    category: 'Stres Akademik',
    readTime: '5 Min',
    summary: 'Kelelahan ekstrem akibat beban tugas kampus yang berlebihan. Kenali tanda-tanda awalnya dan langkah konkret untuk memulihkan energi emosional Anda.',
    source: 'Psikologi Kampus',
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800',
    tips: [
      'Batasi waktu belajar harian secara tegas dengan metode Time-Boxing.',
      'Sediakan waktu minimal 30 menit setiap hari tanpa layar gawai (digital detox).',
      'Ceritakan beban tugas Anda ke teman dekat atau konselor untuk mengurangi isolasi emosional.'
    ],
    content: `Burnout akademik adalah kondisi kelelahan fisik, emosional, dan mental kronis yang disebabkan oleh stres jangka panjang yang terkait dengan kegiatan studi Anda. Kondisi ini bukan sekadar rasa malas atau kelelahan biasa sehabis begadang semalam, melainkan pengurasan energi yang mendalam dan berkepanjangan.

Di kalangan mahasiswa, tuntutan untuk mempertahankan IPK tinggi, menyelesaikan tugas kelompok, mempersiapkan ujian, serta aktif di organisasi kemahasiswaan sering kali menjadi pemicu utama.

### Tanda-Tanda Utama Burnout Akademik
1. **Kelelahan Emosional & Fisik**: Merasa benar-benar terkuras tenaganya terus-menerus. Bangun pagi terasa sangat berat dan Anda merasa kekurangan energi bahkan setelah tidur yang lama.
2. **Sinisme & Sikap Apatis**: Mulai kehilangan minat pada perkuliahan, merasa muak dengan tugas-tugas, mengisolasi diri dari diskusi kelompok, serta skeptis terhadap masa depan akademik.
3. **Penurunan Performa & Efikasi Diri**: Kesulitan konsentrasi saat belajar, sering menunda-nunda tugas (prokrastinasi ekstrem), dan merasa diri tidak cukup pintar atau tidak kompeten untuk menyelesaikan perkuliahan.

### Strategi Pemulihan yang Terbukti Efektif
* **Restrukturisasi Jadwal (Time Boxing)**: Alih-alih belajar tanpa batas waktu, tetapkan jam belajar yang spesifik (misal: pukul 09.00 - 17.00). Setelah lewat jam tersebut, berikan diri Anda izin penuh untuk beristirahat tanpa memikirkan tugas akademis.
* **Latih Istirahat Mikro (Micro-Breaks)**: Cobalah teknik Pomodoro (25 menit fokus, 5 menit istirahat). Pada jeda 5 menit tersebut, menjauhlah dari layar gawai, regangkan tubuh, atau minumlah segelas air.
* **Praktikkan Self-Compassion**: Sadarilah bahwa Anda adalah manusia biasa yang memiliki keterbatasan. Nilai akademis yang kurang memuaskan bukanlah representasi nilai kemanusiaan atau masa depan Anda secara keseluruhan.`
  },
  {
    id: '2',
    title: 'Teknik Grounding 5-4-3-2-1 untuk Meredakan Serangan Panik',
    category: 'Kecemasan',
    readTime: '3 Min',
    summary: 'Sebuah panduan taktis untuk membawa kesadaran Anda kembali ke masa kini dan meredakan kepanikan atau kecemasan luar biasa yang menyerang tiba-tiba.',
    source: 'Asosiasi Psikologi',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
    tips: [
      'Lakukan teknik ini secara perlahan, berikan waktu 5-10 detik untuk setiap indra.',
      'Kombinasikan dengan teknik pernapasan perut (diaphragmatic breathing).',
      'Praktikkan di lingkungan yang tenang terlebih dahulu sebelum mencobanya saat cemas melanda.'
    ],
    content: `Serangan panik atau kecemasan yang tiba-tiba dapat membuat seseorang merasa terputus dari dunia nyata, pusing, hingga sesak napas. Tubuh merespons dengan mode "fight or flight" (melawan atau lari) walaupun tidak ada bahaya fisik yang nyata di sekitar Anda.

Teknik grounding 5-4-3-2-1 adalah latihan kognitif sederhana berbasis terapi perilaku kognitif (CBT) yang dirancang untuk meredakan kecemasan dengan mengalihkan fokus pikiran Anda dari kecemasan internal ke lingkungan eksternal menggunakan panca indra.

### Cara Mempraktikkan Metode 5-4-3-2-1

Mulailah dengan menarik napas dalam-dalam dari perut (hirup selama 4 detik, tahan 4 detik, embuskan selama 4 detik). Kemudian, cari dan sebutkan hal-hal berikut secara perlahan:

1. **5 Hal yang Dapat Anda LIHAT**: Perhatikan sekeliling Anda secara saksama. Sebutkan lima benda kecil yang biasanya Anda abaikan, seperti retakan di dinding, pola serat kayu di meja, gantungan kunci, atau bayangan lampu.
2. **4 Hal yang Dapat Anda SENTUH**: Rasakan sensasi fisik di sekitar Anda. Sentuh tekstur pakaian Anda, rasakan dinginnya permukaan lantai di telapak kaki, rasakan kasarnya permukaan kayu meja, atau rasakan embusan angin di kulit Anda.
3. **3 Hal yang Dapat Anda DENGAR**: Fokuskan pendengaran Anda ke luar tubuh. Dengarkan suara-suara latar belakang yang ada, seperti desis AC, kicauan burung di kejauhan, suara lalu lintas kendaraan, atau detak jarum jam dinding.
4. **2 Hal yang Dapat Anda CIUM**: Hirup udara di sekitar Anda. Cari bau yang tercium, seperti aroma kopi yang baru diseduh, wangi parfum di baju Anda, bau buku tua, atau segarnya wangi lantai yang baru dipel.
5. **1 Hal yang Dapat Anda RASAKAN**: Fokuskan pada indra pengecap Anda. Rasakan sisa rasa makanan atau pasta gigi di mulut Anda, atau minum seteguk air dingin dan rasakan sensasinya saat melewati lidah dan tenggorokan.

Latihan ini akan membantu mengirimkan sinyal ke otak Anda bahwa situasi saat ini aman, menenangkan sistem saraf parasimpatis, dan membawa Anda kembali ke momen masa kini.`
  },
  {
    id: '3',
    title: 'Manajemen Waktu Skripsi agar Tidak Mudah Stres',
    category: 'Tips Belajar',
    readTime: '7 Min',
    summary: 'Menyusun jadwal pengerjaan yang realistis, memecah tugas besar menjadi bagian-bagian kecil, dan cara efektif menghindari prokrastinasi.',
    source: 'Bimbingan Konseling',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800',
    tips: [
      'Pecah penulisan skripsi menjadi target paragraf harian, bukan bab mingguan.',
      'Buat janji menulis bersama teman (writing buddy) untuk menjaga akuntabilitas harian.',
      'Selesaikan draf kasar terlebih dahulu tanpa langsung menyuntingnya (Done is better than perfect).'
    ],
    content: `Mengerjakan tugas akhir atau skripsi sering kali dipandang sebagai momok paling menakutkan bagi mahasiswa tingkat akhir. Kurangnya struktur harian yang jelas, tekanan dari orang tua, serta kebingungan mengenai arah penelitian kerap memicu stres berat hingga depresi ringan.

Kunci utama menyelesaikan skripsi tanpa mengorbankan kesehatan mental Anda bukanlah bekerja keras 12 jam sehari, melainkan manajemen waktu yang cerdas dan konsisten.

### Mengapa Kita Sering Menunda Skripsi?
Sebagian besar mahasiswa menunda skripsi bukan karena malas, melainkan karena **ketakutan kognitif**. Pikiran kita melihat "Menyelesaikan Bab 3" sebagai tugas raksasa yang membingungkan, sehingga otak memilih melarikan diri ke aktivitas yang memberikan kepuasan instan (seperti bermain media sosial).

### Langkah Praktis Mengelola Waktu Skripsi

* **Gunakan Strategi De-konstruksi Tugas**: Jangan menulis agenda harian "Kerjakan Bab II". Ini terlalu luas dan mengintimidasi. Pecah menjadi unit yang sangat kecil dan spesifik, misalnya: "Membaca 2 jurnal tentang kepuasan kerja" atau "Menulis 3 paragraf latar belakang penelitian".
* **Terapkan Batas Waktu Minat (The 5-Minute Rule)**: Katakan pada diri Anda, "Saya hanya akan membuka laptop dan mengetik draf skripsi selama 5 menit saja harian." Sering kali, tantangan terbesar adalah memulai. Begitu Anda melewati 5 menit pertama, Anda akan cenderung melanjutkan pengerjaan tersebut.
* **Tetapkan Jadwal Bimbingan yang Proaktif**: Jangan menunggu skripsi Anda sempurna baru berkonsultasi dengan dosen pembimbing. Konsultasikan draf kasar atau sekadar kerangka berpikir Anda. Masukan yang cepat akan mencegah Anda tersesat terlalu jauh dalam penulisan.`
  },
  {
    id: '4',
    title: 'Pentingnya Self-Compassion Saat Mengalami Kegagalan',
    category: 'Pengembangan Diri',
    readTime: '4 Min',
    summary: 'Belajar untuk bersikap ramah dan tidak terlalu keras pada diri sendiri ketika mendapatkan nilai buruk atau menghadapi penolakan akademis.',
    source: 'Kesehatan Mental',
    imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&q=80&w=800',
    tips: [
      'Ganti kritikus internal Anda dengan kalimat penyemangat seperti yang biasa Anda katakan ke sahabat terdekat.',
      'Ingatlah bahwa setiap mahasiswa pernah melakukan kesalahan atau mendapatkan nilai yang kurang memuaskan.',
      'Ambil waktu sejenak untuk memeluk diri sendiri atau menarik napas hangat saat kegagalan melanda.'
    ],
    content: `Kehidupan kampus penuh dengan evaluasi: nilai ujian, seleksi beasiswa, persetujuan judul proposal, hingga seleksi magang. Di tengah lingkungan yang sangat kompetitif ini, sangat mudah bagi kita untuk jatuh ke dalam perangkap kritik diri yang kejam ketika mengalami kegagalan.

*Self-compassion* atau welas asih pada diri sendiri adalah praktik memperlakukan diri sendiri dengan kebaikan, perhatian, dan pengertian yang sama seperti yang kita berikan kepada seorang teman baik yang sedang mengalami masa-masa sulit.

### Tiga Pilar Utama Self-Compassion

Menurut Dr. Kristin Neff, pelopor riset welas asih diri, self-compassion terdiri dari tiga komponen utama:

1. **Self-Kindness (Kebaikan Diri) vs. Self-Judgment**: Bersikap hangat dan memahami diri sendiri ketika kita gagal atau berbuat salah, alih-alih mengutuk atau mencambuki diri sendiri dengan kata-kata kasar.
2. **Common Humanity (Kemanusiaan Umum) vs. Isolation**: Menyadari bahwa kegagalan, rasa sakit, dan ketidaksempurnaan adalah bagian dari pengalaman hidup universal setiap manusia. Anda tidak sendirian dalam perjuangan ini; ribuan mahasiswa lain juga merasakan kecemasan yang sama.
3. **Mindfulness (Kesadaran Penuh) vs. Over-identification**: Mengamati emosi negatif kita secara seimbang dan objektif tanpa menekan emosi tersebut ataupun hanyut terbawa olehnya.

### Cara Melatih Self-Compassion Saat Nilai Ujian Buruk
Bila Anda mendapati nilai ujian Anda mengecewakan, jangan langsung melabeli diri Anda "bodoh" atau "gagal". Tarik napas, lalu katakan pada diri sendiri: *"Ujian ini memang sangat sulit dan saya kecewa dengan hasilnya. Namun, ini tidak mendefinisikan kecerdasan saya. Saya sudah berusaha, dan saya akan belajar dari kesalahan ini untuk ujian berikutnya."*`
  },
  {
    id: '5',
    title: 'Mengatasi Quarter Life Crisis di Masa Kuliah',
    category: 'Kesehatan Mental',
    readTime: '6 Min',
    summary: 'Merasa tertinggal dari teman sebaya? Pahami fase krisis identitas mahasiswa tingkat akhir dan temukan panduan sehat untuk mengatasinya.',
    source: 'Pusat Karir',
    imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=800',
    tips: [
      'Batasi konsumsi media sosial (seperti LinkedIn atau Instagram) jika mulai memicu rasa rendah diri.',
      'Fokuslah pada pencapaian mikro Anda sendiri harian daripada membandingkan babak tengah orang lain.',
      'Definisikan ulang apa arti "sukses" yang sesuai dengan nilai-nilai hidup pribadi Anda.'
    ],
    content: `Quarter Life Crisis (QLC) adalah periode ketidakpastian, kecemasan, dan kebingungan mendalam yang biasanya terjadi pada rentang usia 18 hingga 30 tahun. Di masa kuliah, krisis ini sering kali memuncak pada mahasiswa semester akhir atau lulusan baru.

Gejalanya meliputi kecemasan konstan tentang masa depan karir, kebingungan akan arah hidup, ketakutan tidak bisa mandiri secara finansial, serta kebiasaan membandingkan diri secara destruktif dengan pencapaian teman seangkatan yang tampak lebih "sukses".

### Mengapa QLC Terjadi di Bangku Kuliah?
Selama belasan tahun, hidup kita terstruktur rapi oleh sistem persekolahan: lulus SD masuk SMP, lulus SMP masuk SMA, lalu masuk kuliah. Namun menjelang kelulusan kuliah, "peta jalan" tersebut tiba-tiba hilang. Anda dihadapkan pada jutaan pilihan arah hidup tanpa ada satu pun jawaban yang mutlak benar. Ketidakpastian inilah yang memicu rasa panik.

### Cara Menghadapi Quarter Life Crisis Secara Sehat

* **Sadari Adanya Efek "Selected Highlights"**: Apa yang Anda lihat di LinkedIn atau Instagram teman Anda adalah rangkuman momen terbaik dan pencapaian termanis mereka. Mereka tidak mempublikasikan malam-malam penuh air mata, ratusan surat penolakan kerja, atau kebingungan yang mereka rasakan sendiri.
* **Fokus pada "Circle of Control" (Lingkaran Kendali)**: Anda tidak bisa mengontrol keadaan ekonomi negara, panggilan wawancara kerja, atau keberuntungan orang lain. Pusatkan energi Anda pada apa yang bisa Anda kendalikan: memperbaiki CV, mempelajari keterampilan baru, menjaga rutinitas tidur, dan menjaga kesehatan mental Anda.
* **Jalani Eksplorasi, Bukan Tekanan**: Usia 20-an awal adalah waktu untuk mencoba, melakukan kesalahan, dan belajar kembali. Tidak apa-apa jika pekerjaan pertama Anda tidak langsung sesuai dengan impian masa kecil Anda. Setiap langkah adalah proses akumulasi pengalaman hidup.`
  },
  {
    id: '6',
    title: 'Mengatasi Impostor Syndrome di Lingkungan Kampus',
    category: 'Pengembangan Diri',
    readTime: '6 Min',
    summary: 'Merasa tidak pantas berada di kampus Anda atau takut dianggap sebagai penipu? Kenali fenomena Impostor Syndrome dan langkah untuk mengatasinya.',
    source: 'Psikologi Kampus',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800',
    tips: [
      'Tulis daftar pencapaian konkret Anda (prestasi, tugas sukses, rintangan yang berhasil dilewati) dalam jurnal.',
      'Bicarakan kekhawatiran Anda kepada teman sebaya; Anda akan kaget mengetahui bahwa mereka pun merasakan hal serupa.',
      'Terima kegagalan kecil sebagai bagian dari kurva belajar alami, bukan tanda ketidakmampuan.'
    ],
    content: `Impostor Syndrome atau sindrom penipu adalah fenomena psikologis di mana seseorang meragukan pencapaiannya sendiri dan memiliki ketakutan konstan bahwa mereka akan ketahuan sebagai "penipu" yang tidak kompeten.

Di lingkungan universitas yang kompetitif, banyak mahasiswa berprestasi diam-diam menderita sindrom ini. Mereka merasa masuk ke jurusan favorit hanya karena keberuntungan, atau mendapatkan nilai A semata-mata karena dosen sedang bermurah hati, bukan karena kecerdasan atau kerja keras mereka sendiri.

### Tanda-Tanda Impostor Syndrome pada Mahasiswa
1. **Atribusi Eksternal**: Menghubungkan semua kesuksesan dengan faktor eksternal seperti keberuntungan, waktu yang tepat, atau koneksi, sambil menyalahkan diri sendiri sepenuhnya atas setiap kegagalan kecil.
2. **Ketakutan Ekstrem terhadap Evaluasi**: Menghindari partisipasi aktif di kelas karena takut membuat kesalahan yang akan membuktikan bahwa mereka tidak secerdas yang dikira orang lain.
3. **Kerja Berlebihan (Over-working)**: Bekerja keras melampaui batas wajar untuk menutupi "kekurangan" imajiner mereka, yang pada akhirya memicu burnout akademis.

### Cara Menghadapi Sindrom Penipu Secara Konstruktif
* **Sarin Fakta dari Perasaan**: Perasaan tidak cukup pintar bukanlah fakta obyektif. Ketika pikiran penipu muncul, tantang dengan bukti nyata: "Saya lulus ujian mandiri, saya mengumpulkan tugas tepat waktu, dan saya memahami materi kuliah ini."
* **Ubah Cara Memandang Kegagalan**: Orang yang sehat secara kognitif melihat kesalahan sebagai kesempatan untuk bertumbuh, bukan sebagai konfirmasi akhir atas ketidakmampuan diri.
* **Akui Kelebihan Anda secara Terbuka**: Saat seseorang memuji hasil presentasi Anda, gantilah respons defensif seperti "Ah, itu cuma kebetulan" dengan ucapan yang mengapresiasi diri: "Terima kasih, saya memang mempersiapkan bahan presentasi ini dengan sungguh-sungguh."`
  },
  {
    id: '7',
    title: 'Pola Tidur Sehat (Sleep Hygiene) bagi Mahasiswa Pejuang Tugas',
    category: 'Kesehatan Mental',
    readTime: '5 Min',
    summary: 'Sering begadang demi tugas kuliah? Temukan panduan sleep hygiene yang taktis untuk memulihkan fungsi otak, fokus, dan stabilitas emosional Anda.',
    source: 'Klinik Kesehatan',
    imageUrl: 'https://images.unsplash.com/photo-1511295742364-92b9345f6853?auto=format&fit=crop&q=80&w=800',
    tips: [
      'Matikan semua layar perangkat (HP, laptop, tablet) minimal 30-45 menit sebelum tidur.',
      'Pertahankan jadwal tidur dan bangun yang konsisten, bahkan di hari libur akhir pekan.',
      'Hindari konsumsi kafein atau minuman energi setelah jam 3 sore.'
    ],
    content: `Bagi mahasiswa, tidur sering kali menjadi hal pertama yang dikorbankan demi mengejar tenggat waktu tugas, ujian, atau kegiatan organisasi. Padahal, kurang tidur kronis berdampak destruktif pada kesehatan mental, memperburuk gejala kecemasan, memicu depresi, dan merusak fungsi kognitif otak Anda.

Sleep Hygiene (higienitas tidur) adalah serangkaian kebiasaan dan praktik lingkungan yang dirancang untuk meningkatkan kualitas dan kuantitas tidur malam Anda agar otak dapat berfungsi optimal keesokan harinya.

### Mengapa Otak Mahasiswa Membutuhkan Tidur Berkualitas?
Saat tidur, otak melakukan proses pembersihan racun metabolik serta melakukan konsolidasi memori. Informasi yang Anda pelajari seharian di ruang kuliah dipindahkan dari memori jangka pendek ke memori jangka panjang saat Anda memasuki fase deep sleep. Begadang semalaman untuk ujian justru menurunkan kapasitas daya ingat otak Anda secara drastis saat lembar soal dibagikan.

### Langkah Membangun Sleep Hygiene di Kamar Kos
* **Kondisikan Kamar Tidur**: Pastikan area tidur Anda gelap, sunyi, dan sejuk. Gunakan tirai tebal atau penutup mata jika cahaya luar mengganggu.
* **Lakukan Ritual Relaksasi Sebelum Tidur**: Alih-alih scrolling media sosial yang memancarkan cahaya biru (blue-light) yang menghambat produksi hormon melatonin (hormon tidur), bacalah buku fisik, lakukan meditasi pernapasan lambat, atau dengarkan musik instrumen yang menenangkan.
* **Gunakan Tempat Tidur Hanya untuk Tidur**: Jangan mengerjakan tugas kuliah atau belajar di atas kasur. Hal ini membuat otak Anda mengasosiasikan tempat tidur dengan stres dan kerja aktif, sehingga menyulitkan Anda untuk rileks saat ingin tidur.`
  },
  {
    id: '8',
    title: "Seni Mengatakan 'Tidak': Menjaga Batasan Diri (Boundaries) di Organisasi",
    category: 'Pengembangan Diri',
    readTime: '5 Min',
    summary: 'Menjadi people pleaser di kampus bisa merusak kesehatan mental Anda. Pelajari cara asertif menjaga batasan waktu, tenaga, dan kesehatan emosional Anda.',
    source: 'Bimbingan Konseling',
    imageUrl: 'https://images.unsplash.com/photo-1484807352052-23338990c6c6?auto=format&fit=crop&q=80&w=800',
    tips: [
      'Gunakan teknik tunda respon: "Saya periksa jadwal saya dulu dan akan memberi kabar sejam lagi."',
      'Gunakan formula komunikasi asertif: Sampaikan apresiasi, nyatakan penolakan dengan jujur, lalu tawarkan alternatif jika memungkinkan.',
      'Sadarilah bahwa menolak tugas tambahan bukan berarti Anda malas atau tidak bertanggung jawab.'
    ],
    content: `Aktif berorganisasi di kampus memang mendatangkan banyak manfaat relasi dan kepemimpinan. Namun, tanpa disadari, banyak mahasiswa terjebak menjadi seorang *people pleaser*—merasa harus selalu menyetujui setiap permintaan bantuan, mengambil semua tanggung jawab kepanitiaan, dan takut menolak tugas tambahan karena cemas dicap egois atau malas.

Memiliki batasan diri (*boundaries*) yang sehat sangat penting untuk mencegah burnout, menjaga kesehatan emosional, dan memastikan tugas akademis utama Anda tidak terbengkalai.

### Mengapa Kita Takut Mengatakan "Tidak"?
Keinginan untuk diterima dalam kelompok sosial adalah kebutuhan dasar manusia. Di dunia kampus, penolakan sering kali salah diartikan sebagai tanda kurangnya komitmen organisasi. Akibatnya, kita mengorbankan waktu istirahat, kesehatan fisik, bahkan nilai kuliah demi menjaga reputasi sosial kita.

### Cara Menolak Permintaan Secara Asertif dan Sopan

1. **Gunakan Kalimat yang Jelas & Jujur**: Hindari memberikan alasan palsu atau berbelit-belit. Katakan: *"Terima kasih sudah memercayai saya untuk memimpin divisi ini. Namun, saat ini saya harus memprioritaskan penyelesaian draf skripsi, sehingga saya tidak bisa mengambil tanggung jawab tambahan ini."*
2. **Gunakan Metode Penawaran Alternatif**: Jika Anda masih ingin membantu tetapi dalam porsi terbatas, tawarkan opsi lain: *"Saya tidak bisa menjadi ketua pelaksana acara ini karena jadwal kuliah yang padat. Namun, saya bersedia membantu meninjau proposal anggaran di akhir pekan."*
3. **Ingatlah Biaya Kesempatan (Opportunity Cost)**: Setiap kali Anda mengatakan "Ya" pada hal yang sebenarnya tidak ingin Anda lakukan, Anda sedang mengatakan "Tidak" pada waktu istirahat, kesehatan mental, atau persiapan masa depan Anda sendiri.`
  },
  {
    id: '9',
    title: 'Mengatasi Kecemasan Sosial (Social Anxiety) saat Presentasi di Kelas',
    category: 'Kecemasan',
    readTime: '6 Min',
    summary: 'Jantung berdebar kencang, tangan gemetar, dan pikiran mendadak kosong saat maju ke depan kelas? Simak panduan mengatasi demam panggung secara psikologis.',
    source: 'Asosiasi Psikologi',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=800',
    tips: [
      'Gunakan teknik pernapasan kotak (Box Breathing) 4 detik sebelum Anda dipanggil maju.',
      'Fokuskan pandangan Anda pada dahi audiens atau objek di dinding belakang ruang kelas, bukan langsung ke mata mereka.',
      'Pahami Spotlight Effect: Audiens tidak memperhatikan kesalahan kecil Anda sedetail yang Anda bayangkan.'
    ],
    content: `Ketakutan berbicara di depan umum (*glossophobia*) adalah salah satu kecemasan sosial paling umum di kalangan mahasiswa. Banyak orang yang sangat menguasai materi perkuliahan tiba-tiba kehilangan kata-kata, berkeringat dingin, dan gemetar hebat saat harus melakukan presentasi di hadapan dosen dan teman sekelas.

Kecemasan ini dipicu oleh ketakutan mendasar akan penilaian negatif dari orang lain, penolakan sosial, atau rasa malu yang intens di depan publik.

### Memahami 'Spotlight Effect'
Salah satu distorsi kognitif yang memperburuk kecemasan sosial adalah *Spotlight Effect*—keyakinan bahwa semua mata tertuju pada Anda dan semua orang sedang menganalisis setiap detail penampilan, intonasi suara, hingga kesalahan kecil Anda. Realitasnya, audiens biasanya jauh lebih santai dan fokus pada materi Anda, atau bahkan sedang memikirkan tugas mereka sendiri.

### Langkah Praktis Meredakan Kecemasan Sebelum Presentasi

* **Lakukan Persiapan Berbasis "Bicara Aktif"**: Jangan hanya menghafal teks slide presentasi di dalam hati. Latihlah berbicara dengan suara lantang di kamar kos Anda, atau lakukan simulasi presentasi di depan cermin atau 2 orang teman dekat Anda.
* **Ubah "Energi Cemas" Menjadi "Energi Antusias"**: Secara fisiologis, cemas dan antusias memiliki sinyal tubuh yang sama (jantung berdetak cepat, adrenalin meningkat). Alih-alih berkata "Saya sangat cemas," katakanlah pada diri sendiri secara berulang: "Tubuh saya sedang bersiap-siap dan saya sangat bersemangat untuk membagikan materi ini."
* **Gunakan Jangkar Fisik**: Jika tangan Anda gemetar, peganglah spidol, remote presentasi, atau letakkan kedua tangan Anda secara mantap di atas podium untuk menyalurkan energi berlebih tersebut secara tenang.`
  }
];

export const MentalHealthArticles: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [savedArticleIds, setSavedArticleIds] = useState<string[]>([]);
  const [readArticleIds, setReadArticleIds] = useState<string[]>([]);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  useEscapeKey(() => setActiveArticle(null), !!activeArticle);
  const [showToast, setShowToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Load saved bookmarks and read history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruang_tenang_saved_articles');
      if (saved) setSavedArticleIds(JSON.parse(saved));

      const read = localStorage.getItem('ruang_tenang_read_articles');
      if (read) setReadArticleIds(JSON.parse(read));
    } catch (e) {
      console.error('Error loading article data from localStorage:', e);
    }
  }, []);

  // Save bookmarks to localStorage
  const saveBookmarksToLocalStorage = (ids: string[]) => {
    try {
      localStorage.setItem('ruang_tenang_saved_articles', JSON.stringify(ids));
    } catch (e) {
      console.error('Error saving article bookmarks:', e);
    }
  };

  // Save read history to localStorage
  const saveReadToLocalStorage = (ids: string[]) => {
    try {
      localStorage.setItem('ruang_tenang_read_articles', JSON.stringify(ids));
    } catch (e) {
      console.error('Error saving read history:', e);
    }
  };

  const triggerToast = (message: string, type: 'success' | 'info' = 'success') => {
    setShowToast({ show: true, message, type });
    setTimeout(() => {
      setShowToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const toggleBookmark = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (savedArticleIds.includes(id)) {
      updated = savedArticleIds.filter(item => item !== id);
      triggerToast('Artikel dihapus dari simpanan', 'info');
    } else {
      updated = [...savedArticleIds, id];
      triggerToast(`Saved: "${title.substring(0, 30)}..." harian`, 'success');
    }
    setSavedArticleIds(updated);
    saveBookmarksToLocalStorage(updated);
  };

  const handleOpenArticle = (article: Article) => {
    setActiveArticle(article);
    if (!readArticleIds.includes(article.id)) {
      const updated = [...readArticleIds, article.id];
      setReadArticleIds(updated);
      saveReadToLocalStorage(updated);
      triggerToast('Artikel ditandai sudah dibaca', 'success');
    }
  };

  const handleShareArticle = (article: Article, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: window.location.href,
      }).catch(err => {
        console.log('Error sharing:', err);
      });
    } else {
      navigator.clipboard.writeText(`${article.title} - Baca di RuangTenang Kampus: ${window.location.href}`);
      triggerToast('Tautan artikel berhasil disalin ke papan klip!', 'success');
    }
  };

  const categories = ['Semua Kategori', 'Stres Akademik', 'Kecemasan', 'Tips Belajar', 'Pengembangan Diri', 'Kesehatan Mental', 'Tersimpan 🔖'];

  const filteredArticles = ARTICLES.filter(article => {
    const isSavedOnly = selectedCategory === 'Tersimpan 🔖';
    const matchCategory = isSavedOnly 
      ? savedArticleIds.includes(article.id)
      : (selectedCategory === 'Semua Kategori' || article.category === selectedCategory);
      
    const matchSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        article.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Toast Notification Container */}
      {showToast.show && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm animate-fade-in text-xs">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
          <span className="font-medium flex-1">{showToast.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-slate-200/40 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-medium text-[10px] rounded border border-slate-300 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-slate-700" />
              Pusat Edukasi Mental
            </span>
            <span className="text-[11px] text-slate-600 font-medium">Artikel & Panduan Terapis</span>
          </div>
          <h1 className="font-sans font-semibold tracking-tight text-xl sm:text-2xl font-medium text-slate-900 tracking-tight">Pusat Psikoedukasi Mahasiswa</h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Kumpulan artikel interaktif, panduan taktis, dan tips manajemen kecemasan yang disusun oleh psikolog profesional untuk membantu Anda menavigasi dunia perkuliahan dengan tenang.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xs border border-slate-200 rounded-lg p-3 shrink-0 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
            {readArticleIds.length}
          </div>
          <div>
            <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider block">Target Baca Anda</span>
            <span className="text-xs font-semibold text-slate-800">{readArticleIds.length} dari {ARTICLES.length} Selesai</span>
          </div>
        </div>
      </div>

      {/* Control Panel: Search & Categorization */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Cari artikel, panduan kognitif, teknik pernapasan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-base sm:text-xs focus:outline-none focus:border-slate-800 text-slate-800 shadow-2xs placeholder:text-slate-600"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Scroller */}
        <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-2 border-b border-slate-100">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-slate-800 border-slate-800 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {cat === 'Tersimpan 🔖' && <Bookmark className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-600'}`} />}
                <span>{cat}</span>
                {cat === 'Tersimpan 🔖' && savedArticleIds.length > 0 && (
                  <span className={`px-1 py-0.2 rounded-full text-[9px] font-bold ${isSelected ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
                    {savedArticleIds.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Articles Grid rendering */}
      {filteredArticles.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-12 text-center max-w-lg mx-auto">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-sans font-semibold text-base tracking-tight text-slate-900">Tidak Ada Artikel Ditemukan</h3>
          <p className="text-slate-600 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
            {selectedCategory === 'Tersimpan 🔖'
              ? 'Anda belum menyimpan artikel apa pun. Klik ikon bookmark pada kartu artikel untuk menyimpannya di sini.'
              : 'Tidak ada artikel yang cocok dengan pencarian Anda saat ini. Coba kata kunci alternatif.'}
          </p>
          {selectedCategory === 'Tersimpan 🔖' && (
            <button
              onClick={() => setSelectedCategory('Semua Kategori')}
              className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md shadow-2xs transition-all active:scale-95"
            >
              Jelajahi Semua Artikel
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article) => {
            const isSaved = savedArticleIds.includes(article.id);
            const isRead = readArticleIds.includes(article.id);

            return (
              <div 
                key={article.id} 
                onClick={() => handleOpenArticle(article)}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group flex flex-col h-full cursor-pointer"
              >
                {/* Card Thumbnail */}
                <div className="h-36 overflow-hidden relative bg-slate-100">
                  <img 
                    src={article.imageUrl} 
                    alt={article.title} 
                    width={400}
                    height={144}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-semibold rounded-md">
                    {article.category}
                  </div>
                  {isRead && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-teal-500 text-white text-[10px] font-semibold rounded-md flex items-center gap-1 shadow-sm">
                      <Check className="w-3 h-3" /> Sudah Dibaca
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="p-4 flex flex-col flex-1 space-y-2">
                  <div className="flex items-center gap-3 text-[10px] text-slate-600 font-medium">
                    <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      <Clock className="w-3 h-3" /> {article.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {article.source}
                    </span>
                  </div>

                  <h3 className="font-sans font-semibold text-sm tracking-tight text-slate-900 leading-snug group-hover:text-slate-700 transition-colors line-clamp-2">
                    {article.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed flex-1">
                    {article.summary}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 group-hover:underline">
                      Baca Selengkapnya
                      <ExternalLink className="w-3 h-3 text-slate-600 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => handleShareArticle(article, e)}
                        className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-md transition-colors"
                        title="Bagikan Artikel"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => toggleBookmark(article.id, article.title, e)}
                        className={`p-1.5 rounded-md transition-all ${
                          isSaved 
                            ? 'text-teal-600 hover:text-teal-700 bg-teal-50' 
                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                        title={isSaved ? "Hapus dari Simpanan" : "Simpan Artikel"}
                      >
                        <Bookmark className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ARTICLE READER MODAL OVERLAY */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div 
            className="bg-white border border-slate-200 text-slate-800 rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-xl animate-scale-up relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header bar */}
            <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-semibold uppercase tracking-wider">
                  {activeArticle.category}
                </span>
                <span className="text-[11px] text-slate-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {activeArticle.readTime} Baca
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => toggleBookmark(activeArticle.id, activeArticle.title, e)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    savedArticleIds.includes(activeArticle.id)
                      ? 'text-teal-600 bg-teal-50 hover:bg-teal-100'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                  title="Simpan ke favorit"
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={() => setActiveArticle(null)}
                  className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Tutup Artikel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Article Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
              {/* Article Thumbnail */}
              <div className="w-full h-44 sm:h-56 rounded-lg overflow-hidden bg-slate-100 relative shadow-2xs shrink-0">
                <img 
                  src={activeArticle.imageUrl} 
                  alt={activeArticle.title} 
                  width={600}
                  height={224}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white px-3 py-1 rounded text-xs">
                  Sumber: {activeArticle.source}
                </div>
              </div>

              {/* Title & Introduction */}
              <div className="space-y-2">
                <h2 className="font-sans font-semibold tracking-tight text-lg sm:text-xl font-medium text-slate-900 leading-tight">
                  {activeArticle.title}
                </h2>
                <div className="h-0.5 w-16 bg-slate-800" />
              </div>

              {/* Formatted body paragraph content */}
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4 font-sans antialiased">
                {activeArticle.content.split('\n\n').map((paragraph, index) => {
                  const trimmed = paragraph.trim();
                  if (trimmed.startsWith('###')) {
                    return (
                      <h3 key={index} className="font-sans font-semibold text-sm sm:text-base tracking-tight text-slate-900 pt-3 border-b border-slate-100 pb-1.5">
                        {trimmed.replace('###', '').trim()}
                      </h3>
                    );
                  }
                  if (trimmed.startsWith('*')) {
                    return (
                      <ul key={index} className="list-disc pl-5 space-y-2 text-slate-600">
                        {trimmed.split('\n').map((li, liIdx) => (
                          <li key={liIdx} className="pl-1">
                            <span className="text-slate-700 font-medium">{li.replace('*', '').split(':')[0]}:</span>
                            {li.replace('*', '').split(':')[1]}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  if (trimmed.startsWith('1.')) {
                    return (
                      <ol key={index} className="list-decimal pl-5 space-y-3 text-slate-600">
                        {trimmed.split('\n').map((li, liIdx) => {
                          const parts = li.replace(/^\d+\.\s*/, '').split(':');
                          return (
                            <li key={liIdx} className="pl-1">
                              {parts.length > 1 ? (
                                <>
                                  <strong className="text-slate-800 font-semibold">{parts[0]}:</strong>
                                  {parts.slice(1).join(':')}
                                </>
                              ) : (
                                <span>{li.replace(/^\d+\.\s*/, '')}</span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    );
                  }
                  return (
                    <p key={index} className="text-slate-600">
                      {trimmed}
                    </p>
                  );
                })}
              </div>

              {/* Actionable Practice Tips panel */}
              {activeArticle.tips && activeArticle.tips.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-xs sm:text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Latihan Praktis Mandiri (Saran Psikolog)</span>
                  </div>
                  <div className="space-y-1.5">
                    {activeArticle.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span className="leading-normal">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer bar */}
            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 rounded-b-xl shrink-0">
              <span className="text-[10px] sm:text-xs text-slate-600 italic">
                Telah ditinjau & diverifikasi oleh Virtual Psychologist RuangTenang Kampus
              </span>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={(e) => handleShareArticle(activeArticle, e)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Bagikan</span>
                </button>
                <button
                  onClick={() => setActiveArticle(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all"
                >
                  Selesai Membaca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
