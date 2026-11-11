import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { scanAndSanitizePII } from '../piiService.js';
import { resolveLaptopSafePath, isProtectedLaptopPath } from './agentToolExecutor.js';

export interface LaptopExtractedItem {
  name: string;
  relativePath: string;
  fullPath: string;
  sizeBytes: number;
  type: 'file' | 'directory';
  pageCount?: number;
  text?: string;
  error?: string;
}

export interface LaptopContextResult {
  hasLaptopContext: boolean;
  pathsFound: string[];
  contextBlock?: string;
  summary?: string;
  totalFilesProcessed: number;
  items: LaptopExtractedItem[];
}

const SUPPORTED_DOCUMENT_EXTS = new Set([
  '.pdf', '.docx', '.pptx', '.xlsx',
  '.txt', '.md', '.markdown',
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs',
  '.json', '.csv', '.tsv', '.yaml', '.yml', '.html', '.css', '.sql', '.sh', '.ps1', '.bat'
]);

export class LaptopContextService {
  /**
   * Scans an input string for candidate Windows or Unix paths,
   * validating each against the actual filesystem with word-stripping.
   */
  static extractLaptopPathCandidates(input: string): string[] {
    if (!input || typeof input !== 'string') return [];

    const candidates: string[] = [];

    // 1. Line-by-line check (user pasting path on its own line)
    const lines = input.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.length > 2 &&
        (trimmed.startsWith('~') || /^[a-zA-Z]:[\\/]/.test(trimmed) || /^(?:\/|[A-Za-z0-9_-]+[\\/])/.test(trimmed))
      ) {
        candidates.push(trimmed);
      }
    }

    // 2. Quoted paths check: "C:\path\to\something" or 'C:\path\to\something'
    const quotedRegex = /["']([a-zA-Z]:[\\/][^"'\n\r*?<>|]+|~[\\/][^"'\n\r*?<>|]+)["']/g;
    let qMatch: RegExpExecArray | null;
    while ((qMatch = quotedRegex.exec(input)) !== null) {
      candidates.push(qMatch[1].trim());
    }

    // 3. Unquoted absolute Windows paths & home paths
    const absRegex = /([a-zA-Z]:[\\/][^"'\n\r*?<>|]+|~[\\/][^"'\n\r*?<>|]+)/g;
    let aMatch: RegExpExecArray | null;
    while ((aMatch = absRegex.exec(input)) !== null) {
      candidates.push(aMatch[1].trim());
    }

    // 4. Special profile folders like OneDrive/Dokumen/... or Downloads/...
    const specialFolderRegex = /\b(OneDrive|Dokumen|Documents|Downloads|Desktop)[\\/][^"'\n\r*?<>|]+/gi;
    let sfMatch: RegExpExecArray | null;
    while ((sfMatch = specialFolderRegex.exec(input)) !== null) {
      candidates.push(sfMatch[0].trim());
    }

    // Deduplicate raw candidates
    const rawUnique = Array.from(new Set(candidates.map(c => c.replace(/[.,;:!?"']+$/, '').trim()))).filter(Boolean);

    // Resolve candidates against filesystem with word-trimming fallback
    const validatedPaths: string[] = [];
    for (const raw of rawUnique) {
      const resolved = this.findExistingPathWithWordStripping(raw);
      if (resolved && !isProtectedLaptopPath(resolved)) {
        validatedPaths.push(resolved);
      }
    }

    return Array.from(new Set(validatedPaths));
  }

  /**
   * If a path candidate contains trailing instruction words (e.g. "C:\folder tolong rangkum"),
   * iteratively strip the rightmost word until fsSync.existsSync matches or string is too short.
   */
  private static findExistingPathWithWordStripping(candidate: string): string | null {
    let current = candidate.trim();
    while (current.length > 2) {
      const resolved = resolveLaptopSafePath(current);
      try {
        if (fsSync.existsSync(resolved)) {
          return resolved;
        }
      } catch {
        // Ignore fs permission/syntax errors
      }

      // Strip last space-separated word
      const lastSpaceIndex = current.lastIndexOf(' ');
      if (lastSpaceIndex === -1) break;
      current = current.slice(0, lastSpaceIndex).trim();
    }
    return null;
  }

  /**
   * Resolves and extracts textual content from local laptop paths found in the user message.
   */
  static async resolveLaptopLocalContext(
    userMessage: string,
    options: { maxTotalChars?: number; maxFilesPerDir?: number } = {}
  ): Promise<LaptopContextResult> {
    const maxTotalChars = options.maxTotalChars ?? 38_000;
    const maxFilesPerDir = options.maxFilesPerDir ?? 10;

    const validatedPaths = this.extractLaptopPathCandidates(userMessage);
    if (validatedPaths.length === 0) {
      return {
        hasLaptopContext: false,
        pathsFound: [],
        totalFilesProcessed: 0,
        items: []
      };
    }

    const items: LaptopExtractedItem[] = [];
    let accumulatedChars = 0;

    for (const targetPath of validatedPaths) {
      if (accumulatedChars >= maxTotalChars) break;

      try {
        const stat = fsSync.statSync(targetPath);

        if (stat.isDirectory()) {
          // Process Directory
          const entries = fsSync.readdirSync(targetPath, { withFileTypes: true });

          // Filter entries
          const fileEntries = entries.filter(e => {
            if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '$RECYCLE.BIN') return false;
            return true;
          });

          // Sort: preferred document extensions first, then by name
          fileEntries.sort((a, b) => {
            const extA = path.extname(a.name).toLowerCase();
            const extB = path.extname(b.name).toLowerCase();
            const aIsDoc = SUPPORTED_DOCUMENT_EXTS.has(extA);
            const bIsDoc = SUPPORTED_DOCUMENT_EXTS.has(extB);
            if (aIsDoc && !bIsDoc) return -1;
            if (!aIsDoc && bIsDoc) return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          });

          const selectedEntries = fileEntries.slice(0, maxFilesPerDir);

          for (const entry of selectedEntries) {
            if (accumulatedChars >= maxTotalChars) break;
            const fullFilePath = path.join(targetPath, entry.name);

            if (entry.isDirectory()) {
              items.push({
                name: entry.name,
                relativePath: entry.name,
                fullPath: fullFilePath,
                sizeBytes: 0,
                type: 'directory'
              });
              continue;
            }

            try {
              const fileStat = fsSync.statSync(fullFilePath);
              const ext = path.extname(entry.name).toLowerCase();

              // Skip oversized files (> 35MB)
              if (fileStat.size > 35 * 1024 * 1024) {
                items.push({
                  name: entry.name,
                  relativePath: entry.name,
                  fullPath: fullFilePath,
                  sizeBytes: fileStat.size,
                  type: 'file',
                  error: 'Ukuran file melebihi batas 35MB'
                });
                continue;
              }

              let extractedText = '';
              let pageCount: number | undefined;

              if (ext === '.pdf') {
                const buffer = fsSync.readFileSync(fullFilePath);
                try {
                  const { PDFParse } = await import('pdf-parse');
                  const parser = new PDFParse({ data: buffer });
                  try {
                    const info = await parser.getInfo();
                    pageCount = info?.total || undefined;
                    const textRes = await parser.getText();
                    extractedText = textRes.text || '';
                  } finally {
                    await parser.destroy();
                  }
                } catch {
                  const { DocumentExtractor } = await import('../file-intelligence/documentExtractor.js');
                  const docResult = await DocumentExtractor.extractDocument({ buffer, filename: entry.name });
                  extractedText = docResult.text || '';
                  pageCount = docResult.metadata.pageCount;
                }
              } else if (['.docx', '.pptx', '.xlsx'].includes(ext)) {
                const buffer = fsSync.readFileSync(fullFilePath);
                const { DocumentExtractor } = await import('../file-intelligence/documentExtractor.js');
                const docResult = await DocumentExtractor.extractDocument({
                  buffer,
                  filename: entry.name
                });
                extractedText = docResult.text || '';
                pageCount = docResult.metadata.pageCount || docResult.metadata.slideCount;
              } else if (SUPPORTED_DOCUMENT_EXTS.has(ext)) {
                extractedText = fsSync.readFileSync(fullFilePath, 'utf-8');
              } else {
                // Unknown binary format, record presence only
                items.push({
                  name: entry.name,
                  relativePath: entry.name,
                  fullPath: fullFilePath,
                  sizeBytes: fileStat.size,
                  type: 'file'
                });
                continue;
              }

              // Budget individual file text
              const perFileBudget = 9_000;
              const remainingBudget = maxTotalChars - accumulatedChars;
              const allowedChars = Math.min(perFileBudget, remainingBudget);

              const truncated = extractedText.length > allowedChars;
              const cleanedText = scanAndSanitizePII(
                truncated ? extractedText.slice(0, allowedChars) + '\n...[bagian berikutnya dipersingkat]' : extractedText
              ).sanitizedText;

              accumulatedChars += cleanedText.length;

              items.push({
                name: entry.name,
                relativePath: entry.name,
                fullPath: fullFilePath,
                sizeBytes: fileStat.size,
                type: 'file',
                pageCount,
                text: cleanedText
              });
            } catch (err: any) {
              items.push({
                name: entry.name,
                relativePath: entry.name,
                fullPath: fullFilePath,
                sizeBytes: 0,
                type: 'file',
                error: err?.message || 'Gagal membaca berkas'
              });
            }
          }
        } else {
          // Process Single File
          const filename = path.basename(targetPath);
          const ext = path.extname(filename).toLowerCase();

          let extractedText = '';
          let pageCount: number | undefined;

          if (ext === '.pdf') {
            const buffer = fsSync.readFileSync(targetPath);
            try {
              const { PDFParse } = await import('pdf-parse');
              const parser = new PDFParse({ data: buffer });
              try {
                const info = await parser.getInfo();
                pageCount = info?.total || undefined;
                const textRes = await parser.getText();
                extractedText = textRes.text || '';
              } finally {
                await parser.destroy();
              }
            } catch {
              const { DocumentExtractor } = await import('../file-intelligence/documentExtractor.js');
              const docResult = await DocumentExtractor.extractDocument({ buffer, filename });
              extractedText = docResult.text || '';
              pageCount = docResult.metadata.pageCount;
            }
          } else if (['.docx', '.pptx', '.xlsx'].includes(ext)) {
            const buffer = fsSync.readFileSync(targetPath);
            const { DocumentExtractor } = await import('../file-intelligence/documentExtractor.js');
            const docResult = await DocumentExtractor.extractDocument({
              buffer,
              filename
            });
            extractedText = docResult.text || '';
            pageCount = docResult.metadata.pageCount || docResult.metadata.slideCount;
          } else {
            extractedText = fsSync.readFileSync(targetPath, 'utf-8');
          }

          const allowedChars = Math.min(28_000, maxTotalChars - accumulatedChars);
          const truncated = extractedText.length > allowedChars;
          const cleanedText = scanAndSanitizePII(
            truncated ? extractedText.slice(0, allowedChars) + '\n...[bagian berikutnya dipersingkat]' : extractedText
          ).sanitizedText;

          accumulatedChars += cleanedText.length;

          items.push({
            name: filename,
            relativePath: filename,
            fullPath: targetPath,
            sizeBytes: stat.size,
            type: 'file',
            pageCount,
            text: cleanedText
          });
        }
      } catch (err: any) {
        console.warn('[LAPTOP_CONTEXT_WARN] Gagal membaca target path:', targetPath, err?.message || err);
      }
    }

    if (items.length === 0) {
      return {
        hasLaptopContext: false,
        pathsFound: validatedPaths,
        totalFilesProcessed: 0,
        items: []
      };
    }

    // Build XML context block
    const summaryLines = items.map((item, idx) => {
      const sizeStr = item.sizeBytes ? `${(item.sizeBytes / 1024 / 1024).toFixed(2)} MB` : '-';
      const pageStr = item.pageCount ? `, ${item.pageCount} hlm/slide` : '';
      return `${idx + 1}. [${item.type === 'directory' ? 'DIR' : 'FILE'}] ${item.name} (${sizeStr}${pageStr})`;
    });

    const contentBlocks = items
      .filter(i => i.text && i.text.trim())
      .map(i => {
        return `=== BERKAS: ${i.name} (${i.fullPath}) ===\n${i.text}\n=== AKHIR BERKAS: ${i.name} ===`;
      });

    const contextBlock = `<laptop_local_context status="SUCCESS" total_items="${items.length}">
[STATUS INTEGRASI LAPTOP RUANGKERJA: BERHASIL MEMBACA BERKAS LOKAL]
Direktori/berkas fisik berikut telah berhasil diakses dan diekstraksi langsung dari laptop pengguna:
${validatedPaths.map(p => `- ${p}`).join('\n')}

Daftar Berkas:
${summaryLines.join('\n')}

[ISI KONTEN BERKAS LOKAL HASIL EKSTRAKSI]:
${contentBlocks.length > 0 ? contentBlocks.join('\n\n') : '(Tidak ada berkas teks yang dapat diekstrak)'}
</laptop_local_context>`;

    const summary = `Berhasil membaca ${items.length} item dari ${validatedPaths.join(', ')}`;

    return {
      hasLaptopContext: true,
      pathsFound: validatedPaths,
      contextBlock,
      summary,
      totalFilesProcessed: items.filter(i => i.type === 'file').length,
      items
    };
  }
}
