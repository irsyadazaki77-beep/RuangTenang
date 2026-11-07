import { WorkspaceToolDefinition, WorkspaceToolExecutionPayload, WorkspaceToolExecutionResult } from './toolTypes';
import { WorkspaceToolRegistry } from './toolRegistry';
import { paraphraseAcademicText, ParaphraseStyle } from '../utils/paraphraseEngine';
import { generateBibTeX, generateRIS } from '../utils/citationExport';
import { auditInTextCitations, auditChapterCoherence, generateLiteratureMatrixTemplate } from '../utils/academicAuditTools';

export class WorkspaceToolExecutor {
  /**
   * Validasi payload tool sebelum dieksekusi
   */
  static validate(payload: WorkspaceToolExecutionPayload): { valid: boolean; error?: string; tool?: WorkspaceToolDefinition } {
    if (!payload || typeof payload !== 'object' || !payload.context || !payload.input || typeof payload.input !== 'object' || Array.isArray(payload.input)) {
      return { valid: false, error: 'Data konfigurasi tool tidak valid' };
    }
    const { toolId, context, input } = payload;
    const tool = WorkspaceToolRegistry.getTool(toolId);

    if (!tool) {
      return { valid: false, error: `Tool "${toolId}" tidak ditemukan dalam registri Workspace` };
    }

    if (tool.requiresArtifact && !context.activeArtifact) {
      return { valid: false, error: `Tool "${tool.name}" memerlukan artefak dokumen yang aktif` };
    }

    for (const field of tool.inputSchema ?? []) {
      const value = input[field.name];
      if (value === undefined || value === null || value === '') {
        if (field.required) return { valid: false, error: `Input "${field.label}" wajib diisi` };
        continue;
      }
      if (field.type === 'string' && typeof value !== 'string') return { valid: false, error: `Input "${field.label}" harus berupa teks` };
      if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) return { valid: false, error: `Input "${field.label}" harus berupa angka yang valid` };
      if (field.type === 'boolean' && typeof value !== 'boolean') return { valid: false, error: `Input "${field.label}" harus berupa ya/tidak` };
      if (field.type === 'enum' && (typeof value !== 'string' || !field.options?.some(option => option.value === value))) {
        return { valid: false, error: `Pilihan "${field.label}" tidak valid` };
      }
    }

