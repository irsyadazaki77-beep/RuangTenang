import { apiClient } from '../../../lib/apiClient';
import { Message } from '../../chat/types';
import { WorkspaceArtifact, ArtifactType, WorkspaceFileKind } from '../types';
import type { WorkspaceContract, WorkspaceTaskContract, WorkspaceTaskStatus, WorkspaceTaskSource, WorkspacePlan } from '../../../../shared/contracts/workspace';
import type { ResearchSource, ResearchSourceMetadata } from '../../../../shared/contracts/files';
import type { TabularAnalysisRequest, TabularAnalysisResult, TabularDataset, TabularTransformPreview, TabularTransformRequest } from '../../../../shared/contracts/tabular';
import type { AgentExecutionResult } from '../../../../shared/contracts/agent';

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
  extractionWarnings?: string[];
  ocrApplied?: boolean;
  visualAnalysisAvailable?: boolean;
  previewOnly?: boolean;
  ocrConfidence?: number;
  readingUncertainty?: string;
  chunkCount?: number;
  errorMessage?: string;
  createdAt?: string;
}

export interface WorkspaceAttachmentPreviewDto extends Pick<WorkspaceAttachmentDto, 'id' | 'filename' | 'mimeType' | 'fileKind' | 'size' | 'chunkCount' | 'ocrApplied' | 'visualAnalysisAvailable' | 'previewOnly' | 'ocrConfidence' | 'readingUncertainty' | 'extractionWarnings'> {
  previewText: string;
}

export interface TabularPreviewDto { sheetName: string; columns: string[]; rows: Array<Record<string, unknown>>; offset: number; limit: number; rowCount: number }
export interface WorkspaceTabularOverviewDto { dataset: TabularDataset; preview: TabularPreviewDto }

export interface WorkspaceSearchResult {
  kind: 'workspace' | 'task' | 'artifact' | 'file' | 'message';
  chatId: string;
  itemId?: string;
  title: string;
  snippet: string;
  updatedAt: string;
}

