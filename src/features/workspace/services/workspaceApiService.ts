import { apiClient } from '../../../lib/apiClient';
import { Message } from '../../chat/types';
import { WorkspaceArtifact, ArtifactType } from '../types';

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
  createVersionSnapshot?: boolean;
}

export class WorkspaceApiService {
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
    return [];
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

