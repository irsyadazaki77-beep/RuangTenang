import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Layout, Palette, Printer } from 'lucide-react';
import {
  EditablePoster,
  PosterSection,
  PosterTheme,
  PosterSize,
  POSTER_THEMES,
  createPosterFromMarkdown
} from '../utils/posterModel';

interface ArtifactPosterEditorProps {
  content: string;
  title: string;
  onChange: (content: string) => void;
  onBlur: () => void;
}

export const ArtifactPosterEditor: React.FC<ArtifactPosterEditorProps> = ({
  content,
  title,
  onChange,
  onBlur
}) => {
  const poster = useMemo(() => createPosterFromMarkdown(content, title), [content, title]);
  const [activeSectionId, setActiveSectionId] = useState<string>(poster.sections[0]?.id || '');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const updatePoster = (updated: EditablePoster) => {
    onChange(JSON.stringify(updated, null, 2));
  };

  const updateSection = (id: string, patch: Partial<PosterSection>) => {
    const nextSections = poster.sections.map(s => s.id === id ? { ...s, ...patch } : s);
    updatePoster({ ...poster, sections: nextSections });
  };

  const addSection = () => {
    const newId = `sec-${Date.now()}`;
    const nextSections: PosterSection[] = [
      ...poster.sections,
      {
        id: newId,
        title: `Bagian Baru ${poster.sections.length + 1}`,
        content: 'Isi ringkasan informasi, poin-poin data, atau temuan penting...'
      }
    ];
    updatePoster({ ...poster, sections: nextSections });
    setActiveSectionId(newId);
  };

  const deleteSection = (id: string) => {
    if (poster.sections.length <= 1) return;
    const nextSections = poster.sections.filter(s => s.id !== id);
    updatePoster({ ...poster, sections: nextSections });
    if (activeSectionId === id) {
      setActiveSectionId(nextSections[0]?.id || '');
    }
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= poster.sections.length) return;
    const sections = [...poster.sections];
    const temp = sections[index];
    sections[index] = sections[target];
    sections[target] = temp;
    updatePoster({ ...poster, sections });
  };

  const handleDropSection = (dropIndex: number) => {
    if (draggedIdx === null || draggedIdx === dropIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const sections = [...poster.sections];
    const [removed] = sections.splice(draggedIdx, 1);
    sections.splice(dropIndex, 0, removed);
    updatePoster({ ...poster, sections });
    setActiveSectionId(removed.id);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const currentTheme = POSTER_THEMES[poster.theme] || POSTER_THEMES.academic_navy;

  const handlePrint = () => {
    document.body.classList.add('is-printing-poster');
    const cleanup = () => {
      document.body.classList.remove('is-printing-poster');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1000);
  };

  return (
    <section className="mx-auto flex min-h-[640px] max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900" aria-label="Poster Studio">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Layout className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Poster Ilmiah Studio</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {poster.sections.length} modul · Ukuran {poster.size} ({poster.orientation}) · Siap cetak & display konferensi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Theme Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800 text-xs">
            <Palette className="h-3.5 w-3.5 text-slate-400" />
            <select
              aria-label="Pilih tema poster"
              value={poster.theme}
              onChange={e => updatePoster({ ...poster, theme: e.target.value as PosterTheme })}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="academic_navy">Academic Navy</option>
              <option value="modern_emerald">Modern Emerald</option>
              <option value="minimal_slate">Minimal Slate</option>
              <option value="vibrant_indigo">Vibrant Indigo</option>
            </select>
          </div>

          {/* Orientation */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => updatePoster({ ...poster, orientation: 'portrait' })}
              className={`rounded px-2 py-1 font-medium transition-colors ${poster.orientation === 'portrait' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => updatePoster({ ...poster, orientation: 'landscape' })}
              className={`rounded px-2 py-1 font-medium transition-colors ${poster.orientation === 'landscape' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'}`}
            >
              Landscape
            </button>
          </div>

          {/* Size */}
          <select
            aria-label="Pilih ukuran kertas poster"
            value={poster.size}
            onChange={e => updatePoster({ ...poster, size: e.target.value as PosterSize })}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="A0">Ukuran A0 (Konferensi Internasional)</option>
            <option value="A1">Ukuran A1 (Standar Konferensi)</option>
            <option value="A2">Ukuran A2</option>
            <option value="A3">Ukuran A3 (Ringkas)</option>
          </select>

          {/* Cetak / PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Editor & Preview Split View */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left Control Sidebar */}
        <aside className="border-b border-slate-200 bg-slate-50/50 p-4 lg:border-b-0 lg:border-r dark:border-slate-800 dark:bg-slate-900/40 overflow-y-auto space-y-4">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Header & Penulis</h3>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Judul Utama Poster</label>
              <textarea
                value={poster.title}
                onChange={e => updatePoster({ ...poster, title: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Judul penelitian poster..."
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Penulis & Tim</label>
              <input
                type="text"
                value={poster.authors}
                onChange={e => updatePoster({ ...poster, authors: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Nama Peneliti, Pembimbing..."
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Institusi & Laboratorium</label>
              <input
                type="text"
                value={poster.institution}
                onChange={e => updatePoster({ ...poster, institution: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Nama Universitas, Fakultas, Lab..."
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Modul Poster</h3>
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
              >
                <Plus className="h-3 w-3" /> Tambah
              </button>
            </div>

            <div className="space-y-2">
              {poster.sections.map((section, idx) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIdx(idx);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIdx !== idx) setDragOverIdx(idx);
                  }}
                  onDragLeave={() => {
                    if (dragOverIdx === idx) setDragOverIdx(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropSection(idx);
                  }}
                  onDragEnd={() => {
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`cursor-grab active:cursor-grabbing rounded-xl border p-2.5 transition-all ${
                    dragOverIdx === idx ? 'ring-2 ring-indigo-500 scale-[1.01]' : ''
                  } ${draggedIdx === idx ? 'opacity-40 border-dashed border-indigo-400' : ''} ${
                    activeSectionId === section.id
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="line-clamp-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {idx + 1}. {section.title || 'Modul Tanpa Judul'}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => { e.stopPropagation(); moveSection(idx, -1); }}
                        className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === poster.sections.length - 1}
                        onClick={(e) => { e.stopPropagation(); moveSection(idx, 1); }}
                        className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={poster.sections.length <= 1}
                        onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                        className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {activeSectionId === section.id && (
                    <div className="mt-2.5 space-y-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                      <input
                        type="text"
                        value={section.title}
                        onChange={e => updateSection(section.id, { title: e.target.value })}
                        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-semibold"
                        placeholder="Nama bagian..."
                      />
                      <textarea
                        value={section.content}
                        onChange={e => updateSection(section.id, { content: e.target.value })}
                        rows={4}
                        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs leading-relaxed"
                        placeholder="Uraian isi atau bullet points..."
                      />

                      {/* Image & Span Settings */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Gambar / Diagram Pendukung</label>
                        <input
                          type="text"
                          value={section.imageUrl || ''}
                          onChange={e => updateSection(section.id, { imageUrl: e.target.value })}
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px]"
                          placeholder="URL gambar (http... atau /api/ai/images/...)"
                        />
                        {section.imageUrl && (
                          <input
                            type="text"
                            value={section.imageCaption || ''}
                            onChange={e => updateSection(section.id, { imageCaption: e.target.value })}
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px]"
                            placeholder="Keterangan gambar (caption)..."
                          />
                        )}
                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <span>Lebar Modul:</span>
                          <button
                            type="button"
                            onClick={() => updateSection(section.id, { columnSpan: section.columnSpan === 2 ? 1 : 2 })}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                              section.columnSpan === 2
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {section.columnSpan === 2 ? 'Lebar 2 Kolom' : '1 Kolom Standar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Live Interactive Canvas */}
        <div className="overflow-auto bg-slate-200/70 p-4 sm:p-6 lg:p-8 dark:bg-slate-950 flex justify-center" onBlur={onBlur}>
          <div
            className={`w-full max-w-4xl bg-white text-slate-900 shadow-2xl transition-all rounded-xl overflow-hidden print:m-0 print:w-full print:max-w-none print:shadow-none print:rounded-none flex flex-col ${
              poster.orientation === 'landscape' ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]'
            }`}
            style={{
              minHeight: poster.orientation === 'landscape' ? '560px' : '792px'
            }}
          >
            {/* Poster Header */}
            <header className={`${currentTheme.headerBg} ${currentTheme.headerText} p-6 sm:p-8 text-center relative border-b-4`} style={{ borderColor: currentTheme.accent }}>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-snug">
                {poster.title || 'Judul Penelitian Poster'}
              </h1>
              <p className="mt-2 text-xs sm:text-sm font-semibold opacity-90">
                {poster.authors || 'Nama Penulis / Tim'}
              </p>
              <p className="mt-0.5 text-[11px] sm:text-xs opacity-75 font-mono">
                {poster.institution || 'Institusi / Departemen'}
              </p>
            </header>

            {/* Poster Body Columns */}
            <main
              className={`flex-1 p-5 sm:p-6 grid gap-4 bg-slate-50/50 ${
                poster.orientation === 'landscape' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
              }`}
            >
              {poster.sections.map((section, idx) => (
                <div
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`flex flex-col rounded-xl border bg-white p-4 shadow-2xs transition-all hover:shadow-md cursor-pointer ${
                    section.columnSpan === 2 ? 'md:col-span-2' : ''
                  } ${
                    activeSectionId === section.id
                      ? 'ring-2 ring-indigo-500 border-indigo-400'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white shadow-2xs"
                      style={{ backgroundColor: currentTheme.accent }}
                    >
                      {idx + 1}
                    </span>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                      {section.title}
                    </h2>
                  </div>

                  {section.imageUrl && (
                    <figure className="my-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-center">
                      <img
                        src={section.imageUrl}
                        alt={section.imageCaption || section.title}
                        className="max-h-56 w-full object-contain bg-white"
                        loading="lazy"
                      />
                      {section.imageCaption && (
                        <figcaption className="p-1.5 text-[10px] font-medium italic text-slate-500">
                          {section.imageCaption}
                        </figcaption>
                      )}
                    </figure>
                  )}

                  <div className="flex-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                    {section.content || '(Belum ada konten)'}
                  </div>
                </div>
              ))}
            </main>

            {/* Poster Footer Note */}
            <footer className="border-t border-slate-200 bg-white px-6 py-2.5 text-center text-[10px] text-slate-400 flex items-center justify-between">
              <span>Disusun dengan RuangTenang Workspace · Poster Ilmiah Studio</span>
              <span>Format: {poster.size} ({poster.orientation})</span>
            </footer>
          </div>
        </div>
      </div>
    </section>
  );
};

export const ArtifactPosterPreview: React.FC<{ content: string }> = ({ content }) => {
  try {
    const poster = JSON.parse(content) as EditablePoster;
    if (!Array.isArray(poster.sections)) {
      return <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Format poster tidak valid.</p>;
    }
    const theme = POSTER_THEMES[poster.theme] || POSTER_THEMES.academic_navy;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between border-b pb-2 text-xs text-slate-500">
          <span>Poster Ilmiah · {poster.sections.length} modul</span>
          <span>Format: {poster.size} ({poster.orientation})</span>
        </div>
        <header className={`${theme.headerBg} ${theme.headerText} rounded-xl p-6 text-center border-b-4`} style={{ borderColor: theme.accent }}>
          <h1 className="text-xl sm:text-2xl font-black">{poster.title}</h1>
          <p className="mt-2 text-xs sm:text-sm font-semibold opacity-90">{poster.authors}</p>
          <p className="text-[11px] opacity-75 font-mono">{poster.institution}</p>
        </header>
        <div className={`mt-5 grid gap-4 ${poster.orientation === 'landscape' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
          {poster.sections.map((sec, idx) => (
            <div key={sec.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <h2 className="mb-2 text-xs font-bold text-slate-800 dark:text-slate-200">{idx + 1}. {sec.title}</h2>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">{sec.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  } catch {
    return <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Format poster tidak valid.</p>;
  }
};
