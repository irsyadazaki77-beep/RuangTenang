import { apiClient } from '../../../lib/apiClient';
import { Message } from '../../chat/types';
import { WorkspaceArtifact, ArtifactType, WorkspaceFileKind } from '../types';
import type { WorkspaceContract, WorkspaceTaskContract, WorkspaceTaskStatus, WorkspaceTaskSource, WorkspacePlan } from '../../../../shared/contracts/workspace';
import type { ResearchSource, ResearchSourceMetadata } from '../../../../shared/contracts/files';
import type { TabularAnalysisRequest, TabularAnalysisResult, TabularDataset, TabularTransformPreview, TabularTransformRequest } from '../../../../shared/contracts/tabular';

export interface CreateArtifactPayload {
  id?: string;
  chatId: string;
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
  chatId?: string;
  createNewVersion?: boolean;
  expectedVersion?: number;
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
  chunkCount?: number;
  errorMessage?: string;
  createdAt?: string;
}

export interface WorkspaceAttachmentPreviewDto extends Pick<WorkspaceAttachmentDto, 'id' | 'filename' | 'mimeType' | 'fileKind' | 'size' | 'chunkCount'> {
  previewText: string;
}

export interface TabularPreviewDto { sheetName: string; columns: string[]; rows: Array<Record<string, unknown>>; offset: number; limit: number; rowCount: number }

export interface WorkspaceSearchResult {
  kind: 'workspace' | 'task' | 'artifact' | 'file' | 'message';
  chatId: string;
  itemId?: string;
  title: string;
  snippet: string;
  updatedAt: string;
}

