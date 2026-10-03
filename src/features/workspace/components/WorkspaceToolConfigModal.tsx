import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { WorkspaceToolDefinition } from '../tools/toolTypes';

interface WorkspaceToolConfigModalProps {
  tool: WorkspaceToolDefinition | null;
  onCancel: () => void;
  onExecute: (input: Record<string, unknown>) => void;
}

function defaultsFor(tool: WorkspaceToolDefinition): Record<string, unknown> {
  return Object.fromEntries((tool.inputSchema ?? []).flatMap(field =>
    field.defaultValue !== undefined ? [[field.name, field.defaultValue]] : []
  ));
}

export const WorkspaceToolConfigModal: React.FC<WorkspaceToolConfigModalProps> = ({ tool, onCancel, onExecute }) => {
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setValues(tool ? defaultsFor(tool) : {});
  }, [tool]);

  if (!tool?.inputSchema?.length) return null;

  const updateValue = (name: string, value: unknown) => setValues(current => ({ ...current, [name]: value }));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="workspace-tool-config-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="workspace-tool-config-title" className="text-base font-bold text-slate-900 dark:text-slate-100">Konfigurasi {tool.name}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pilih parameter sebelum tool dijalankan.</p>
          </div>
          <button type="button" aria-label="Tutup" onClick={onCancel} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={event => { event.preventDefault(); onExecute(values); }} className="space-y-4">
          {tool.inputSchema.map(field => (
            <label key={field.name} className="block space-y-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
              <span>{field.label}{field.required ? ' *' : ''}</span>
              {field.description && <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{field.description}</span>}
              {field.type === 'enum' ? (
                <select required={field.required} value={String(values[field.name] ?? '')} onChange={event => updateValue(field.name, event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                  {!field.required && <option value="">Pilih…</option>}
                  {(field.options ?? []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === 'boolean' ? (
                <span className="flex items-center gap-2 pt-1"><input type="checkbox" checked={Boolean(values[field.name] ?? false)} onChange={event => updateValue(field.name, event.target.checked)} /> <span className="text-xs font-normal">Ya</span></span>
              ) : (
                <input type={field.type === 'number' ? 'number' : 'text'} required={field.required} value={String(values[field.name] ?? '')} onChange={event => updateValue(field.name, field.type === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
              )}
            </label>
          ))}
          <footer className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Batal</button>
            <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Jalankan</button>
          </footer>
        </form>
      </section>
    </div>
  );
};
