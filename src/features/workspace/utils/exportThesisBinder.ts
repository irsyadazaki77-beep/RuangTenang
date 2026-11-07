/**
 * Thesis Multi-Chapter Binder & Comprehensive Exporter for RuangKerja
 * Unifies separate chapter artifacts into a single cohesive manuscript,
 * deduplicating bibliographies and injecting standard page breaks.
 */

import { WorkspaceArtifact, WorkspaceChapterScope } from '../types';
import { inferArtifactChapterScope } from './workspaceContext';
import { exportToAcademicDocx } from './exportDocx';

export interface ChapterBinderSlot {
  scope: WorkspaceChapterScope;
  title: string;
  defaultHeading: string;
  artifactId?: string;
  order: number;
}

export const THESIS_STANDARD_SLOTS: ChapterBinderSlot[] = [
  { scope: 'BAB_1', title: 'Bab 1 — Pendahuluan', defaultHeading: 'BAB I\nPENDAHULUAN', order: 1 },
  { scope: 'BAB_2', title: 'Bab 2 — Tinjauan Pustaka', defaultHeading: 'BAB II\nTINJAUAN PUSTAKA DAN LANDASAN TEORI', order: 2 },
  { scope: 'BAB_3', title: 'Bab 3 — Metodologi Penelitian', defaultHeading: 'BAB III\nMETODOLOGI PENELITIAN', order: 3 },
  { scope: 'BAB_4', title: 'Bab 4 — Hasil & Pembahasan', defaultHeading: 'BAB IV\nHASIL PENELITIAN DAN PEMBAHASAN', order: 4 },
  { scope: 'BAB_5', title: 'Bab 5 — Penutup (Kesimpulan & Saran)', defaultHeading: 'BAB V\nKESIMPULAN DAN SARAN', order: 5 },
  { scope: 'LAMPIRAN', title: 'Lampiran & Instrumen', defaultHeading: 'LAMPIRAN', order: 6 },
];

export interface ThesisBinderMap {
  [scope: string]: string; // scope -> artifactId
}

export function autoMapArtifactsToChapters(artifacts: WorkspaceArtifact[]): ThesisBinderMap {
  const map: ThesisBinderMap = {};
  for (const artifact of artifacts) {
    if (artifact.type !== 'DOCUMENT') continue;
    const detected = inferArtifactChapterScope(artifact.title);
    if (detected && detected !== 'ALL' && !map[detected]) {
      map[detected] = artifact.id;
    }
  }
  return map;
}

/**
 * Combines separate chapters into a single markdown document.
 * Consolidates individual chapter bibliographies into a unified list at the end.
 */
export function compileThesisBinderMarkdown(
  thesisTitle: string,
  authorName: string,
  artifacts: WorkspaceArtifact[],
  binderMap: ThesisBinderMap
): string {
  const parts: string[] = [];
  const allBibliographyLines = new Set<string>();

  // Front Matter
  parts.push(`# ${thesisTitle.toUpperCase()}`);
  parts.push(`**Oleh:** ${authorName || 'Mahasiswa Peneliti'}\n\n---\n`);

  for (const slot of THESIS_STANDARD_SLOTS) {
    const artId = binderMap[slot.scope];
    if (!artId) continue;
    const art = artifacts.find(a => a.id === artId);
    if (!art || !art.content.trim()) continue;

    let content = art.content.trim();

    // Remove standalone artifact markers if present
    content = content.replace(/^:::artifact\{.*?\}\s*/i, '').replace(/\s*:::$/, '');

    // Extract bibliography section from this chapter if exists
    const bibMatch = content.match(/(?:^|\n)(#{1,4}\s*(?:daftar\s+pustaka|referensi|references|rujukan)[\s\S]*)/i);
    if (bibMatch && bibMatch.index !== undefined) {
      const bibText = content.slice(bibMatch.index);
      content = content.slice(0, bibMatch.index).trim();
      const lines = bibText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 15 && !/^#{1,6}\s+/.test(l));
      lines.forEach(line => allBibliographyLines.add(line));
    }

    parts.push(`\n\n<div style="page-break-before: always;"></div>\n\n`);
    parts.push(`## ${slot.defaultHeading}\n`);
    parts.push(content);
  }

  // Unified Bibliography
  if (allBibliographyLines.size > 0) {
    parts.push(`\n\n<div style="page-break-before: always;"></div>\n\n`);
    parts.push(`## DAFTAR PUSTAKA\n`);
    const sortedBib = Array.from(allBibliographyLines).sort((a, b) => a.localeCompare(b, 'id'));
    sortedBib.forEach(entry => parts.push(`${entry}\n`));
  }

  return parts.join('\n');
}

/**
 * Generates and triggers download of the unified thesis as .docx or .md
 */
export async function downloadThesisBinderDocx(
  thesisTitle: string,
  authorName: string,
  university: string,
  artifacts: WorkspaceArtifact[],
  binderMap: ThesisBinderMap
): Promise<void> {
  const fullContent = compileThesisBinderMarkdown(thesisTitle, authorName, artifacts, binderMap);
  await exportToAcademicDocx({
    title: thesisTitle,
    content: fullContent,
    templateType: 'skripsi',
    authorName,
    university: university || 'Universitas Indonesia',
    faculty: 'Fakultas / Program Studi'
  });
}
