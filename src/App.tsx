import React from 'react';
import { AuthGate } from './components/AuthGate';
import { AppShell } from './components/AppShell';

export default function App() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}
