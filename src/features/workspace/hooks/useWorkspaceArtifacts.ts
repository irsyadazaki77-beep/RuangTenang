import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { WorkspaceArtifact, ArtifactType } from '../types';
import { DEFAULT_WELCOME_ARTIFACT, DEFAULT_WELCOME_ARTIFACT_ID } from '../constants/workspaceConstants';
import { WorkspaceApiService } from '../services/workspaceApiService';
import { useToast } from '../../../components/Toast';

interface UseWorkspaceArtifactsOptions {
  chatId?: string;
  workspaceIdentity?: string;
  persistedArtifacts: WorkspaceArtifact[];
}

const draftStoragePrefix = 'ruangkerja:artifact-drafts:';

function readLocalDrafts(workspaceIdentity: string): WorkspaceArtifact[] {
  try {
    const saved = globalThis.sessionStorage?.getItem(`${draftStoragePrefix}${workspaceIdentity}`);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is WorkspaceArtifact => item && item.localWorkspaceId === workspaceIdentity && item.persistenceStatus !== 'persistent') : [];
  } catch {
    return [];
  }
}

function writeLocalDrafts(workspaceIdentity: string, drafts: WorkspaceArtifact[]) {
  try {
    if (drafts.length) globalThis.sessionStorage?.setItem(`${draftStoragePrefix}${workspaceIdentity}`, JSON.stringify(drafts));
    else globalThis.sessionStorage?.removeItem(`${draftStoragePrefix}${workspaceIdentity}`);
  } catch {
    // Keep the in-memory draft usable if browser storage is unavailable or full.
  }
}

