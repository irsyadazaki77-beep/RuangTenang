export interface QualityAuditReport {
  timestamp: string;
  overallStatus: 'passed' | 'warning' | 'error';
  score: number; // 0 - 100
  checks: {
    id: string;
    title: string;
    status: 'passed' | 'warning' | 'error';
    detail: string;
  }[];
  recommendation?: string;
}

export function performQualityAudit(files: Record<string, string>): QualityAuditReport {
  const checks: QualityAuditReport['checks'] = [];
  let deductions = 0;

  // 1. Check index.html presence
  if (!files['index.html'] && !files['script.py']) {
    deductions += 40;
    checks.push({
      id: 'entry_file',
      title: 'Entry Point Validasi',
      status: 'error',
      detail: 'Tidak ditemukan file entry point (index.html atau script.py).'
    });
  } else {
    checks.push({
      id: 'entry_file',
      title: 'Entry Point Validasi',
      status: 'passed',
      detail: 'File entry point ditemukan dan siap dieksekusi.'
    });
  }

  // 2. Syntax check for HTML tags
  if (files['index.html']) {
    const html = files['index.html'];
    const openTags = (html.match(/<div/gi) || []).length;
    const closeTags = (html.match(/<\/div>/gi) || []).length;
    if (openTags !== closeTags) {
      deductions += 15;
      checks.push({
        id: 'html_tags',
        title: 'Keseimbangan Tag HTML',
        status: 'warning',
        detail: `Jumlah <div> (${openTags}) tidak seimbang dengan </div> (${closeTags}). Periksa penutupan tag.`
      });
    } else {
      checks.push({
        id: 'html_tags',
        title: 'Keseimbangan Tag HTML',
        status: 'passed',
        detail: 'Tag struktur HTML berpasangan dengan rapi.'
      });
    }
  }

  // 3. Script security & console inspection
  let dangerousPatterns = 0;
  for (const [filename, content] of Object.entries(files)) {
    if (filename.endsWith('.js') || filename.endsWith('.html')) {
      if (/eval\s*\(/.test(content)) {
        dangerousPatterns++;
        deductions += 25;
        checks.push({
          id: `security_eval_${filename}`,
          title: `Keamanan Script: ${filename}`,
          status: 'error',
          detail: 'Terdeteksi penggunaan eval(), berpotensi celah injeksi kode.'
        });
      }
      if (/document\.write\s*\(/.test(content)) {
        deductions += 10;
        checks.push({
          id: `doc_write_${filename}`,
          title: `Praktik Kode: ${filename}`,
          status: 'warning',
          detail: 'Hindari document.write(), gunakan manipulasi DOM modern.'
        });
      }
    }
  }

  if (dangerousPatterns === 0) {
    checks.push({
      id: 'security_safe',
      title: 'Sanitasi Script & Keamanan',
      status: 'passed',
      detail: 'Bebas dari eval() atau pola berbahaya.'
    });
  }

  // 4. Broken resource / style link check
  if (files['index.html']) {
    const html = files['index.html'];
    if (html.includes('href="styles.css"') && !files['styles.css']) {
      deductions += 15;
      checks.push({
        id: 'missing_css',
        title: 'Tautan Resource CSS',
        status: 'warning',
        detail: 'index.html memuat styles.css tapi file styles.css belum dibuat.'
      });
    }
    if (html.includes('src="app.js"') && !files['app.js']) {
      deductions += 15;
      checks.push({
        id: 'missing_js',
        title: 'Tautan Resource Script',
        status: 'warning',
        detail: 'index.html memuat app.js tapi file app.js belum dibuat.'
      });
    }
  }

  const score = Math.max(0, 100 - deductions);
  const overallStatus: QualityAuditReport['overallStatus'] =
    score >= 90 ? 'passed' : score >= 65 ? 'warning' : 'error';

  let recommendation = 'Kode dalam kondisi prima & siap dipublish.';
  if (overallStatus === 'warning') {
    recommendation = 'Ada beberapa peringatan minor, periksa kembali penutupan tag atau link file.';
  } else if (overallStatus === 'error') {
    recommendation = 'Ditemukan masalah kritis yang perlu diperbaiki sebelum eksekusi.';
  }

  return {
    timestamp: new Date().toLocaleTimeString('id-ID'),
    overallStatus,
    score,
    checks,
    recommendation
  };
}
