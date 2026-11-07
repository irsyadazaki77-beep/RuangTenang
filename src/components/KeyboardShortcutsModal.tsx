import React, { useCallback, useEffect, useState } from 'react';
import { ModalShell } from './ui/ModalShell';

export const OPEN_SHORTCUTS_EVENT = 'rt:open-shortcuts';

const SHORTCUT_GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: 'Navigasi',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Buka pencarian & command palette' },
      { keys: ['Ctrl', 'Shift', 'O'], label: 'Mulai obrolan baru' },
      { keys: ['?'], label: 'Buka command palette (di luar kolom ketik)' },
      { keys: ['Alt', '/'], label: 'Tampilkan daftar pintasan ini' }
    ]
  },
  {
    title: 'Penulisan pesan',
    items: [
      { keys: ['Enter'], label: 'Kirim pesan' },
      { keys: ['Shift', 'Enter'], label: 'Baris baru' },
      { keys: ['/'], label: 'Buka menu perintah di kolom ketik' },
      { keys: ['Esc'], label: 'Tutup menu atau dialog' }
    ]
  }
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
      {children}
    </kbd>
  );
}

/** Self-contained modal: listens for Alt+/ or the `rt:open-shortcuts` window event. */
export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === '/') {
        event.preventDefault();
        setIsOpen(open => !open);
      }
    };
    const onOpen = () => setIsOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, onOpen);
    };
  }, []);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={close}
      title="Pintasan keyboard"
      subtitle="Bekerja lebih cepat tanpa meninggalkan keyboard"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {SHORTCUT_GROUPS.map(group => (
          <section key={group.title} aria-label={group.title}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {group.title}
            </h3>
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {group.items.map(item => (
                <li key={item.label} className="flex items-center justify-between gap-4 py-2 text-sm text-slate-700 dark:text-slate-200">
                  <span>{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map(key => <Kbd key={key}>{key}</Kbd>)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ModalShell>
  );
}
