import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkspaceContract, WorkspaceTaskContract, WorkspaceTaskSource, WorkspaceTaskStatus, WorkspacePlan } from '../../../../shared/contracts/workspace';
import { WorkspaceApiService } from '../services/workspaceApiService';

export function useWorkspaceMetadata(chatId?: string) {
  const [workspace, setWorkspace] = useState<WorkspaceContract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!chatId) { setWorkspace(null); return null; }
    const currentGeneration = ++generation.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await WorkspaceApiService.fetchWorkspace(chatId);
      if (generation.current === currentGeneration) setWorkspace(result);
      return result;
    } catch (reason) {
      if (generation.current === currentGeneration) setError(reason instanceof Error ? reason.message : 'Workspace gagal dimuat.');
      return null;
    } finally {
      if (generation.current === currentGeneration) setIsLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]);

  const save = useCallback(async (patch: Partial<Pick<WorkspaceContract, 'name' | 'description' | 'instructions' | 'defaultModel' | 'defaultPreset'>>) => {
    if (!chatId) return null;
    setPendingIds(current => [...current, 'workspace']);
    try {
      const result = await WorkspaceApiService.updateWorkspace(chatId, patch);
      setWorkspace(result);
      setError(null);
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Workspace gagal disimpan.');
      throw reason;
    } finally {
      setPendingIds(current => current.filter(id => id !== 'workspace'));
    }
  }, [chatId]);

  const createTask = useCallback(async (title: string, source: WorkspaceTaskSource = 'user') => {
    if (!chatId) throw new Error('Buat Workspace tersimpan sebelum menambahkan task.');
    const optimisticId = `pending:${Date.now()}`;
    setPendingIds(current => [...current, optimisticId]);
    try {
      const task = await WorkspaceApiService.createTask(chatId, title, source);
      setWorkspace(current => current ? { ...current, tasks: [...(current.tasks || []), task] } : current);
      return task;
    } finally {
      setPendingIds(current => current.filter(id => id !== optimisticId));
    }
  }, [chatId]);

  const updateTask = useCallback(async (taskId: string, status: WorkspaceTaskStatus): Promise<WorkspaceTaskContract> => {
    if (!chatId) throw new Error('Workspace tidak tersedia.');
    setPendingIds(current => [...current, taskId]);
    try {
      const task = await WorkspaceApiService.updateTask(chatId, taskId, status);
      setWorkspace(current => current ? { ...current, tasks: (current.tasks || []).map(item => item.id === taskId ? task : item) } : current);
      return task;
    } finally {
      setPendingIds(current => current.filter(id => id !== taskId));
    }
  }, [chatId]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!chatId) throw new Error('Workspace tidak tersedia.');
    setPendingIds(current => [...current, taskId]);
    try {
      await WorkspaceApiService.deleteTask(chatId, taskId);
      setWorkspace(current => current ? { ...current, tasks: (current.tasks || []).filter(item => item.id !== taskId) } : current);
    } finally {
      setPendingIds(current => current.filter(id => id !== taskId));
    }
  }, [chatId]);

  const createPlan = useCallback(async (plan: WorkspacePlan) => {
    if (!chatId) throw new Error('Simpan Workspace sebelum membuat plan.');
    const saved = await WorkspaceApiService.createPlan(chatId, plan);
    setWorkspace(current => current ? { ...current, plan: saved } : current);
    return saved;
  }, [chatId]);

  const updatePlan = useCallback(async (plan: WorkspacePlan) => {
    if (!chatId) throw new Error('Workspace tidak tersedia.');
    const saved = await WorkspaceApiService.updatePlan(chatId, plan);
    setWorkspace(current => current ? { ...current, plan: saved } : current);
    return saved;
  }, [chatId]);

  const startTaskExecution = useCallback(async (planId: string, taskId: string, executionId: string, snapshot: NonNullable<WorkspacePlan['tasks'][number]['snapshot']>) => {
    if (!chatId) throw new Error('Workspace tidak tersedia.');
    const saved = await WorkspaceApiService.startTaskExecution(chatId, planId, taskId, executionId, snapshot);
    setWorkspace(current => current ? { ...current, plan: saved } : current);
    return saved;
  }, [chatId]);

  return { workspace, tasks: workspace?.tasks || [], plan: workspace?.plan || null, isLoading, pendingIds, error, refresh, save, createTask, updateTask, deleteTask, createPlan, updatePlan, startTaskExecution };
}
