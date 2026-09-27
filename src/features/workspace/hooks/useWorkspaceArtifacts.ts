import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkspaceArtifact, ArtifactType } from '../types';
import { DEFAULT_WELCOME_ARTIFACT, DEFAULT_WELCOME_ARTIFACT_ID } from '../constants/workspaceConstants';
import { WorkspaceApiService } from '../services/workspaceApiService';
import { useToast } from '../../../components/Toast';

interface UseWorkspaceArtifactsOptions {
  chatId?: string;
  persistedArtifacts: WorkspaceArtifact[];
}

export function useWorkspaceArtifacts({
  chatId,
  persistedArtifacts
}: UseWorkspaceArtifactsOptions) {
  const { showToast } = useToast();
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([DEFAULT_WELCOME_ARTIFACT]);
  const [activeArtifactId, setActiveArtifactId] = useState<string>(DEFAULT_WELCOME_ARTIFACT_ID);
  const [hasUnreadArtifact, setHasUnreadArtifact] = useState<boolean>(false);

  // Track pending save IDs to prevent duplicate concurrent network calls
  const savingArtifactIdsRef = useRef<Set<string>>(new Set());

  // Sync state when persistedArtifacts change from persistence hook
  useEffect(() => {
    if (persistedArtifacts.length > 0) {
      setArtifacts(prev => {
        // Keep DEFAULT_WELCOME_ARTIFACT at top
        const welcome = prev.find(a => a.id === DEFAULT_WELCOME_ARTIFACT_ID) || DEFAULT_WELCOME_ARTIFACT;
        
        // Combine persisted artifacts with existing runtime artifacts, avoiding duplicate IDs
        const existingMap = new Map<string, WorkspaceArtifact>();
        prev.forEach(a => {
          if (a.id !== DEFAULT_WELCOME_ARTIFACT_ID) {
            existingMap.set(a.id, a);
          }
        });

        persistedArtifacts.forEach(pArt => {
          existingMap.set(pArt.id, pArt);
        });

        const combinedList = Array.from(existingMap.values());
        return [welcome, ...combinedList];
      });

      // Set active artifact if current active is default welcome or invalid
      setActiveArtifactId(prevId => {
        if (prevId === DEFAULT_WELCOME_ARTIFACT_ID && persistedArtifacts.length > 0) {
          return persistedArtifacts[0].id;
        }
        return prevId;
      });
    }
  }, [persistedArtifacts]);

  const activeArtifact = artifacts.find(a => a.id === activeArtifactId) || artifacts[0] || null;

  const updateActiveArtifact = useCallback((updated: Partial<WorkspaceArtifact>) => {
    if (!activeArtifact) return;
    setArtifacts(prev => prev.map(a => {
      if (a.id === activeArtifact.id) {
        return {
          ...a,
          ...updated,
          updatedAt: new Date().toISOString()
        };
      }
      return a;
    }));
  }, [activeArtifact]);

  const saveArtifact = useCallback(async (content: string, title?: string) => {
    if (!activeArtifact || activeArtifact.id === DEFAULT_WELCOME_ARTIFACT_ID) return;

    try {
      const saved = await WorkspaceApiService.updateArtifact(activeArtifact.id, {
        title: title || activeArtifact.title,
        content,
        language: activeArtifact.language,
        type: activeArtifact.type,
        chatId: chatId || activeArtifact.chatId,
        createVersionSnapshot: false
      });

      if (saved) {
        setArtifacts(prev => prev.map(a => a.id === activeArtifact.id ? { ...a, ...saved } : a));
      }
    } catch (err: any) {
      console.warn('[useWorkspaceArtifacts] Save error:', err);
    }
  }, [activeArtifact, chatId]);

  const rollbackArtifact = useCallback(async (targetVersion: number) => {
    if (!activeArtifact || activeArtifact.id === DEFAULT_WELCOME_ARTIFACT_ID) return;

    try {
      const rolledBack = await WorkspaceApiService.rollbackArtifact(activeArtifact.id, targetVersion);
      if (rolledBack) {
        setArtifacts(prev => prev.map(a => a.id === activeArtifact.id ? rolledBack : a));
        showToast(`Versi ${targetVersion} berhasil dipulihkan`, 'success');
      }
    } catch (err: any) {
      showToast(`Gagal memulihkan versi: ${err?.message || 'Terjadi kendala'}`, 'error');
      throw err;
    }
  }, [activeArtifact, showToast]);

  const createNewArtifact = useCallback(async (type: ArtifactType = 'DOCUMENT') => {
    const newId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newArt: WorkspaceArtifact = {
      id: newId,
      chatId: chatId || undefined,
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

    try {
      const persisted = await WorkspaceApiService.createArtifact({
        id: newArt.id,
        chatId: chatId || undefined,
        title: newArt.title,
        type: newArt.type,
        language: newArt.language,
        content: newArt.content
      });

      if (persisted) {
        setArtifacts(prev => prev.map(a => a.id === newArt.id ? persisted : a));
      }
    } catch (err) {
      console.warn('[useWorkspaceArtifacts] Failed to persist new artifact immediately:', err);
    }

    showToast('Draf baru dibuka di Canvas', 'success');
  }, [chatId, showToast]);

  /**
   * Syncs artifacts parsed from messages into the local state and triggers background persistence
   * with strict idempotency (no duplicate server posts for identical artifacts).
   */
  const syncParsedMessageArtifacts = useCallback((extracted: WorkspaceArtifact[]) => {
    if (!extracted || extracted.length === 0) return;

    setArtifacts(prev => {
      let updated = [...prev];
      extracted.forEach(newArt => {
        // Skip DEFAULT_WELCOME_ARTIFACT
        if (newArt.id === DEFAULT_WELCOME_ARTIFACT_ID) return;

        const idx = updated.findIndex(a => a.id === newArt.id || a.title === newArt.title);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            content: newArt.content,
            type: newArt.type,
            language: newArt.language || updated[idx].language,
            version: Math.max(updated[idx].version || 1, newArt.version || 1),
            updatedAt: new Date().toISOString()
          };
        } else {
          updated = [newArt, ...updated];
        }
      });
      return updated;
    });

    // Idempotent background persistence for newly parsed artifacts
    extracted.forEach(async (newArt) => {
      if (newArt.id === DEFAULT_WELCOME_ARTIFACT_ID) return;
      if (savingArtifactIdsRef.current.has(newArt.id)) return;

      savingArtifactIdsRef.current.add(newArt.id);
      try {
        const persisted = await WorkspaceApiService.createArtifact({
          id: newArt.id,
          chatId: chatId || undefined,
          title: newArt.title,
          type: newArt.type,
          language: newArt.language,
          content: newArt.content
        });

        if (persisted) {
          setArtifacts(prev => {
            const idx = prev.findIndex(a => a.id === persisted.id || a.title === persisted.title);
            if (idx !== -1) {
              const copy = [...prev];
              copy[idx] = persisted;
              return copy;
            }
            return [persisted, ...prev];
          });
        }
      } catch (err) {
        console.warn('[useWorkspaceArtifacts] Failed to persist extracted artifact:', err);
      } finally {
        savingArtifactIdsRef.current.delete(newArt.id);
      }
    });
  }, [chatId]);

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
    rollbackArtifact,
    createNewArtifact,
    syncParsedMessageArtifacts
  };
}
