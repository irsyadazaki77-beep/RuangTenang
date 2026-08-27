export interface Message {
  isEdited?: boolean;
  id: string;
  role: 'user' | 'assistant';
  content: string;
  plugin?: string;
  pluginResult?: any;
  error?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  isTemporary?: boolean;
  updatedAt: string;
}

export type ChatMode = 'Teman Cerita' | 'Refleksi Diri' | 'Fokus Solusi' | 'Produktivitas' | 'Persiapan Konseling';
export type ResponseStyle = 'Singkat' | 'Seimbang' | 'Mendalam' | 'Fokus mendengarkan' | 'Fokus solusi';

