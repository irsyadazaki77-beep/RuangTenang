import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import type { UserSession } from '../../types';
import type { Chat } from '../chat/types';
import type { StudentWorkspaceProps } from './StudentWorkspace';
import { WorkspaceApiService } from './services/workspaceApiService';
import { LoadingState } from '../../components/ui/primitives/Surfaces';

const GuestWorkspace = React.lazy(() => import('./StudentWorkspace'));

interface WorkspaceEntryProps extends StudentWorkspaceProps {
  user: UserSession;
  setChats?: React.Dispatch<React.SetStateAction<Chat[]>>;
}

export const WorkspaceEntry: React.FC<WorkspaceEntryProps> = props => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const createRequestRef = useRef<ReturnType<typeof WorkspaceApiService.createWorkspace> | null>(null);
  const { user } = props;
  const setChats = props.setChats;

  useEffect(() => {
    if (user.role === 'guest') return;
    let active = true;
    createRequestRef.current ||= WorkspaceApiService.createWorkspace();
    void createRequestRef.current.then(workspace => {
      if (!active) return;
      const now = workspace.createdAt || new Date().toISOString();
      setChats?.(current => [{
        id: workspace.chatId,
        title: workspace.name,
        isPinned: Boolean(workspace.isPinned),
        isArchived: Boolean(workspace.isArchived),
        workspaceMode: 'RUANG_KERJA',
        createdAt: now,
        updatedAt: workspace.updatedAt || now
      }, ...current.filter(chat => chat.id !== workspace.chatId)]);
      navigate(`/workspace/c/${encodeURIComponent(workspace.chatId)}`, { replace: true, state: location.state });
    }).catch(reason => {
      if (active) {
        createRequestRef.current = null;
        setError(reason instanceof Error ? reason.message : 'Workspace gagal dibuat.');
      }
    });
    return () => { active = false; };
  }, [attempt, location.state, navigate, setChats, user.role]);

  if (user.role === 'guest') {
    return <React.Suspense fallback={<LoadingState message="Membuka Workspace" className="p-4" />}><GuestWorkspace {...props} /></React.Suspense>;
  }

  if (error) return <main className="flex h-full items-center justify-center p-5"><section role="alert" className="w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-5 text-center shadow-sm dark:border-rose-900 dark:bg-slate-900"><AlertCircle className="mx-auto h-6 w-6 text-rose-600" /><h1 className="mt-3 text-sm font-semibold">Workspace belum dibuat</h1><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{error}</p><button type="button" onClick={() => { createRequestRef.current = null; setError(null); setAttempt(value => value + 1); }} className="mt-4 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Coba lagi</button><button type="button" onClick={() => navigate('/workspace')} className="ml-2 rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-300">Kembali</button></section></main>;

  return <div className="flex h-full items-center justify-center" role="status"><LoadingState message="Menyiapkan Workspace" className="p-4" /></div>;
};

export default WorkspaceEntry;
