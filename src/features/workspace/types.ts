export type WorkspaceMode = 'RUANG_TENANG' | 'RUANG_KERJA';

export type ArtifactType = 'DOCUMENT' | 'CODE' | 'CITATION' | 'OUTLINE';

export interface ArtifactVersionRecord {
  id: string;
  artifactId: string;
  version: number;
  content: string;
  title: string;
  createdAt: string;
}

export interface WorkspaceArtifact {
  id: string;
  chatId?: string | null;
  userId?: string;
  title: string;
  type: ArtifactType;
  language?: string; // e.g. 'python', 'javascript', 'typescript', 'sql', 'markdown', 'html', 'css', 'latex'
  content: string;
  version: number;
  createdAt?: string;
  updatedAt: string;
  versions?: ArtifactVersionRecord[];
}

export interface AcademicTaskTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompt: string;
  targetArtifact: ArtifactType;
}

export type CitationStyle = 'APA7' | 'IEEE' | 'HARVARD' | 'VANCOUVER' | 'BIBTEX';

export interface ParsedCitationItem {
  id: string;
  raw: string;
  title?: string;
  authors?: string[];
  year?: string;
  journal?: string;
  doiOrUrl?: string;
}
