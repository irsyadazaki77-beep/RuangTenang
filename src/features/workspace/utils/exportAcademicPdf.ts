import { getStoredAuthToken } from '../../../lib/apiClient';

export interface ExportAcademicPdfOptions {
  title: string;
  content: string;
  authorName?: string;
}

export async function exportToAcademicPdf(options: ExportAcademicPdfOptions): Promise<boolean> {
  const { title, content, authorName } = options;
  const csrfCookie = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1];
  const storedToken = getStoredAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
  if (csrfCookie) headers['X-CSRF-Token'] = decodeURIComponent(csrfCookie);
  if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

  try {
    const res = await fetch('/api/v1/ai/export-pdf', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        title: title || 'Naskah Akademik Skripsi',
        content: content.slice(0, 58000),
        authorName
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }

    const blob = await res.blob();
    const safeFilename = (title || 'naskah_akademik_skripsi')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 40) || 'naskah_akademik';

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFilename}_a4.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    window.print();
    return false;
  }
}
