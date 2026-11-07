/**
 * Supervisor Consultation Notes & Action Plan Parser for RuangKerja
 * Converts messy lecturer guidance notes or transcripts into structured,
 * chapter-scoped tasks and a formal supervisor tracking sheet (Lembar Kendali Bimbingan).
 */



export interface SupervisorRevisionItem {
  id: string;
  chapter: 'BAB_1' | 'BAB_2' | 'BAB_3' | 'BAB_4' | 'BAB_5' | 'UMUM';
  chapterLabel: string;
  actionTitle: string;
  details: string;
  priority: 'kritis' | 'sedang' | 'minor';
}

export interface SupervisorConsultationSummary {
  supervisorName: string;
  consultationDate: string;
  sessionNotes: string;
  revisionItems: SupervisorRevisionItem[];
}

export function parseSupervisorNotes(rawText: string, supervisorName = 'Dosen Pembimbing'): SupervisorConsultationSummary {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const revisionItems: SupervisorRevisionItem[] = [];

  let currentChapter: SupervisorRevisionItem['chapter'] = 'UMUM';
  let currentChapterLabel = 'Umum / Format';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect chapter cues
    if (/bab\s*(1|i)\b|latar\s+belakang|rumusan/i.test(line)) {
      currentChapter = 'BAB_1';
      currentChapterLabel = 'Bab 1: Pendahuluan';
    } else if (/bab\s*(2|ii)\b|tinjauan|teori|pustaka/i.test(line)) {
      currentChapter = 'BAB_2';
      currentChapterLabel = 'Bab 2: Tinjauan Pustaka';
    } else if (/bab\s*(3|iii)\b|metode|sampel|instrumen/i.test(line)) {
      currentChapter = 'BAB_3';
      currentChapterLabel = 'Bab 3: Metodologi';
    } else if (/bab\s*(4|iv)\b|hasil|pembahasan|data/i.test(line)) {
      currentChapter = 'BAB_4';
      currentChapterLabel = 'Bab 4: Hasil & Pembahasan';
    } else if (/bab\s*(5|v)\b|kesimpulan|saran/i.test(line)) {
      currentChapter = 'BAB_5';
      currentChapterLabel = 'Bab 5: Penutup';
    }

    // Determine priority
    let priority: SupervisorRevisionItem['priority'] = 'sedang';
    if (/wajib|harus|kritis|fatal|sebelum\s+sidang|ganti\s+total/i.test(line)) {
      priority = 'kritis';
    } else if (/typo|ejaan|format|margin|font|halaman/i.test(line)) {
      priority = 'minor';
    }

    // Clean action title
    const cleanedTitle = line.replace(/^[-*•\d+.)\s]+/, '').trim();
    if (cleanedTitle.length > 8 && !/^(catatan|bimbingan|revisi|hari\s+ini|dosen)/i.test(cleanedTitle)) {
      revisionItems.push({
        id: `rev-${Date.now()}-${i}`,
        chapter: currentChapter,
        chapterLabel: currentChapterLabel,
        actionTitle: cleanedTitle.length > 70 ? cleanedTitle.slice(0, 67) + '...' : cleanedTitle,
        details: cleanedTitle,
        priority
      });
    }
  }

  // Fallback if raw text wasn't bulleted
  if (revisionItems.length === 0 && rawText.trim().length > 15) {
    revisionItems.push({
      id: `rev-${Date.now()}-0`,
      chapter: 'UMUM',
      chapterLabel: 'Umum & Naskah',
      actionTitle: rawText.trim().slice(0, 60),
      details: rawText.trim(),
      priority: 'sedang'
    });
  }

  return {
    supervisorName,
    consultationDate: new Date().toISOString().split('T')[0],
    sessionNotes: rawText,
    revisionItems
  };
}

export function generateSupervisorControlSheetMarkdown(summary: SupervisorConsultationSummary): string {
  const dateFormatted = new Date(summary.consultationDate).toLocaleDateString('id-ID', { dateStyle: 'full' });

  return `:::artifact{type="markdown" title="Lembar Kendali Bimbingan Skripsi (${summary.supervisorName})"}
# 📋 Lembar Kendali & Tindak Lanjut Bimbingan Skripsi
**Dosen Pembimbing:** ${summary.supervisorName}  
**Tanggal Pertemuan:** ${dateFormatted}  
**Status Tindak Lanjut:** Dalam Proses Pengerjaan

---

### 📝 Catatan Sesi & Arahan Dosen:
> "${summary.sessionNotes.trim()}"

---

### ✅ Daftar Tindak Lanjut Revisi (Action Plan)
| No | Ruang Lingkup Bab | Arahan Perbaikan / Tugas | Prioritas | Status Mahasiswa |
| :---: | :--- | :--- | :---: | :---: |
${summary.revisionItems.map((item, idx) => {
  const priorityBadge = item.priority === 'kritis' ? '🔴 **Kritis**' : item.priority === 'sedang' ? '🟡 Sedang' : '🟢 Minor';
  return `| ${idx + 1} | ${item.chapterLabel} | ${item.details} | ${priorityBadge} | [ ] Belum Selesai |`;
}).join('\n')}

---

### 💡 Tips Konsultasi Bimbingan Selanjutnya:
- Beri tanda stabilo (*highlight*) pada kalimat atau paragraf yang telah direvisi saat bimbingan berikutnya.
- Bawa naskah lama beserta lembar kendali ini agar dosen dapat mencocokkan perkembangan revisi dengan cepat.
:::
`;
}
