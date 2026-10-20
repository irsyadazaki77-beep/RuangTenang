import { useCallback, useRef, useState } from 'react';
import type { WorkspaceArtifact } from '../types';
import { DEFAULT_WELCOME_ARTIFACT_ID } from '../constants/workspaceConstants';
import { WorkspaceToolExecutor } from '../tools/toolExecutor';
import type { WorkspaceToolDefinition, WorkspaceToolExecutionPayload } from '../tools/toolTypes';
import { useToast } from '../../../components/Toast';

interface WorkspaceToolTarget {
  artifactId: string;
  text: string;
}

interface PendingWorkspaceTool {
  tool: WorkspaceToolDefinition;
  artifact: WorkspaceArtifact | null;
  selectedText?: string;
}

interface UseWorkspaceToolsOptions {
  activeArtifact: WorkspaceArtifact | null;
  selection?: WorkspaceToolTarget | null;
  selectedModel: string;
  presetId?: string;
  chatId?: string;
  onRequestAiExecution: (prompt: string, tool: WorkspaceToolDefinition) => boolean | void;
  onRequestRevision: (prompt: string, artifact: WorkspaceArtifact) => void;
  onUpdateArtifactContent: (content: string, artifact: WorkspaceArtifact) => Promise<WorkspaceArtifact | undefined>;
}

export function useWorkspaceTools({
  activeArtifact,
  selection,
  selectedModel,
  presetId,
  chatId,
  onRequestAiExecution,
  onRequestRevision,
  onUpdateArtifactContent
}: UseWorkspaceToolsOptions) {
  const { showToast } = useToast();
  const [pendingTool, setPendingTool] = useState<PendingWorkspaceTool | null>(null);
  const executingToolRef = useRef(false);

  const executeTool = useCallback(async (
    tool: WorkspaceToolDefinition,
    input: Record<string, unknown> = {},
    artifact: WorkspaceArtifact | null = activeArtifact,
    selectedText?: string
  ): Promise<boolean> => {
    if (executingToolRef.current) return false;
    const usableArtifact = artifact && artifact.id !== DEFAULT_WELCOME_ARTIFACT_ID ? artifact : null;
    const capturedSelection = selectedText ?? (
      usableArtifact && selection?.artifactId === usableArtifact.id ? selection.text : undefined
    );
    const payload: WorkspaceToolExecutionPayload = {
      toolId: tool.id,
      input,
      context: {
        activeArtifact: usableArtifact ? {
          id: usableArtifact.id,
          title: usableArtifact.title,
          type: usableArtifact.type,
          language: usableArtifact.language,
          content: usableArtifact.content,
          version: usableArtifact.version
        } : null,
        selectedText: capturedSelection,
        chatId,
        selectedModel,
        presetId
      }
    };
    const validation = WorkspaceToolExecutor.validate(payload);
    if (!validation.valid) {
      showToast(validation.error || 'Konfigurasi tool tidak valid.', 'error');
      return false;
    }

    executingToolRef.current = true;
    try {
      if (tool.executionMode === 'client_utility' || tool.executionMode === 'export') {
        const result = await WorkspaceToolExecutor.executeClientUtility(tool, payload);
        if (!result.success) throw new Error(result.error?.message || 'Tool gagal dijalankan.');
        if (result.downloadData) {
          const blob = new Blob([result.downloadData.content], { type: `${result.downloadData.mimeType};charset=utf-8` });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = result.downloadData.filename;
          document.body.appendChild(link);
          try {
            link.click();
          } finally {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
          showToast(`Berkas ${result.downloadData.filename} berhasil diunduh.`, 'success');
        } else if (result.proposedContent !== undefined && usableArtifact) {
          const saved = await onUpdateArtifactContent(result.proposedContent, usableArtifact);
          if (!saved) throw new Error('Perubahan belum berhasil disimpan ke Canvas.');
          showToast(saved.persistenceStatus === 'local'
            ? `Aksi "${tool.name}" diterapkan ke draf lokal.`
            : `Aksi "${tool.name}" berhasil diterapkan. Versi sebelumnya tersimpan.`, saved.persistenceStatus === 'local' ? 'info' : 'success');
        }
        return true;
      }

      const prompt = WorkspaceToolExecutor.prepareAiPrompt(tool, payload);
      if (tool.outputType === 'TEXT' || !usableArtifact) {
        return onRequestAiExecution(prompt, tool) !== false;
      }
      onRequestRevision(prompt, usableArtifact);
      return true;
    } catch (error) {
      console.warn(`[WorkspaceTool:${tool.id}] Execution failed:`, error);
      showToast(error instanceof Error ? error.message : 'Tool gagal dijalankan.', 'error');
      return false;
    } finally {
      executingToolRef.current = false;
    }
  }, [activeArtifact, chatId, onRequestAiExecution, onRequestRevision, onUpdateArtifactContent, presetId, selectedModel, selection, showToast]);

  const selectWorkspaceTool = useCallback((tool: WorkspaceToolDefinition, artifact?: WorkspaceArtifact | null) => {
    const targetArtifact = artifact === undefined ? activeArtifact : artifact;
    const usableArtifact = targetArtifact?.id === DEFAULT_WELCOME_ARTIFACT_ID ? null : targetArtifact;
    const selectedText = usableArtifact && selection?.artifactId === usableArtifact.id ? selection.text : undefined;
    if (tool.inputSchema?.length) {
      setPendingTool({ tool, artifact: usableArtifact, selectedText });
      return;
    }
    void executeTool(tool, {}, usableArtifact, selectedText);
  }, [activeArtifact, executeTool, selection]);

  const cancelPendingTool = useCallback(() => setPendingTool(null), []);

  const executePendingTool = useCallback((input: Record<string, unknown>) => {
    const selected = pendingTool;
    setPendingTool(null);
    if (selected) void executeTool(selected.tool, input, selected.artifact, selected.selectedText);
  }, [executeTool, pendingTool]);

  return {
    pendingTool,
    selectWorkspaceTool,
    executePendingTool,
    cancelPendingTool
  };
}
