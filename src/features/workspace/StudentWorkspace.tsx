import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Sparkles, 
  PanelRightClose, 
  PanelRightOpen, 
  FilePlus, 
  Layers, 
  Send, 
  StopCircle, 
  Trash2, 
  FileCode, 
  FileText, 
  Paperclip, 
  ChevronRight, 
  X,
  RefreshCw,
  Quote,
  ListTree,
  ChevronDown,
  HeartHandshake,
  MoreVertical,
  BookOpen
} from 'lucide-react';
import { WorkspaceArtifact, ArtifactType, AcademicTaskTemplate, WorkspaceMode } from './types';
import { ArtifactCanvas } from './components/ArtifactCanvas';
import { ACADEMIC_TEMPLATES } from './components/AcademicToolsBar';
import { WorkspaceTemplateModal } from './components/WorkspaceTemplateModal';
import { parseArtifactsFromText } from './utils/artifactParser';
import { UserSession } from '../../types';
import { ChatStreamingClient } from '../chat/services/chatStreamingClient';
import { LazyMarkdown } from '../../components/common/LazyMarkdown';
import { useToast } from '../../components/Toast';
import { Chat, Message } from '../chat/types';
import { apiClient } from '../../lib/apiClient';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { detectAcademicDistress, DistressDetectionResult } from './utils/distressDetector';
import { AcademicDistressBanner } from './components/AcademicDistressBanner';
import { MicroBreathingModal } from './components/MicroBreathingModal';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { RhythmicTypingIndicator } from '../../components/ui/RhythmicTypingIndicator';

interface StudentWorkspaceProps {
  user: UserSession | null;
  chats?: Chat[];
  setChats?: React.Dispatch<React.SetStateAction<Chat[]>>;
  onSwitchMode?: (mode: WorkspaceMode) => void;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void;
}

const DEFAULT_WELCOME_ARTIFACT: WorkspaceArtifact = {
  id: 'art_welcome',
  title: 'Panduan Asisten RuangKerja',
  type: 'DOCUMENT',
  content: `# Selamat Datang di RuangKerja Mahasiswa 🎓
*Selesaikan Tugas Akademik & Riset Secara Terstruktur Tanpa Cemas*

> **Filosofi RuangKerja**: *"Ketika lelah dan cemas, ada RuangTenang untuk pulih. Ketika siap kembali berjuang, ada RuangKerja untuk menuntaskan draf skripsi, resume paper, dan debugging kode secara tenang, teratur, dan efisien."*

---

### 🚀 Cara Kerja RuangKerja:
1. **Live Artifact Canvas (Panel Kanan)**: Setiap draf dokumen, resume jurnal, format sitasi, atau kode program otomatis muncul di panel kanvas ini. Anda dapat mengedit, menyalin, merevisi bersama AI, serta mengekspornya langsung ke Word (.docx skripsi standar 4-4-3-3), PDF, Markdown, atau BibTeX.
2. **Template Akademik Terstruktur**:
   - 📑 **Bedah Paper & Jurnal**: Ekstrak latar belakang masalah, metodologi riset, temuan kunci, dan celah penelitian.
   - 🖋️ **Format Sitasi Ilmiah**: Susun daftar pustaka otomatis berstandar APA 7th, IEEE, atau Harvard lengkap dengan berkas .bib / .ris untuk Zotero & Mendeley.
   - 💻 **Debug & Optimasi Kode**: Temukan letak bug, jelaskan alur logika, dan optimasi efisiensi fungsi secara aman.
   - 📐 **Struktur Skripsi / Proposal**: Bimbingan merancang bab pendahuluan, rumusan masalah piramida terbalik, dan literatur.
3. **Revisi Cepat**: Minta AI memperhalus tulisan dengan nada baku KBBI atau mengoptimasi algoritma Big-O langsung menggunakan menu aksi di atas dokumen.

*Pilihlah salah satu kartu aksi di layar obrolan atau ketik langsung tugas akademik Anda di kolom composer.*`,
  version: 1,
  updatedAt: new Date().toISOString()
};

