import { WorkspaceToolDefinition, WorkspaceToolCategory } from './toolTypes';
import { WORKSPACE_TOOL_DEFINITIONS } from './toolDefinitions';
import { ArtifactType } from '../types';

export class WorkspaceToolRegistry {
  private static tools: Map<string, WorkspaceToolDefinition> = new Map(
    WORKSPACE_TOOL_DEFINITIONS.map(tool => [tool.id, tool])
  );

  /**
   * Mendapatkan definisi tool berdasarkan ID kanonikal
   */
  static getTool(id: string): WorkspaceToolDefinition | undefined {
    return this.tools.get(id);
  }

  /**
   * Mengambil semua tool terdaftar
   */
  static getAllTools(): WorkspaceToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Filter tool berdasarkan kategori
   */
  static getToolsByCategory(category: WorkspaceToolCategory): WorkspaceToolDefinition[] {
    return this.getAllTools().filter(t => t.category === category);
  }

  /**
   * Filter tool berdasarkan tipe artefak aktif
   */
  static getToolsForArtifact(artifactType?: ArtifactType | null): WorkspaceToolDefinition[] {
    if (!artifactType) {
      // Jika tidak ada artefak aktif, ambil tool yang tidak memerlukan artefak
      return this.getAllTools().filter(t => !t.requiresArtifact);
    }

    return this.getAllTools().filter(t => 
      !t.supportedArtifactTypes || t.supportedArtifactTypes.includes(artifactType)
    );
  }

  /**
   * Memeriksa apakah tool ID terdaftar
   */
  static hasTool(id: string): boolean {
    return this.tools.has(id);
  }

  /**
   * Menambahkan tool kustom secara dinamis (extensibility)
   */
  static registerTool(tool: WorkspaceToolDefinition): void {
    this.tools.set(tool.id, tool);
  }
}
