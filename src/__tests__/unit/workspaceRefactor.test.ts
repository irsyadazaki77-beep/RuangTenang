import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  processFileForWorkspace, 
  validateFileHeader, 
  isTextBasedFile, 
  MAX_FILE_SIZE_BYTES 
} from '../../features/workspace/services/fileIngestionService';
import { useAcademicDistress } from '../../features/workspace/hooks/useAcademicDistress';
import { useWorkspaceTemplates } from '../../features/workspace/hooks/useWorkspaceTemplates';
import { parseArtifactsFromText } from '../../features/workspace/utils/artifactParser';

describe('Workspace Refactor - Services & Hooks Domain Tests', () => {
  describe('fileIngestionService', () => {
    it('correctly identifies text-based files by extension and mime-type', () => {
      expect(isTextBasedFile('script.py')).toBe(true);
      expect(isTextBasedFile('document.md')).toBe(true);
      expect(isTextBasedFile('data.csv', 'text/csv')).toBe(true);
      expect(isTextBasedFile('config.json', 'application/json')).toBe(true);
      expect(isTextBasedFile('report.pdf', 'application/pdf')).toBe(false);
      expect(isTextBasedFile('image.png', 'image/png')).toBe(false);
    });

    it('rejects files larger than 5MB', () => {
      const oversizedFile = new File(['x'.repeat(10)], 'huge.txt', { type: 'text/plain' });
      Object.defineProperty(oversizedFile, 'size', { value: MAX_FILE_SIZE_BYTES + 100 });

      const validation = validateFileHeader(oversizedFile);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('TOO_LARGE');
    });

    it('processes text file safely', async () => {
      const content = 'console.log("Hello RuangKerja");';
      const file = new File([content], 'test.js', { type: 'text/javascript' });

      const result = await processFileForWorkspace(file);
      expect(result.valid).toBe(true);
      expect(result.file?.name).toBe('test.js');
      expect(result.file?.isText).toBe(true);
      expect(result.file?.content).toBe(content);
    });

    it('handles non-plain text document boundary gracefully without reading raw binary garbage', async () => {
      const dummyBinary = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
      const file = new File([dummyBinary], 'skripsi.pdf', { type: 'application/pdf' });

      const result = await processFileForWorkspace(file);
      expect(result.valid).toBe(true);
      expect(result.file?.name).toBe('skripsi.pdf');
      expect(result.file?.isText).toBe(false);
      expect(result.file?.content).toContain('[Berkas Dokumen: skripsi.pdf');
    });
  });

  describe('useAcademicDistress hook', () => {
    it('detects academic distress from input text and allows dismissal', () => {
      const { result, rerender } = renderHook(({ text }) => useAcademicDistress(text), {
        initialProps: { text: 'Tolong bantu saya' }
      });

      expect(result.current.distressResult.isDistressed).toBe(false);

      // Rerender with distress keyword
      rerender({ text: 'Saya panik overthinking skripsi revisi mulu' });
      expect(result.current.distressResult.isDistressed).toBe(true);

      // Dismiss distress banner
      act(() => {
        result.current.dismissDistress();
      });
      expect(result.current.isDistressDismissed).toBe(true);
    });

    it('opens and closes breathing modal', () => {
      const { result } = renderHook(() => useAcademicDistress(''));

      expect(result.current.isBreathingModalOpen).toBe(false);

      act(() => {
        result.current.openBreathingModal();
      });
      expect(result.current.isBreathingModalOpen).toBe(true);

      act(() => {
        result.current.closeBreathingModal();
      });
      expect(result.current.isBreathingModalOpen).toBe(false);
    });
  });

  describe('useWorkspaceTemplates hook', () => {
    it('listens to custom template triggers with proper event listener cleanup', () => {
      const { result, unmount } = renderHook(() => useWorkspaceTemplates());

      expect(result.current.selectedTemplateForModal).toBeNull();

      // Trigger custom event
      act(() => {
        window.dispatchEvent(new CustomEvent('ruangkerja_trigger_template', { detail: 'resume-jurnal' }));
      });

      expect(result.current.selectedTemplateForModal).not.toBeNull();
      expect(result.current.selectedTemplateForModal?.id).toBe('resume-jurnal');

      act(() => {
        result.current.closeTemplateModal();
      });
      expect(result.current.selectedTemplateForModal).toBeNull();

      unmount();
    });
  });

  describe('artifactParser state machine immunity', () => {
    it('prevents duplicate artifact creation and respects streaming token engine', () => {
      const streamingContent = `<artifact type="document" title="Draf Bab 1">\n# Bab 1\nLatar belakang...`;
      const { activeStreamingArtifact, artifacts } = parseArtifactsFromText(streamingContent, true);

      expect(activeStreamingArtifact).not.toBeNull();
      expect(activeStreamingArtifact?.title).toBe('Draf Bab 1');
      expect(artifacts).toHaveLength(0);

      const completedContent = `${streamingContent}\n</artifact>`;
      const { activeStreamingArtifact: completedStreaming, artifacts: completedArtifacts } = parseArtifactsFromText(completedContent, false);

      expect(completedStreaming).toBeNull();
      expect(completedArtifacts).toHaveLength(1);
      expect(completedArtifacts[0].title).toBe('Draf Bab 1');
    });
  });
});
