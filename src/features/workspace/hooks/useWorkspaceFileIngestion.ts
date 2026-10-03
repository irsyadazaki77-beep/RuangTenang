import { useState, useRef, useCallback, useEffect } from 'react';
import { WorkspaceFileAttachment } from '../types.js';
import { pollProcessingStatus, processFileForWorkspace, retryWorkspaceFile, validateFileHeader } from '../services/fileIngestionService.js';
import { WorkspaceApiService } from '../services/workspaceApiService.js';
import { WorkspaceAttachmentDto } from '../services/workspaceApiService.js';
import { MAX_WORKSPACE_ACTIVE_ATTACHMENTS } from '../../../../shared/contracts/files.js';
import { useToast } from '../../../components/Toast';

const MAX_CONCURRENT_UPLOADS = 3;
interface QueuedUpload { clientId: string; file: File; retry?: boolean }

function fromDto(dto: WorkspaceAttachmentDto): WorkspaceFileAttachment {
  return {
    id: dto.id,
    clientId: dto.id,
    name: dto.filename,
    mimeType: dto.mimeType,
    fileKind: dto.fileKind,
    size: dto.size,
    status: dto.status === 'ready' ? 'ready' : dto.status === 'processing' || dto.status === 'pending' ? 'processing' : 'failed',
    errorMessage: dto.errorMessage,
    checksum: dto.checksum,
    pageCount: dto.pageCount,
    slideCount: dto.slideCount,
    sheetCount: dto.sheetCount,
    url: dto.url,
    createdAt: dto.createdAt
  };
}

