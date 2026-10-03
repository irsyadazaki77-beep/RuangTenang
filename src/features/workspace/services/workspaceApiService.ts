import { apiClient } from '../../../lib/apiClient';
import { Message } from '../../chat/types';
import { WorkspaceArtifact, ArtifactType, WorkspaceFileKind } from '../types';

export interface CreateArtifactPayload {
  id?: string;
  chatId?: string | null;
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
}

export interface UpdateArtifactPayload {
  title?: string;
  content?: string;
  type?: ArtifactType;
  language?: string;
  chatId?: string | null;
  createNewVersion?: boolean;
  expectedUpdatedAt?: string;
}

export interface WorkspaceAttachmentDto {
  id: string;
  filename: string;
  mimeType: string;
  fileKind: WorkspaceFileKind;
  size: number;
  status: 'processing' | 'ready' | 'failed' | 'pending' | 'unsupported';
  url: string;
  checksum?: string;
  pageCount?: number;
  slideCount?: number;
  sheetCount?: number;
  errorMessage?: string;
  createdAt?: string;
}

export class WorkspaceApiService {
  static async fetchChatAttachments(chatId: string, signal?: AbortSignal): Promise<WorkspaceAttachmentDto[]> {
    const res = await apiClient.get<{ attachments?: WorkspaceAttachmentDto[] }>(
      `/api/v1/chat/${encodeURIComponent(chatId)}/attachments`, { signal }
    );
    if (!res.success || !Array.isArray(res.data?.attachments)) {
      throw new Error(res.message || 'Gagal memuat dokumen Workspace');
    }
    return res.data.attachments;
  }

  static async deleteAttachment(attachmentId: string, signal?: AbortSignal): Promise<void> {
    const res = await apiClient.delete<{ message?: string }>(
      `/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}`, { signal }
    );
    if (!res.success) throw new Error(res.message || 'Gagal menghapus dokumen');
  }

  /**
   * Fetch all workspace artifacts for current user, optionally filtered by chatId
   */
  static async fetchArtifacts(chatId?: string, signal?: AbortSignal): Promise<WorkspaceArtifact[]> {
    const url = chatId 
      ? `/api/v1/workspace/artifacts?chatId=${encodeURIComponent(chatId)}` 
      : `/api/v1/workspace/artifacts`;
      
    const res = await apiClient.get<any>(url, { signal });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }

  /**
   * Fetch messages for a specific chat
   */
  static async fetchMessages(chatId: string, signal?: AbortSignal): Promise<Message[]> {
    const res = await apiClient.get<any>(`/api/v1/chat/${encodeURIComponent(chatId)}/messages?limit=50`, { signal });
    if (res.success && res.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.message || 'Gagal memuat percakapan Workspace');
  }

  /** Clears only the messages belonging to an owned Workspace chat. */
  static async clearMessages(chatId: string, signal?: AbortSignal): Promise<void> {
    const res = await apiClient.delete<{ message?: string }>(`/api/v1/chat/${encodeURIComponent(chatId)}/messages`, { signal });
    if (!res.success) throw new Error(res.message || 'Gagal membersihkan percakapan');
  }

  /**
   * Create or upsert a new artifact
   */
  static async createArtifact(payload: CreateArtifactPayload, signal?: AbortSignal): Promise<WorkspaceArtifact | null> {
    const res = await apiClient.post<any>('/api/v1/workspace/artifacts', payload, { signal });
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  /**
   * Update an existing artifact by ID
   */
  static async updateArtifact(id: string, payload: UpdateArtifactPayload, signal?: AbortSignal): Promise<WorkspaceArtifact | null> {
    const res = await apiClient.put<any>(`/api/v1/workspace/artifacts/${encodeURIComponent(id)}`, payload, { signal });
    if (res.success && res.data) {
      return res.data;
    }
    if (res.status === 409 || res.code === 'ARTIFACT_CONFLICT') {
      throw new Error(res.message || 'Dokumen berubah sejak revisi dimulai. Coba ulang revisi.');
    }
    if (!res.success) throw new Error(res.message || 'Gagal menyimpan artefak');
    return null;
  }

  /**
   * Rollback an artifact to a previous target version
   */
  static async rollbackArtifact(id: string, targetVersion: number, signal?: AbortSignal): Promise<WorkspaceArtifact> {
    const res = await apiClient.post<any>(`/api/v1/workspace/artifacts/${encodeURIComponent(id)}/rollback`, {
      targetVersion
    }, { signal });

    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Gagal memulihkan versi artefak');
  }

  /**
   * Delete an artifact by ID
   */
  static async deleteArtifact(id: string, signal?: AbortSignal): Promise<boolean> {
    const res = await apiClient.delete<any>(`/api/v1/workspace/artifacts/${encodeURIComponent(id)}`, { signal });
    return Boolean(res.success);
  }
}

