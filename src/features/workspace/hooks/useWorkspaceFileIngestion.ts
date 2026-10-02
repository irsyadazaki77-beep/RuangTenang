import { useState, useRef, useCallback, useEffect } from 'react';
import { WorkspaceFileAttachment } from '../types.js';
import { processFileForWorkspace } from '../services/fileIngestionService.js';
import { useToast } from '../../../components/Toast';

export function useWorkspaceFileIngestion(chatId?: string) {
  const { showToast } = useToast();
  const [attachedFile, setAttachedFile] = useState<WorkspaceFileAttachment | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleProcessFile = useCallback(async (file: File) => {
    // Cancel previous ongoing ingestion if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    // Optimistic chip indicator during upload & server processing
    setAttachedFile({
      name: file.name,
      size: file.size,
      mimeType: file.type,
      status: 'uploading'
    });

    const result = await processFileForWorkspace(file, chatId, ac.signal);
    
    // Guard against unmounted state update
    if (!isMountedRef.current || ac.signal.aborted) {
      return;
    }

    if (!result.valid) {
      setAttachedFile({
        name: file.name,
        size: file.size,
        mimeType: file.type,
        status: 'failed',
        errorMessage: result.message || 'Dokumen belum selesai diproses. Coba pilih file lagi.'
      });
      showToast(result.message || 'Gagal memproses berkas.', 'error');
      return;
    }

    if (result.file) {
      setAttachedFile(result.file);
      const meta = result.file.pageCount 
        ? ` (${result.file.pageCount} halaman)` 
        : result.file.slideCount 
          ? ` (${result.file.slideCount} slide)` 
          : result.file.sheetCount 
            ? ` (${result.file.sheetCount} sheet)` 
            : '';
      showToast(`Dokumen "${result.file.name}" siap dianalisis${meta}`, 'info');
    }
  }, [chatId, showToast]);

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
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setAttachedFile(prev => {
      if (prev?.url && prev.url.startsWith('blob:')) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
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