    const allowedFields = new Set((tool.inputSchema ?? []).map(field => field.name));
    if (Object.keys(input).some(key => !allowedFields.has(key))) {
      return { valid: false, error: 'Payload berisi parameter yang tidak dikenali tool ini' };
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

    // 1. Editor akademik lokal
    if (tool.id === 'academic_paraphrase') {
      const style = (input.style as ParaphraseStyle) || 'KONSERVATIF';
      if (style === 'RESTRUKTURISASI') {
        return {
          success: false,
          toolId: tool.id,
          outputType: 'ARTIFACT_UPDATE',
          error: {
            code: 'TOOL_UNAVAILABLE',
            message: 'Restrukturisasi belum tersedia di mode lokal. Pilih Konservatif atau Sintesis Ringkas.'
          }
        };
      }
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

    // 5. Audit Sitasi In-Text vs Daftar Pustaka (F3.7)
    if (tool.id === 'academic_citation_intext_audit') {
      const audit = auditInTextCitations(content);
      let outputText = `### 📋 Hasil Audit Sitasi In-Text vs Daftar Pustaka\n\n`;
      outputText += `- **Total Sitasi In-Text Ditemukan:** ${audit.inTextCitations.length} kutipan (${audit.uniqueAuthors.length} penulis unik)\n`;
      outputText += `- **Status Bagian Daftar Pustaka:** ${audit.hasBibliographySection ? `✅ Ditemukan (${audit.bibliographyEntriesCount} entri)` : '❌ Belum Ditemukan'}\n`;
      outputText += `- **Sitasi Tervalidasi Konsisten:** ${audit.matchedCount} / ${audit.uniqueAuthors.length}\n\n`;

      if (audit.unmatchedInText.length > 0) {
        outputText += `#### ⚠️ Sitasi di Naskah yang Belum Tercantum di Daftar Pustaka:\n`;
        audit.unmatchedInText.forEach(a => {
          outputText += `- \`${a}\`\n`;
        });
        outputText += `\n`;
      }

      if (audit.suggestions.length > 0) {
        outputText += `#### 💡 Rekomendasi Perbaikan:\n`;
        audit.suggestions.forEach(s => {
          outputText += `- ${s}\n`;
        });
      }

      return {
        success: true,
        toolId: tool.id,
        outputType: 'TEXT',
        proposedContent: outputText,
        metadata: {
          inTextCount: audit.inTextCitations.length,
          matchedCount: audit.matchedCount,
          unmatchedCount: audit.unmatchedInText.length
        }
      };
    }

    // 6. Audit Konsistensi Antar-Bab Skripsi (F3.7)
    if (tool.id === 'academic_chapter_coherence') {
      const audit = auditChapterCoherence(content, artifact?.chapterScope);
      let outputText = `### ⚖️ Laporan Audit Konsistensi Antar-Bab Skripsi\n\n`;
      outputText += `- **Skor Koherensi Keseluruhan:** **${audit.coherenceScore}/100**\n`;
      outputText += `- **Penilaian:** ${audit.overallAssessment}\n\n`;
      outputText += `#### 📑 Deteksi Cakupan Bab:\n`;
      outputText += `- Bab 1 (Pendahuluan): ${audit.chapterCoverage.BAB_1 ? '✅ Ada' : '⚪ Belum terdeteksi'}\n`;
      outputText += `- Bab 2 (Tinjauan Pustaka): ${audit.chapterCoverage.BAB_2 ? '✅ Ada' : '⚪ Belum terdeteksi'}\n`;
      outputText += `- Bab 3 (Metodologi): ${audit.chapterCoverage.BAB_3 ? '✅ Ada' : '⚪ Belum terdeteksi'}\n`;
      outputText += `- Bab 4 (Hasil & Pembahasan): ${audit.chapterCoverage.BAB_4 ? '✅ Ada' : '⚪ Belum terdeteksi'}\n`;
      outputText += `- Bab 5 (Kesimpulan): ${audit.chapterCoverage.BAB_5 ? '✅ Ada' : '⚪ Belum terdeteksi'}\n\n`;

      if (audit.issues.length > 0) {
        outputText += `#### ⚠️ Temuan & Kesenjangan Logis:\n`;
        audit.issues.forEach((issue, idx) => {
          const badge = issue.severity === 'CRITICAL' ? '🚨 [KRITIS]' : issue.severity === 'WARNING' ? '⚠️ [PERINGATAN]' : '💡 [SARAN]';
          outputText += `${idx + 1}. **${badge} ${issue.title}** (${issue.chapter})\n`;
          outputText += `   - *Deskripsi:* ${issue.description}\n`;
          outputText += `   - *Rekomendasi:* ${issue.recommendation}\n\n`;
        });
      } else {
        outputText += `✅ Tidak ditemukan diskoneksi kritis antara rumusan masalah, metodologi, dan kesimpulan.\n`;
      }

      return {
        success: true,
        toolId: tool.id,
        outputType: 'TEXT',
        proposedContent: outputText,
        metadata: {
          coherenceScore: audit.coherenceScore,
          issuesCount: audit.issues.length
        }
      };
    }

    // 7. Generator Matriks Literatur Riset (F3.7)
    if (tool.id === 'academic_lit_matrix_builder') {
      const template = generateLiteratureMatrixTemplate();
      return {
        success: true,
        toolId: tool.id,
        outputType: 'ARTIFACT_CREATE',
        proposedContent: template,
        metadata: {
          artifactType: 'TABLE',
          title: 'Matriks Sintesis Literatur'
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
