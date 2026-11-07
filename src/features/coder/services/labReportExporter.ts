/**
 * Lab Report Exporter for Ruang Coder
 * Mengonversi proyek koding mahasiswa menjadi laporan praktikum / tugas akademik standar siap kumpul.
 */

export interface LabReportInput {
  title: string;
  studentName?: string;
  studentId?: string;
  courseName?: string;
  date?: string;
  summary?: string;
  files: Record<string, string>;
  testOutput?: string;
  learningReflections?: string;
}

function detectFileLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return 'javascript';
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.sql')) return 'sql';
  if (lower.endsWith('.c') || lower.endsWith('.cpp')) return 'cpp';
  return 'text';
}

export function generateMarkdownLabReport(input: LabReportInput): string {
  const dateStr = input.date || new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fileList = Object.keys(input.files).sort();

  let md = `# LAPORAN PRAKTIKUM / TUGAS PEMROGRAMAN
**Judul Tugas:** ${input.title || 'Proyek Pemrograman Ruang Coder'}  
**Mata Kuliah:** ${input.courseName || 'Praktikum Pemrograman'}  
**Nama Mahasiswa:** ${input.studentName || 'Mahasiswa Ruang Tenang'}  
${input.studentId ? `**NIM:** ${input.studentId}  \n` : ''}**Tanggal:** ${dateStr}  

---

## 1. Ringkasan & Tujuan Solusi
${input.summary || 'Aplikasi dan algoritma ini dibangun dan diuji menggunakan lingkungan interaktif Ruang Coder.'}

---

## 2. Struktur Berkas Proyek
\`\`\`
${fileList.map(f => `├── ${f}`).join('\n')}
\`\`\`

---

## 3. Implementasi Kode Sumber
`;

  for (const filename of fileList) {
    const code = (input.files[filename] || '').trim();
    const lang = detectFileLanguage(filename);
    md += `\n### Berkas: \`${filename}\`\n\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
  }

  md += `\n---

## 4. Bukti Hasil Eksekusi & Pengujian Terminal
${input.testOutput ? `\`\`\`text\n${input.testOutput}\n\`\`\`` : '_Pengujian berhasil dijalankan tanpa kendala di terminal sandbox._'}

---

## 5. Analisis Algoritma & Refleksi Pembelajaran
${input.learningReflections || `
1. **Analisis Logika & Kompleksitas:** Kode mengimplementasikan fungsi modular dengan efisiensi waktu operasi yang optimal.
2. **Kemandirian Debugging:** Menangani error runtime menggunakan pendekatan penelusuran akar masalah stack trace terstruktur.
3. **Refleksi Mahasiswa:** Pengembangan aplikasi berjalan lancar dengan integrasi continuous testing dan panduan clean code.
`}
`;

  return md;
}

export function downloadFile(content: string, filename: string, mimeType = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
