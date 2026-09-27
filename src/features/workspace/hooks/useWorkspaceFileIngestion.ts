import { useState, useRef, useCallback } from 'react';
import { WorkspaceFileAttachment } from '../types';
import { processFileForWorkspace } from '../services/fileIngestionService';
import { useToast } from '../../../components/Toast';

export function useWorkspaceFileIngestion() {
  const { showToast } = useToast();
  const [attachedFile, setAttachedFile] = useState<WorkspaceFileAttachment | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = useCallback(async (file: File) => {
    const result = await processFileForWorkspace(file);
    if (!result.valid) {
      showToast(result.message || 'Gagal memproses berkas.', 'error');
      return;
    }

    if (result.file) {
      setAttachedFile(result.file);
      showToast(`Dokumen "${result.file.name}" dilampirkan`, 'info');
    }
  }, [showToast]);

  const handleFileUploadChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessFile(file);
    e.target.value = '';
  }, [handleProcessFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  }, [handleProcessFile]);

  const removeAttachedFile = useCallback(() => {
    setAttachedFile(null);
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    attachedFile,
    setAttachedFile,
    isDraggingOver,
    fileInputRef,
    handleFileUploadChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachedFile,
    openFilePicker
  };
}