export function useWorkspaceFileIngestion(chatId?: string) {
  const { showToast } = useToast();
  const [attachments, setAttachments] = useState<WorkspaceFileAttachment[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<WorkspaceFileAttachment[]>([]);
  const controllersRef = useRef(new Map<string, AbortController>());
  const deletingAttachmentsRef = useRef(new Set<string>());
  const filesRef = useRef(new Map<string, File>());
  const queueRef = useRef<QueuedUpload[]>([]);
  const activeUploadsRef = useRef(0);
  const isMountedRef = useRef(true);
  const showToastRef = useRef(showToast);
  const pumpQueueRef = useRef<() => void>(() => undefined);
  showToastRef.current = showToast;

  const updateAttachments = useCallback((updater: (current: WorkspaceFileAttachment[]) => WorkspaceFileAttachment[]) => {
    const next = updater(attachmentsRef.current);
    attachmentsRef.current = next;
    if (isMountedRef.current) setAttachments(next);
  }, []);

  const performUpload = useCallback(async (item: QueuedUpload, controller: AbortController) => {
    const current = attachmentsRef.current.find(attachment => (attachment.clientId || attachment.id) === item.clientId);
    if (!current) return;
    updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === item.clientId
      ? { ...attachment, status: 'uploading', errorMessage: undefined }
      : attachment));

    const result = item.retry && current.id
      ? await retryWorkspaceFile(current.id, controller.signal)
      : await processFileForWorkspace(item.file, chatId, controller.signal, () => updateAttachments(list => list.map(attachment =>
          (attachment.clientId || attachment.id) === item.clientId ? { ...attachment, status: 'processing' } : attachment
        )));

    if (!isMountedRef.current || controller.signal.aborted) {
      if (result.valid && result.file?.id && !deletingAttachmentsRef.current.has(item.clientId)) {
        void WorkspaceApiService.deleteAttachment(result.file.id).catch(error => console.warn('[Workspace] Orphaned upload cleanup failed:', error));
      }
      return;
    }

    controllersRef.current.delete(item.clientId);
    if (!result.valid || !result.file) {
      updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === item.clientId
        ? {
            ...attachment,
            ...(result.file || {}),
            clientId: item.clientId,
            status: 'failed',
            errorMessage: result.message || result.file?.errorMessage || 'Dokumen gagal diproses.'
          }
        : attachment));
      showToastRef.current(result.message || 'Gagal memproses dokumen.', 'error');
      return;
    }

    updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === item.clientId
      ? { ...result.file!, clientId: item.clientId, status: 'ready', createdAt: attachment.createdAt || new Date().toISOString() }
      : attachment));
    const meta = result.file.pageCount ? ` (${result.file.pageCount} halaman)`
      : result.file.slideCount ? ` (${result.file.slideCount} slide)`
        : result.file.sheetCount ? ` (${result.file.sheetCount} sheet)` : '';
    showToastRef.current(`Dokumen "${result.file.name}" siap dianalisis${meta}`, 'info');
  }, [chatId, updateAttachments]);

  const pumpQueue = useCallback(() => {
    while (activeUploadsRef.current < MAX_CONCURRENT_UPLOADS && queueRef.current.length > 0) {
      const item = queueRef.current.shift();
      if (!item || !attachmentsRef.current.some(attachment => (attachment.clientId || attachment.id) === item.clientId)) continue;
      const controller = new AbortController();
      controllersRef.current.set(item.clientId, controller);
      activeUploadsRef.current += 1;
      void performUpload(item, controller).finally(() => {
        activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
        pumpQueueRef.current();
      });
    }
  }, [performUpload]);
  pumpQueueRef.current = pumpQueue;

  const queueUpload = useCallback((file: File, clientId: string, retry = false) => {
    if (controllersRef.current.has(clientId) || queueRef.current.some(item => item.clientId === clientId)) return;
    filesRef.current.set(clientId, file);
    queueRef.current.push({ clientId, file, retry });
    updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === clientId
      ? { ...attachment, status: 'uploading', errorMessage: undefined }
      : attachment));
    pumpQueue();
  }, [pumpQueue, updateAttachments]);

  const handleProcessFiles = useCallback((files: File[]) => {
    for (const file of files) {
      const active = attachmentsRef.current;
      if (active.length >= MAX_WORKSPACE_ACTIVE_ATTACHMENTS) {
        showToastRef.current(`Maksimal ${MAX_WORKSPACE_ACTIVE_ATTACHMENTS} dokumen aktif dalam satu Ruang Kerja.`, 'error');
        break;
      }
      if (active.some(item => item.name.toLocaleLowerCase() === file.name.toLocaleLowerCase() && item.size === file.size)) {
        showToastRef.current(`Dokumen "${file.name}" sudah ada di Ruang Kerja.`, 'info');
        continue;
      }

      const clientId = crypto.randomUUID();
      const validation = validateFileHeader(file);
      const attachment: WorkspaceFileAttachment = {
        clientId,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        status: validation.valid ? 'uploading' : 'failed',
        errorMessage: validation.valid ? undefined : validation.message,
        createdAt: new Date().toISOString()
      };
      updateAttachments(current => [...current, attachment]);
      if (!validation.valid) {
        showToastRef.current(validation.message || 'Format dokumen tidak didukung.', 'error');
        continue;
      }
      queueUpload(file, clientId);
    }
  }, [queueUpload, updateAttachments]);

  const handleFileUploadChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length) handleProcessFiles(files);
    event.target.value = '';
  }, [handleProcessFiles]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDraggingOver(false), []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(false);
    handleProcessFiles(Array.from(event.dataTransfer.files || []));
  }, [handleProcessFiles]);

  const removeAttachment = useCallback(async (target: WorkspaceFileAttachment) => {
    const key = target.clientId || target.id;
    if (!key) return;
    const serverId = target.id;
    if (serverId) deletingAttachmentsRef.current.add(key);
    controllersRef.current.get(key)?.abort();
    controllersRef.current.delete(key);
    queueRef.current = queueRef.current.filter(item => item.clientId !== key);
    if (serverId) {
      try {
        await WorkspaceApiService.deleteAttachment(serverId);
      } catch (error) {
        console.error('[Workspace] Attachment deletion failed:', error);
        updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === key
          ? { ...attachment, status: attachment.status === 'uploading' || attachment.status === 'processing' ? 'failed' : attachment.status, errorMessage: 'Dokumen gagal dihapus.' }
          : attachment));
        deletingAttachmentsRef.current.delete(key);
        showToastRef.current('Dokumen gagal dihapus. Dokumen masih aktif.', 'error');
        return;
      }
    }
    filesRef.current.delete(key);
    updateAttachments(list => list.filter(attachment => (attachment.clientId || attachment.id) !== key));
    deletingAttachmentsRef.current.delete(key);
  }, [updateAttachments]);

  const retryAttachment = useCallback((target: WorkspaceFileAttachment) => {
    const key = target.clientId || target.id;
    if (!key || target.status !== 'failed') return;
    const localFile = filesRef.current.get(key);
    if (localFile) {
      queueUpload(localFile, key);
    } else if (target.id) {
      queueRef.current.push({ clientId: key, file: new File([], target.name), retry: true });
      pumpQueue();
    } else {
      showToastRef.current('Pilih ulang dokumen sumber untuk mencoba pemrosesan.', 'error');
    }
  }, [pumpQueue, queueUpload]);

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    const requestControllers = controllersRef.current;
    const deletingAttachments = deletingAttachmentsRef.current;
    const localFiles = filesRef.current;
    let active = true;
    attachmentsRef.current = [];
    setAttachments([]);
    if (chatId) {
      void WorkspaceApiService.fetchChatAttachments(chatId, controller.signal).then(serverAttachments => {
        if (!active || !isMountedRef.current) return;
        const localAttachments = attachmentsRef.current.filter(attachment => !attachment.id);
        const mapped = serverAttachments.map(fromDto);
        const seen = new Set(mapped.map(attachment => `${attachment.name.toLocaleLowerCase()}:${attachment.size}`));
        const merged = [...mapped, ...localAttachments.filter(attachment => !seen.has(`${attachment.name.toLocaleLowerCase()}:${attachment.size}`))];
        attachmentsRef.current = merged;
        setAttachments(merged);
        for (const attachment of mapped.filter(item => item.status === 'processing' && item.id)) {
          const statusController = new AbortController();
          controllersRef.current.set(attachment.id!, statusController);
          void pollProcessingStatus(attachment.id!, 15, 800, statusController.signal).then(result => {
            if (!active || statusController.signal.aborted) return;
            if (result.attachment) {
              const updated = fromDto(result.attachment);
              updateAttachments(list => list.map(item => item.id === updated.id ? updated : item));
            } else {
              updateAttachments(list => list.map(item => item.id === attachment.id
                ? { ...item, status: 'failed', errorMessage: result.errorMessage || 'Pemrosesan dokumen melebihi batas waktu.' }
                : item));
              showToastRef.current(result.errorMessage || 'Pemrosesan dokumen gagal.', 'error');
            }
          }).finally(() => controllersRef.current.delete(attachment.id!));
        }
      }).catch(error => {
        if (!controller.signal.aborted) {
          console.error('[Workspace] Attachment list fetch failed:', error);
          showToastRef.current('Dokumen Workspace gagal dimuat.', 'error');
        }
      });
    }
    return () => {
      active = false;
      controller.abort();
      for (const request of requestControllers.values()) request.abort();
      requestControllers.clear();
      deletingAttachments.clear();
      queueRef.current = [];
      localFiles.clear();
    };
  }, [chatId, updateAttachments]);

  return {
    attachments,
    isDraggingOver,
    fileInputRef,
    handleFileUploadChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachment,
    retryAttachment,
    openFilePicker
  };
}