export function useWorkspaceArtifacts({
  chatId,
  workspaceIdentity = chatId ? `chat:${chatId}` : 'local:workspace',
  persistedArtifacts
}: UseWorkspaceArtifactsOptions) {
  const { showToast } = useToast();
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>(() => [DEFAULT_WELCOME_ARTIFACT, ...readLocalDrafts(workspaceIdentity)]);
  const [activeArtifactId, setActiveArtifactId] = useState<string>(() => readLocalDrafts(workspaceIdentity)[0]?.id || DEFAULT_WELCOME_ARTIFACT_ID);
  const [hasUnreadArtifact, setHasUnreadArtifact] = useState<boolean>(false);

  // Share in-flight writes between stream persistence and post-chat draft migration.
  const pendingArtifactSavesRef = useRef(new Map<string, Promise<WorkspaceArtifact | null>>());
  const activeMutationsRef = useRef(new Set<string>());
  const failedDuplicateIdsRef = useRef(new Map<string, string>());
  const saveTailsRef = useRef(new Map<string, Promise<void>>());
  const confirmedArtifactsRef = useRef(new Map<string, WorkspaceArtifact>());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const lastPersistedSigRef = useRef<string>('');
  const currentIdentityRef = useRef(workspaceIdentity);
  currentIdentityRef.current = workspaceIdentity;
  const lastWorkspaceIdentityRef = useRef(workspaceIdentity);

  const persistArtifact = useCallback((artifact: WorkspaceArtifact, targetChatId: string) => {
    const pending = pendingArtifactSavesRef.current.get(artifact.id);
    if (pending) return pending;
    const operation = WorkspaceApiService.createArtifact({
      id: artifact.id, chatId: targetChatId, title: artifact.title, type: artifact.type,
      language: artifact.language, content: artifact.content
    }).finally(() => {
      if (pendingArtifactSavesRef.current.get(artifact.id) === operation) pendingArtifactSavesRef.current.delete(artifact.id);
    });
    pendingArtifactSavesRef.current.set(artifact.id, operation);
    return operation;
  }, []);

  useLayoutEffect(() => {
    if (lastWorkspaceIdentityRef.current === workspaceIdentity) return;
    lastWorkspaceIdentityRef.current = workspaceIdentity;
    lastPersistedSigRef.current = '';
    const localDrafts = readLocalDrafts(workspaceIdentity);
    setArtifacts([DEFAULT_WELCOME_ARTIFACT, ...localDrafts]);
    setActiveArtifactId(localDrafts[0]?.id || DEFAULT_WELCOME_ARTIFACT_ID);
    setHasUnreadArtifact(false);
  }, [workspaceIdentity]);

  useEffect(() => {
    writeLocalDrafts(workspaceIdentity, artifacts.filter(item => item.localWorkspaceId === workspaceIdentity && item.persistenceStatus !== 'persistent'));
  }, [artifacts, workspaceIdentity]);

  // Sync state when persistedArtifacts change from persistence hook
  useEffect(() => {
    const workspaceArtifacts = chatId ? persistedArtifacts.filter(item => item.chatId === chatId) : [];
    if (workspaceArtifacts.length > 0 || chatId) {
      const sig = `${workspaceIdentity}:${JSON.stringify(workspaceArtifacts.map(a => `${a.id}:${a.version}:${a.updatedAt}`))}`;
      if (sig === lastPersistedSigRef.current) return;
      lastPersistedSigRef.current = sig;

      setArtifacts(prev => {
        // Only retain local drafts created in this same local Workspace. Persisted results
        // replace server-backed state instead of merging a previous Workspace's runtime map.
        const localDrafts = prev.filter(a => a.persistenceStatus && a.persistenceStatus !== 'persistent' && a.localWorkspaceId === workspaceIdentity);
        const combined = new Map<string, WorkspaceArtifact>();
        localDrafts.forEach(item => combined.set(item.id, item));
        workspaceArtifacts.forEach(item => combined.set(item.id, { ...item, persistenceStatus: 'persistent', localWorkspaceId: undefined }));
        return [DEFAULT_WELCOME_ARTIFACT, ...combined.values()];
      });

      // Set active artifact if current active is default welcome or invalid
      setActiveArtifactId(prevId => {
        if (prevId === DEFAULT_WELCOME_ARTIFACT_ID && workspaceArtifacts.length > 0) {
          return workspaceArtifacts[0].id;
        }
        return prevId;
      });
    }
  }, [persistedArtifacts, chatId, workspaceIdentity]);

  const activeArtifact = artifacts.find(a => a.id === activeArtifactId) || artifacts[0] || null;

  const updateActiveArtifact = useCallback((updated: Partial<WorkspaceArtifact>) => {
    if (!activeArtifact) return;
    setArtifacts(prev => prev.map(a => {
      if (a.id === activeArtifact.id) {
        return {
          ...a,
          ...updated,
          // Optimistic edits retain the confirmed timestamp; a server-confirmed snapshot may advance it.
          updatedAt: updated.persistenceStatus === 'persistent' ? (updated.updatedAt || a.updatedAt) : a.updatedAt
        };
      }
      return a;
    }));
  }, [activeArtifact]);

  const saveArtifact = useCallback(async (content: string, title?: string, createVersionSnapshot = false, expectedUpdatedAt?: string): Promise<WorkspaceArtifact | undefined> => {
    if (!activeArtifact || activeArtifact.id === DEFAULT_WELCOME_ARTIFACT_ID) return undefined;

    const savingArtifact = activeArtifact;
    const identityAtStart = workspaceIdentity;
    if (!chatId) {
      const localSaved = { ...savingArtifact, title: title || savingArtifact.title, content, persistenceStatus: 'local' as const };
      setArtifacts(prev => prev.map(a => a.id === savingArtifact.id ? localSaved : a));
      return localSaved;
    }

    const previous = saveTailsRef.current.get(savingArtifact.id) || Promise.resolve();
    let release!: () => void;
    const lock = new Promise<void>(resolve => { release = resolve; });
    const tail = previous.then(() => lock);
    saveTailsRef.current.set(savingArtifact.id, tail);
    await previous;
    try {
      const previouslyConfirmed = confirmedArtifactsRef.current.get(savingArtifact.id);
      const isServerBacked = !!previouslyConfirmed || savingArtifact.persistenceStatus === 'persistent' || (!savingArtifact.persistenceStatus && !!savingArtifact.chatId);
      if (!isServerBacked) setArtifacts(prev => prev.map(a => a.id === savingArtifact.id ? { ...a, persistenceStatus: 'saving' } : a));
      const saved = !isServerBacked
        ? await WorkspaceApiService.createArtifact({
            id: savingArtifact.id, chatId, title: title || savingArtifact.title, content,
            language: savingArtifact.language, type: savingArtifact.type
          })
        : await WorkspaceApiService.updateArtifact(savingArtifact.id, {
            title: title || savingArtifact.title,
            content,
            language: savingArtifact.language,
            type: savingArtifact.type,
            chatId,
            createNewVersion: createVersionSnapshot,
            expectedUpdatedAt: expectedUpdatedAt || previouslyConfirmed?.updatedAt || savingArtifact.updatedAt
          });

      if (saved) {
        const confirmed = { ...saved, persistenceStatus: 'persistent' as const, localWorkspaceId: undefined };
        confirmedArtifactsRef.current.set(savingArtifact.id, confirmed);
        if (currentIdentityRef.current === identityAtStart) setArtifacts(prev => prev.map(a => a.id === savingArtifact.id ? confirmed : a));
        return confirmed;
      } else {
        throw new Error('Server tidak mengembalikan artefak yang tersimpan');
      }
    } catch (err: any) {
      console.warn('[useWorkspaceArtifacts] Save error:', err);
      if (currentIdentityRef.current === identityAtStart) {
        setArtifacts(prev => prev.map(item => item.id === savingArtifact.id
          ? { ...item, persistenceStatus: confirmedArtifactsRef.current.has(savingArtifact.id) || savingArtifact.persistenceStatus === 'persistent' || (!savingArtifact.persistenceStatus && savingArtifact.chatId) ? 'persistent' : 'failed' }
          : item));
      }
      if (err instanceof Error && err.message.includes('berubah') && chatId && currentIdentityRef.current === identityAtStart) {
        try {
          const latestArtifacts = await WorkspaceApiService.fetchArtifacts(chatId);
          const latest = latestArtifacts.find(item => item.id === savingArtifact.id);
          if (latest && latest.chatId === chatId && currentIdentityRef.current === identityAtStart) {
            Object.assign(err, { serverArtifact: { ...latest, persistenceStatus: 'persistent' } });
          }
        } catch (refreshError) {
          console.warn('[useWorkspaceArtifacts] Could not refresh conflicting artifact:', refreshError);
        }
      }
      showToast('Draf masih tersimpan lokal. Penyimpanan ke Ruang Kerja belum berhasil.', 'error');
      throw err;
    } finally {
      release();
      if (saveTailsRef.current.get(savingArtifact.id) === tail) saveTailsRef.current.delete(savingArtifact.id);
    }
  }, [activeArtifact, chatId, showToast, workspaceIdentity]);

  const migrateLocalArtifacts = useCallback(async (targetChatId: string): Promise<boolean> => {
    if (!targetChatId) return false;
    const identityAtStart = workspaceIdentity;
    const drafts = artifacts.filter(item => item.id !== DEFAULT_WELCOME_ARTIFACT_ID && item.localWorkspaceId === identityAtStart && item.persistenceStatus !== 'persistent');
    let succeeded = true;
    for (const draft of drafts) {
      if (currentIdentityRef.current === identityAtStart) {
        setArtifacts(prev => prev.map(item => item.id === draft.id ? { ...item, persistenceStatus: 'saving' } : item));
      }
      try {
        const saved = await persistArtifact(draft, targetChatId);
        if (!saved) throw new Error('Server tidak mengembalikan artefak yang tersimpan');
        if (currentIdentityRef.current === identityAtStart) {
          setArtifacts(prev => prev.map(item => item.id === draft.id ? { ...saved, persistenceStatus: 'persistent', localWorkspaceId: undefined } : item));
        }
        writeLocalDrafts(identityAtStart, readLocalDrafts(identityAtStart).filter(item => item.id !== draft.id));
      } catch (error) {
        succeeded = false;
        console.warn('[useWorkspaceArtifacts] Draft migration failed:', error);
        const retainedDraft = { ...draft, persistenceStatus: 'failed' as const, localWorkspaceId: `chat:${targetChatId}`, chatId: undefined };
        writeLocalDrafts(`chat:${targetChatId}`, [...readLocalDrafts(`chat:${targetChatId}`).filter(item => item.id !== draft.id), retainedDraft]);
        if (currentIdentityRef.current === identityAtStart) setArtifacts(prev => prev.map(item => item.id === draft.id ? { ...item, persistenceStatus: 'failed', chatId: undefined } : item));
      }
    }
    if (!succeeded && currentIdentityRef.current === identityAtStart) {
      showToast('Draf masih tersimpan lokal. Penyimpanan ke Ruang Kerja belum berhasil.', 'error');
    }
    return succeeded;
  }, [artifacts, persistArtifact, showToast, workspaceIdentity]);

  const rollbackArtifact = useCallback(async (targetVersion: number) => {
    if (!activeArtifact || activeArtifact.id === DEFAULT_WELCOME_ARTIFACT_ID) return;
    const target = activeArtifact;
    const identityAtStart = workspaceIdentity;
    if (activeMutationsRef.current.has(target.id)) return;
    activeMutationsRef.current.add(target.id);
    try {
      const rolledBack = await WorkspaceApiService.rollbackArtifact(target.id, targetVersion, target.chatId || chatId);
      if (rolledBack && currentIdentityRef.current === identityAtStart) {
        setArtifacts(prev => prev.map(a => a.id === target.id ? { ...rolledBack, persistenceStatus: 'persistent' } : a));
        showToast(`Versi ${targetVersion} berhasil dipulihkan`, 'success');
      }
    } catch (err: any) {
      showToast('Versi belum berhasil dipulihkan.', 'error');
      throw err;
    } finally {
      activeMutationsRef.current.delete(target.id);
    }
  }, [activeArtifact, chatId, showToast, workspaceIdentity]);

  const createNewArtifact = useCallback(async (type: ArtifactType = 'DOCUMENT') => {
    const newId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newArt: WorkspaceArtifact = {
      id: newId,
      chatId: chatId || undefined,
      localWorkspaceId: workspaceIdentity,
      persistenceStatus: chatId ? 'saving' : 'local',
      title: type === 'CODE' ? 'Skrip Kode Baru' : type === 'CITATION' ? 'Daftar Sitasi Ilmiah' : 'Draf Dokumen Baru',
      type,
      language: type === 'CODE' ? 'python' : undefined,
      content: type === 'CODE' 
        ? `# Tulis kode program di sini\ndef main():\n    print("Hello RuangKerja")\n\nif __name__ == "__main__":\n    main()` 
        : type === 'CITATION' 
        ? `# Daftar Sitasi & Bibliografi\n\n[1] Nama Penulis, "Judul Artikel Ilmiah," Nama Jurnal, vol. 1, no. 1, pp. 1-10, 2026. DOI: 10.1000/182` 
        : `# Draf Dokumen Baru\n\nTulis catatan atau draf akademik Anda di sini...`,
      version: 1,
      updatedAt: new Date().toISOString()
    };

    setArtifacts(prev => [newArt, ...prev]);
    setActiveArtifactId(newArt.id);

    if (!chatId) {
      showToast('Draf baru dibuka di Canvas. Draf ini tersimpan lokal.', 'info');
      return;
    }

    try {
      const persisted = await WorkspaceApiService.createArtifact({
        id: newArt.id,
        chatId,
        title: newArt.title,
        type: newArt.type,
        language: newArt.language,
        content: newArt.content
      });

      if (!persisted) throw new Error('Server tidak mengembalikan artefak yang tersimpan');
      if (currentIdentityRef.current === workspaceIdentity) {
        setArtifacts(prev => [ { ...persisted, persistenceStatus: 'persistent', localWorkspaceId: undefined }, ...prev.filter(a => a.id !== newArt.id && a.id !== persisted.id) ]);
        setActiveArtifactId(current => current === newArt.id ? persisted.id : current);
      }
      showToast('Draf baru berhasil disimpan dan dibuka di Canvas', 'success');
    } catch (err) {
      console.warn('[useWorkspaceArtifacts] Failed to persist new artifact immediately:', err);
      if (currentIdentityRef.current === workspaceIdentity) setArtifacts(prev => prev.map(a => a.id === newArt.id ? { ...a, persistenceStatus: 'failed' } : a));
      showToast('Draf baru belum berhasil disimpan. Draf lokal tetap tersedia.', 'error');
    }
  }, [chatId, showToast, workspaceIdentity]);

  const createArtifactFromContent = useCallback(async (content: string, title: string, operationId?: string): Promise<boolean> => {
    const id = operationId || `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const draft: WorkspaceArtifact = {
      id, chatId: chatId || undefined, localWorkspaceId: workspaceIdentity, persistenceStatus: chatId ? 'saving' : 'local', title: title.slice(0, 120), type: 'DOCUMENT',
      content, version: 1, updatedAt: new Date().toISOString()
    };
    setArtifacts(current => [draft, ...current.filter(item => item.id !== id)]);
    setActiveArtifactId(id);
    setHasUnreadArtifact(true);
    if (!chatId) {
      showToast('Jawaban ditambahkan sebagai draf lokal di Canvas.', 'info');
      return true;
    }
    try {
      const persisted = await WorkspaceApiService.createArtifact({ id, chatId, title: draft.title, type: draft.type, content });
      if (!persisted) throw new Error('Server tidak mengembalikan artefak yang tersimpan');
      if (currentIdentityRef.current === workspaceIdentity) {
        setArtifacts(current => [ { ...persisted, persistenceStatus: 'persistent', localWorkspaceId: undefined }, ...current.filter(item => item.id !== id && item.id !== persisted.id) ]);
        setActiveArtifactId(current => current === id ? persisted.id : current);
      }
      showToast('Jawaban dikirim ke Canvas', 'success');
      return true;
    } catch (error) {
      console.warn('[useWorkspaceArtifacts] Failed to save comparison result to Canvas:', error);
      if (currentIdentityRef.current === workspaceIdentity) setArtifacts(current => current.map(item => item.id === id ? { ...item, persistenceStatus: 'failed' } : item));
      showToast('Draf masih tersimpan lokal. Penyimpanan ke Ruang Kerja belum berhasil.', 'error');
      return false;
    }
  }, [chatId, showToast, workspaceIdentity]);

  const duplicateArtifact = useCallback(async (id: string) => {
    const target = artifacts.find(a => a.id === id);
    if (!target || activeMutationsRef.current.has(`duplicate:${id}`)) return;
    activeMutationsRef.current.add(`duplicate:${id}`);

    const newId = failedDuplicateIdsRef.current.get(id) || `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clonedArt: WorkspaceArtifact = {
      ...target,
      id: newId,
      localWorkspaceId: workspaceIdentity,
      persistenceStatus: chatId ? 'saving' : 'local',
      title: `${target.title} (Salinan)`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: []
    };

    if (!chatId) {
      if (currentIdentityRef.current === workspaceIdentity) {
        setArtifacts(prev => [clonedArt, ...prev]);
        setActiveArtifactId(clonedArt.id);
      }
      showToast(`Salinan dibuat sebagai draf lokal: "${clonedArt.title}"`, 'info');
      activeMutationsRef.current.delete(`duplicate:${id}`);
      return;
    }

    try {
      const persisted = await WorkspaceApiService.createArtifact({
        id: clonedArt.id,
        chatId,
        title: clonedArt.title,
        type: clonedArt.type,
        language: clonedArt.language,
        content: clonedArt.content
      });

      if (!persisted) throw new Error('Server tidak mengembalikan artefak yang tersimpan');
      if (currentIdentityRef.current === workspaceIdentity) {
        setArtifacts(prev => [ { ...persisted, persistenceStatus: 'persistent', localWorkspaceId: undefined }, ...prev.filter(a => a.id !== persisted.id) ]);
        setActiveArtifactId(persisted.id);
        failedDuplicateIdsRef.current.delete(id);
        showToast(`Dokumen berhasil diduplikasi: "${persisted.title}"`, 'success');
      }
    } catch (err) {
      console.warn('[useWorkspaceArtifacts] Failed to persist duplicated artifact:', err);
      failedDuplicateIdsRef.current.set(id, newId);
      showToast('Dokumen belum berhasil diduplikasi.', 'error');
    } finally {
      activeMutationsRef.current.delete(`duplicate:${id}`);
    }
  }, [artifacts, chatId, showToast, workspaceIdentity]);

  const deleteArtifact = useCallback(async (id: string) => {
    if (id === DEFAULT_WELCOME_ARTIFACT_ID) {
      showToast('Artefak default selamat datang tidak dapat dihapus', 'info');
      return;
    }

    const target = artifacts.find(a => a.id === id);
    if (!target || activeMutationsRef.current.has(`delete:${id}`)) return;
    const targetTitle = target?.title || 'Dokumen';
    const identityAtStart = workspaceIdentity;
    activeMutationsRef.current.add(`delete:${id}`);

    if (target?.persistenceStatus === 'persistent' || (!target?.persistenceStatus && target?.chatId)) {
      try {
        await WorkspaceApiService.deleteArtifact(id, target.chatId || chatId);
      } catch (err) {
        console.warn('[useWorkspaceArtifacts] Backend delete error:', err);
        activeMutationsRef.current.delete(`delete:${id}`);
        showToast('Dokumen belum berhasil dihapus.', 'error');
        throw err;
      }
    }

    if (currentIdentityRef.current !== identityAtStart) {
      activeMutationsRef.current.delete(`delete:${id}`);
      return;
    }
    const index = artifacts.findIndex(a => a.id === id);
    const remaining = artifacts.filter(a => a.id !== id);
    const nextId = remaining.length ? remaining[Math.min(Math.max(index, 0), remaining.length - 1)].id : DEFAULT_WELCOME_ARTIFACT_ID;
    setArtifacts(prev => {
      const filtered = prev.filter(a => a.id !== id);
      return filtered.length > 0 ? filtered : [DEFAULT_WELCOME_ARTIFACT];
    });

    setActiveArtifactId(prevId => prevId === id ? nextId : prevId);
    activeMutationsRef.current.delete(`delete:${id}`);

    showToast(`"${targetTitle}" berhasil dihapus`, 'success');
  }, [artifacts, chatId, showToast, workspaceIdentity]);

  /**
   * Syncs artifacts parsed from messages into the local state and triggers background persistence
   * with strict idempotency (no duplicate server posts for identical artifacts).
   */
  const syncParsedMessageArtifacts = useCallback(async (extracted: WorkspaceArtifact[], targetChatId?: string): Promise<boolean> => {
    if (!extracted || extracted.length === 0) return true;
    const destinationChatId = targetChatId || chatId;
    const identityAtStart = workspaceIdentity;

    setArtifacts(prev => {
      if (currentIdentityRef.current !== identityAtStart) return prev;
      let updated = [...prev];
      extracted.forEach(newArt => {
        // Skip DEFAULT_WELCOME_ARTIFACT
        if (newArt.id === DEFAULT_WELCOME_ARTIFACT_ID) return;

        const idx = updated.findIndex(a => a.id === newArt.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            content: newArt.content,
            type: newArt.type,
            language: newArt.language || updated[idx].language,
            version: Math.max(updated[idx].version || 1, newArt.version || 1),
            updatedAt: new Date().toISOString(),
            localWorkspaceId: identityAtStart,
            persistenceStatus: destinationChatId ? 'saving' : 'local'
          };
        } else {
          updated = [{ ...newArt, chatId: destinationChatId, localWorkspaceId: identityAtStart, persistenceStatus: destinationChatId ? 'saving' : 'local' }, ...updated];
        }
      });
      return updated;
    });

    if (!destinationChatId) return true;
    const results = await Promise.all(extracted.filter(artifact => artifact.id !== DEFAULT_WELCOME_ARTIFACT_ID && artifact.content.trim()).map(async (newArt) => {
      try {
        const persisted = await persistArtifact(newArt, destinationChatId);

        if (!persisted) throw new Error('Server tidak mengembalikan artefak yang tersimpan');
        if (isMountedRef.current && currentIdentityRef.current === identityAtStart) {
          setArtifacts(prev => {
            const idx = prev.findIndex(a => a.id === persisted.id);
            if (idx !== -1) {
              const copy = [...prev];
              copy[idx] = { ...persisted, persistenceStatus: 'persistent', localWorkspaceId: undefined };
              return copy;
            }
            return [{ ...persisted, persistenceStatus: 'persistent', localWorkspaceId: undefined }, ...prev];
          });
        }
        return true;
      } catch (err) {
        console.warn('[useWorkspaceArtifacts] Failed to persist extracted artifact:', err);
        if (currentIdentityRef.current === identityAtStart) setArtifacts(prev => prev.map(item => item.id === newArt.id ? { ...item, persistenceStatus: 'failed' } : item));
        return false;
      }
    }));
    const allSaved = results.every(Boolean);
    if (!allSaved) showToast('Dokumen dibuat, tetapi belum tersimpan. Canvas mempertahankan draf lokal; coba simpan lagi.', 'error');
    return allSaved;
  }, [chatId, persistArtifact, showToast, workspaceIdentity]);

  return {
    artifacts,
    setArtifacts,
    activeArtifact,
    activeArtifactId,
    setActiveArtifactId,
    hasUnreadArtifact,
    setHasUnreadArtifact,
    updateActiveArtifact,
    saveArtifact,
    migrateLocalArtifacts,
    rollbackArtifact,
    createNewArtifact,
    createArtifactFromContent,
    duplicateArtifact,
    deleteArtifact,
    syncParsedMessageArtifacts
  };
}
