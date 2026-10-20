import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../src/components/Toast';
import { StudentWorkspace } from '../src/features/workspace/StudentWorkspace';
import type { UserSession } from '../src/types';
import '../src/index.css';

const user: UserSession = {
  id: 'workspace-history-e2e-user',
  name: 'Workspace History Test',
  email: 'workspace-history@example.test',
  role: 'mahasiswa',
  tier: 'Free',
  usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
};
const setChats: React.Dispatch<React.SetStateAction<any[]>> = () => {};

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <HashRouter>
      <Routes>
        <Route path="/workspace/c/:chatId" element={<StudentWorkspace user={user} chats={[]} setChats={setChats} />} />
      </Routes>
    </HashRouter>
  </ToastProvider>
);
