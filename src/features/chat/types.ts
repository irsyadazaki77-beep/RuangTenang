export interface Attachment {
  id: string;
  file: File;
  previewUrl?: string;
  status: 'uploading' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  serverAttachmentId?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  url?: string;
  base64?: string;
}

export interface StoredAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
  data?: string;
}

export interface Message {
  isEdited?: boolean;
  id: string;
  role: 'user' | 'assistant';
  content: string;
  plugin?: string;
  pluginResult?: any;
  error?: boolean;
  createdAt?: string | Date;
  attachments?: StoredAttachment[];
}

export interface Chat {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  isTemporary?: boolean;
  parentChatId?: string | null;
  branchedFromMessageId?: string | null;
  useMemory?: boolean;
  summary?: string | null;
  updatedAt: string;
}

export interface BookmarkItem {
  id: string;
  userId: string;
  chatId: string;
  messageId: string;
  createdAt: string;
  chatTitle: string;
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
  };
}

export interface StructuredSessionSummary {
  masalahUtama: string;
  emosi: string[];
  polaPemicu: string[];
  poinPenting: string[];
  sudahDicoba: string[];
  langkahBerikutnya: string[];
  disclaimer: string;
  generatedAt: string;
  messageCountAtGeneration?: number;
}

export type ChatMode = 'Teman Cerita' | 'Refleksi Diri' | 'Fokus Solusi' | 'Produktivitas' | 'Persiapan Konseling';
export type ResponseStyle = 'Singkat' | 'Seimbang' | 'Mendalam' | 'Fokus mendengarkan' | 'Fokus solusi';


