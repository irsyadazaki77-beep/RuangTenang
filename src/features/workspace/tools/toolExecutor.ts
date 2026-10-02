import { WorkspaceToolDefinition, WorkspaceToolExecutionPayload, WorkspaceToolExecutionResult } from './toolTypes';
import { WorkspaceToolRegistry } from './toolRegistry';
import { paraphraseAcademicText, ParaphraseStyle } from '../utils/paraphraseEngine';
import { generateBibTeX, generateRIS } from '../utils/citationExport';

export class WorkspaceToolExecutor {
  /**
   * Validasi payload tool sebelum dieksekusi
   */
  static validate(payload: WorkspaceToolExecutionPayload): { valid: boolean; error?: string; tool?: WorkspaceToolDefinition } {
    const { toolId, context } = payload;
    const tool = WorkspaceToolRegistry.getTool(toolId);

    if (!tool) {
      return { valid: false, error: `Tool "${toolId}" tidak ditemukan dalam registri Workspace` };
    }

    if (tool.requiresArtifact && !context.activeArtifact) {
      return { valid: false, error: `Tool "${tool.name}" memerlukan artefak dokumen yang aktif` };
    }

    if (tool.requiresSelection && !context.selectedText?.trim()) {
      return { valid: false, error: `Tool "${tool.name}" memerlukan teks yang disorot/dipilih terlebih dahulu` };
    }

    if (tool.supportedArtifactTypes && context.activeArtifact) {
      if (!tool.supportedArtifactTypes.includes(context.activeArtifact.type)) {
        return { 
          valid: false, 
          error: `Tool "${tool.name}" tidak mendukung tipe artefak ${context.activeArtifact.type}` 
        };
      }
    }

    return { valid: true, tool };
  }

  /**
   * Menjalankan tool lokal (non-AI utilities: export, sorting, static rules)
   */
  static async executeClientUtility(
    tool: WorkspaceToolDefinition,
    payload: WorkspaceToolExecutionPayload
  ): Promise<WorkspaceToolExecutionResult> {
    const { input, context } = payload;
    const artifact = context.activeArtifact;
    const content = context.selectedText || artifact?.content || '';

    // 1. Parafrase Akademis
    if (tool.id === 'academic_paraphrase') {
      const style = (input.style as ParaphraseStyle) || 'KONSERVATIF';
      const result = paraphraseAcademicText(content, style);
      return {
        success: true,
        toolId: tool.id,
        outputType: 'ARTIFACT_UPDATE',
        proposedContent: result.paraphrasedText,
        metadata: {
          readabilityScore: result.readabilityScore,
          changesCount: result.changesCount,
          originalWords: result.wordCountOriginal,
          paraphrasedWords: result.wordCountParaphrased
        }
      };
    }

    // 2. Pengurutan sitasi alfabetis
    if (tool.id === 'citation_sort_alphabetical') {
      const lines = content.split('\n');
      const headerLines: string[] = [];
      const citationLines: string[] = [];

      lines.forEach(l => {
        if (l.trim().startsWith('#') || l.trim().length === 0) {
          headerLines.push(l);
        } else {
          citationLines.push(l);
        }
      });

      citationLines.sort((a, b) => {
        // Strip markdown list bullets like '- ' or '[1] '
        const cleanA = a.replace(/^[-*•\d.[\]]+\s*/, '').trim();
        const cleanB = b.replace(/^[-*•\d.[\]]+\s*/, '').trim();
        return cleanA.localeCompare(cleanB, 'id-ID');
      });

      const sortedText = [...headerLines, ...citationLines].join('\n');
      return {
        success: true,
        toolId: tool.id,
        outputType: 'ARTIFACT_UPDATE',
        proposedContent: sortedText
      };
    }

    // 3. Ekspor BibTeX
    if (tool.id === 'citation_export_bibtex') {
      const bibtex = generateBibTeX(content, artifact?.title || 'Daftar Pustaka');
      return {
        success: true,
        toolId: tool.id,
        outputType: 'DOWNLOAD',
        downloadData: {
          filename: `${(artifact?.title || 'sitasi').toLowerCase().replace(/\s+/g, '_')}.bib`,
          mimeType: 'application/x-bibtex',
          content: bibtex
        }
      };
    }

    // 4. Ekspor RIS
    if (tool.id === 'citation_export_ris') {
      const ris = generateRIS(content, artifact?.title || 'Daftar Pustaka');
      return {
        success: true,
        toolId: tool.id,
        outputType: 'DOWNLOAD',
        downloadData: {
          filename: `${(artifact?.title || 'sitasi').toLowerCase().replace(/\s+/g, '_')}.ris`,
          mimeType: 'application/x-research-info-systems',
          content: ris
        }
      };
    }

    return {
      success: false,
      toolId: tool.id,
      outputType: tool.outputType,
      error: {
        code: 'EXECUTION_FAILED',
        message: `Eksekutor utilitas klien tidak mengenali tool ${tool.id}`
      }
    };
  }

  /**
   * Menyiapkan prompt terstandar untuk AI Execution
   */
  static prepareAiPrompt(tool: WorkspaceToolDefinition, payload: WorkspaceToolExecutionPayload): string {
    const { input, context } = payload;
    const targetText = context.selectedText || context.activeArtifact?.content || '';
    
    if (tool.promptTemplate) {
      return tool.promptTemplate(input, targetText);
    }

    // Default template jika tidak ada custom template
    return `${tool.description}:\n\n${targetText}`;
  }
}
