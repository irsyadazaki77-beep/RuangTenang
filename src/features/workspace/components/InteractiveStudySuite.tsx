import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  GraduationCap,
  HelpCircle,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Table2,
  Volume2,
  VolumeX,
  XCircle,
  BarChart3,
  Radio,
  ShieldCheck,
  FileSearch,
  Network,
  HeartPulse,
  Award,
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import { speechPlayer, type SpeechPlaybackStatus } from '../../../lib/speechPlayer';
import { useToast } from '../../../components/Toast';
import {
  VisualCanvasStudio,
  NotebookLmPodcastStudio,
  AcademicQuickExportBar,
} from './CanvasVisualAndAudioStudio';
import {
  DefenseSimulatorStage,
  OriginalityClaimAuditor,
  LiteratureGraphCanvas,
  MoodChapterCorrelationPanel,
  DefensePackageExporter,
} from './ThesisMasteryStudio';

export type StudySuiteTab =
  | 'flashcards'
  | 'quiz'
  | 'matrix'
  | 'visual'
  | 'audio'
  | 'defense'
  | 'audit'
  | 'graph'
  | 'mood_progress'
  | 'defense_kit';

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  tag: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
}

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LiteratureMatrixRow {
  id: string;
  sourceTitle: string;
  authorYear: string;
  methodology: string;
  keyFindings: string;
  limitations: string;
  relevance: string;
}

export interface StudySuitePayload {
  format: 'ruangkerja-study-suite-v1';
  title: string;
  updatedAt?: string;
  audioOverviewScript: string;
  flashcards: FlashcardItem[];
  quiz: QuizQuestionItem[];
  literatureMatrix: LiteratureMatrixRow[];
}

export function parseStudySuiteContent(raw: string): StudySuitePayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StudySuitePayload>;
    if (
      parsed &&
      parsed.format === 'ruangkerja-study-suite-v1' &&
      Array.isArray(parsed.flashcards) &&
      Array.isArray(parsed.quiz) &&
      Array.isArray(parsed.literatureMatrix)
    ) {
      return {
        format: 'ruangkerja-study-suite-v1',
        title: String(parsed.title || 'Paket Studi Aktif'),
        updatedAt: parsed.updatedAt,
        audioOverviewScript: String(parsed.audioOverviewScript || ''),
        flashcards: parsed.flashcards,
        quiz: parsed.quiz,
        literatureMatrix: parsed.literatureMatrix,
      };
    }
    return null;
  } catch {
    return null;
  }
}

interface InteractiveStudySuiteProps {
  artifactId: string;
  artifactTitle: string;
  sourceContent: string;
  initialTab?: StudySuiteTab;
  onClose?: () => void;
  onApplyMarkdownToCanvas?: (markdownAppendix: string) => void;
  onReplaceCanvasContent?: (nextContent: string) => void;
}

type MasteryLevel = 'unseen' | 'review' | 'mastered';

