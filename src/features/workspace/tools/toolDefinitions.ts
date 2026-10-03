import { WorkspaceToolDefinition } from './toolTypes';

export const WORKSPACE_TOOL_DEFINITIONS: WorkspaceToolDefinition[] = [
  // 1. WRITING CATEGORY
  {
    id: 'document_grammar_spok',
    name: 'Perbaiki Tata Bahasa & SPOK',
    description: 'Menstandarkan tata bahasa, struktur kalimat baku (SPOK), tanda baca, dan ejaan KBBI.',
    icon: 'CheckCheck',
    category: 'Writing',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['DOCUMENT', 'OUTLINE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    inputSchema: [
      {
        name: 'focus',
        type: 'enum',
        label: 'Fokus Perbaikan',
        defaultValue: 'spok_ejaan',
        options: [
          { value: 'spok_ejaan', label: 'Struktur SPOK & Ejaan KBBI' },
          { value: 'formalitas', label: 'Peningkatan Diksi Formal' }
        ]
      }
    ],
    promptTemplate: (input, contextText) => {
      const focusInstruction = input.focus === 'formalitas'
        ? 'Fokus pada peningkatan diksi formal yang ekuivalen; jangan menambah klaim atau mengubah makna.'
        : 'Fokus pada struktur SPOK, tanda baca, dan ejaan baku KBBI tanpa mengubah makna substansi.';
      return `${focusInstruction}\n\n${contextText}`;
    }
  },
  {
    id: 'document_formalize_academic',
    name: 'Formalisasi Nada Akademik',
    description: 'Mengubah gaya penulisan agar formal, objektif, dan berstandar karya tulis ilmiah.',
    icon: 'GraduationCap',
    category: 'Writing',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['DOCUMENT', 'OUTLINE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Tingkatkan derajat formalitas naskah ini agar sesuai dengan register penulisan ilmiah akademik universitas (objektif, bebas kata santai, berbasis bukti):\n\n${contextText}`
  },
  {
    id: 'document_expand_elaboration',
    name: 'Elaborasi & Tambah Contoh',
    description: 'Memperluas argumen dengan menambahkan elaborasi teoritis dan ilustrasi kasus nyata.',
    icon: 'Maximize2',
    category: 'Writing',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['DOCUMENT', 'OUTLINE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Elaborasi naskah ini secara mendalam dengan menyertakan landasan konseptual, contoh kasus konkret yang relevan, dan analisis komparatif:\n\n${contextText}`
  },
  {
    id: 'document_shorten_concise',
    name: 'Ringkas & Padatkan Naskah',
    description: 'Memadatkan kalimat berbelit-belit untuk mengurangi redudansi kata dan menjaga kelugasan naskah.',
    icon: 'Scissors',
    category: 'Writing',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['DOCUMENT', 'OUTLINE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Ringkas dokumen ini menjadi lebih padat, ringkas, dan fokus pada inti argumen ilmiah, tanpa mengurangi informasi penting:\n\n${contextText}`
  },
  {
    id: 'academic_paraphrase',
    name: 'Parafrase Akademik Beretika',
    description: 'Membantu menyunting struktur dan diksi naskah akademik tanpa menjamin hasil pemeriksaan similarity.',
    icon: 'Pencil',
    category: 'Writing',
    executionMode: 'client_utility',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['DOCUMENT'],
    requiresArtifact: true,
    inputSchema: [
      {
        name: 'style',
        type: 'enum',
        label: 'Gaya Parafrase',
        defaultValue: 'KONSERVATIF',
        options: [
          { value: 'KONSERVATIF', label: 'Konservatif (Pertahankan Klaim)' },
          { value: 'RESTRUKTURISASI', label: 'Restrukturisasi Kalimat' },
          { value: 'SINTESIS', label: 'Sintesis Ringkas' }
        ]
      }
    ]
  },

  // 2. RESEARCH CATEGORY
  {
    id: 'research_summarize_keypoints',
    name: 'Ekstraksi Poin Kunci & Temuan',
    description: 'Menganalisis dan menyusun rangkuman temuan utama, metodologi, dan kesimpulan dokumen.',
    icon: 'FileSpreadsheet',
    category: 'Research',
    executionMode: 'ai',
    outputType: 'TEXT',
    supportedArtifactTypes: ['DOCUMENT', 'OUTLINE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Ekstraksi dan rangkum poin-poin kunci, landasan metodologi, premis utama, dan temuan substantif dari dokumen berikut dalam format butir-butir terstruktur:\n\n${contextText}`
  },
  {
    id: 'research_explain_concept',
    name: 'Jelaskan Konsep Teoritis',
    description: 'Memberikan penjelasan terperinci tentang teori atau istilah metodologis dalam dokumen.',
    icon: 'HelpCircle',
    category: 'Research',
    executionMode: 'ai',
    outputType: 'TEXT',
    supportedArtifactTypes: ['DOCUMENT', 'CODE', 'OUTLINE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Jelaskan konsep inti, landasan ilmiah, dan keterkaitan teori yang terdapat dalam materi berikut secara komprehensif untuk mahasiswa:\n\n${contextText}`
  },

  // 3. CODING CATEGORY
  {
    id: 'code_optimize_big_o',
    name: 'Optimasi Kompleksitas Big-O',
    description: 'Mengoptimalkan performa algoritma, mengurangi alokasi memori, dan memangkas runtime loop.',
    icon: 'Zap',
    category: 'Coding',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['CODE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Optimalkan kode program ini untuk efisiensi kompleksitas waktu dan memori (Big-O notation). Berikan penjelasan singkat mengenai optimasi yang dilakukan:\n\n${contextText}`
  },
  {
    id: 'code_handle_edge_cases',
    name: 'Pertahanan Edge-Case & Error',
    description: 'Menambahkan penanganan eksepsi, validasi tipe data, dan penjagaan kasus batas ekstrem.',
    icon: 'ShieldCheck',
    category: 'Coding',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['CODE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Lengkapi kode program ini dengan validasi input defensif, exception handling komprehensif, dan pengujian edge-case batas ekstrem:\n\n${contextText}`
  },
  {
    id: 'code_add_documentation',
    name: 'Dokumentasi & Docstring',
    description: 'Menyematkan komentar alur logika, deskripsi fungsi, parameter, return types, dan docstring.',
    icon: 'FileCode',
    category: 'Coding',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['CODE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Tambahkan dokumentasi docstring lengkap (deskripsi fungsi, parameter, return type, dan catatan penting) serta komentar kode yang jelas pada setiap blok logika:\n\n${contextText}`
  },
  {
    id: 'code_explain_logic',
    name: 'Bedah Logika Kode',
    description: 'Menjelaskan alur algoritma kode baris demi baris secara sistematis.',
    icon: 'Terminal',
    category: 'Coding',
    executionMode: 'ai',
    outputType: 'TEXT',
    supportedArtifactTypes: ['CODE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Jelaskan alur algoritma, struktur data yang digunakan, dan cara kerja kode ini secara terstruktur langkah demi langkah:\n\n${contextText}`
  },

  // 4. CITATION CATEGORY
  {
    id: 'citation_format_apa',
    name: 'Konversi ke Standar APA 7th',
    description: 'Menstandarkan seluruh daftar rujukan ke gaya penulisan American Psychological Association Edisi 7.',
    icon: 'BookMarked',
    category: 'Citation',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['CITATION', 'DOCUMENT'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Konversikan dan format ulang seluruh daftar pustaka/sitasi berikut agar mematuhi pedoman baku APA Style 7th Edition secara presisi:\n\n${contextText}`
  },
  {
    id: 'citation_format_ieee',
    name: 'Konversi ke Standar IEEE',
    description: 'Menstandarkan format sitasi bernomor [1], [2] sesuai kaidah penulisan paper teknik IEEE.',
    icon: 'BookOpen',
    category: 'Citation',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['CITATION', 'DOCUMENT'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Konversikan seluruh daftar pustaka berikut ke format standar IEEE bernomor [1], [2], dengan urutan kutipan yang tepat:\n\n${contextText}`
  },
  {
    id: 'citation_sort_alphabetical',
    name: 'Urutkan Sitasi Alfabetis (A-Z)',
    description: 'Menyusun daftar referensi secara berurutan berdasarkan nama belakang penulis pertama.',
    icon: 'ListOrdered',
    category: 'Citation',
    executionMode: 'client_utility',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['CITATION'],
    requiresArtifact: true
  },
  {
    id: 'citation_export_bibtex',
    name: 'Ekspor Berkas BibTeX (.bib)',
    description: 'Menghasilkan berkas bibliografi standar LaTeX / Overleaf.',
    icon: 'Download',
    category: 'Citation',
    executionMode: 'export',
    outputType: 'DOWNLOAD',
    supportedArtifactTypes: ['CITATION', 'DOCUMENT'],
    requiresArtifact: true
  },
  {
    id: 'citation_export_ris',
    name: 'Ekspor Berkas RIS (.ris)',
    description: 'Menghasilkan berkas bibliografi untuk Zotero, Mendeley, dan EndNote.',
    icon: 'Download',
    category: 'Citation',
    executionMode: 'export',
    outputType: 'DOWNLOAD',
    supportedArtifactTypes: ['CITATION', 'DOCUMENT'],
    requiresArtifact: true
  },

  // 5. OUTLINE CATEGORY
  {
    id: 'outline_expand_methodology',
    name: 'Perluas Metodologi Penelitian',
    description: 'Menambahkan kerangka kerja desain riset, populasi, sampel, teknik analisis, dan instrumen.',
    icon: 'ListTree',
    category: 'Outline',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['OUTLINE', 'DOCUMENT'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Kembangkan outline berikut dengan merinci bab/sub-bab metodologi penelitian (desain riset, populasi & sampling, instrumen pengumpulan data, dan teknik analisis kuantitatif/kualitatif):\n\n${contextText}`
  },
  {
    id: 'outline_refine_problem_statement',
    name: 'Pertajam Rumusan Masalah',
    description: 'Menyelaraskan struktur outline dengan urgensi penelitian dan rumusan pertanyaan ilmiah.',
    icon: 'Crosshair',
    category: 'Outline',
    executionMode: 'ai',
    outputType: 'ARTIFACT_UPDATE',
    supportedArtifactTypes: ['OUTLINE'],
    requiresArtifact: true,
    supportsStreaming: true,
    requiredCapabilities: ['chat'],
    promptTemplate: (_input, contextText) => 
      `Evaluasi dan susun ulang hierarki outline ini agar setiap sub-bab langsung menjawab rumusan masalah dan tujuan penelitian ilmiah:\n\n${contextText}`
  }
];
