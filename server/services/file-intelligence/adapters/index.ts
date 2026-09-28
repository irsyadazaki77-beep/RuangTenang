import { SupportedFileKind } from '../../../../shared/contracts/files.js';
import { DocumentExtractorAdapter } from './types.js';
import { TextAdapter } from './TextAdapter.js';
import { PdfAdapter } from './PdfAdapter.js';
import { DocxAdapter } from './DocxAdapter.js';
import { PptxAdapter } from './PptxAdapter.js';
import { XlsxAdapter } from './XlsxAdapter.js';
import { ImageAdapter } from './ImageAdapter.js';
import { DocumentProcessingException } from '../fileTypes.js';

export * from './types.js';
export * from './TextAdapter.js';
export * from './PdfAdapter.js';
export * from './DocxAdapter.js';
export * from './PptxAdapter.js';
export * from './XlsxAdapter.js';
export * from './ImageAdapter.js';

const adapters: DocumentExtractorAdapter[] = [
  new TextAdapter(),
  new PdfAdapter(),
  new DocxAdapter(),
  new PptxAdapter(),
  new XlsxAdapter(),
  new ImageAdapter()
];

export function getAdapterForKind(kind: SupportedFileKind): DocumentExtractorAdapter {
  const found = adapters.find(a => a.supports(kind));
  if (!found) {
    throw new DocumentProcessingException('UNSUPPORTED_FORMAT', `Tidak ditemukan adapter ekstraksi untuk jenis berkas "${kind}".`);
  }
  return found;
}