export const InteractiveStudySuite: React.FC<InteractiveStudySuiteProps> = ({
  artifactId,
  artifactTitle,
  sourceContent,
  initialTab = 'flashcards',
  onClose,
  onApplyMarkdownToCanvas,
  onReplaceCanvasContent,
}) => {
  const { showToast } = useToast();
  const existingParsed = useMemo(() => parseStudySuiteContent(sourceContent), [sourceContent]);

  const [suite, setSuite] = useState<StudySuitePayload | null>(existingParsed);
  const [isLoading, setIsLoading] = useState(!existingParsed);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudySuiteTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Flashcard state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteryMap, setMasteryMap] = useState<Record<string, MasteryLevel>>({});
  const [cardFilter, setCardFilter] = useState<'all' | 'review' | 'mastered'>('all');

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  // Literature Matrix state
  const [matrixSearch, setMatrixSearch] = useState('');
  const [showAddRowForm, setShowAddRowForm] = useState(false);
  const [newRowDraft, setNewRowDraft] = useState<Omit<LiteratureMatrixRow, 'id'>>({
    sourceTitle: '',
    authorYear: '',
    methodology: '',
    keyFindings: '',
    limitations: '',
    relevance: '',
  });

  // Audio Study Overview state
  const [speechStatus, setSpeechStatus] = useState<SpeechPlaybackStatus>('idle');
  const audioId = `study-overview-${artifactId}`;

  useEffect(() => {
    return speechPlayer.subscribe(state => {
      if (state.activeId === audioId) {
        setSpeechStatus(state.status);
      } else {
        setSpeechStatus('idle');
      }
    });
  }, [audioId]);

  const generateSuiteFromSource = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.fetchJson<{
        success: boolean;
        data: StudySuitePayload;
      }>('/api/v1/ai/study-suite', {
        method: 'POST',
        body: JSON.stringify({
          title: artifactTitle || 'Dokumen Akademik',
          sourceText: sourceContent.slice(0, 18000) || artifactTitle || 'Kajian Ilmiah Mahasiswa',
          focusMode: 'full_suite',
        }),
      });

      if (response.success && response.data) {
        setSuite(response.data);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setSelectedAnswers({});
      } else {
        setErrorMsg('Paket studi belum dapat disusun dari dokumen ini.');
      }
    } catch {
      setErrorMsg('Gagal menghubungi layanan penyusun studi. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [artifactTitle, sourceContent]);

  useEffect(() => {
    if (existingParsed) {
      setSuite(existingParsed);
      setIsLoading(false);
      return;
    }
    void generateSuiteFromSource();
  }, [existingParsed, generateSuiteFromSource]);

  const filteredCards = useMemo(() => {
    if (!suite) return [];
    if (cardFilter === 'all') return suite.flashcards;
    return suite.flashcards.filter(c => (masteryMap[c.id] || 'unseen') === cardFilter);
  }, [suite, cardFilter, masteryMap]);

  const activeCard = filteredCards[currentCardIndex] || filteredCards[0] || null;

  const masteredCount = useMemo(() => {
    if (!suite) return 0;
    return suite.flashcards.filter(c => masteryMap[c.id] === 'mastered').length;
  }, [suite, masteryMap]);

  const quizScore = useMemo(() => {
    if (!suite) return { answered: 0, correct: 0, total: 0 };
    let answered = 0;
    let correct = 0;
    for (const q of suite.quiz) {
      if (selectedAnswers[q.id] !== undefined) {
        answered += 1;
        if (selectedAnswers[q.id] === q.correctIndex) {
          correct += 1;
        }
      }
    }
    return { answered, correct, total: suite.quiz.length };
  }, [suite, selectedAnswers]);

  const filteredMatrixRows = useMemo(() => {
    if (!suite) return [];
    const q = matrixSearch.trim().toLowerCase();
    if (!q) return suite.literatureMatrix;
    return suite.literatureMatrix.filter(
      row =>
        row.sourceTitle.toLowerCase().includes(q) ||
        row.authorYear.toLowerCase().includes(q) ||
        row.methodology.toLowerCase().includes(q) ||
        row.keyFindings.toLowerCase().includes(q) ||
        row.limitations.toLowerCase().includes(q) ||
        row.relevance.toLowerCase().includes(q)
    );
  }, [suite, matrixSearch]);

  const handleMarkCard = (id: string, level: MasteryLevel) => {
    setMasteryMap(prev => ({ ...prev, [id]: level }));
    setIsFlipped(false);
    if (filteredCards.length > 1) {
      setCurrentCardIndex(idx => (idx + 1) % filteredCards.length);
    }
  };

  const handleAddMatrixRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suite) return;
    if (!newRowDraft.sourceTitle.trim() || !newRowDraft.authorYear.trim()) {
      showToast('Judul studi dan Penulis/Tahun wajib diisi.', 'info');
      return;
    }
    const created: LiteratureMatrixRow = {
      id: `lit-custom-${Date.now()}`,
      sourceTitle: newRowDraft.sourceTitle.trim(),
      authorYear: newRowDraft.authorYear.trim(),
      methodology: newRowDraft.methodology.trim() || '-',
      keyFindings: newRowDraft.keyFindings.trim() || '-',
      limitations: newRowDraft.limitations.trim() || '-',
      relevance: newRowDraft.relevance.trim() || '-',
    };
    setSuite({
      ...suite,
      literatureMatrix: [...suite.literatureMatrix, created],
    });
    setNewRowDraft({
      sourceTitle: '',
      authorYear: '',
      methodology: '',
      keyFindings: '',
      limitations: '',
      relevance: '',
    });
    setShowAddRowForm(false);
    showToast('Baris jurnal berhasil ditambahkan ke Matriks Sintesis.', 'success');
  };

  const buildMatrixMarkdown = useCallback(() => {
    if (!suite) return '';
    const header = `## Matriks Sintesis Literatur: ${suite.title}\n\n| Studi / Judul | Penulis & Tahun | Metodologi | Temuan Kunci | Celah / Limitasi | Relevansi Skripsi |\n| --- | --- | --- | --- | --- | --- |`;
    const rows = suite.literatureMatrix.map(
      r =>
        `| ${r.sourceTitle.replace(/\|/g, '/')} | ${r.authorYear.replace(/\|/g, '/')} | ${r.methodology.replace(/\|/g, '/')} | ${r.keyFindings.replace(/\|/g, '/')} | ${r.limitations.replace(/\|/g, '/')} | ${r.relevance.replace(/\|/g, '/')} |`
    );
    return [header, ...rows].join('\n');
  }, [suite]);

  const handleCopyMatrixMarkdown = () => {
    const md = buildMatrixMarkdown();
    if (!md) return;
    void navigator.clipboard.writeText(md);
    showToast('Tabel Matriks Sintesis disalin dalam format Markdown', 'success');
  };

  const handleExportMatrixCsv = () => {
    if (!suite) return;
    const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = ['Judul Sumber', 'Penulis & Tahun', 'Metodologi', 'Temuan Kunci', 'Limitasi / Celah Riset', 'Relevansi Skripsi'];
    const lines = [
      headers.map(escapeCsv).join(','),
      ...suite.literatureMatrix.map(r =>
        [r.sourceTitle, r.authorYear, r.methodology, r.keyFindings, r.limitations, r.relevance]
          .map(escapeCsv)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matriks-literatur-${artifactTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'studi'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Berkas CSV Matriks Literatur berhasil diunduh', 'success');
  };

  const handleToggleAudioOverview = () => {
    if (!suite?.audioOverviewScript) return;
    void speechPlayer.toggleSpeak({
      id: audioId,
      text: suite.audioOverviewScript,
      mode: 'study_overview',
      voiceName: 'Zephyr',
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
        <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Menyusun Flashcard, Kuis Evaluasi, & Matriks Sintesis Literatur…
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Mengekstraksi konsep inti, metodologi, dan celah riset dari dokumen aktif Anda.
        </p>
      </div>
    );
  }

  if (errorMsg || !suite) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
        <p className="text-sm font-medium text-rose-800 dark:text-rose-200">
          {errorMsg || 'Paket studi tidak tersedia.'}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void generateSuiteFromSource()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 text-xs font-semibold text-white hover:bg-rose-800 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Coba Lagi</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Kembali ke Dokumen
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Top Bar Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span>Studio Belajar Aktif & Sintesis Literatur</span>
            </div>
            <h2 className="mt-0.5 truncate text-base font-bold text-slate-900 dark:text-slate-100">
              {suite.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <AcademicQuickExportBar title={suite.title} content={sourceContent} />

            <button
              type="button"
              onClick={handleToggleAudioOverview}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                speechStatus !== 'idle'
                  ? 'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/60 dark:text-teal-200'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {speechStatus === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : speechStatus === 'playing' ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              )}
              <span>
                {speechStatus === 'loading'
                  ? 'Menyiapkan Audio…'
                  : speechStatus === 'playing'
                  ? 'Hentikan Audio Overview'
                  : 'Dengarkan Audio Overview'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void generateSuiteFromSource()}
              title="Perbarui dari isi dokumen terbaru"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Segarkan</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 cursor-pointer whitespace-nowrap"
              >
                Lihat Naskah
              </button>
            )}
          </div>
        </div>

        {/* Interactive Mode Segmented Controls */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Mode alat belajar aktif">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'flashcards'}
            onClick={() => setActiveTab('flashcards')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'flashcards'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Flashcard ({suite.flashcards.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'quiz'}
            onClick={() => setActiveTab('quiz')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'quiz'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Kuis Mandiri ({suite.quiz.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'matrix'}
            onClick={() => setActiveTab('matrix')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
            <span>Matriks Sintesis Literatur ({suite.literatureMatrix.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'visual'}
            onClick={() => setActiveTab('visual')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'visual'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Visual & Grafik</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'audio'}
            onClick={() => setActiveTab('audio')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'audio'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Studio Audio 2 Host</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'defense'}
            onClick={() => setActiveTab('defense')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'defense'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Simulasi Sidang</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <FileSearch className="h-3.5 w-3.5" />
            <span>Audit Klaim & Kohesi</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'graph'}
            onClick={() => setActiveTab('graph')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'graph'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            <span>Peta Literatur (Graph)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mood_progress'}
            onClick={() => setActiveTab('mood_progress')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'mood_progress'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            <span>Mood vs. Progres Bab</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'defense_kit'}
            onClick={() => setActiveTab('defense_kit')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'defense_kit'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-200'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Paket Sidang 1-Klik</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 font-mono tabular-nums">
              <span>
                Penguasaan: <strong>{masteredCount}</strong>/{suite.flashcards.length} kartu dihafal
              </span>
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'review', 'mastered'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setCardFilter(f);
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                    cardFilter === f
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {f === 'all' ? 'Semua' : f === 'review' ? 'Perlu Diulang' : 'Sudah Hafal'}
                </button>
              ))}
            </div>
          </div>

          {activeCard ? (
            <>
              <div
                onClick={() => setIsFlipped(f => !f)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsFlipped(f => !f);
                  }
                }}
                aria-label="Klik untuk membalik kartu flashcard"
                className="min-h-56 flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8 text-left transition duration-150 hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-950/60 cursor-pointer select-none"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {isFlipped ? 'Jawaban / Penjelasan Konsep' : 'Pertanyaan / Konsep'} · {activeCard.tag}
                  </span>
                  <span className="font-mono tabular-nums">
                    Kartu {currentCardIndex + 1} / {filteredCards.length} · Tingkat {activeCard.difficulty}
                  </span>
                </div>

                <div className="my-6">
                  <p className="text-base sm:text-lg font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                    {isFlipped ? activeCard.back : activeCard.front}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  <span>Klik kartu atau tekan Spasi untuk {isFlipped ? 'melihat pertanyaan' : 'membuka jawaban'}</span>
                  <span>
                    Status:{' '}
                    {masteryMap[activeCard.id] === 'mastered'
                      ? 'Sudah Hafal'
                      : masteryMap[activeCard.id] === 'review'
                      ? 'Perlu Ulang'
                      : 'Belum Dinilai'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex(idx => (idx - 1 + filteredCards.length) % filteredCards.length);
                    }}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Sebelumnya</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex(idx => (idx + 1) % filteredCards.length);
                    }}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarkCard(activeCard.id, 'review')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Perlu Diulang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkCard(activeCard.id, 'mastered')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Sudah Hafal</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-xs text-slate-500">
              Tidak ada kartu pada filter ini. Pilih kategori &ldquo;Semua&rdquo; untuk melihat seluruh kartu.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE QUIZ */}
      {activeTab === 'quiz' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Kuis Evaluasi Pemahaman Materi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih satu jawaban terbaik untuk melihat pembahasan ilmiah secara langsung.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Skor: {quizScore.correct}/{quizScore.total} benar ({quizScore.answered} dijawab)
              </span>
              {quizScore.answered > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedAnswers({})}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Ulangi Kuis</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {suite.quiz.map((q, qIdx) => {
              const userChoice = selectedAnswers[q.id];
              const isAnswered = userChoice !== undefined;

              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-3"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {qIdx + 1}. {q.question}
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = userChoice === optIdx;
                      const isCorrectOption = q.correctIndex === optIdx;

                      let btnStyle =
                        'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';
                      if (isAnswered) {
                        if (isCorrectOption) {
                          btnStyle =
                            'border-emerald-500 bg-emerald-50/80 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100 font-medium';
                        } else if (isSelected) {
                          btnStyle =
                            'border-rose-400 bg-rose-50/80 text-rose-950 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() =>
                            setSelectedAnswers(prev => ({
                              ...prev,
                              [q.id]: optIdx,
                            }))
                          }
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left text-xs sm:text-sm transition cursor-pointer ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {isAnswered && isCorrectOption && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Benar</span>
                            </span>
                          )}
                          {isAnswered && isSelected && !isCorrectOption && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300 shrink-0">
                              <XCircle className="h-4 w-4" />
                              <span>Kurang Tepat</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-slate-100">Pembahasan: </strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LITERATURE SYNTHESIS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Matriks Sintesis Literatur & Pemetaan Celah Riset (Research Gap)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bandingkan metodologi, temuan kunci, dan keterbatasan antar-jurnal untuk menyusun Bab 2 secara tajam.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddRowForm(v => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200 cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Jurnal</span>
              </button>
              <button
                type="button"
                onClick={handleCopyMatrixMarkdown}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Markdown</span>
              </button>
              <button
                type="button"
                onClick={handleExportMatrixCsv}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh CSV</span>
              </button>
              {onApplyMarkdownToCanvas && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyMarkdownToCanvas(buildMatrixMarkdown());
                    showToast('Tabel Matriks Sintesis disisipkan ke dokumen Canvas', 'success');
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Sisipkan ke Dokumen</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Filter */}
          <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-indigo-500 focus-within:bg-white dark:border-slate-800 dark:bg-slate-950">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              type="text"
              value={matrixSearch}
              onChange={e => setMatrixSearch(e.target.value)}
              placeholder="Saring matriks berdasarkan penulis, metode, temuan, atau celah riset…"
              className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </label>

          {/* Add New Row Form */}
          {showAddRowForm && (
            <form
              onSubmit={handleAddMatrixRow}
              className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Tambah Entri Jurnal ke Matriks Sintesis
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={newRowDraft.sourceTitle}
                  onChange={e => setNewRowDraft(p => ({ ...p, sourceTitle: e.target.value }))}
                  placeholder="Judul Jurnal / Artikel Ilmiah *"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  required
                  value={newRowDraft.authorYear}
                  onChange={e => setNewRowDraft(p => ({ ...p, authorYear: e.target.value }))}
                  placeholder="Penulis & Tahun (mis. Pratama et al., 2025) *"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newRowDraft.methodology}
                  onChange={e => setNewRowDraft(p => ({ ...p, methodology: e.target.value }))}
                  placeholder="Metodologi & Sampel"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newRowDraft.keyFindings}
                  onChange={e => setNewRowDraft(p => ({ ...p, keyFindings: e.target.value }))}
                  placeholder="Temuan Kunci"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newRowDraft.limitations}
                  onChange={e => setNewRowDraft(p => ({ ...p, limitations: e.target.value }))}
                  placeholder="Celah Riset / Limitasi Studi"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newRowDraft.relevance}
                  onChange={e => setNewRowDraft(p => ({ ...p, relevance: e.target.value }))}
                  placeholder="Relevansi terhadap Skripsi Anda"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRowForm(false)}
                  className="h-8 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="h-8 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Simpan Baris
                </button>
              </div>
            </form>
          )}

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/80">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                    Sumber & Penulis
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                    Metodologi
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                    Temuan Kunci
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                    Celah / Limitasi
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                    Relevansi Skripsi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMatrixRows.map(row => (
                  <tr key={row.id} className="align-top hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-3.5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div>{row.sourceTitle}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {row.authorYear}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {row.methodology}
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {row.keyFindings}
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {row.limitations}
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {row.relevance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VISUAL CANVAS FOR DIAGRAMS, RECHARTS & UI PREVIEW */}
      {activeTab === 'visual' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <VisualCanvasStudio
            title={suite.title}
            content={sourceContent}
            onAppendContent={onApplyMarkdownToCanvas}
          />
        </div>
      )}

      {/* TAB 5: NOTEBOOKLM 2-HOST PODCAST STUDIO & EXECUTIVE AUDIO OVERVIEW */}
      {activeTab === 'audio' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <NotebookLmPodcastStudio
              artifactId={artifactId}
              artifactTitle={suite.title}
              sourceContent={sourceContent}
              onAppendTranscriptToCanvas={onApplyMarkdownToCanvas}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Ringkasan Naratif Tunggal (Executive Audio Overview)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Narasi cepat satu suara untuk menyimak rangkuman eksekutif naskah dalam 1 menit.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAudioOverview}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800 cursor-pointer whitespace-nowrap"
              >
                {speechStatus === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : speechStatus === 'playing' ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
                <span>
                  {speechStatus === 'playing' ? 'Hentikan Narasi' : 'Putar Narasi Singkat'}
                </span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-sm leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200">
              {suite.audioOverviewScript}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: INTERACTIVE THESIS DEFENSE SIMULATOR (VOICE & 4D RUBRIC) */}
      {activeTab === 'defense' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <DefenseSimulatorStage
            artifactId={artifactId}
            title={suite.title}
            sourceContent={sourceContent}
            onAppendToCanvas={onApplyMarkdownToCanvas}
          />
        </div>
      )}

      {/* TAB 7: ORIGINALITY, PUEBI COHESION & AUTOMATIC CLAIM CITATION AUDITOR */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <OriginalityClaimAuditor
            title={suite.title}
            sourceContent={sourceContent}
            onReplaceCanvasContent={onReplaceCanvasContent}
            onAppendToCanvas={onApplyMarkdownToCanvas}
          />
        </div>
      )}

      {/* TAB 8: INTERACTIVE LITERATURE GRAPH & CONCEPT MAP */}
      {activeTab === 'graph' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <LiteratureGraphCanvas
            title={suite.title}
            sourceContent={sourceContent}
            onAppendToCanvas={onApplyMarkdownToCanvas}
          />
        </div>
      )}

      {/* TAB 9: MOOD VS. THESIS CHAPTER PROGRESS CORRELATION & REFLECTION JOURNAL */}
      {activeTab === 'mood_progress' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <MoodChapterCorrelationPanel
            title={suite.title}
            onAppendToCanvas={onApplyMarkdownToCanvas}
          />
        </div>
      )}

      {/* TAB 10: 1-CLICK THESIS DEFENSE PACKAGE EXPORTER (PPTX + DOCX + Q&A SHEET) */}
      {activeTab === 'defense_kit' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <DefensePackageExporter
            title={suite.title}
            sourceContent={sourceContent}
            onAppendToCanvas={onApplyMarkdownToCanvas}
          />
        </div>
      )}
    </div>
  );
};

