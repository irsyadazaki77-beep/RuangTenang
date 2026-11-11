import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"], [data-workspace-editor]'));
}

export function useGlobalShortcuts(toggleCommandPalette: () => void) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        navigate('/');
      } else if (((event.ctrlKey || event.metaKey) && event.key === '/') || (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey)) {
        event.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [navigate, toggleCommandPalette]);
}
