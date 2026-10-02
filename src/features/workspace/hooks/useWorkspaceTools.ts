import { useState, useCallback } from 'react';
import { 
  WorkspaceToolDefinition, 
  WorkspaceToolExecutionPayload, 
  WorkspaceToolExecutionResult, 
  WorkspaceToolContext 
} from '../tools/toolTypes';
import { WorkspaceToolExecutor } from '../tools/toolExecutor';
import { WorkspaceArtifact } from '../types';
import { useToast } from '../../../components/Toast';

interface UseWorkspaceToolsOptions {
  activeArtifact: WorkspaceArtifact | null;
  selectedModel?: string;
  presetId?: string;
  chatId?: string;
  onRequestAiExecution?: (prompt: string, tool: WorkspaceToolDefinition) => void;
  onUpdateArtifactContent?: (newContent: string) => void;
}

export function useWorkspaceTools({
  activeArtifact,
  selectedModel,
  presetId,
  chatId,
  onRequestAiExecution,
  onUpdateArtifactContent
}: UseWorkspaceToolsOptions) {
  const { showToast } = useToast();
  const [executingToolId, setExecutingToolId] = useState<string | null>(null);
  const [proposedResult, setProposedResult] = useState<WorkspaceToolExecutionResult | null>(null);
  const [selectedToolForInput, setSelectedToolForInput] = useState<WorkspaceToolDefinition | null>(null);

  const executeTool = useCallback(async (
    tool: WorkspaceToolDefinition,
    input: Record<string, any> = {},
    selectedText?: string
  ): Promise<WorkspaceToolExecutionResult> => {
    const context: WorkspaceToolContext = {
      activeArtifact: activeArtifact ? {
        id: activeArtifact.id,
        title: activeArtifact.title,
        type: activeArtifact.type,
        language: activeArtifact.language,
        content: activeArtifact.content,
        version: activeArtifact.version
      } : null,
      selectedText,
      chatId,
      selectedModel,
      presetId
    };

    const payload: WorkspaceToolExecutionPayload = {
      toolId: tool.id,
      input,
      context
    };

    // 1. Validation
    const validation = WorkspaceToolExecutor.validate(payload);
    if (!validation.valid) {
      const errResult: WorkspaceToolExecutionResult = {
        success: false,
        toolId: tool.id,
        outputType: tool.outputType,
        error: {
          code: 'INVALID_TOOL_INPUT',
          message: validation.error || 'Validasi tool gagal'
        }
      };
      showToast(errResult.error?.message || 'Validasi gagal', 'error');
      return errResult;
    }

    setExecutingToolId(tool.id);

    try {
      // 2. Client Utility Execution (Offline / Fast)
      if (tool.executionMode === 'client_utility' || tool.executionMode === 'export') {
        const result = await WorkspaceToolExecutor.executeClientUtility(tool, payload);
        if (result.success) {
          if (result.downloadData) {
            // Trigger browser download
            const blob = new Blob([result.downloadData.content], { type: `${result.downloadData.mimeType};charset=utf-8` });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.downloadData.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast(`Berkas ${result.downloadData.filename} berhasil diunduh`, 'success');
          } else if (result.proposedContent) {
            setProposedResult(result);
          }
        } else {
          showToast(result.error?.message || 'Gagal menjalankan aksi', 'error');
        }
        return result;
      }

      // 3. AI Execution (Streams through existing Workspace Chat/AI router)
      const prompt = WorkspaceToolExecutor.prepareAiPrompt(tool, payload);
      if (onRequestAiExecution) {
        onRequestAiExecution(prompt, tool);
      }

      return {
        success: true,
        toolId: tool.id,
        outputType: tool.outputType,
        text: prompt
      };
    } catch (err: any) {
      const errorResult: WorkspaceToolExecutionResult = {
        success: false,
        toolId: tool.id,
        outputType: tool.outputType,
        error: {
          code: 'EXECUTION_FAILED',
          message: err?.message || 'Terjadi kesalahan eksekusi tool'
        }
      };
      showToast(errorResult.error?.message || 'Eksekusi gagal', 'error');
      return errorResult;
    } finally {
      setExecutingToolId(null);
    }
  }, [activeArtifact, chatId, selectedModel, presetId, onRequestAiExecution, showToast]);

  const applyProposedResult = useCallback(() => {
    if (proposedResult?.proposedContent && onUpdateArtifactContent) {
      onUpdateArtifactContent(proposedResult.proposedContent);
      showToast('Perubahan berhasil diterapkan ke artefak', 'success');
      setProposedResult(null);
    }
  }, [proposedResult, onUpdateArtifactContent, showToast]);

  const discardProposedResult = useCallback(() => {
    setProposedResult(null);
  }, []);

  return {
    executingToolId,
    proposedResult,
    selectedToolForInput,
    setSelectedToolForInput,
    executeTool,
    applyProposedResult,
    discardProposedResult
  };
}
