import { useState, useRef, useCallback, useEffect } from 'react';
import { WorkspaceFileAttachment } from '../types.js';
import { pollProcessingStatus, processFileForWorkspace, retryWorkspaceFile, validateFileHeader } from '../services/fileIngestionService.js';
import { WorkspaceApiService } from '../services/workspaceApiService.js';
import { WorkspaceAttachmentDto } from '../services/workspaceApiService.js';
import { MAX_WORKSPACE_ACTIVE_ATTACHMENTS } from '../../../../shared/contracts/files.js';
import { useToast } from '../../../components/Toast';

const MAX_CONCURRENT_UPLOADS = 3;
interface QueuedAttachmentOperation { type: 'upload' | 'retry'; clientId: string; attachmentId?: string; file?: File }

function getAttachmentKey(attachment: WorkspaceFileAttachment): string | undefined {
  return attachment.id ? `server:${attachment.id}` : attachment.clientId ? `client:${attachment.clientId}` : undefined;
}

function fromDto(dto: WorkspaceAttachmentDto): WorkspaceFileAttachment {
  const unsupported = dto.status === 'unsupported';
  return {
    id: dto.id,
    clientId: dto.id,
    name: dto.filename,
    mimeType: dto.mimeType,
    fileKind: dto.fileKind,
    size: dto.size,
    status: dto.status === 'ready' ? 'ready' : dto.status === 'processing' || dto.status === 'pending' ? 'processing' : unsupported ? 'unsupported' : 'failed',
    errorMessage: dto.errorMessage || (unsupported ? 'Format dokumen tidak didukung.' : undefined),
    failureStage: dto.status === 'failed' ? 'processing' : undefined,
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
  const queueRef = useRef<QueuedAttachmentOperation[]>([]);
  const activeUploadsRef = useRef(0);
  const isMountedRef = useRef(true);
  const generationRef = useRef(0);
  const showToastRef = useRef(showToast);
  const pumpQueueRef = useRef<() => void>(() => undefined);
  showToastRef.current = showToast;

  const updateAttachments = useCallback((updater: (current: WorkspaceFileAttachment[]) => WorkspaceFileAttachment[]) => {
    const seenServerIds = new Set<string>();
    const next = updater(attachmentsRef.current).filter(attachment => {
      if (!attachment.id) return true;
      if (seenServerIds.has(attachment.id)) return false;
      seenServerIds.add(attachment.id);
      return true;
    });
    attachmentsRef.current = next;
    if (isMountedRef.current) setAttachments(next);
  }, []);

  const watchProcessing = useCallback((attachmentId: string, clientId: string) => {
    const controller = new AbortController();
    const key = `server:${attachmentId}`;
    const generation = generationRef.current;
    controllersRef.current.get(key)?.abort();
    controllersRef.current.set(key, controller);
    void pollProcessingStatus(attachmentId, 15, 800, controller.signal, chatId).then(result => {
      if (controller.signal.aborted || generationRef.current !== generation || !attachmentsRef.current.some(item => item.id === attachmentId)) return;
      if (result.attachment) {
        const updated = fromDto(result.attachment);
        updateAttachments(list => list.map(item => item.id === attachmentId ? { ...updated, clientId } : item));
        if (updated.status === 'failed') showToastRef.current(updated.errorMessage || 'Dokumen gagal diproses.', 'error');
      } else if (result.timeout) {
        updateAttachments(list => list.map(item => item.id === attachmentId
          ? { ...item, status: 'processing', errorMessage: 'Masih diproses. Periksa kembali sebentar lagi.' }
          : item));
      }
    }).finally(() => {
      if (controllersRef.current.get(key) === controller) controllersRef.current.delete(key);
    });
  }, [chatId, updateAttachments]);

  const performUpload = useCallback(async (item: QueuedAttachmentOperation, controller: AbortController) => {
    const current = attachmentsRef.current.find(attachment => (attachment.clientId || attachment.id) === item.clientId);
    if (!current) return;
    const operationKey = getAttachmentKey(current)!;
    updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === item.clientId
      ? { ...attachment, status: item.type === 'upload' ? 'uploading' : 'processing', errorMessage: undefined, failureStage: undefined }
      : attachment));

    const result = item.type === 'retry' && item.attachmentId
      ? await retryWorkspaceFile(item.attachmentId, controller.signal, chatId)
      : item.file ? await processFileForWorkspace(item.file, chatId, controller.signal, () => updateAttachments(list => list.map(attachment =>
          (attachment.clientId || attachment.id) === item.clientId ? { ...attachment, status: 'processing' } : attachment
        ))) : { valid: false, message: 'Berkas sumber tidak tersedia untuk diunggah ulang.' };

    if (!isMountedRef.current || controller.signal.aborted) {
      if (item.type === 'upload' && result.valid && result.file?.id && !deletingAttachmentsRef.current.has(item.clientId)) {
        void WorkspaceApiService.deleteAttachment(result.file.id, chatId).catch(error => console.warn('[Workspace] Orphaned upload cleanup failed:', error));
      }
      return;
    }

    controllersRef.current.delete(operationKey);
    if (!result.valid || !result.file) {
      updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === item.clientId
        ? {
            ...attachment,
            ...(result.file || {}),
            clientId: item.clientId,
            status: result.file?.status === 'unsupported' ? 'unsupported' : 'failed',
            failureStage: (result.file?.id || attachment.id) && result.file?.status !== 'unsupported' ? 'processing' : (result.file?.status === 'unsupported' ? undefined : 'upload'),
            errorMessage: result.message || result.file?.errorMessage || 'Dokumen gagal diproses.'
          }
        : attachment));
      showToastRef.current(result.message || 'Gagal memproses dokumen.', 'error');
      return;
    }

    updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === item.clientId
      ? { ...result.file!, clientId: item.clientId, status: result.file!.status === 'processing' ? 'processing' : 'ready', createdAt: attachment.createdAt || new Date().toISOString() }
      : attachment));
    if (result.file.status === 'processing') {
      if (result.file.id) watchProcessing(result.file.id, item.clientId);
      return;
    }
    const meta = result.file.pageCount ? ` (${result.file.pageCount} halaman)`
      : result.file.slideCount ? ` (${result.file.slideCount} slide)`
        : result.file.sheetCount ? ` (${result.file.sheetCount} sheet)` : '';
    showToastRef.current(`Dokumen "${result.file.name}" siap dianalisis${meta}`, 'info');
  }, [chatId, updateAttachments, watchProcessing]);

  const pumpQueue = useCallback(() => {
    while (activeUploadsRef.current < MAX_CONCURRENT_UPLOADS && queueRef.current.length > 0) {
      const item = queueRef.current.shift();
      if (!item) continue;
      const attachment = attachmentsRef.current.find(candidate => (candidate.clientId || candidate.id) === item.clientId);
      if (!attachment) continue;
      const operationKey = getAttachmentKey(attachment)!;
      if (controllersRef.current.has(operationKey)) continue;
      const controller = new AbortController();
      controllersRef.current.set(operationKey, controller);
      activeUploadsRef.current += 1;
      void performUpload(item, controller).finally(() => {
        activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
        pumpQueueRef.current();
      });
    }
  }, [performUpload]);
  pumpQueueRef.current = pumpQueue;

  const queueOperation = useCallback((operation: QueuedAttachmentOperation) => {
    const { clientId } = operation;
    const attachment = attachmentsRef.current.find(item => (item.clientId || item.id) === clientId);
    const operationKey = attachment && getAttachmentKey(attachment);
    if (!operationKey || controllersRef.current.has(operationKey) || queueRef.current.some(item => item.clientId === clientId)) return;
    if (operation.file) filesRef.current.set(clientId, operation.file);
    queueRef.current.push(operation);
    updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === clientId
      ? { ...attachment, status: operation.type === 'upload' ? 'uploading' : 'processing', errorMessage: undefined }
      : attachment));
    pumpQueue();
  }, [pumpQueue, updateAttachments]);

  const handleProcessFiles = useCallback((files: File[]) => {
    let activeCount = attachmentsRef.current.length;
    for (const file of files) {
      const active = attachmentsRef.current;
      if (activeCount >= MAX_WORKSPACE_ACTIVE_ATTACHMENTS) {
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
      activeCount += 1;
      if (!validation.valid) {
        showToastRef.current(validation.message || 'Format dokumen tidak didukung.', 'error');
        continue;
      }
      queueOperation({ type: 'upload', file, clientId });
    }
  }, [queueOperation, updateAttachments]);

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
    const operationGeneration = generationRef.current;
    const operationChatId = chatId;
    const stillCurrent = () => generationRef.current === operationGeneration && chatId === operationChatId;
    const serverId = target.id;
    if (serverId) deletingAttachmentsRef.current.add(key);
    const operationKey = getAttachmentKey(target);
    if (operationKey) {
      controllersRef.current.get(operationKey)?.abort();
      controllersRef.current.delete(operationKey);
    }
    queueRef.current = queueRef.current.filter(item => item.clientId !== key);
    if (serverId) {
      try {
        await WorkspaceApiService.deleteAttachment(serverId, chatId);
      } catch (error) {
        if (!stillCurrent()) return;
        console.error('[Workspace] Attachment deletion failed:', error);
        updateAttachments(list => list.map(attachment => (attachment.clientId || attachment.id) === key
          ? { ...attachment, status: target.status, errorMessage: 'Dokumen gagal dihapus. Dokumen masih aktif.' }
          : attachment));
        if (target.status === 'processing' && serverId) watchProcessing(serverId, key);
        deletingAttachmentsRef.current.delete(key);
        showToastRef.current('Dokumen gagal dihapus. Dokumen masih aktif.', 'error');
        return;
      }
    }
    if (!stillCurrent()) return;
    filesRef.current.delete(key);
    updateAttachments(list => list.filter(attachment => (attachment.clientId || attachment.id) !== key));
    deletingAttachmentsRef.current.delete(key);
  }, [chatId, updateAttachments, watchProcessing]);

  const retryAttachment = useCallback((target: WorkspaceFileAttachment) => {
    const key = target.clientId || target.id;
    if (!key || target.status !== 'failed') return;
    if (target.id) {
      queueOperation({ type: 'retry', clientId: key, attachmentId: target.id });
    } else {
      const localFile = filesRef.current.get(key);
      if (localFile) queueOperation({ type: 'upload', clientId: key, file: localFile });
      else showToastRef.current('Pilih ulang dokumen sumber untuk mencoba pemrosesan.', 'error');
    }
  }, [queueOperation]);

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  useEffect(() => {
    const generation = ++generationRef.current;
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
          const pollKey = `server:${attachment.id}`;
          controllersRef.current.set(pollKey, statusController);
          void pollProcessingStatus(attachment.id!, 15, 800, statusController.signal, chatId).then(result => {
            if (!active || statusController.signal.aborted || generationRef.current !== generation || !attachmentsRef.current.some(item => item.id === attachment.id)) return;
            if (result.attachment) {
              const updated = fromDto(result.attachment);
              updateAttachments(list => list.map(item => item.id === updated.id ? updated : item));
            } else if (result.timeout) {
              updateAttachments(list => list.map(item => item.id === attachment.id
                ? { ...item, status: 'processing', errorMessage: 'Masih diproses. Periksa kembali sebentar lagi.' }
                : item));
            } else {
              if (result.errorMessage !== 'Pemrosesan dibatalkan.') showToastRef.current(result.errorMessage || 'Status dokumen tidak dapat diperiksa.', 'error');
            }
          }).finally(() => controllersRef.current.delete(pollKey));
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
      isMountedRef.current = false;
      generationRef.current += 1;
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
