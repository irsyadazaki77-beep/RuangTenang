import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from "./components/Toast";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ErrorBoundary } from './components/ErrorBoundary';

// Swallow benign Vite HMR WebSocket connection warnings caused by sandbox environment constraints
if (typeof window !== 'undefined') {
  const isViteWSWarning = (msg: string): boolean => {
    return (
      msg.includes('WebSocket') ||
      msg.includes('websocket') ||
      msg.includes('vite') ||
      msg.includes('Vite') ||
      msg.includes('HMR')
    ) && (
      msg.includes('closed') ||
      msg.includes('connect') ||
      msg.includes('fail') ||
      msg.includes('open')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (isViteWSWarning(msg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (isViteWSWarning(msg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