export interface WorkspaceSearchPage {
  items: WorkspaceSearchResult[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface WorkspaceListPage {
  items: WorkspaceContract[];
  hasMore: boolean;
  nextOffset: number;
}

function workspaceApiError(message: string, status?: number, code?: string): Error & { status?: number; code?: string } {
  return Object.assign(new Error(message), { status, code });
}

function unwrapApiData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'success' in payload &&
    typeof (payload as { success?: unknown }).success === 'boolean' &&
    'data' in payload
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export class WorkspaceApiService {
  static async fetchResearchSources(chatId: string, signal?: AbortSignal): Promise<ResearchSource[]> {
    const res = await apiClient.get<ResearchSource[]>(`/api/v1/workspace/${encodeURIComponent(chatId)}/sources`, { signal });
    const data = unwrapApiData<ResearchSource[]>(res.data);
    if (!res.success || !Array.isArray(data)) throw new Error(res.message || 'Sumber gagal dimuat.');
    return data;
  }

  static async updateResearchSource(chatId: string, sourceId: string, metadata: ResearchSourceMetadata): Promise<ResearchSource> {
    const res = await apiClient.put<ResearchSource>(`/api/v1/workspace/${encodeURIComponent(chatId)}/sources/${encodeURIComponent(sourceId)}`, metadata);
    const data = unwrapApiData<ResearchSource>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Metadata sumber gagal disimpan.');
    return data;
  }

  static async startTaskExecution(chatId: string, planId: string, taskId: string, executionId: string, snapshot: NonNullable<WorkspacePlan['tasks'][number]['snapshot']>): Promise<{ plan: WorkspacePlan; claimed: boolean }> {
    const res = await apiClient.post<{ plan: WorkspacePlan; claimed: boolean }>(`/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/run`, { executionId, snapshot });
    const data = unwrapApiData<{ plan: WorkspacePlan; claimed: boolean }>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Task tidak dapat dijalankan.');
    return data;
  }

  static async executeAgentTask(chatId: string, planId: string, taskId: string, executionId: string, signal?: AbortSignal): Promise<{ execution: AgentExecutionResult; plan: WorkspacePlan }> {
    const url = `/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/agent`;
    const res = await apiClient.request<{ execution: AgentExecutionResult; plan: WorkspacePlan }>(url, {
      method: 'POST', body: JSON.stringify({ executionId }), signal
    }, 0, 120_000);
    const data = unwrapApiData<{ execution: AgentExecutionResult; plan: WorkspacePlan }>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Agent tidak dapat menjalankan task.');
    return data;
  }

  static async finishTaskExecution(chatId: string, planId: string, taskId: string, executionId: string, result: { output?: string; sources?: WorkspacePlan['tasks'][number]['sources']; errorCode?: string }): Promise<WorkspacePlan> {
    const path = `/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/executions/${encodeURIComponent(executionId)}/result`;
    const res = await apiClient.post<WorkspacePlan>(path, result);
    const data = unwrapApiData<WorkspacePlan>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Hasil task gagal disimpan.');
    return data;
  }

  static async reviewTask(chatId: string, planId: string, taskId: string, decision: 'accept' | 'reject'): Promise<WorkspacePlan> {
    const path = `/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/review`;
    const res = await apiClient.post<WorkspacePlan>(path, { decision });
    const data = unwrapApiData<WorkspacePlan>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Keputusan tinjauan gagal disimpan.');
    return data;
  }

  static async updateTaskModel(chatId: string, planId: string, taskId: string, modelId: string | null): Promise<WorkspacePlan> {
    const path = `/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/model`;
    const res = await apiClient.post<WorkspacePlan>(path, { modelId });
    const data = unwrapApiData<WorkspacePlan>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Model task gagal diperbarui.');
    return data;
  }

  static async linkTaskArtifact(chatId: string, planId: string, taskId: string, executionId: string, artifactId: string): Promise<WorkspacePlan> {
    const path = `/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/executions/${encodeURIComponent(executionId)}/artifact`;
    const res = await apiClient.post<WorkspacePlan>(path, { artifactId });
    const data = unwrapApiData<WorkspacePlan>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Artifact task gagal ditautkan.');
    return data;
  }

  static async transitionPlan(chatId: string, planId: string, action: 'approve' | 'pause' | 'resume' | 'cancel' | 'complete'): Promise<WorkspacePlan> {
    const res = await apiClient.post<WorkspacePlan>(`/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/transition`, { action });
    const data = unwrapApiData<WorkspacePlan>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Perubahan status plan gagal disimpan.');
    return data;
  }

  static async cancelTaskExecution(chatId: string, planId: string, taskId: string, executionId: string): Promise<WorkspacePlan> {
    const path = `/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/executions/${encodeURIComponent(executionId)}/cancel`;
    const res = await apiClient.post<WorkspacePlan>(path, {});
    const data = unwrapApiData<WorkspacePlan>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Task belum dapat dihentikan.');
    return data;
  }

  static async recoverTaskExecution(chatId: string, planId: string, taskId: string, executionId: string): Promise<WorkspacePlan> {
    const path = `/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/executions/${encodeURIComponent(executionId)}/recover`;
    const res = await apiClient.post<WorkspacePlan>(path, {});
    const data = unwrapApiData<WorkspacePlan>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Eksekusi belum dapat dipulihkan.');
    return data;
  }

  static async createPlan(chatId: string, plan: WorkspacePlan): Promise<WorkspacePlan> {
    const res = await apiClient.post<WorkspacePlan>(`/api/v1/workspace/${encodeURIComponent(chatId)}/plans`, plan);
    const data = unwrapApiData<WorkspacePlan>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Plan gagal disimpan.');
    return data;
  }

  static async updatePlan(chatId: string, plan: WorkspacePlan): Promise<WorkspacePlan> {
    const res = await apiClient.put<WorkspacePlan>(`/api/v1/workspace/${encodeURIComponent(chatId)}/plans/${encodeURIComponent(plan.id)}`, plan);
    const data = unwrapApiData<WorkspacePlan>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Plan gagal diperbarui.');
    return data;
  }

  static async searchWorkspaces(query: string, signal?: AbortSignal, kind?: string, cursor?: string | null): Promise<WorkspaceSearchPage> {
    const params = new URLSearchParams({ q: query });
    if (kind && kind !== 'all') params.set('kind', kind);
    if (cursor) params.set('cursor', cursor);
    const res = await apiClient.get<WorkspaceSearchPage>(`/api/v1/workspace/search?${params.toString()}`, { signal });
    const data = unwrapApiData<WorkspaceSearchPage>(res.data);
    if (!res.success || !data || !Array.isArray(data.items) || typeof data.hasMore !== 'boolean' || !(data.nextCursor === null || typeof data.nextCursor === 'string') || (data.hasMore && !data.nextCursor)) throw new Error(res.message || 'Pencarian Workspace gagal.');
    return data;
  }

  static async fetchAttachmentPreview(attachmentId: string, signal?: AbortSignal): Promise<WorkspaceAttachmentPreviewDto> {
    const res = await apiClient.get<WorkspaceAttachmentPreviewDto>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/preview`, { signal });
    const data = unwrapApiData<WorkspaceAttachmentPreviewDto>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Preview dokumen gagal dimuat.');
    return data;
  }

  static async fetchTabularDataset(attachmentId: string, sheetName?: string, signal?: AbortSignal): Promise<TabularDataset> {
    const suffix = sheetName ? `?sheet=${encodeURIComponent(sheetName)}` : '';
    const res = await apiClient.get<TabularDataset>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset${suffix}`, { signal });
    const data = unwrapApiData<TabularDataset>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Profil dataset gagal dimuat.');
    return data;
  }

  static async fetchTabularDatasetOverview(attachmentId: string, sheetName?: string, signal?: AbortSignal): Promise<WorkspaceTabularOverviewDto> {
    const query = sheetName ? `?sheet=${encodeURIComponent(sheetName)}` : '';
    const res = await apiClient.get<WorkspaceTabularOverviewDto>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/overview${query}`, { signal });
    const data = unwrapApiData<WorkspaceTabularOverviewDto>(res.data);
    if (!res.success || !data?.dataset || !data.preview) throw new Error(res.message || 'Ringkasan dataset gagal dimuat.');
    return data;
  }

  static async fetchTabularPreview(attachmentId: string, sheetName: string, offset: number, signal?: AbortSignal): Promise<TabularPreviewDto> {
    const query = new URLSearchParams({ sheet: sheetName, offset: String(offset), limit: '25' });
    const res = await apiClient.get<TabularPreviewDto>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/preview?${query}`, { signal });
    const data = unwrapApiData<TabularPreviewDto>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Preview dataset gagal dimuat.');
    return data;
  }

