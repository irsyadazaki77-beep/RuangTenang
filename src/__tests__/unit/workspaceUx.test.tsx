import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { WorkspaceComposer } from '../../features/workspace/components/WorkspaceComposer';
import { WorkspaceConversation } from '../../features/workspace/components/WorkspaceConversation';
import { WorkspaceHeader } from '../../features/workspace/components/WorkspaceHeader';
import { WorkspaceTemplateModal } from '../../features/workspace/components/WorkspaceTemplateModal';
import { MicroBreathingModal } from '../../features/workspace/components/MicroBreathingModal';
import { WorkspaceCanvasPane } from '../../features/workspace/components/WorkspaceCanvasPane';
import { useWorkspaceFileIngestion } from '../../features/workspace/hooks/useWorkspaceFileIngestion';
import { processFileForWorkspace } from '../../features/workspace/services/fileIngestionService';
import { AcademicPromptPill, AcademicTaskTemplate, StarterTaskItem, WorkspaceArtifact } from '../../features/workspace/types';
import { readWorkspaceModelPreference, saveWorkspaceModelPreference } from '../../features/workspace/utils/workspaceModelPreference';

vi.mock('../../features/workspace/services/fileIngestionService', async importOriginal => ({
  ...await importOriginal<typeof import('../../features/workspace/services/fileIngestionService')>(),
  processFileForWorkspace: vi.fn(),
  retryWorkspaceFile: vi.fn()
}));

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(async () => ({ success: true, status: 200, data: {
      defaultModel: 'gemini-3.8-flash',
      models: [
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', category: 'Model Utama & Seimbang', tag: 'Default', description: 'Model cepat', recommendedFor: 'Obrolan', available: true, providerAvailable: true, speed: 'Sangat Cepat', reasoning: 'Tinggi', provider: 'gemini', capabilities: ['chat', 'streaming'], allowedTiers: ['Free', 'Pro', 'Premium'], availability: 'configured', selectable: true, isDefault: true },
        { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)', category: 'Model Utama & Seimbang', tag: 'Chat', description: 'Model percakapan', recommendedFor: 'Obrolan', available: true, providerAvailable: true, speed: 'Cepat', reasoning: 'Tinggi', provider: 'deepseek', capabilities: ['chat', 'streaming'], allowedTiers: ['Free', 'Pro', 'Premium'], availability: 'configured', selectable: true, isDefault: false }
      ]
    } }))
  }
}));

vi.mock('../../features/workspace/components/ArtifactCanvas', () => ({
  ArtifactCanvas: ({ artifact: active, onClose, onToggleExpand }: {
    artifact: WorkspaceArtifact; onClose: () => void; onToggleExpand: () => void
  }) => <div><span>{active.content}</span><button onClick={onToggleExpand}>Toggle fullscreen</button><button onClick={onClose}>Close canvas</button></div>
}));

vi.mock('../../components/common/LazyMarkdown', () => ({
  LazyMarkdown: ({ content }: { content: string }) => <div>{content}</div>
}));

const noop = () => {};
const emptyDistress = { isDistressed: false, triggerKeywords: [], suggestedAction: '' };
const starterTasks: StarterTaskItem[] = [{
  id: 'outline', title: 'Buat outline', subtitle: 'Mulai dari kerangka', icon: <span>O</span>, prompt: 'Buat outline'
}];
const artifact: WorkspaceArtifact = {
  id: 'a1', title: 'Bab Pendahuluan', type: 'DOCUMENT', content: '# Bab 1', version: 2, updatedAt: new Date().toISOString()
};

function renderComposer(overrides: Partial<React.ComponentProps<typeof WorkspaceComposer>> = {}) {
  const props: React.ComponentProps<typeof WorkspaceComposer> = {
    inputText: '', setInputText: vi.fn(), attachedFile: null, isStreaming: false,
    distressResult: emptyDistress, isDistressDismissed: false, promptPills: [] as AcademicPromptPill[],
    selectedModel: 'gemini-3.8-flash', onModelChange: vi.fn(),
    fileInputRef: React.createRef<HTMLInputElement>(), onSendMessage: vi.fn(), onAbortStream: vi.fn(),
    onOpenTemplateGallery: vi.fn(), onRemoveAttachedFile: vi.fn(), onFileUploadChange: vi.fn(),
    onOpenBreathing: noop, onSwitchToRuangTenang: noop, onDismissDistress: noop, ...overrides
  };
  return { ...render(<WorkspaceComposer {...props} />), props };
}