export class WorkspaceApiService {
  static async fetchResearchSources(chatId: string, signal?: AbortSignal): Promise<ResearchSource[]> {
    const res = await apiClient.get<ResearchSource[]>(`/api/v1/workspace/${encodeURIComponent(chatId)}/sources`, { signal });
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.message || 'Sumber gagal dimuat.');
    return res.data;
  }

  static async updateResearchSource(chatId: string, sourceId: string, metadata: ResearchSourceMetadata): Promise<ResearchSource> {
    const res = await apiClient.put<ResearchSource>(`/api/v1/workspace/${encodeURIComponent(chatId)}/sources/${encodeURIComponent(sourceId)}`, metadata);
    if (!res.success || !res.data) throw new Error(res.message || 'Metadata sumber gagal disimpan.');
    return res.data;
  }

  static async startTaskExecution(chatId: string, planId: string, taskId: string, executionId: string, snapshot: NonNullable<WorkspacePlan['tasks'][number]['snapshot']>): Promise<WorkspacePlan> {
    const res = await apiClient.post<WorkspacePlan>(`/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/run`, { executionId, snapshot });
    if (!res.success || !res.data) throw new Error(res.message || 'Task tidak dapat dijalankan.');
    return res.data;
  }

  static async createPlan(chatId: string, plan: WorkspacePlan): Promise<WorkspacePlan> {
    const res = await apiClient.post<WorkspacePlan>(`/api/v1/workspace/${encodeURIComponent(chatId)}/plans`, plan);
    if (!res.success || !res.data) throw new Error(res.message || 'Plan gagal disimpan.');
    return res.data;
  }

  static async updatePlan(chatId: string, plan: WorkspacePlan): Promise<WorkspacePlan> {
    const res = await apiClient.put<WorkspacePlan>(`/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(plan.id)}`, plan);
    if (!res.success || !res.data) throw new Error(res.message || 'Plan gagal diperbarui.');
    return res.data;
  }

  static async searchWorkspaces(query: string, signal?: AbortSignal): Promise<WorkspaceSearchResult[]> {
    const res = await apiClient.get<WorkspaceSearchResult[]>(`/api/v1/workspace/search?q=${encodeURIComponent(query)}`, { signal });
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.message || 'Pencarian Workspace gagal.');
    return res.data;
  }

  static async fetchAttachmentPreview(attachmentId: string, signal?: AbortSignal): Promise<WorkspaceAttachmentPreviewDto> {
    const res = await apiClient.get<WorkspaceAttachmentPreviewDto>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/preview`, { signal });
    if (!res.success || !res.data) throw new Error(res.message || 'Preview dokumen gagal dimuat.');
    return res.data;
  }

  static async fetchTabularDataset(attachmentId: string, sheetName?: string, signal?: AbortSignal): Promise<TabularDataset> {
    const suffix = sheetName ? `?sheet=${encodeURIComponent(sheetName)}` : '';
    const res = await apiClient.get<TabularDataset>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset${suffix}`, { signal });
    if (!res.success || !res.data) throw new Error(res.message || 'Profil dataset gagal dimuat.');
    return res.data;
  }

  static async fetchTabularPreview(attachmentId: string, sheetName: string, offset: number, signal?: AbortSignal): Promise<TabularPreviewDto> {
    const query = new URLSearchParams({ sheet: sheetName, offset: String(offset), limit: '25' });
    const res = await apiClient.get<TabularPreviewDto>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/preview?${query}`, { signal });
    if (!res.success || !res.data) throw new Error(res.message || 'Preview dataset gagal dimuat.');
    return res.data;
  }

  static async analyzeTabularDataset(attachmentId: string, plan: TabularAnalysisRequest): Promise<TabularAnalysisResult> {
    const res = await apiClient.post<TabularAnalysisResult>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/analyze`, plan);
    if (!res.success || !res.data) throw new Error(res.message || 'Analisis dataset gagal dijalankan.');
    return res.data;
  }

  static async previewTabularTransform(attachmentId: string, plan: TabularTransformRequest): Promise<TabularTransformPreview> {
    const res = await apiClient.post<TabularTransformPreview>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/transform/preview`, plan);
    if (!res.success || !res.data) throw new Error(res.message || 'Preview transformasi gagal.');
    return res.data;
  }

  static async confirmTabularTransform(attachmentId: string, plan: TabularTransformRequest): Promise<{ artifact: WorkspaceArtifact; transform: TabularTransformPreview; sourceUnchanged: boolean }> {
    const res = await apiClient.post<{ artifact: WorkspaceArtifact; transform: TabularTransformPreview; sourceUnchanged: boolean }>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/transform/confirm`, plan);
    if (!res.success || !res.data) throw new Error(res.message || 'Transformasi gagal disimpan.');
    return res.data;
  }

  static async listWorkspaces(signal?: AbortSignal): Promise<WorkspaceContract[]> {
    const res = await apiClient.get<WorkspaceContract[]>('/api/v1/workspace', { signal });
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.message || 'Gagal memuat Workspace');
    return res.data;
  }

  static async createWorkspace(name?: string, signal?: AbortSignal): Promise<WorkspaceContract> {
    const res = await apiClient.post<WorkspaceContract>('/api/v1/workspace', { ...(name ? { name } : {}) }, { signal });
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal membuat Workspace');
    return res.data;
  }

  static async fetchWorkspace(chatId: string, signal?: AbortSignal): Promise<WorkspaceContract> {
    const res = await apiClient.get<WorkspaceContract>(`/api/v1/workspace/${encodeURIComponent(chatId)}`, { signal });
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat Workspace');
    return res.data;
  }

  static async updateWorkspace(chatId: string, payload: Partial<Pick<WorkspaceContract, 'name' | 'description' | 'instructions' | 'defaultModel' | 'defaultPreset'>>, signal?: AbortSignal): Promise<WorkspaceContract> {
    const res = await apiClient.put<WorkspaceContract>(`/api/v1/workspace/${encodeURIComponent(chatId)}`, payload, { signal });
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal menyimpan Workspace');
    return res.data;
  }

  static async createTask(chatId: string, title: string, source: WorkspaceTaskSource = 'user', signal?: AbortSignal): Promise<WorkspaceTaskContract> {
    const res = await apiClient.post<WorkspaceTaskContract>(`/api/v1/workspace/${encodeURIComponent(chatId)}/tasks`, { title, source }, { signal });
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal membuat task');
    return res.data;
  }

  static async updateTask(chatId: string, taskId: string, status: WorkspaceTaskStatus, signal?: AbortSignal): Promise<WorkspaceTaskContract> {
    const res = await apiClient.put<WorkspaceTaskContract>(`/api/v1/workspace/${encodeURIComponent(chatId)}/tasks/${encodeURIComponent(taskId)}`, { status }, { signal });
    if (!res.success || !res.data) throw new Error(res.message || 'Gagal memperbarui task');
    return res.data;
  }

  static async deleteTask(chatId: string, taskId: string, signal?: AbortSignal): Promise<void> {
    const res = await apiClient.delete(`/api/v1/workspace/${encodeURIComponent(chatId)}/tasks/${encodeURIComponent(taskId)}`, { signal });
    if (!res.success) throw new Error(res.message || 'Gagal menghapus task');
  }

  static async fetchChatAttachments(chatId: string, signal?: AbortSignal): Promise<WorkspaceAttachmentDto[]> {
    const res = await apiClient.get<{ attachments?: WorkspaceAttachmentDto[] }>(
      `/api/v1/chat/${encodeURIComponent(chatId)}/attachments`, { signal }
    );
    if (!res.success || !Array.isArray(res.data?.attachments)) {
      throw new Error(res.message || 'Gagal memuat dokumen Workspace');
    }
    return res.data.attachments;
  }

  static async deleteAttachment(attachmentId: string, chatId?: string, signal?: AbortSignal): Promise<void> {
    const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
    const res = await apiClient.delete<{ message?: string }>(
      `/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}${query}`, { signal }
    );
    if (!res.success) throw new Error(res.message || 'Gagal menghapus dokumen');
  }

  static async retryAttachment(attachmentId: string, chatId?: string, signal?: AbortSignal): Promise<WorkspaceAttachmentDto> {
    const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
    const res = await apiClient.post<{ attachment?: WorkspaceAttachmentDto }>(
      `/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/retry${query}`, {}, { signal }
    );
    if (!res.success || !res.data?.attachment) throw new Error(res.message || 'Gagal mencoba ulang pemrosesan dokumen.');
    return res.data.attachment;
  }

  /** Fetch artifacts belonging to one Workspace. A missing chat never falls back to the user library. */
  static async fetchArtifacts(chatId: string | undefined, signal?: AbortSignal): Promise<WorkspaceArtifact[]> {
    if (!chatId) return [];
    const url = `/api/v1/workspace/artifacts?chatId=${encodeURIComponent(chatId)}`;
    const res = await apiClient.get<any>(url, { signal });
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }

  /** Explicit library operation for screens that intentionally list every user artifact. */
  static async fetchAllArtifacts(signal?: AbortSignal): Promise<WorkspaceArtifact[]> {
    const res = await apiClient.get<any>('/api/v1/workspace/artifacts/all', { signal });
    if (res.success && Array.isArray(res.data)) return res.data;
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
  static async rollbackArtifact(id: string, targetVersion: number, chatId?: string, signal?: AbortSignal): Promise<WorkspaceArtifact> {
    const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
    const res = await apiClient.post<any>(`/api/v1/workspace/artifacts/${encodeURIComponent(id)}/rollback${query}`, {
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
  static async deleteArtifact(id: string, chatId?: string, signal?: AbortSignal): Promise<void> {
    const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
    const res = await apiClient.delete<any>(`/api/v1/workspace/artifacts/${encodeURIComponent(id)}${query}`, { signal });
    if (!res.success) throw new Error(res.message || 'Gagal menghapus artefak');
  }
}