  static async analyzeTabularDataset(attachmentId: string, plan: TabularAnalysisRequest): Promise<TabularAnalysisResult> {
    const res = await apiClient.post<TabularAnalysisResult>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/analyze`, plan);
    const data = unwrapApiData<TabularAnalysisResult>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Analisis dataset gagal dijalankan.');
    return data;
  }

  static async previewTabularTransform(attachmentId: string, plan: TabularTransformRequest): Promise<TabularTransformPreview> {
    const res = await apiClient.post<TabularTransformPreview>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/transform/preview`, plan);
    const data = unwrapApiData<TabularTransformPreview>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Preview transformasi gagal.');
    return data;
  }

  static async confirmTabularTransform(attachmentId: string, plan: TabularTransformRequest): Promise<{ artifact: WorkspaceArtifact; transform: TabularTransformPreview; sourceUnchanged: boolean }> {
    const res = await apiClient.post<{ artifact: WorkspaceArtifact; transform: TabularTransformPreview; sourceUnchanged: boolean }>(`/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/dataset/transform/confirm`, plan);
    const data = unwrapApiData<{ artifact: WorkspaceArtifact; transform: TabularTransformPreview; sourceUnchanged: boolean }>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Transformasi gagal disimpan.');
    return data;
  }

  static async listWorkspaces(offset = 0, signal?: AbortSignal): Promise<WorkspaceListPage> {
    const params = new URLSearchParams({ offset: String(offset), limit: '100' });
    const res = await apiClient.get<WorkspaceListPage>(`/api/v1/workspace?${params.toString()}`, { signal });
    const data = unwrapApiData<WorkspaceListPage>(res.data);
    if (!res.success || !Array.isArray(data?.items) || typeof data.hasMore !== 'boolean' || !Number.isSafeInteger(data.nextOffset)) {
      throw new Error(res.message || 'Gagal memuat Workspace');
    }
    return data;
  }

  static async createWorkspace(name?: string, signal?: AbortSignal): Promise<WorkspaceContract> {
    const res = await apiClient.post<WorkspaceContract>('/api/v1/workspace', { ...(name ? { name } : {}) }, { signal });
    const data = unwrapApiData<WorkspaceContract>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Gagal membuat Workspace');
    return data;
  }

  static async fetchWorkspace(chatId: string, signal?: AbortSignal): Promise<WorkspaceContract> {
    const res = await apiClient.get<WorkspaceContract>(`/api/v1/workspace/${encodeURIComponent(chatId)}`, { signal });
    const data = unwrapApiData<WorkspaceContract>(res.data);
    if (!res.success || !data) throw workspaceApiError(res.message || 'Gagal memuat Workspace', res.status, res.code);
    return data;
  }

  static async updateWorkspace(chatId: string, payload: Partial<Pick<WorkspaceContract, 'name' | 'description' | 'instructions' | 'defaultModel' | 'defaultPreset'>>, signal?: AbortSignal): Promise<WorkspaceContract> {
    const res = await apiClient.put<WorkspaceContract>(`/api/v1/workspace/${encodeURIComponent(chatId)}`, payload, { signal });
    const data = unwrapApiData<WorkspaceContract>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Gagal menyimpan Workspace');
    return data;
  }

  static async createTask(chatId: string, title: string, source: WorkspaceTaskSource = 'user', signal?: AbortSignal): Promise<WorkspaceTaskContract> {
    const res = await apiClient.post<WorkspaceTaskContract>(`/api/v1/workspace/${encodeURIComponent(chatId)}/tasks`, { title, source }, { signal });
    const data = unwrapApiData<WorkspaceTaskContract>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Gagal membuat task');
    return data;
  }

  static async updateTask(chatId: string, taskId: string, status: WorkspaceTaskStatus, signal?: AbortSignal): Promise<WorkspaceTaskContract> {
    const res = await apiClient.put<WorkspaceTaskContract>(`/api/v1/workspace/${encodeURIComponent(chatId)}/tasks/${encodeURIComponent(taskId)}`, { status }, { signal });
    const data = unwrapApiData<WorkspaceTaskContract>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Gagal memperbarui task');
    return data;
  }

  static async deleteTask(chatId: string, taskId: string, signal?: AbortSignal): Promise<void> {
    const res = await apiClient.delete(`/api/v1/workspace/${encodeURIComponent(chatId)}/tasks/${encodeURIComponent(taskId)}`, { signal });
    if (!res.success) throw new Error(res.message || 'Gagal menghapus task');
  }

  static async fetchChatAttachments(chatId: string, signal?: AbortSignal): Promise<WorkspaceAttachmentDto[]> {
    const res = await apiClient.get<{ attachments?: WorkspaceAttachmentDto[] }>(
      `/api/v1/chat/${encodeURIComponent(chatId)}/attachments`, { signal }
    );
    const data = unwrapApiData<{ attachments?: WorkspaceAttachmentDto[] }>(res.data);
    if (!res.success || !Array.isArray(data?.attachments)) {
      throw workspaceApiError(res.message || 'Gagal memuat dokumen Workspace', res.status, res.code);
    }
    return data.attachments;
  }

  static async deleteAttachment(attachmentId: string, chatId?: string, signal?: AbortSignal): Promise<void> {
    const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
    const res = await apiClient.delete<{ message?: string }>(
      `/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}${query}`, { signal }
    );
    // A stale client can still hold an attachment that was removed in another tab.
    // Treat that already-absent state as the desired outcome of this delete action.
    if (!res.success && res.status !== 404) throw new Error(res.message || 'Gagal menghapus dokumen');
  }

  static async retryAttachment(attachmentId: string, chatId?: string, signal?: AbortSignal): Promise<WorkspaceAttachmentDto> {
    const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
    const res = await apiClient.post<{ attachment?: WorkspaceAttachmentDto }>(
      `/api/v1/chat/attachments/${encodeURIComponent(attachmentId)}/retry${query}`, {}, { signal }
    );
    const data = unwrapApiData<{ attachment?: WorkspaceAttachmentDto }>(res.data);
    if (!res.success || !data?.attachment) throw new Error(res.message || 'Gagal mencoba ulang pemrosesan dokumen.');
    return data.attachment;
  }

  /** Fetch artifacts belonging to one Workspace. A missing chat never falls back to the user library. */
  static async fetchArtifacts(chatId: string | undefined, signal?: AbortSignal): Promise<WorkspaceArtifact[]> {
    if (!chatId) return [];
    const url = `/api/v1/workspace/artifacts?chatId=${encodeURIComponent(chatId)}`;
    const res = await apiClient.get<any>(url, { signal });
    const data = unwrapApiData<WorkspaceArtifact[]>(res.data);
    if (res.success && Array.isArray(data)) {
      return data;
    }
    return [];
  }

  /** Explicit library operation for screens that intentionally list every user artifact. */
  static async fetchAllArtifacts(signal?: AbortSignal): Promise<WorkspaceArtifact[]> {
    const res = await apiClient.get<any>('/api/v1/workspace/artifacts/all', { signal });
    const data = unwrapApiData<WorkspaceArtifact[]>(res.data);
    if (res.success && Array.isArray(data)) return data;
    return [];
  }

  /** Fetch one chronological page of messages for a specific chat. */
  static async fetchMessagesPage(chatId: string, cursor?: string, signal?: AbortSignal): Promise<{ messages: Message[]; nextCursor: string | null }> {
    const params = new URLSearchParams({ limit: '50' });
    if (cursor) params.set('cursor', cursor);
    const res = await apiClient.get<any>(`/api/v1/chat/${encodeURIComponent(chatId)}/messages?${params.toString()}`, { signal });
    const payload = res.data;
    const messagesArray = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.data)
        ? payload.data.data
        : null;
    const rawCursor = payload?.nextCursor ?? payload?.data?.nextCursor;
    if (res.success && messagesArray) {
      return {
        messages: messagesArray,
        nextCursor: typeof rawCursor === 'string' && rawCursor.length > 0 ? rawCursor : null
      };
    }
    throw workspaceApiError(res.message || 'Gagal memuat percakapan Workspace', res.status, res.code);
  }

  /** Compatibility helper for callers that only need the first page of messages. */
  static async fetchMessages(chatId: string, signal?: AbortSignal): Promise<Message[]> {
    const page = await this.fetchMessagesPage(chatId, undefined, signal);
    return page.messages;
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
    const data = unwrapApiData<WorkspaceArtifact>(res.data);
    if (res.success && data) {
      return data;
    }
    return null;
  }

  /**
   * Update an existing artifact by ID
   */
  static async updateArtifact(id: string, payload: UpdateArtifactPayload, signal?: AbortSignal): Promise<WorkspaceArtifact | null> {
    const res = await apiClient.put<any>(`/api/v1/workspace/artifacts/${encodeURIComponent(id)}`, payload, { signal });
    const data = unwrapApiData<WorkspaceArtifact>(res.data);
    if (res.success && data) {
      return data;
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
    const data = unwrapApiData<WorkspaceArtifact>(res.data);

    if (res.success && data) {
      return data;
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
  // ==========================================
  // WORKSPACE MEMORY API (FASE 14)
  // ==========================================

  static async fetchWorkspaceMemories(chatId: string, signal?: AbortSignal): Promise<any[]> {
    const res = await apiClient.get<any[]>(`/api/v1/workspace/${encodeURIComponent(chatId)}/memories`, { signal });
    const data = unwrapApiData<any[]>(res.data);
    if (!res.success || !Array.isArray(data)) throw new Error(res.message || 'Memori workspace gagal dimuat.');
    return data;
  }

  static async createWorkspaceMemory(chatId: string, payload: { category: string; content: string; provenance?: string }, signal?: AbortSignal): Promise<any> {
    const res = await apiClient.post<any>(`/api/v1/workspace/${encodeURIComponent(chatId)}/memories`, payload, { signal });
    const data = unwrapApiData<any>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Memori workspace gagal disimpan.');
    return data;
  }

  static async updateWorkspaceMemory(chatId: string, memoryId: string, payload: { content?: string; category?: string; status?: string; isActive?: boolean }, signal?: AbortSignal): Promise<any> {
    const res = await apiClient.put<any>(`/api/v1/workspace/${encodeURIComponent(chatId)}/memories/${encodeURIComponent(memoryId)}`, payload, { signal });
    const data = unwrapApiData<any>(res.data);
    if (!res.success || !data) throw new Error(res.message || 'Memori workspace gagal diperbarui.');
    return data;
  }

  static async deleteWorkspaceMemory(chatId: string, memoryId: string, signal?: AbortSignal): Promise<void> {
    const res = await apiClient.delete<any>(`/api/v1/workspace/${encodeURIComponent(chatId)}/memories/${encodeURIComponent(memoryId)}`, { signal });
    if (!res.success) throw new Error(res.message || 'Memori workspace gagal dihapus.');
  }
}