describe('RuangKerja UX foundation', () => {
  it('shows a useful empty conversation and starter task', () => {
    render(<WorkspaceConversation messages={[]} activeStreamingMessage={null} isStreaming={false} artifacts={[]}
      starterTasks={starterTasks} onSelectStarterTask={noop} onRetryMessage={noop} onOpenCanvas={noop} />);
    expect(screen.getByText('Mulai sesuatu')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Buat outline'));
  });

  it('shows a loading status before initial messages arrive', () => {
    render(<WorkspaceConversation isLoading messages={[]} activeStreamingMessage={null} isStreaming={false} artifacts={[]}
      starterTasks={starterTasks} onSelectStarterTask={noop} onRetryMessage={noop} onOpenCanvas={noop} />);
    expect(screen.getByRole('status', { name: 'Memuat percakapan' })).toBeInTheDocument();
  });

  it('sends on Enter and preserves Shift+Enter for a newline', () => {
    const { props } = renderComposer({ inputText: 'Halo' });
    const input = screen.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(props.onSendMessage).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onSendMessage).toHaveBeenCalledWith('Halo', undefined, expect.objectContaining({
      aiModel: 'gemini-3.8-flash', responseMode: 'Seimbang', responseStyle: 'Default'
    }));
  });

  it('keeps send disabled for an empty composer', () => {
    renderComposer();
    expect(screen.getByRole('button', { name: 'Kirim Pesan' })).toBeDisabled();
  });

  it('uses the send control as stop while streaming', () => {
    const { props } = renderComposer({ isStreaming: true });
    fireEvent.click(screen.getByRole('button', { name: 'Hentikan respons' }));
    expect(props.onAbortStream).toHaveBeenCalledOnce();
  });

  it('prevents sending while a selected attachment is still processing', () => {
    renderComposer({ attachedFile: { name: 'paper.pdf', status: 'processing' }, inputText: 'Analisis ini' });
    expect(screen.getByRole('button', { name: 'Kirim Pesan' })).toBeDisabled();
  });

  it('sends ready attachments while keeping them active as document context', () => {
    const { props } = renderComposer({ attachedFile: {
      id: 'att-1', name: 'paper.pdf', size: 2048, mimeType: 'application/pdf', status: 'ready'
    } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pesan' }));
    expect(props.onSendMessage).toHaveBeenCalledWith(
      'Mohon telaah dan analisis dokumen berikut secara mendalam: "paper.pdf".',
      [expect.objectContaining({ id: 'att-1', filename: 'paper.pdf', mimeType: 'application/pdf', size: 2048 })],
      expect.objectContaining({ responseMode: 'Seimbang' })
    );
    expect(props.onRemoveAttachedFile).not.toHaveBeenCalled();
  });

  it('sends multiple active documents together', () => {
    const { props } = renderComposer({ attachments: [
      { id: 'att-a', name: 'jurnal-agile.pdf', mimeType: 'application/pdf', status: 'ready' },
      { id: 'att-b', name: 'rubrik.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', status: 'ready' }
    ], inputText: 'Bandingkan sumber ini.' });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pesan' }));
    expect(props.onSendMessage).toHaveBeenCalledWith('Bandingkan sumber ini.', expect.arrayContaining([
      expect.objectContaining({ id: 'att-a' }), expect.objectContaining({ id: 'att-b' })
    ]), expect.objectContaining({ responseMode: 'Seimbang' }));
  });

  it('blocks a ready attachment that cannot be referenced by the stream request', () => {
    renderComposer({ attachedFile: { name: 'paper.pdf', status: 'ready' } });
    expect(screen.getByRole('button', { name: 'Kirim Pesan' })).toBeDisabled();
  });

  it('opens the model picker, searches and selects a model', async () => {
    const { props } = renderComposer();
    fireEvent.click(await screen.findByRole('button', { name: 'Pilih model, Gemini 3.8 Flash' }));
    expect(screen.getByRole('listbox', { name: 'Model AI' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari model' }), { target: { value: 'DeepSeek V3' } });
    fireEvent.click(screen.getByRole('option', { name: /DeepSeek V3 \(Chat\)/ }));
    expect(props.onModelChange).toHaveBeenCalledWith('deepseek-chat');
  });

  it('keeps model selection disabled during streaming', async () => {
    renderComposer({ isStreaming: true });
    expect(await screen.findByRole('button', { name: 'Pilih model, Gemini 3.8 Flash' })).toBeDisabled();
  });

  it('supports keyboard model selection and exposes expanded/selected state', async () => {
    const { props } = renderComposer();
    const trigger = await screen.findByRole('button', { name: 'Pilih model, Gemini 3.8 Flash' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const search = screen.getByRole('textbox', { name: 'Cari model' });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(props.onModelChange).toHaveBeenCalledWith('deepseek-chat');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('persists the selected catalog model for the current browser session', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); }
    };
    saveWorkspaceModelPreference(storage, 'deepseek-chat');
    expect(readWorkspaceModelPreference(storage)).toBe('deepseek-chat');
  });

  it('passes selected model and response preferences when sending', () => {
    const { props } = renderComposer({ inputText: 'Tolong jelaskan' });
    fireEvent.click(screen.getByRole('button', { name: /Opsi/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Respons' }));
    fireEvent.change(screen.getByLabelText('Mode respons'), { target: { value: 'Ringkas' } });
    fireEvent.change(screen.getByLabelText('Gaya (opsional)'), { target: { value: 'Akademik' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pesan' }));
    expect(props.onSendMessage).toHaveBeenCalledWith('Tolong jelaskan', undefined, expect.objectContaining({
      aiModel: 'gemini-3.8-flash', responseMode: 'Ringkas', responseStyle: 'Akademik'
    }));
  });

  it('closes the response menu with Escape', () => {
    renderComposer();
    fireEvent.click(screen.getByRole('button', { name: /Opsi/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Respons' }));
    expect(screen.getByRole('dialog', { name: 'Pengaturan respons dan konteks' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText('Mode respons'), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Pengaturan respons dan konteks' })).not.toBeInTheDocument();
  });

  it('keeps secondary composer controls hidden until requested', () => {
    renderComposer();
    expect(screen.queryByRole('button', { name: 'Respons' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Template' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Opsi Workspace' }));
    expect(screen.getByRole('button', { name: 'Respons' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Template' })).toBeInTheDocument();
  });

  it('exposes attachment status and removal action', () => {
    const { props } = renderComposer({ attachedFile: { name: 'paper.pdf', size: 2048, status: 'processing' } });
    expect(screen.getByText('paper.pdf')).toBeInTheDocument();
    expect(screen.getByText('Memproses…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus paper.pdf' }));
    expect(props.onRemoveAttachedFile).toHaveBeenCalledOnce();
  });

  it('marks canvas tab selection and shows the active artifact context', () => {
    render(<WorkspaceHeader activeArtifact={artifact} isCanvasOpen mobileActiveTab="chat" hasUnreadArtifact={false}
      onSetMobileActiveTab={noop} onToggleCanvas={noop} onCreateNewArtifact={noop} onOpenTemplateGallery={noop}
      onConfirmClearWorkspace={noop} />);
    expect(screen.getByRole('button', { name: 'Canvas' })).toBeInTheDocument();
    expect(screen.getByText('Bab Pendahuluan')).toBeInTheDocument();
  });

  it('opens the Context tab from compact workspace navigation', () => {
    const onSetMobileActiveTab = vi.fn();
    render(<WorkspaceHeader activeArtifact={null} isCanvasOpen mobileActiveTab="chat" hasUnreadArtifact={false}
      onSetMobileActiveTab={onSetMobileActiveTab} onToggleCanvas={noop} onCreateNewArtifact={noop} onOpenTemplateGallery={noop}
      onConfirmClearWorkspace={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Context' }));
    expect(onSetMobileActiveTab).toHaveBeenCalledWith('context');
  });

  it('preserves the last user prompt for retry after an assistant error', () => {
    const onRetryMessage = vi.fn();
    render(<WorkspaceConversation messages={[
      { id: 'u1', role: 'user', content: 'Jelaskan metode penelitian', createdAt: new Date() },
      { id: 'e1', role: 'assistant', content: 'Respons belum berhasil dibuat.', error: true, createdAt: new Date() }
    ]} activeStreamingMessage={null} isStreaming={false} artifacts={[]} starterTasks={[]}
      onSelectStarterTask={noop} onRetryMessage={onRetryMessage} onOpenCanvas={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Ulang Pesan' }));
    expect(onRetryMessage).toHaveBeenCalledWith('Jelaskan metode penelitian', 'e1');
  });

  it('shows a stable assistant activity indicator during streaming', () => {
    render(<WorkspaceConversation messages={[]} activeStreamingMessage={{
      id: 's1', role: 'assistant', content: 'Sedang menulis', createdAt: new Date()
    }} isStreaming artifacts={[]} starterTasks={[]} onSelectStarterTask={noop} onRetryMessage={noop} onOpenCanvas={noop} />);
    expect(screen.getByRole('status', { name: 'Menyusun konten akademik di Canvas...' })).toBeInTheDocument();
    expect(screen.getByText('Menulis...')).toBeInTheDocument();
  });

  it('opens and closes the new artifact menu with Escape', () => {
    render(<WorkspaceHeader activeArtifact={null} isCanvasOpen mobileActiveTab="chat" hasUnreadArtifact={false}
      onSetMobileActiveTab={noop} onToggleCanvas={noop} onCreateNewArtifact={noop} onOpenTemplateGallery={noop}
      onConfirmClearWorkspace={noop} />);
    const menuButton = screen.getByRole('button', { name: 'Buat draf baru' });
    fireEvent.click(menuButton);
    expect(screen.getByRole('group', { name: 'Jenis draf baru' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Jenis draf baru' })).not.toBeInTheDocument();
  });

  it('switches mode, opens templates, and confirms clearing from the secondary menu', () => {
    const onSwitchMode = vi.fn();
    const onOpenTemplateGallery = vi.fn();
    const onConfirmClearWorkspace = vi.fn();
    render(<WorkspaceHeader activeArtifact={null} isCanvasOpen mobileActiveTab="chat" hasUnreadArtifact={false}
      onSetMobileActiveTab={noop} onToggleCanvas={noop} onCreateNewArtifact={noop} onOpenTemplateGallery={onOpenTemplateGallery}
      onConfirmClearWorkspace={onConfirmClearWorkspace} onSwitchMode={onSwitchMode} />);
    fireEvent.click(screen.getByRole('button', { name: 'Opsi Lebih Lanjut' }));
    fireEvent.click(screen.getByText('Ke RuangTenang'));
    expect(onSwitchMode).toHaveBeenCalledWith('RUANG_TENANG');
    fireEvent.click(screen.getByRole('button', { name: 'Opsi Lebih Lanjut' }));
    fireEvent.click(screen.getByText('Galeri Template'));
    expect(onOpenTemplateGallery).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Opsi Lebih Lanjut' }));
    fireEvent.click(screen.getByText('Bersihkan Obrolan'));
    expect(screen.getByText('Semua pesan di RuangKerja ini akan dihapus. Dokumen dan artefak Canvas tetap tersimpan.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan' }));
    expect(onConfirmClearWorkspace).toHaveBeenCalledOnce();
  });

  it('toggles the desktop canvas from the header', () => {
    const onToggleCanvas = vi.fn();
    render(<WorkspaceHeader activeArtifact={null} isCanvasOpen mobileActiveTab="chat" hasUnreadArtifact={false}
      onSetMobileActiveTab={noop} onToggleCanvas={onToggleCanvas} onCreateNewArtifact={noop}
      onOpenTemplateGallery={noop} onConfirmClearWorkspace={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tutup Canvas' }));
    expect(onToggleCanvas).toHaveBeenCalledOnce();
  });

  it('exposes the template gallery as a dialog and closes it with Escape', () => {
    const onClose = vi.fn();
    const template: AcademicTaskTemplate = {
      id: 'outline', title: 'Buat outline', description: 'Susun kerangka', icon: 'ListTree',
      prompt: 'Buat outline', targetArtifact: 'OUTLINE'
    };
    render(<WorkspaceTemplateModal template={template} snippet="" onSnippetChange={noop} onClose={onClose} onSubmit={noop} />);
    expect(screen.getByRole('dialog', { name: 'Galeri Template Akademik' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('exposes the breathing pause as a dialog and closes it with Escape', () => {
    const onClose = vi.fn();
    render(<MicroBreathingModal isOpen onClose={onClose} reason="Jeda singkat" />);
    expect(screen.getByRole('dialog', { name: 'Jeda Regulasi Napas 1 Menit' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps an attachment visible with its failure reason after processing fails', async () => {
    vi.mocked(processFileForWorkspace).mockResolvedValueOnce({
      valid: false, error: 'PROCESSING_FAILED', message: 'Dokumen belum selesai diproses. Coba lagi.'
    });
    const { result } = renderHook(() => useWorkspaceFileIngestion());
    const file = new File(['catatan'], 'catatan.txt', { type: 'text/plain' });
    await act(async () => {
      result.current.handleDrop({ preventDefault: noop, dataTransfer: { files: [file] } } as unknown as React.DragEvent);
    });
    expect(result.current.attachments[0]?.status).toBe('failed');
    expect(result.current.attachments[0]?.errorMessage).toContain('Coba lagi');
  });

  it('offers a send-to-canvas action on assistant responses', () => {
    const onSendToCanvas = vi.fn();
    render(<WorkspaceConversation messages={[{ id: 'u1', role: 'user', content: 'Ringkas hasilnya.' }, { id: 'a1', role: 'assistant', content: 'Ringkasan hasil penelitian.' }]}
      activeStreamingMessage={null} isStreaming={false} artifacts={[]} starterTasks={[]}
      onSelectStarterTask={noop} onRetryMessage={noop} onOpenCanvas={noop} onSendToCanvas={onSendToCanvas} />);
    fireEvent.click(screen.getByRole('button', { name: 'Kirim ke Canvas' }));
    expect(onSendToCanvas).toHaveBeenCalledWith('Ringkasan hasil penelitian.');
  });

  it('rejects unsupported file types without starting an upload', () => {
    vi.mocked(processFileForWorkspace).mockClear();
    const { result } = renderHook(() => useWorkspaceFileIngestion());
    const unsupported = new File(['binary'], 'payload.exe', { type: 'application/octet-stream' });
    act(() => result.current.handleDrop({ preventDefault: noop, dataTransfer: { files: [unsupported] } } as unknown as React.DragEvent));
    expect(result.current.attachments[0]?.status).toBe('failed');
    expect(result.current.attachments[0]?.errorMessage).toContain('belum didukung');
    expect(processFileForWorkspace).not.toHaveBeenCalled();
  });

  it('caps active documents at the configured Workspace limit', () => {
    vi.mocked(processFileForWorkspace).mockImplementation(() => new Promise(() => undefined));
    const { result } = renderHook(() => useWorkspaceFileIngestion());
    const files = Array.from({ length: 9 }, (_, index) => new File([String(index)], `doc-${index}.txt`, { type: 'text/plain' }));
    act(() => result.current.handleDrop({ preventDefault: noop, dataTransfer: { files } } as unknown as React.DragEvent));
    expect(result.current.attachments).toHaveLength(8);
  });

  it('does not restore an attachment after the user removes it during processing', async () => {
    let resolveProcess!: (value: { valid: true; file: WorkspaceArtifact & { name: string; size: number; status: 'ready' } }) => void;
    vi.mocked(processFileForWorkspace).mockImplementationOnce(() => new Promise((resolve) => { resolveProcess = resolve; }));
    const { result } = renderHook(() => useWorkspaceFileIngestion());
    const file = new File(['catatan'], 'catatan.txt', { type: 'text/plain' });
    act(() => {
      result.current.handleDrop({ preventDefault: noop, dataTransfer: { files: [file] } } as unknown as React.DragEvent);
    });
    expect(result.current.attachments[0]?.status).toBe('uploading');
    await act(async () => result.current.removeAttachment(result.current.attachments[0]));
    await act(async () => {
      resolveProcess({ valid: true, file: { ...artifact, name: file.name, size: file.size, status: 'ready' } });
      await Promise.resolve();
    });
    expect(result.current.attachments).toHaveLength(0);
  });

  it('cancels one upload without stopping the other attachment', async () => {
    const pending = new Map<string, { signal?: AbortSignal; resolve: (value: { valid: true; file: { id: string; name: string; size: number; status: 'ready' } }) => void }>();
    vi.mocked(processFileForWorkspace).mockImplementation((file, _chatId, signal) => new Promise(resolve => {
      pending.set(file.name, { signal, resolve: resolve as (value: { valid: true; file: { id: string; name: string; size: number; status: 'ready' } }) => void });
    }));
    const { result } = renderHook(() => useWorkspaceFileIngestion());
    const fileA = new File(['a'], 'a.txt', { type: 'text/plain' });
    const fileB = new File(['b'], 'b.txt', { type: 'text/plain' });
    act(() => result.current.handleDrop({ preventDefault: vi.fn(), dataTransfer: { files: [fileA, fileB] } } as unknown as React.DragEvent));
    expect(result.current.attachments).toHaveLength(2);
    const attachmentA = result.current.attachments.find(attachment => attachment.name === 'a.txt')!;
    await act(async () => result.current.removeAttachment(attachmentA));
    expect(pending.get('a.txt')?.signal?.aborted).toBe(true);
    await act(async () => {
      pending.get('b.txt')?.resolve({ valid: true, file: { id: 'server-b', name: 'b.txt', size: fileB.size, status: 'ready' } });
      await Promise.resolve();
    });
    expect(result.current.attachments.map(attachment => [attachment.name, attachment.status])).toEqual([['b.txt', 'ready']]);
  });

  it('renders canvas empty state and creates a document from its action', () => {
    const onCreateNewArtifact = vi.fn();
    render(<WorkspaceCanvasPane artifacts={[]} activeArtifact={null} activeArtifactId="" isCanvasOpen isCanvasExpanded={false}
      isStreaming={false} mobileActiveTab="chat" onSelectArtifact={noop} onCloseCanvas={noop} onToggleExpand={noop}
      onUpdateActiveArtifact={noop} onSaveArtifact={noop} onRollbackVersion={noop} onRequestRevision={noop}
      onCreateNewArtifact={onCreateNewArtifact} onSetMobileActiveTab={noop} />);
    expect(screen.getByText('Canvas siap digunakan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Buat Draf Baru/ }));
    expect(onCreateNewArtifact).toHaveBeenCalledWith('DOCUMENT');
  });

  it('switches artifacts and toggles fullscreen without replacing the canvas', () => {
    const second = { ...artifact, id: 'a2', title: 'Metode', content: '# Metode' };
    const onSelectArtifact = vi.fn();
    const onToggleExpand = vi.fn();
    render(<WorkspaceCanvasPane artifacts={[artifact, second]} activeArtifact={artifact} activeArtifactId={artifact.id}
      isCanvasOpen isCanvasExpanded={false} isStreaming={false} mobileActiveTab="chat" onSelectArtifact={onSelectArtifact}
      onCloseCanvas={noop} onToggleExpand={onToggleExpand} onUpdateActiveArtifact={noop} onSaveArtifact={noop}
      onRollbackVersion={noop} onRequestRevision={noop} onCreateNewArtifact={noop} onSetMobileActiveTab={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Metode/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle fullscreen' }));
    expect(onSelectArtifact).toHaveBeenCalledWith('a2');
    expect(onToggleExpand).toHaveBeenCalledOnce();
    expect(screen.getByText('# Bab 1')).toBeInTheDocument();
  });

  it('renders preset selector button and allows selecting a built-in preset', () => {
    const onSelectPreset = vi.fn();
    const { props } = renderComposer({
      allPresets: [
        { id: 'seimbang', name: 'Seimbang', description: 'Seimbang', icon: 'Scale', scope: 'builtin', group: 'Recommended', routingMode: 'auto' },
        { id: 'akademik', name: 'Akademik', description: 'Kebutuhan skripsi', icon: 'BookOpen', scope: 'builtin', group: 'Academic', routingMode: 'auto', taskCategory: 'academic_writing', responseStyle: 'Akademik' }
      ],
      activePreset: { id: 'seimbang', name: 'Seimbang', description: 'Seimbang', icon: 'Scale', scope: 'builtin', group: 'Recommended', routingMode: 'auto' },
      activePresetId: 'seimbang',
      presetSummary: 'Auto · Seimbang',
      onSelectPreset,
      onCreatePreset: vi.fn(),
      onUpdatePreset: vi.fn(),
      onDuplicatePreset: vi.fn(),
      onDeletePreset: vi.fn()
    });

    expect(screen.queryByRole('button', { name: /Preset AI: Seimbang/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Opsi/ }));
    const trigger = screen.getByRole('button', { name: /Preset AI: Seimbang/ });
    expect(trigger).toBeInTheDocument();
    fireEvent.click(trigger);

    expect(screen.getByRole('listbox', { name: 'Daftar Preset AI' })).toBeInTheDocument();
    const akademikOption = screen.getByRole('option', { name: /Akademik/ });
    fireEvent.click(akademikOption);

    expect(onSelectPreset).toHaveBeenCalledWith('akademik');
  });
});
