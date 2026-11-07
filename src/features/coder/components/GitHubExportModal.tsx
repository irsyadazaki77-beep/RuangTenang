import React, { useState, useEffect } from 'react';
import {
  Github,
  Lock,
  Globe,
  Copy,
  Check,
  X,
  ExternalLink,
  Loader2,
  Key,
  Download
} from 'lucide-react';
import { safeLocalStorage } from '../../../lib/storage';

const GITHUB_TOKEN_STORAGE_KEY = 'ruangcoder_github_pat';

export interface GitHubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, string>;
  projectName: string;
  onDownloadZip: () => void;
  isDark?: boolean;
}

export const GitHubExportModal: React.FC<GitHubExportModalProps> = ({
  isOpen,
  onClose,
  files,
  projectName,
  onDownloadZip,
  isDark = true
}) => {
  const [token, setToken] = useState<string>(() => safeLocalStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || '');
  const [description, setDescription] = useState<string>(`Tugas Kuliah: ${projectName} - Dibuat via Ruang Coder`);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [gistUrl, setGistUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      safeLocalStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token);
    }
  }, [token]);

  if (!isOpen) return null;

  const handlePublishGist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('GitHub Personal Access Token (PAT) dengan izin "gist" diperlukan.');
      return;
    }

    const gistFiles: Record<string, { content: string }> = {};
    for (const [name, content] of Object.entries(files)) {
      if (content && content.trim()) {
        gistFiles[name] = { content };
      }
    }

    if (Object.keys(gistFiles).length === 0) {
      setError('Tidak ada berkas yang dapat diekspor.');
      return;
    }

    setError('');
    setIsLoading(true);
    setGistUrl('');

    try {
      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token.trim()}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description.trim() || 'Ruang Coder Project',
          public: isPublic,
          files: gistFiles
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Gagal membuat Gist (Status ${res.status}). Pastikan token valid.`);
      }

      const data = await res.json();
      setGistUrl(data.html_url);
    } catch (err: any) {
      setError(err?.message || 'Gagal menghubungi GitHub API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(gistUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl flex flex-col overflow-hidden max-h-[85vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-800 text-white">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Ekspor ke GitHub Gist / Repositori</h3>
              <p className="text-[11px] text-slate-400">Publikasikan kode tugas untuk pengumpulan link praktikum</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {gistUrl ? (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Check className="w-4 h-4" />
                <span>GitHub Gist Berhasil Dibuat!</span>
              </div>
              <p className="text-xs text-slate-300">
                Tautan Gist publik Anda siap dibagikan ke dosen, asisten lab, atau teman kelompok:
              </p>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={gistUrl}
                  className="flex-1 bg-transparent text-xs text-sky-400 font-mono focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                  title="Salin Tautan"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={gistUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer"
                  title="Buka di GitHub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePublishGist} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-300">Deskripsi Gist</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-hidden focus:ring-1 focus:ring-sky-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  placeholder="Deskripsi tugas atau modul koding"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>GitHub Personal Access Token (PAT)</span>
                  </span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=gist&description=RuangCoder"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Buat Token Gist</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx..."
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono focus:outline-hidden focus:ring-1 focus:ring-sky-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Token hanya disimpan di browser lokal Anda untuk izin membuat Gist.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gist_visibility"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    className="accent-sky-500"
                  />
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>Publik (Dapat diakses siapa saja)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gist_visibility"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    className="accent-purple-500"
                  />
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Rahasia / Unlisted</span>
                </label>
              </div>

              {error && <p className="text-xs text-rose-400 bg-rose-950/20 p-2 rounded-lg border border-rose-900/40">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                <span>{isLoading ? 'Membuat Gist...' : 'Publikasikan ke GitHub Gist'}</span>
              </button>
            </form>
          )}

          <div className="border-t border-slate-800 pt-3">
            <div className="text-xs font-semibold text-slate-400 mb-2">Alternatif Unduhan Offline:</div>
            <button
              type="button"
              onClick={() => {
                onDownloadZip();
                onClose();
              }}
              className="w-full py-2 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Berkas ZIP Proyek</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
