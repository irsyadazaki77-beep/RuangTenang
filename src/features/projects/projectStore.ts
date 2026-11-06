import { useState, useEffect, useCallback } from 'react';
import { safeLocalStorage } from '../../lib/storage';

export interface AiProject {
  id: string;
  name: string;
  description: string;
  customInstructions: string;
  pinnedContext: string;
  defaultFocus: 'RUANG_TENANG' | 'RUANG_KERJA' | 'UNIFIED';
  chatIds: string[];
  updatedAt: string;
}

const PROJECTS_STORAGE_KEY = 'ruang_ai_projects_v1';
const ACTIVE_PROJECT_KEY = 'ruang_ai_active_project_id_v1';
const PROJECTS_UPDATED_EVENT = 'ruang_ai_projects_updated';

const DEFAULT_PROJECTS: AiProject[] = [
  {
    id: 'proj_skripsi_riset',
    name: 'Skripsi & Metodologi Bab 1–3',
    description: 'Ruang riset terstruktur untuk penyusunan latar belakang, rumusan masalah, kajian literatur, dan metodologi.',
    customInstructions:
      'Gunakan bahasa Indonesia ilmiah baku (EYD V). Strukturkan argumen secara deduktif (Das Sollen, Das Sein, Research Gap, dan Solusi). Sertakan sitasi APA 7th Edition dan buat draf panjang di dalam blok Artifact Canvas.',
    pinnedContext: 'Fokus penelitian: Transformasi digital & kesejahteraan akademik mahasiswa perguruan tinggi di Indonesia.',
    defaultFocus: 'RUANG_KERJA',
    chatIds: [],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'proj_refleksi_regulasi',
    name: 'Jurnal Refleksi & Regulasi Diri',
    description: 'Pendampingan reflektif berbasis CBT untuk mengelola beban akademik, kecemasan skripsi, dan keseimbangan hidup.',
    customInstructions:
      'Dengarkan dengan penuh empati tanpa menghakimi. Bantu identifikasi pemicu (trigger) dan pola pikir otomatis secara lembut, lalu tawarkan satu langkah regulasi diri yang realistis dan menenangkan.',
    pinnedContext: 'Prioritas: Menjaga ritme istirahat, mengenali tanda kelelahan dini, dan membangun kebiasaan belajar yang ramah energi.',
    defaultFocus: 'RUANG_TENANG',
    chatIds: [],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'proj_koding_analisis',
    name: 'Eksplorasi Kode & Analisis Data',
    description: 'Pengolahan data statistik penelitian, skrip Python/R/TypeScript, dan visualisasi hasil eksperimen.',
    customInstructions:
      'Tulis kode yang bersih, modular, dan terdokumentasi lengkap dengan penjelasan kompleksitas serta cara menjalankannya. Sajikan blok kode utuh di Canvas.',
    pinnedContext: 'Stack utama: Python (Pandas, SciPy, Scikit-Learn), R, SQL, dan TypeScript.',
    defaultFocus: 'UNIFIED',
    chatIds: [],
    updatedAt: new Date().toISOString()
  }
];

export function getStoredProjects(): AiProject[] {
  try {
    const raw = safeLocalStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) {
      safeLocalStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS));
      return DEFAULT_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PROJECTS;
    return parsed;
  } catch {
    return DEFAULT_PROJECTS;
  }
}

export function saveStoredProjects(projects: AiProject[]): void {
  try {
    safeLocalStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PROJECTS_UPDATED_EVENT));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function getActiveProjectId(): string | null {
  try {
    return safeLocalStorage.getItem(ACTIVE_PROJECT_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveProjectId(projectId: string | null): void {
  try {
    if (projectId) {
      safeLocalStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    } else {
      safeLocalStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PROJECTS_UPDATED_EVENT));
    }
  } catch {
    // ignore
  }
}

export function assignChatToProject(chatId: string, projectId: string | null): void {
  if (!chatId) return;
  const current = getStoredProjects();
  const next = current.map(proj => {
    const filteredIds = proj.chatIds.filter(id => id !== chatId);
    if (proj.id === projectId) {
      return {
        ...proj,
        chatIds: [chatId, ...filteredIds],
        updatedAt: new Date().toISOString()
      };
    }
    return { ...proj, chatIds: filteredIds };
  });
  saveStoredProjects(next);
}

export function buildProjectInstructionsBlock(project: AiProject | null | undefined): string | undefined {
  if (!project) return undefined;
  const parts: string[] = [];
  parts.push(`[PROYEK AKTIF: ${project.name}]`);
  if (project.description.trim()) {
    parts.push(`Deskripsi Proyek: ${project.description.trim()}`);
  }
  if (project.customInstructions.trim()) {
    parts.push(`Instruksi Kustom Proyek:\n${project.customInstructions.trim()}`);
  }
  if (project.pinnedContext.trim()) {
    parts.push(`Pengetahuan & Konteks Disematkan:\n${project.pinnedContext.trim()}`);
  }
  return parts.join('\n\n');
}

export function useProjects() {
  const [projects, setProjects] = useState<AiProject[]>(() => getStoredProjects());
  const [activeProjectId, setActiveProjectState] = useState<string | null>(() => getActiveProjectId());

  useEffect(() => {
    const sync = () => {
      setProjects(getStoredProjects());
      setActiveProjectState(getActiveProjectId());
    };
    window.addEventListener(PROJECTS_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const selectProject = useCallback((projectId: string | null) => {
    setActiveProjectId(projectId);
    setActiveProjectState(projectId);
  }, []);

  const createProject = useCallback((input: Omit<AiProject, 'id' | 'chatIds' | 'updatedAt'>) => {
    const newProject: AiProject = {
      ...input,
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      chatIds: [],
      updatedAt: new Date().toISOString()
    };
    const next = [newProject, ...getStoredProjects()];
    saveStoredProjects(next);
    setActiveProjectId(newProject.id);
    return newProject;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Omit<AiProject, 'id'>>) => {
    const next = getStoredProjects().map(proj =>
      proj.id === id ? { ...proj, ...patch, updatedAt: new Date().toISOString() } : proj
    );
    saveStoredProjects(next);
  }, []);

  const deleteProject = useCallback((id: string) => {
    const next = getStoredProjects().filter(proj => proj.id !== id);
    saveStoredProjects(next);
    if (getActiveProjectId() === id) {
      setActiveProjectId(null);
    }
  }, []);

  const assignChat = useCallback((chatId: string, projectId: string | null) => {
    assignChatToProject(chatId, projectId);
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  return {
    projects,
    activeProject,
    activeProjectId,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    assignChat
  };
}
