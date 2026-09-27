import { FileValidationResult, WorkspaceFileAttachment } from '../types';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const TEXT_FILE_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h',
  'json', 'csv', 'sql', 'html', 'css', 'xml', 'yaml', 'yml', 'sh', 'r', 'bib', 'ris', 'env'
]);

export function isTextBasedFile(filename: string, mimeType?: string): boolean {
  if (mimeType) {
    if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml') {
      return true;
    }
  }
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? TEXT_FILE_EXTENSIONS.has(ext) : false;
}

export function validateFileHeader(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'EMPTY_FILE', message: 'Tidak ada berkas yang dipilih.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'EMPTY_FILE', message: 'Berkas kosong (0 byte).' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { 
      valid: false, 
      error: 'TOO_LARGE', 
      message: `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi batas maksimal 5MB.` 
    };
  }

  return { valid: true };
}

/**
 * Safe File Processing Boundary: Converts uploaded files into typed WorkspaceFileAttachment
 */
export async function processFileForWorkspace(file: File): Promise<FileValidationResult> {
  const headerValidation = validateFileHeader(file);
  if (!headerValidation.valid) {
    return headerValidation;
  }

  const isText = isTextBasedFile(file.name, file.type);

  return new Promise((resolve) => {
    const reader = new FileReader();

    if (isText) {
      reader.onload = (event) => {
        const textContent = (event.target?.result as string) || '';
        const attachment: WorkspaceFileAttachment = {
          name: file.name,
          content: textContent,
          size: file.size,
          mimeType: file.type || 'text/plain',
          isText: true
        };
        resolve({ valid: true, file: attachment });
      };

      reader.onerror = () => {
        resolve({
          valid: false,
          error: 'READ_FAILED',
          message: `Gagal membaca isi berkas teks "${file.name}".`
        });
      };

      reader.readAsText(file);
    } else {
      // For binary / non-plain-text documents (e.g. PDF, DOCX, images)
      // Provide clean structured adapter metadata without corrupting text state
      const attachment: WorkspaceFileAttachment = {
        name: file.name,
        content: `[Berkas Dokumen: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        isText: false
      };
      resolve({ valid: true, file: attachment });
    }
  });
}
