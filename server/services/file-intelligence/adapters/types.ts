import { SupportedFileKind, ExtractedDocument } from '../../../../shared/contracts/files.js';

export interface ExtractionInput {
  documentId: string;
  filename: string;
  mimeType: string;
  kind: SupportedFileKind;
  buffer: Buffer;
  checksum: string;
  abortSignal?: AbortSignal;
}

export interface DocumentExtractorAdapter {
  supports(kind: SupportedFileKind): boolean;
  extract(input: ExtractionInput): Promise<ExtractedDocument>;
}