export function StudentWorkspace({ user, onSwitchMode, onOpenSidebar }: StudentWorkspaceProps) {
  const { chatId } = useParams<{ chatId?: string }>();
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();
  const scrollRafRef = useRef<number | null>(null);

  // Core Canvas & Workspace State
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([DEFAULT_WELCOME_ARTIFACT]);
  const [activeArtifactId, setActiveArtifactId] = useState<string>(DEFAULT_WELCOME_ARTIFACT.id);
  const [isCanvasOpen, setIsCanvasOpen] = useState<boolean>(true);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState<boolean>(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'canvas'>('chat');
  const [hasUnreadArtifact, setHasUnreadArtifact] = useState<boolean>(false);

  // Popover & Dropdown State
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showNewArtifactMenu, setShowNewArtifactMenu] = useState<boolean>(false);
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<AcademicTaskTemplate | null>(null);
  const [templateInputSnippet, setTemplateInputSnippet] = useState('');

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const newArtifactMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
        setShowDeleteConfirm(false);
      }
      if (newArtifactMenuRef.current && !newArtifactMenuRef.current.contains(e.target as Node)) {
        setShowNewArtifactMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Academic Quick Suggestions
  const ACADEMIC_PROMPT_PILLS = [
    {
      label: "Bab 1: 4 Pilar Latar Belakang",
      prompt: "Tolong susunkan draf Latar Belakang Masalah (Bab 1) berbobot ilmiah tinggi untuk topik penelitian saya menggunakan 4 pilar argumen (Das Sollen, Das Sein, Research Gap, Urgensi & Solusi):\n\n[Tuliskan topik atau rancangan judul skripsi Anda di sini]"
    },
    {
      label: "Struktur Bab 2 Tinjauan Pustaka",
      prompt: "Bantu saya menyusun kerangka dan struktur Bab 2 (Tinjauan Pustaka / Landasan Teori) secara sistematis untuk topik penelitian saya:\n\n[Tuliskan topik atau judul skripsi Anda di sini]"
    },
    {
      label: "Parafrase Akademik PUEBI",
      prompt: "Tolong parafrase paragraf berikut dengan gaya penulisan ilmiah formal, sesuai kaidah PUEBI dan KBBI, serta pertahankan makna aslinya agar lolos uji orisinalitas/Turnitin:\n\n[Tempelkan draf teks di sini]"
    },
    {
      label: "Bedah Metodologi Jurnal",
      prompt: "Bantu saya membedah dan meringkas jurnal/paper ilmiah ini: ekstrak latar belakang masalah, urgensi riset, metodologi & instrumen analisis, temuan kunci, serta celah/keterbatasan penelitian:\n\n[Tempelkan abstrak atau isi jurnal di sini]"
    },
    {
      label: "Format Sitasi APA 7th / IEEE",
      prompt: "Bantu saya menyusun daftar pustaka dan format sitasi ilmiah (dalam standar APA 7th Edition dan IEEE) dari referensi berikut:\n\n[Tuliskan judul artikel, penulis, tahun rilis, nama jurnal/penerbit, dan DOI/URL]"
    }
  ];

  const handleApplyPromptPill = (promptText: string) => {
    setInputText(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 50);
    }
  };

  // Academic Distress State
  const [distressResult, setDistressResult] = useState<DistressDetectionResult>({ isDistressed: false, triggerKeywords: [], suggestedAction: '' });
  const [isDistressDismissed, setIsDistressDismissed] = useState<boolean>(false);
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState<boolean>(false);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content: `Halo ${user?.name ? user.name.split(' ')[0] : 'Rekan Mahasiswa'}! 👋 Saya asisten akademik RuangKerja. 

Ada tugas kuliah, draf skripsi, resume jurnal, atau kode yang butuh di-review dan dioptimasi hari ini? Ketik langsung tugas Anda atau pilih instruksi di bawah.`,
      createdAt: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeStreamingMessage, setActiveStreamingMessage] = useState<Message | null>(null);

  // Drag-and-drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Real-time Academic Distress Detection
  useEffect(() => {
    if (!inputText.trim() || isDistressDismissed) {
      if (!inputText.trim()) setIsDistressDismissed(false);
      return;
    }
    const detected = detectAcademicDistress(inputText);
    if (detected.isDistressed) {
      setDistressResult(detected);
    }
  }, [inputText, isDistressDismissed]);

  const streamingClientRef = useRef<ChatStreamingClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);

  // Auto-expand textarea (min 44px, max 160px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 160)}px`;
    }
  }, [inputText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
    e.target.value = '';
  };

  const processSelectedFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setAttachedFile({ name: file.name, content: text });
      showToast(`Dokumen "${file.name}" dilampirkan`, 'info');
    };
    reader.onerror = () => {
      showToast('Gagal membaca dokumen', 'error');
    };
    reader.readAsText(file);
  };

  const activeArtifact = artifacts.find(a => a.id === activeArtifactId) || artifacts[0] || null;

  // Listen for template triggers
  useEffect(() => {
    const handleTemplateEvent = (e: any) => {
      const templateId = e.detail;
      const found = ACADEMIC_TEMPLATES.find(t => t.id === templateId);
      if (found) {
        setSelectedTemplateForModal(found);
        setTemplateInputSnippet('');
      }
    };

    window.addEventListener('ruangkerja_trigger_template', handleTemplateEvent);
    return () => window.removeEventListener('ruangkerja_trigger_template', handleTemplateEvent);
  }, []);

  // Load chat history & persisted artifacts
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        let persistedArtifacts: WorkspaceArtifact[] = [];
        try {
          const artUrl = chatId 
            ? `/api/v1/workspace/artifacts?chatId=${chatId}` 
            : `/api/v1/workspace/artifacts`;
          const artRes = await apiClient.get<any>(artUrl);
          if (artRes.success && Array.isArray(artRes.data)) {
            persistedArtifacts = artRes.data;
          }
        } catch (err) {
          console.warn('Failed to load persisted artifacts:', err);
        }

        let loadedMsgs: Message[] = [];
        if (chatId) {
          const res = await apiClient.get<any>(`/api/v1/chat/${chatId}/messages?limit=50`);
          if (res.success && res.data && Array.isArray(res.data.data)) {
            loadedMsgs = res.data.data;
          }
        }

        if (isCancelled) return;

        if (loadedMsgs.length > 0) {
          setMessages(loadedMsgs);
        }

        const messageParsedArtifacts: WorkspaceArtifact[] = [];
        loadedMsgs.forEach(m => {
          if (m.role === 'assistant' && m.content) {
            const { artifacts: parsed } = parseArtifactsFromText(m.content, false);
            messageParsedArtifacts.push(...parsed);
          }
        });

        const combined: WorkspaceArtifact[] = [...persistedArtifacts];
        messageParsedArtifacts.forEach(msgArt => {
          const exists = combined.some(a => a.id === msgArt.id || a.title === msgArt.title);
          if (!exists) {
            combined.push(msgArt);
            if (chatId) {
              apiClient.post('/api/v1/workspace/artifacts', {
                id: msgArt.id,
                chatId,
                title: msgArt.title,
                type: msgArt.type,
                language: msgArt.language,
                content: msgArt.content
              }).catch(() => {});
            }
          }
        });

        if (combined.length > 0) {
          setArtifacts([DEFAULT_WELCOME_ARTIFACT, ...combined]);
          setActiveArtifactId(combined[0].id);
        } else {
          setArtifacts([DEFAULT_WELCOME_ARTIFACT]);
          setActiveArtifactId(DEFAULT_WELCOME_ARTIFACT.id);
        }
      } catch (e) {
        console.warn('Failed to load workspace data:', e);
      }
    };

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [chatId]);

  // Auto scroll to latest chat message
  useEffect(() => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      if (!messagesEndRef.current) return;
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    });

    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [messages, activeStreamingMessage]);

  const handleUpdateActiveArtifact = (updated: Partial<WorkspaceArtifact>) => {
    if (!activeArtifact) return;
    setArtifacts(prev => prev.map(a => {
      if (a.id === activeArtifact.id) {
        return {
          ...a,
          ...updated,
          updatedAt: new Date().toISOString()
        };
      }
      return a;
    }));
  };

  const handleSaveArtifact = async (content: string, title?: string) => {
    if (!activeArtifact || activeArtifact.id === 'art_welcome') return;

    try {
      const res = await apiClient.put<any>(`/api/v1/workspace/artifacts/${activeArtifact.id}`, {
        title: title || activeArtifact.title,
        content,
        language: activeArtifact.language,
        type: activeArtifact.type,
        chatId: chatId || activeArtifact.chatId,
        createVersionSnapshot: false
      });

      if (res.success && res.data) {
        const saved = res.data;
        setArtifacts(prev => prev.map(a => a.id === activeArtifact.id ? { ...a, ...saved } : a));
      }
    } catch (err) {
      console.warn('Artifact save error:', err);
    }
  };

  const handleRollbackArtifact = async (targetVersion: number) => {
    if (!activeArtifact || activeArtifact.id === 'art_welcome') return;
    try {
      const res = await apiClient.post<any>(`/api/v1/workspace/artifacts/${activeArtifact.id}/rollback`, {
        targetVersion
      });

      if (res.success && res.data) {
        const rolledBack = res.data;
        setArtifacts(prev => prev.map(a => a.id === activeArtifact.id ? rolledBack : a));
        showToast(`Versi ${targetVersion} berhasil dipulihkan`, 'success');
      }
    } catch (err: any) {
      showToast(`Gagal memulihkan versi: ${err?.message || 'Terjadi kendala'}`, 'error');
      throw err;
    }
  };

  const handleCreateNewArtifact = async (type: ArtifactType = 'DOCUMENT') => {
    setShowNewArtifactMenu(false);
    const newId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newArt: WorkspaceArtifact = {
      id: newId,
      chatId: chatId || undefined,
      title: type === 'CODE' ? 'Skrip Kode Baru' : type === 'CITATION' ? 'Daftar Sitasi Ilmiah' : 'Draf Dokumen Baru',
      type,
      language: type === 'CODE' ? 'python' : undefined,
      content: type === 'CODE' ? `# Tulis kode program di sini\ndef main():\n    print("Hello RuangKerja")\n\nif __name__ == "__main__":\n    main()` : type === 'CITATION' ? `# Daftar Sitasi & Bibliografi\n\n[1] Nama Penulis, "Judul Artikel Ilmiah," Nama Jurnal, vol. 1, no. 1, pp. 1-10, 2026. DOI: 10.1000/182` : `# Draf Dokumen Baru\n\nTulis catatan atau draf akademik Anda di sini...`,
      version: 1,
      updatedAt: new Date().toISOString()
    };

    setArtifacts(prev => [newArt, ...prev]);
    setActiveArtifactId(newArt.id);
    setIsCanvasOpen(true);
    setMobileActiveTab('canvas');

    try {
      const res = await apiClient.post<any>('/api/v1/workspace/artifacts', {
        id: newArt.id,
        chatId: chatId || undefined,
        title: newArt.title,
        type: newArt.type,
        language: newArt.language,
        content: newArt.content
      });
      if (res.success && res.data) {
        setArtifacts(prev => prev.map(a => a.id === newArt.id ? res.data : a));
      }
    } catch (err) {
      console.warn('Failed to persist new artifact immediately:', err);
    }

    showToast('Draf baru dibuka di Canvas', 'success');
  };

  const executeSendMessage = async (userPrompt: string, customSystemNote?: string) => {
    if (!userPrompt.trim() || isStreaming) return;

    const userMsgId = `user_${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userPrompt.trim(),
      createdAt: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setIsStreaming(true);

    const assistantMsgId = `asst_${Date.now()}`;
    let accumulatedText = '';

    if (!streamingClientRef.current) {
      streamingClientRef.current = new ChatStreamingClient();
    }

    try {
      await streamingClientRef.current.stream(
        {
          message: customSystemNote ? `${userPrompt}\n\n[Catatan Konteks Canvas: ${customSystemNote}]` : userPrompt,
          chatId: chatId || undefined,
          chatMode: 'RuangKerja',
          responseStyle: 'Mendalam'
        },
        {
          onMessageStart: () => {
            setActiveStreamingMessage({
              id: assistantMsgId,
              role: 'assistant',
              content: '',
              createdAt: new Date()
            });
          },
          onChunk: (chunk: string) => {
            accumulatedText += chunk;
            setActiveStreamingMessage({
              id: assistantMsgId,
              role: 'assistant',
              content: accumulatedText,
              createdAt: new Date()
            });

            // Parse live artifacts during stream
            const { artifacts: extracted, activeStreamingArtifact } = parseArtifactsFromText(accumulatedText, true);

            if (activeStreamingArtifact) {
              setIsCanvasOpen(true);
              setHasUnreadArtifact(true);
              setArtifacts(prev => {
                const existingIdx = prev.findIndex(a => a.id === activeStreamingArtifact.id || a.title === activeStreamingArtifact.title);
                if (existingIdx !== -1) {
                  const copy = [...prev];
                  copy[existingIdx] = {
                    ...copy[existingIdx],
                    content: activeStreamingArtifact.content,
                    type: activeStreamingArtifact.type,
                    language: activeStreamingArtifact.language
                  };
                  return copy;
                } else {
                  return [activeStreamingArtifact, ...prev];
                }
              });
              setActiveArtifactId(activeStreamingArtifact.id);
            } else if (extracted.length > 0) {
              setIsCanvasOpen(true);
              setHasUnreadArtifact(true);
              setArtifacts(prev => {
                let updated = [...prev];
                extracted.forEach(newArt => {
                  const idx = updated.findIndex(a => a.id === newArt.id || a.title === newArt.title);
                  if (idx !== -1) {
                    updated[idx] = newArt;
                  } else {
                    updated = [newArt, ...updated];
                  }
                });
                return updated;
              });
              setActiveArtifactId(extracted[0].id);
            }
          },
          onMessageComplete: (finalText: string) => {
            setIsStreaming(false);
            setActiveStreamingMessage(null);

            const { cleanedText, artifacts: extracted } = parseArtifactsFromText(finalText, false);

            setMessages(prev => [
              ...prev,
              {
                id: assistantMsgId,
                role: 'assistant',
                content: cleanedText || finalText,
                createdAt: new Date()
              }
            ]);

            if (extracted.length > 0) {
              setHasUnreadArtifact(true);
              extracted.forEach(async (newArt) => {
                try {
                  const targetChatId = chatId;
                  const res = await apiClient.post<any>('/api/v1/workspace/artifacts', {
                    id: newArt.id,
                    chatId: targetChatId || undefined,
                    title: newArt.title,
                    type: newArt.type,
                    language: newArt.language,
                    content: newArt.content
                  });
                  if (res.success && res.data) {
                    setArtifacts(prev => {
                      const idx = prev.findIndex(a => a.id === res.data.id || a.title === res.data.title);
                      if (idx !== -1) {
                        const copy = [...prev];
                        copy[idx] = res.data;
                        return copy;
                      }
                      return [res.data, ...prev];
                    });
                  }
                } catch (err) {
                  console.warn('Failed to save streamed artifact to DB:', err);
                }
              });

              setArtifacts(prev => {
                let updated = [...prev];
                extracted.forEach(newArt => {
                  const idx = updated.findIndex(a => a.title === newArt.title || a.id === newArt.id);
                  if (idx !== -1) {
                    updated[idx] = {
                      ...updated[idx],
                      content: newArt.content,
                      version: (updated[idx].version || 1) + 1,
                      updatedAt: new Date().toISOString()
                    };
                  } else {
                    updated = [newArt, ...updated];
                  }
                });
                return updated;
              });
              setActiveArtifactId(extracted[0].id);
              setIsCanvasOpen(true);
            }
          },
          onError: (errMsg: string) => {
            setIsStreaming(false);
            setActiveStreamingMessage(null);
            showToast(`Kesalahan komunikasi: ${errMsg}`, 'error');
            setMessages(prev => [
              ...prev,
              {
                id: `err_${Date.now()}`,
                role: 'assistant',
                content: `⚠️ Terjadi kendala komunikasi: ${errMsg}. Silakan coba kirim ulang.`,
                error: true,
                createdAt: new Date()
              }
            ]);
          }
        }
      );
    } catch (_err: any) {
      setIsStreaming(false);
      setActiveStreamingMessage(null);
      showToast('Gagal memproses permintaan AI.', 'error');
    }
  };

  const handleSelectAcademicTemplate = (template: AcademicTaskTemplate, customInput?: string) => {
    let finalPrompt = template.prompt;
    if (customInput) {
      finalPrompt += `\n${customInput}`;
    }
    executeSendMessage(finalPrompt);
  };

  const handleRequestRevision = (revisionPrompt: string, currentArt: WorkspaceArtifact) => {
    const revisionFullPrompt = `Saya ingin merevisi artefak "${currentArt.title}" (${currentArt.type}).
Instruksi revisi: ${revisionPrompt}

Konten Artefak Saat Ini:
\`\`\`${currentArt.language || ''}
${currentArt.content}
\`\`\`

Mohon berikan hasil revisi lengkapnya yang dibungkus dalam tag:
<artifact type="${currentArt.type.toLowerCase()}" title="${currentArt.title}" ${currentArt.language ? `language="${currentArt.language}"` : ''}>
...konten hasil revisi baru...
</artifact>`;

    executeSendMessage(revisionFullPrompt, `Revisi artefak ${currentArt.title}`);
  };

  const handleAbortStream = () => {
    if (streamingClientRef.current) {
      streamingClientRef.current.abort();
      setIsStreaming(false);
      setActiveStreamingMessage(null);
      showToast('Respons dihentikan.', 'info');
    }
  };

  const handleConfirmClearWorkspace = () => {
    setShowDeleteConfirm(false);
    setShowMoreMenu(false);
    setMessages([
      {
        id: `msg_clear_${Date.now()}`,
        role: 'assistant',
        content: 'Obrolan telah dibersihkan. Siap memulai sesi pekerjaan akademik baru.',
        createdAt: new Date()
      }
    ]);
    showToast('Sesi obrolan dibersihkan', 'info');
  };

  // Compact Starter Tasks for Fresh Workspace
  const STARTER_TASKS = [
    {
      id: 'bedah-paper',
      title: 'Bedah Paper & Jurnal',
      subtitle: 'Ringkas problem gap, variabel & metodologi Bab 2',
      icon: <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      primary: true,
      prompt: 'Bantu saya membedah dan menganalisis jurnal/paper ilmiah ini: ekstrak latar belakang masalah, urgensi riset, metodologi dan instrumen analisis yang digunakan, temuan kunci, serta buat ringkasan eksekutif yang sistematis:\n\n[Tempelkan abstrak atau isi jurnal di sini]'
    },
    {
      id: 'format-sitasi',
      title: 'Format Sitasi APA 7th / IEEE',
      subtitle: 'Susun bibliografi otomatis & ekspor berkas .bib',
      icon: <Quote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      primary: false,
      prompt: 'Tolong review bagian metodologi penelitian dan periksa format sitasi serta daftar pustaka berikut sesuai standar APA 7th Edition dan IEEE:\n\n[Tempelkan draf referensi di sini]'
    },
    {
      id: 'struktur-skripsi',
      title: 'Struktur Skripsi Bab 1-3',
      subtitle: 'Kerangka pendahuluan piramida terbalik & landasan teori',
      icon: <ListTree className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      primary: false,
      prompt: 'Bantu saya menyusun kerangka penulisan (outline) skripsi yang komprehensif mulai dari Bab 1 (Pendahuluan), Bab 2 (Tinjauan Pustaka), hingga Bab 3 (Metodologi Penelitian):\n\n[Topik / Judul Skripsi: ]'
    },
    {
      id: 'debug-kode',
      title: 'Debug Kode & Optimasi Big-O',
      subtitle: 'Telusuri bug, perbaiki runtime, dan analisis kompleksitas',
      icon: <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      primary: false,
      prompt: 'Tolong telusuri bug/error pada kode program berikut, jelaskan penyebab masalahnya, berikan kode perbaikan yang bersih dan efisien, serta analisis kompleksitas waktu (Big-O):\n\n[Tempelkan kode dan pesan error di sini]'
    }
  ];

  // Active work state detector: true if user has sent messages or is streaming
  const hasUserSentMessage = messages.some(m => m.role === 'user') || isStreaming || messages.length > 1;

  const formatMessageTime = (date?: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const getArtifactTabIcon = (type: ArtifactType) => {
    switch (type) {
      case 'CODE': return <FileCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'CITATION': return <Quote className="w-3.5 h-3.5 text-amber-500" />;
      case 'OUTLINE': return <ListTree className="w-3.5 h-3.5 text-teal-500" />;
      default: return <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div 
      className="flex flex-col h-dvh w-full bg-slate-50/60 dark:bg-[#0B101B] text-slate-800 dark:text-slate-100 overflow-hidden relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processSelectedFile(file);
      }}
    >
      {/* Drag & Drop Overlay Indicator */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-emerald-900/40 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in pointer-events-none">
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-emerald-500 rounded-2xl p-6 text-center max-w-sm shadow-2xl space-y-2">
            <Paperclip className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Lepaskan Berkas di Sini</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Lampirkan dokumen atau kode langsung ke composer RuangKerja</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. WORKSPACE HEADER TOOLBAR (h-13 / 52px) */}
      {/* ========================================================================= */}
      <header className="h-13 px-3 sm:px-4 lg:px-6 bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 z-30 shrink-0">
        {/* Left Zone: Workspace Identity & Mobile Navigation Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Buka Sidebar Menu"
            >
              <Layers className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo mode="RUANG_KERJA" size="sm" />
            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              RuangKerja
            </span>
          </div>

          {/* Active Document Kicker (Desktop) */}
          {activeArtifact && (
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 pl-3 border-l border-slate-200 dark:border-slate-800 min-w-0">
              <span className="truncate max-w-[200px] text-slate-600 dark:text-slate-300 font-medium">
                {activeArtifact.title}
              </span>
              <span className="text-[10px] font-mono opacity-60">
                v{activeArtifact.version || 1}
              </span>
            </div>
          )}
        </div>

        {/* Center / Right Zone: Compact Segmented Switcher & Workspace Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Compact View Switcher on Mobile/Tablet */}
          <div className="lg:hidden flex items-center p-0.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setMobileActiveTab('chat')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                mobileActiveTab === 'chat'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Obrolan
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileActiveTab('canvas');
                setHasUnreadArtifact(false);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer relative ${
                mobileActiveTab === 'canvas'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Canvas
              {hasUnreadArtifact && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block ml-1 animate-pulse" />
              )}
            </button>
          </div>

          {/* Primary Action: + Draf Baru Dropdown */}
          <div className="relative" ref={newArtifactMenuRef}>
            <button
              type="button"
              onClick={() => setShowNewArtifactMenu(!showNewArtifactMenu)}
              className="h-8 px-2.5 sm:px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Buat Berkas / Draf Baru"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Draf Baru</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {showNewArtifactMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 animate-scale-up space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleCreateNewArtifact('DOCUMENT')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Draf Dokumen (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateNewArtifact('CODE')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Skrip Kode (.py/.ts)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateNewArtifact('CITATION')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Quote className="w-3.5 h-3.5 text-amber-500" />
                  <span>Daftar Sitasi (.bib)</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Canvas Toggle */}
          <button
            type="button"
            onClick={() => setIsCanvasOpen(!isCanvasOpen)}
            className="hidden lg:flex h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium items-center gap-1.5 transition-colors cursor-pointer"
            title={isCanvasOpen ? 'Sembunyikan Panel Canvas' : 'Tampilkan Panel Canvas'}
          >
            {isCanvasOpen ? (
              <>
                <PanelRightClose className="w-3.5 h-3.5" />
                <span>Tutup Canvas</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-3.5 h-3.5" />
                <span>Canvas</span>
              </>
            )}
            {hasUnreadArtifact && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>

          {/* More Actions Menu (•••) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Menu Opsi Workspace"
              aria-label="Opsi Lebih Lanjut"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 animate-scale-up space-y-0.5">
                {onSwitchMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onSwitchMode('RUANG_TENANG');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-700 dark:hover:text-teal-300 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <HeartHandshake className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Ke RuangTenang</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setSelectedTemplateForModal(ACADEMIC_TEMPLATES[0]);
                    setTemplateInputSnippet('');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Galeri Template</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Obrolan</span>
                </button>

                {/* Delete Confirmation Sub-Popover */}
                {showDeleteConfirm && (
                  <div className="p-2.5 mt-1 bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-xs space-y-2">
                    <p className="text-[11px] text-rose-800 dark:text-rose-200">
                      Bersihkan riwayat percakapan sesi ini? Artefak Canvas tetap tersimpan.
                    </p>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmClearWorkspace}
                        className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold text-[11px] hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        Ya, Bersihkan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Floating Notification for Mobile when Artifact Updates */}
      {mobileActiveTab === 'chat' && hasUnreadArtifact && activeArtifact && (
        <div className="lg:hidden absolute top-14 left-3 right-3 z-30 animate-slide-down">
          <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-xl flex items-center justify-between border border-slate-700/80 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
              <div className="text-xs truncate">
                <span className="font-semibold">Artefak diperbarui:</span>{' '}
                <span className="text-slate-300">{activeArtifact.title}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileActiveTab('canvas');
                setHasUnreadArtifact(false);
              }}
              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 ml-2 cursor-pointer"
            >
              Lihat Canvas
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DUAL-PANE WORKSPACE BODY */}
      {/* ========================================================================= */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANE: CONVERSATION & COMMAND WORKSPACE */}
        <section 
          className={`flex flex-col h-full bg-white dark:bg-[#0F172A] border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 ${
            isCanvasExpanded 
              ? 'hidden' 
              : isCanvasOpen 
                ? 'w-full lg:w-[40%] xl:w-[38%] shrink-0' 
                : 'w-full max-w-3xl mx-auto border-r-0'
          } ${mobileActiveTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}
        >
          {/* Chat Messages Feed (Single Primary Scroll Container) */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 custom-scrollbar flex flex-col min-h-0">
            {!hasUserSentMessage && !activeStreamingMessage ? (
              /* FRESH WORKSPACE STATE: Compact Intro & Starter Tasks */
              <div className="my-auto py-6 px-2 space-y-6 animate-fade-in max-w-lg mx-auto w-full">
                {/* Compact Workspace Introduction */}
                <div className="text-center space-y-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Asisten Akademik
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Bantu riset, tulisan, coding, dan pekerjaan akademik secara terstruktur.
                  </p>
                </div>

                {/* Compact Starter Actions List */}
                <div className="space-y-1.5">
                  {STARTER_TASKS.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleApplyPromptPill(task.prompt)}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99] border ${
                        task.primary
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800/80 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          : 'bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0">
                          {task.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors truncate">
                            {task.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {task.subtitle}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ACTIVE WORKSPACE STATE: Chat Messages Feed */
              <>
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.15 }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {/* Assistant Message Header */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1 px-1 select-none text-xs text-slate-500 dark:text-slate-400">
                        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Asisten RuangKerja</span>
                        <span>·</span>
                        <span className="font-mono text-[10.5px] opacity-75">{formatMessageTime(msg.createdAt)}</span>
                      </div>
                    )}

                    {/* User Message Header */}
                    {msg.role === 'user' && (
                      <div className="flex items-center gap-1 mb-1 px-1 select-none text-[10.5px] font-mono text-slate-400">
                        <span>{formatMessageTime(msg.createdAt)}</span>
                      </div>
                    )}

                    {/* Message Content Bubble */}
                    <div 
                      className={`max-w-[92%] sm:max-w-[88%] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl rounded-tr-xs px-3.5 py-2.5 text-xs sm:text-sm font-normal'
                          : 'bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl rounded-tl-xs p-3.5 text-xs sm:text-sm'
                      }`}
                    >
                      <div className={`prose max-w-none text-xs sm:text-sm prose-p:my-1.5 prose-pre:my-1.5 ${
                        msg.role === 'user' ? 'text-white dark:text-slate-900 prose-headings:text-white dark:prose-headings:text-slate-900 prose-code:text-white dark:prose-code:text-slate-900' : 'dark:prose-invert text-slate-800 dark:text-slate-200'
                      }`}>
                        <LazyMarkdown content={msg.content} />
                      </div>

                      {/* Error Retry Option */}
                      {msg.error && (
                        <div className="mt-2.5 pt-2 border-t border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                              if (lastUserMsg) {
                                setMessages(prev => prev.filter(m => m.id !== msg.id));
                                executeSendMessage(lastUserMsg.content);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Kirim Ulang Pesan</span>
                          </button>
                        </div>
                      )}

                      {/* Canvas Link Shortcut */}
                      {msg.role === 'assistant' && artifacts.length > 0 && msg.content.includes('📦 **Artefak Aktif') && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCanvasOpen(true);
                              setMobileActiveTab('canvas');
                            }}
                            className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Buka Dokumen di Canvas &rarr;</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Active Streaming Preview */}
                {activeStreamingMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-start"
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 select-none text-xs text-slate-500 dark:text-slate-400">
                      <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Asisten RuangKerja</span>
                      <span>·</span>
                      <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">Menulis...</span>
                    </div>

                    <div className="max-w-[92%] sm:max-w-[88%] rounded-xl rounded-tl-xs p-3.5 bg-slate-50/90 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/80 text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-sm">
                      <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm prose-p:my-1">
                        <LazyMarkdown content={activeStreamingMessage.content || '...'} />
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        <RhythmicTypingIndicator label="Menyusun konten akademik di Canvas..." />
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ========================================================================= */}
          {/* 3. REDESIGNED COMPACT COMPOSER */}
          {/* ========================================================================= */}
          <div className="p-3 bg-white/95 dark:bg-[#0F172A]/95 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
            {/* Academic Distress Regulation Banner */}
            {distressResult.isDistressed && !isDistressDismissed && (
              <AcademicDistressBanner
                distressResult={distressResult}
                onOpenBreathing={() => setIsBreathingModalOpen(true)}
                onSwitchToRuangTenang={() => onSwitchMode?.('RUANG_TENANG')}
                onDismiss={() => setIsDistressDismissed(true)}
              />
            )}

            {/* Quiet Contextual Suggestions Strip */}
            <div className="relative w-full mb-1.5 overflow-hidden">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs text-slate-500">
                <span className="shrink-0 font-medium select-none pr-1 text-[11px]">Coba:</span>
                {ACADEMIC_PROMPT_PILLS.map((pill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPromptPill(pill.prompt)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Floating Composer Container */}
            <div className="relative rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 focus-within:border-emerald-500/80 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all p-2">
              {/* Attached File Chip */}
              {attachedFile && (
                <div className="flex items-center gap-2 mb-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate flex-1 font-medium">{attachedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded text-emerald-700 dark:text-emerald-300 transition-colors"
                    title="Hapus lampiran"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    let fullPrompt = inputText.trim();
                    if (attachedFile) {
                      fullPrompt = fullPrompt 
                        ? `${fullPrompt}\n\n[Lampiran Dokumen: ${attachedFile.name}]\n${attachedFile.content}`
                        : `[Lampiran Dokumen: ${attachedFile.name}]\n${attachedFile.content}`;
                      setAttachedFile(null);
                    }
                    if (fullPrompt) executeSendMessage(fullPrompt);
                  }
                }}
                placeholder="Tanyakan tugas akademik, format sitasi, atau tempel draf/kode..."
                rows={1}
                className="w-full text-xs sm:text-sm px-1 py-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed min-h-[40px]"
              />

              {/* Action Bar Inside Composer */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                {/* Left Controls: Attach & Template */}
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.md,.pdf,.docx,.py,.js,.ts,.java,.cpp,.c,.json,.csv,.sql"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 px-2 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-medium flex items-center gap-1"
                    title="Lampirkan dokumen atau kode"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lampirkan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateForModal(ACADEMIC_TEMPLATES[0]);
                      setTemplateInputSnippet('');
                    }}
                    className="h-7 px-2 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-xs font-medium cursor-pointer flex items-center gap-1"
                    title="Buka Galeri Template"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Template</span>
                  </button>
                </div>

                {/* Right Controls: Enter Hint & Send */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-sans hidden sm:inline select-none">
                    Enter ↵
                  </span>

                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={handleAbortStream}
                      className="h-7 w-7 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer"
                      title="Hentikan respons"
                      aria-label="Hentikan"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        let fullPrompt = inputText.trim();
                        if (attachedFile) {
                          fullPrompt = fullPrompt 
                            ? `${fullPrompt}\n\n[Lampiran Dokumen: ${attachedFile.name}]\n${attachedFile.content}`
                            : `[Lampiran Dokumen: ${attachedFile.name}]\n${attachedFile.content}`;
                          setAttachedFile(null);
                        }
                        if (fullPrompt) executeSendMessage(fullPrompt);
                      }}
                      disabled={!inputText.trim() && !attachedFile}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        inputText.trim() || attachedFile
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                      title="Kirim"
                      aria-label="Kirim Pesan"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANE: LIVE ARTIFACT CANVAS */}
        {isCanvasOpen && (
          <section 
            className="hidden lg:flex flex-1 flex-col h-full overflow-hidden transition-all duration-200"
          >
            {/* Multi-Artifact Tab Strip (when > 1 artifacts exist) */}
            {artifacts.length > 1 && (
              <div className="h-9 px-3 bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 z-10">
                {artifacts.map((art) => {
                  const isActive = art.id === activeArtifactId;
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => {
                        setActiveArtifactId(art.id);
                        setHasUnreadArtifact(false);
                      }}
                      className={`h-6.5 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title={art.title}
                    >
                      {getArtifactTabIcon(art.type)}
                      <span className="truncate max-w-[130px]">{art.title}</span>
                      <span className="text-[9.5px] font-mono opacity-60">v{art.version || 1}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeArtifact ? (
              <ArtifactCanvas
                artifact={activeArtifact}
                onUpdateArtifact={handleUpdateActiveArtifact}
                onSaveArtifact={handleSaveArtifact}
                onRollbackVersion={handleRollbackArtifact}
                onClose={() => setIsCanvasOpen(false)}
                onRequestRevision={handleRequestRevision}
                isStreaming={isStreaming}
                isExpanded={isCanvasExpanded}
                onToggleExpand={() => setIsCanvasExpanded(!isCanvasExpanded)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Artefak Aktif</h3>
                <p className="text-xs max-w-xs mt-1 mb-3">
                  Kirim pertanyaan di kolom obrolan atau buat draf dokumen/kode baru untuk ditampilkan di Canvas.
                </p>
                <button
                  type="button"
                  onClick={() => handleCreateNewArtifact('DOCUMENT')}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>+ Buat Draf Baru</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* Mobile Slide-Over Drawer for Canvas */}
        <AnimatePresence>
          {mobileActiveTab === 'canvas' && (
            <motion.div
              key="mobile-canvas-drawer"
              initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
              animate={{ x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.18 }}
              className="lg:hidden fixed inset-0 z-40 bg-white dark:bg-[#0F172A] flex flex-col shadow-2xl"
            >
              {/* Mobile Drawer Top Bar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {activeArtifact?.title || 'Canvas Dokumen'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileActiveTab('chat')}
                  className="h-7 px-2.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  aria-label="Kembali ke Obrolan"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tutup</span>
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-hidden">
                {activeArtifact ? (
                  <ArtifactCanvas
                    artifact={activeArtifact}
                    onUpdateArtifact={handleUpdateActiveArtifact}
                    onSaveArtifact={handleSaveArtifact}
                    onRollbackVersion={handleRollbackArtifact}
                    onClose={() => setMobileActiveTab('chat')}
                    onRequestRevision={handleRequestRevision}
                    isStreaming={isStreaming}
                    isExpanded={false}
                    onToggleExpand={() => {}}
                  />
                ) : (
                  <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Artefak Aktif</h3>
                    <button
                      type="button"
                      onClick={() => handleCreateNewArtifact('DOCUMENT')}
                      className="h-8 px-3 mt-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>+ Buat Draf Baru</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Template Gallery Modal */}
      <WorkspaceTemplateModal
        template={selectedTemplateForModal}
        snippet={templateInputSnippet}
        onSnippetChange={setTemplateInputSnippet}
        onClose={() => setSelectedTemplateForModal(null)}
        onSubmit={(template, snippet) => {
          handleSelectAcademicTemplate(template, snippet);
          setTemplateInputSnippet('');
        }}
      />

      {/* 1-Minute Micro-Regulation Modal */}
      <MicroBreathingModal
        isOpen={isBreathingModalOpen}
        onClose={() => setIsBreathingModalOpen(false)}
        reason={distressResult.suggestedAction || 'Jeda relaksasi untuk memulihkan kejernihan berpikir sebelum melanjutkan tugas.'}
      />
    </div>
  );
}

export default StudentWorkspace;
