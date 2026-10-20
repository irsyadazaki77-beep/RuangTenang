import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useMindfulnessAudio } from './hooks/useMindfulnessAudio';
import { apiClient } from '../../lib/apiClient';
import {
  Compass,
  Music,
  PenTool,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Search,
  Check,
  Volume2,
  VolumeX,
  Wind,
  Sparkles,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Smile,
  BookOpen
} from 'lucide-react';

// ============================================================================
// STRICT TYPESCRIPT INTERFACES
// ============================================================================
export interface GratitudeEntry {
  id: string;
  date: string;
  note1: string;
  note2: string;
  note3: string;
  personToThank: string;
  challengeOvercome: string;
  moodRating: number;
}

export interface SelfCompassionLetter {
  id: string;
  dateWritten: string;
  unlockDate: string; // YYYY-MM-DD
  content: string;
  keyPhrase: string;
  isUnlocked: boolean;
  theme: 'amber' | 'teal' | 'slate';
}

const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type WorkshopTab = 'soundscape' | 'grounding' | 'gratitude' | 'compassion';

// ============================================================================
export const MindfulnessWorkshop: React.FC<{ userId: string }> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<WorkshopTab>('soundscape');
  const shouldReduceMotion = useReducedMotion();
  const { isPlayingTheta, isPlayingWaves, isPlayingChimes, volume, toggleTheta, toggleWaves, toggleChimes, stopAllAudio, handleVolumeChange } = useMindfulnessAudio();
  const hasActiveAudio = isPlayingTheta || isPlayingWaves || isPlayingChimes;
  const panelInitial = shouldReduceMotion ? false : { opacity: 0, y: 8 };
  const panelAnimate = shouldReduceMotion ? { opacity: 1, y: 0, transition: { duration: 0 } } : { opacity: 1, y: 0 };
  const panelExit = shouldReduceMotion ? { opacity: 1, y: 0, transition: { duration: 0 } } : { opacity: 0, y: -8 };
  const stepInitial = shouldReduceMotion ? false : { opacity: 0, x: 10 };
  const stepAnimate = shouldReduceMotion ? { opacity: 1, x: 0, transition: { duration: 0 } } : { opacity: 1, x: 0 };
  const stepExit = shouldReduceMotion ? { opacity: 1, x: 0, transition: { duration: 0 } } : { opacity: 0, x: -10 };

  // Gratitude Jurnal state
  const [gratitudeLogs, setGratitudeLogs] = useState<GratitudeEntry[]>([]);
  const [searchGratitude, setSearchGratitude] = useState('');
  const [gFormNote1, setGFormNote1] = useState('');
  const [gFormNote2, setGFormNote2] = useState('');
  const [gFormNote3, setGFormNote3] = useState('');
  const [gFormPerson, setGFormPerson] = useState('');
  const [gFormChallenge, setGFormChallenge] = useState('');
  const [gFormRating, setGFormRating] = useState(5);
  const [showGSuccessMessage, setShowGSuccessMessage] = useState(false);

  // Grounding technique state (5-4-3-2-1 Wizard)
  const [groundingStep, setGroundingStep] = useState(1);
  const [groundingInputs, setGroundingInputs] = useState({
    sights: ['', '', '', '', ''],
    touches: ['', '', '', ''],
    sounds: ['', '', ''],
    smells: ['', ''],
    tastes: ['']
  });
  const [isGroundingFinished, setIsGroundingFinished] = useState(false);

  // Self Compassion Time Capsule
  const [letters, setLetters] = useState<SelfCompassionLetter[]>([]);
  const [letterContent, setLetterContent] = useState('');
  const [letterUnlockDate, setLetterUnlockDate] = useState('');
  const [letterKeyPhrase, setLetterKeyPhrase] = useState('');
  const [letterTheme, setLetterTheme] = useState<'amber' | 'teal' | 'slate'>('teal');
  const [unlockAttemptId, setUnlockAttemptId] = useState<string | null>(null);
  const [unlockKeyPhraseInput, setUnlockKeyPhraseInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showCompassionSuccess, setShowCompassionSuccess] = useState(false);
  const [showLegacyMigration, setShowLegacyMigration] = useState(false);
  const [migrationError, setMigrationError] = useState('');
  const [isJournalLoading, setIsJournalLoading] = useState(true);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [journalError, setJournalError] = useState('');
  const [journalReloadKey, setJournalReloadKey] = useState(0);
  const hasAccount = Boolean(userId && userId !== 'guest');

  // Journals are encrypted on the account server; the browser holds only UI state.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setGratitudeLogs([]);
    setLetters([]);
    setJournalError('');
    setIsJournalLoading(hasAccount);
    if (hasAccount) {
      void apiClient.get<any>('/api/v1/journals', { signal: controller.signal }).then(response => {
        if (!active) return;
        if (!response.success) throw new Error(response.error || 'Jurnal belum dapat dimuat.');
        const stored = response.data || {};
        setGratitudeLogs(Array.isArray(stored.gratitude) ? stored.gratitude : []);
        setLetters(Array.isArray(stored.compassion) ? stored.compassion : []);
      }).catch(() => {
        if (active && !controller.signal.aborted) setJournalError('Jurnal belum dapat dimuat. Periksa koneksi lalu muat ulang halaman.');
      }).finally(() => { if (active) setIsJournalLoading(false); });
    } else {
      setIsJournalLoading(false);
    }

    if (hasAccount) {
      try {
        const hasLegacyData = localStorage.getItem('rt_gratitude_entries') || localStorage.getItem('rt_compassion_letters');
        setShowLegacyMigration(Boolean(hasLegacyData));
      } catch { setShowLegacyMigration(false); }
    }

    // Set a sensible default unlock date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setLetterUnlockDate(localDateString(tomorrow));

    return () => { active = false; controller.abort(); };
  }, [hasAccount, userId, journalReloadKey]);

  const saveJournalEntries = async (kind: 'gratitude' | 'compassion', entries: GratitudeEntry[] | SelfCompassionLetter[]) => {
    if (!hasAccount) {
      setJournalError('Masuk ke akun untuk menyimpan jurnal secara terenkripsi.');
      return false;
    }
    setIsSavingJournal(true);
    setJournalError('');
    try {
      const response = await apiClient.put<any>(`/api/v1/journals/${kind}`, { entries });
      if (!response.success) throw new Error(response.error || 'Jurnal belum tersimpan.');
      return true;
    } catch {
      setJournalError('Jurnal belum tersimpan. Coba lagi saat koneksi tersedia.');
      return false;
    } finally {
      setIsSavingJournal(false);
    }
  };

  const migrateLegacyEntries = async () => {
    if (!hasAccount || isJournalLoading || journalError) return;
    try {
      const legacyGratitude = localStorage.getItem('rt_gratitude_entries');
      const legacyLetters = localStorage.getItem('rt_compassion_letters');
      const nextGratitude = legacyGratitude ? JSON.parse(legacyGratitude) : [];
      const nextLetters = legacyLetters ? JSON.parse(legacyLetters) : [];
      if (!Array.isArray(nextGratitude) || !Array.isArray(nextLetters)) throw new Error('Format jurnal lama tidak dikenali.');
      const mergedGratitude = Array.from(new Map([...nextGratitude, ...gratitudeLogs].map(entry => [(entry as GratitudeEntry).id, entry])).values()) as GratitudeEntry[];
      const mergedLetters = Array.from(new Map([...nextLetters, ...letters].map(entry => [(entry as SelfCompassionLetter).id, entry])).values()) as SelfCompassionLetter[];
      if (legacyGratitude && !await saveJournalEntries('gratitude', mergedGratitude)) return;
      if (legacyLetters && !await saveJournalEntries('compassion', mergedLetters)) return;
      setGratitudeLogs(mergedGratitude);
      setLetters(mergedLetters);
      if (legacyGratitude) localStorage.removeItem('rt_gratitude_entries');
      if (legacyLetters) localStorage.removeItem('rt_compassion_letters');
      setShowLegacyMigration(false);
      setMigrationError('');
    } catch {
      setMigrationError('Catatan lama belum dapat dipindahkan. Data lama tetap dipertahankan di browser ini.');
    }
  };

  // Save gratitude helpers
  const saveGratitudeLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gFormNote1.trim() && !gFormNote2.trim() && !gFormNote3.trim()) return;

    const newEntry: GratitudeEntry = {
      id: `g-${Date.now()}`,
      date: new Date(`${localDateString()}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      note1: gFormNote1.trim() || 'Rasa syukur sederhana harian.',
      note2: gFormNote2.trim(),
      note3: gFormNote3.trim(),
      personToThank: gFormPerson.trim(),
      challengeOvercome: gFormChallenge.trim(),
      moodRating: gFormRating
    };

    const updated = [newEntry, ...gratitudeLogs];
    if (!await saveJournalEntries('gratitude', updated)) return;
    setGratitudeLogs(updated);

    // Clear form
    setGFormNote1('');
    setGFormNote2('');
    setGFormNote3('');
    setGFormPerson('');
    setGFormChallenge('');
    setGFormRating(5);

    setShowGSuccessMessage(true);
    setTimeout(() => setShowGSuccessMessage(false), 4000);
  };

  const deleteGratitudeEntry = async (id: string) => {
    const updated = gratitudeLogs.filter(item => item.id !== id);
    if (!await saveJournalEntries('gratitude', updated)) return;
    setGratitudeLogs(updated);
  };

  // Grounding Navigation Helper
  const handleNextGrounding = () => {
    if (groundingStep < 5) {
      setGroundingStep(groundingStep + 1);
    } else {
      setIsGroundingFinished(true);
    }
  };

  const resetGrounding = () => {
    setGroundingStep(1);
    setIsGroundingFinished(false);
    setGroundingInputs({
      sights: ['', '', '', '', ''],
      touches: ['', '', '', ''],
      sounds: ['', '', ''],
      smells: ['', ''],
      tastes: ['']
    });
  };

  // Save Self Compassion Letter
  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterContent.trim() || !letterKeyPhrase.trim()) return;

    const newLetter: SelfCompassionLetter = {
      id: `l-${Date.now()}`,
      dateWritten: new Date(`${localDateString()}T12:00:00`).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
      unlockDate: letterUnlockDate,
      content: letterContent.trim(),
      keyPhrase: letterKeyPhrase.trim().toLowerCase(),
      isUnlocked: false,
      theme: letterTheme
    };

    const updated = [newLetter, ...letters];
    if (!await saveJournalEntries('compassion', updated)) return;
    setLetters(updated);

    setLetterContent('');
    setLetterKeyPhrase('');
    setShowCompassionSuccess(true);
    setTimeout(() => setShowCompassionSuccess(false), 4000);
  };

  const handleUnlockLetterAttempt = async (letter: SelfCompassionLetter) => {
    // Check lock date
    const todayStr = localDateString();
    const isDatePassed = new Date(todayStr).getTime() >= new Date(letter.unlockDate).getTime();

    if (!isDatePassed) {
      setUnlockError(`Surat ini masih terkunci oleh waktu. Baru bisa dibuka pada tanggal: ${letter.unlockDate}`);
      return;
    }

    if (unlockKeyPhraseInput.trim().toLowerCase() === letter.keyPhrase) {
      // Unlock successfully!
      const updated = letters.map(item => {
        if (item.id === letter.id) {
          return { ...item, isUnlocked: true };
        }
        return item;
      });
      if (!await saveJournalEntries('compassion', updated)) {
        setUnlockError('Surat belum dapat diperbarui. Coba lagi saat koneksi tersedia.');
        return;
      }
      setLetters(updated);
      setUnlockAttemptId(null);
      setUnlockKeyPhraseInput('');
      setUnlockError('');
    } else {
      setUnlockError('Frasa kunci verifikasi tidak cocok. Silakan coba lagi.');
    }
  };

  const deleteLetter = async (id: string) => {
    const updated = letters.filter(item => item.id !== id);
    if (!await saveJournalEntries('compassion', updated)) return;
    setLetters(updated);
  };

  const filteredGratitude = gratitudeLogs.filter(log =>
    log.note1.toLowerCase().includes(searchGratitude.toLowerCase()) ||
    log.note2.toLowerCase().includes(searchGratitude.toLowerCase()) ||
    log.note3.toLowerCase().includes(searchGratitude.toLowerCase()) ||
    log.personToThank.toLowerCase().includes(searchGratitude.toLowerCase())
  );

  return (
    <div id="mindfulness-workshop-root" className={`max-w-4xl mx-auto p-4 sm:p-6 space-y-6 text-slate-800 dark:text-slate-100 ${shouldReduceMotion ? '' : 'animate-fade-in'}`}>
      {showLegacyMigration && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Ada jurnal lama yang belum terkait ke akun ini.</p>
          <p className="mt-1 text-xs leading-relaxed">Pindahkan jurnal lama dari penyimpanan browser ke akun yang sedang masuk? Lanjutkan hanya jika catatan itu milik Anda. Setelah dipindahkan, salinan browser lama akan dihapus.</p>
          {migrationError && <p role="alert" className="mt-2 text-xs">{migrationError}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={migrateLegacyEntries} className="min-h-10 rounded-lg bg-amber-800 px-3 text-xs font-semibold text-white hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">Pindahkan jurnal</button>
            <button type="button" onClick={() => setShowLegacyMigration(false)} className="min-h-10 rounded-lg border border-amber-400 px-3 text-xs font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-amber-800 dark:hover:bg-amber-950/60">Nanti saja</button>
          </div>
        </div>
      )}
      {isJournalLoading && <p role="status" className="rounded-lg border border-default px-3 py-2 text-xs text-secondary">Memuat jurnal terenkripsi…</p>}
      {journalError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><span>{journalError}</span><button type="button" onClick={() => setJournalReloadKey(value => value + 1)} className="min-h-9 rounded-md border border-rose-300 px-2.5 font-semibold hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-900 dark:hover:bg-rose-950">Coba lagi</button></div>}

      {/* ========================================================================= */}
      {/* ELEGANT TABULAR NAVIGATION PANEL */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-850 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Compass className={`w-6 h-6 text-teal-600 dark:text-teal-400 ${shouldReduceMotion ? '' : 'animate-spin-slow'}`} />
            <span>Lokakarya Tenang Mandiri</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pilih latihan audio, grounding, atau refleksi jurnal sesuai kondisi dan kenyamananmu.
          </p>
          {hasActiveAudio && (
            <button
              type="button"
              onClick={stopAllAudio}
              aria-label="Matikan semua suara mindfulness"
              className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-950"
            >
              <VolumeX className="h-4 w-4" />
              Matikan semua suara
            </button>
          )}
        </div>

        <div className="relative max-w-full">
          <div
            role="tablist"
            aria-label="Kategori Lokakarya Ketenangan"
            className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-full p-0.5 max-w-full overflow-x-auto shrink-0 scrollbar-none"
          >
            <button
              type="button"
              role="tab"
              id="tab-soundscape"
              aria-controls="panel-soundscape"
              aria-selected={activeTab === 'soundscape'}
              onClick={() => setActiveTab('soundscape')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'soundscape'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Soundscape</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-grounding"
              aria-controls="panel-grounding"
              aria-selected={activeTab === 'grounding'}
              onClick={() => setActiveTab('grounding')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'grounding'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>5-4-3-2-1</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-gratitude"
              aria-controls="panel-gratitude"
              aria-selected={activeTab === 'gratitude'}
              onClick={() => setActiveTab('gratitude')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'gratitude'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Jurnal Syukur</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-compassion"
              aria-controls="panel-compassion"
              aria-selected={activeTab === 'compassion'}
              onClick={() => setActiveTab('compassion')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'compassion'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Kapsul Waktu</span>
            </button>
          </div>
          {/* Scroll fade affordance cue on small screens */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-100 dark:from-slate-900 to-transparent rounded-r-full sm:hidden opacity-75" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER CONTENT SECTION */}
      {/* ========================================================================= */}
      <div className="min-h-[420px]">
        <AnimatePresence mode="wait">
          {/* TAB 1: PREMIUM WEB AUDIO SOUNDSCAPE */}
          {activeTab === 'soundscape' && (
            <motion.div
              key="soundscape"
              initial={panelInitial}
              animate={panelAnimate}
              exit={panelExit}
              className="space-y-6"
            >
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Pemutar Suara Ambient</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                      Suara dibuat langsung di browser dengan Web Audio API; aplikasi tidak mengunduh file audio untuk fitur ini. Ketersediaan tetap bergantung pada browser dan perangkat Anda.
                    </p>
                  </div>
                </div>

                {/* Synthesis Control Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {/* Option 1: Theta Beats */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl flex flex-col justify-between space-y-4 transition-all hover:shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Gelombang Theta</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-mono text-[9px] uppercase font-bold tracking-wider">6Hz Beat</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        Suara berulang mungkin terasa menenangkan bagi sebagian orang, tetapi respons tiap orang berbeda. Hentikan jika terasa tidak nyaman; headphone bersifat opsional.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleTheta}
                      className={`w-full py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isPlayingTheta
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isPlayingTheta ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{isPlayingTheta ? 'Matikan' : 'Dengarkan Gelombang'}</span>
                    </button>
                  </div>

                  {/* Option 2: Ocean Sweep */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl flex flex-col justify-between space-y-4 transition-all hover:shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Deburan Ombak</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 font-mono text-[9px] uppercase font-bold tracking-wider">LFO Filter Sweep</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        Audio latar dengan pola desau berulang yang terinspirasi angin dan ombak. Hentikan jika terasa tidak nyaman.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleWaves}
                      className={`w-full py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isPlayingWaves
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isPlayingWaves ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{isPlayingWaves ? 'Matikan' : 'Dengarkan Ombak'}</span>
                    </button>
                  </div>

                  {/* Option 3: FM Windchime Harmony */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl flex flex-col justify-between space-y-4 transition-all hover:shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Gemerincing Chime</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-mono text-[9px] uppercase font-bold tracking-wider">Pentatonic Scale</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        Audio latar dari nada acak yang menyerupai lonceng angin. Hentikan jika terasa tidak nyaman.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleChimes}
                      className={`w-full py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isPlayingChimes
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isPlayingChimes ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{isPlayingChimes ? 'Matikan' : 'Dengarkan Chime'}</span>
                    </button>
                  </div>
                </div>

                {/* Master Volume Slider */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/80 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block">Volume Suara Utama</span>
                      <span className="text-[11px] text-slate-400">Atur intensitas kekerasan suara total</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:max-w-xs">
                    <span className="text-[11px] font-medium text-slate-400">Min</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      aria-label="Volume suara utama"
                      aria-valuetext={`${volume}%`}
                      onChange={event => handleVolumeChange(Number(event.target.value))}
                      className="flex-1 accent-teal-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg outline-none"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{volume}%</span>
                  </div>
                </div>

                {/* Optional breathing visual while any sound is active */}
                {(isPlayingTheta || isPlayingWaves || isPlayingChimes) && (
                  <div className="flex flex-col items-center justify-center py-6 border-t border-slate-100 dark:border-slate-800/50">
                    <motion.div
                      animate={shouldReduceMotion ? { scale: 1 } : { scale: [1, 1.45, 1] }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center"
                    >
                      <motion.div
                        animate={shouldReduceMotion ? { scale: 1 } : { scale: [1, 1.35, 1] }}
                        transition={shouldReduceMotion ? { duration: 0 } : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal-500/20 flex items-center justify-center"
                      >
                        <Wind className={`w-5 h-5 text-teal-600 dark:text-teal-400 ${shouldReduceMotion ? '' : 'animate-pulse'}`} />
                      </motion.div>
                    </motion.div>
                    <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 mt-4 tracking-wider uppercase">{shouldReduceMotion ? 'Suara sedang aktif' : 'Ikuti visual bila terasa nyaman'}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: INTERACTIVE 5-4-3-2-1 GROUNDING TECHNIQUE */}
          {activeTab === 'grounding' && (
            <motion.div
              key="grounding"
              initial={panelInitial}
              animate={panelAnimate}
              exit={panelExit}
              className="space-y-6"
            >
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-5 rounded-2xl">
                {!isGroundingFinished ? (
                  <div className="space-y-5">
                    {/* Header Step Counter */}
                    <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                          {groundingStep}
                        </div>
                        <div>
                          <span className="text-xs font-semibold block text-slate-800 dark:text-slate-100">Teknik Grounding 5-4-3-2-1</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Latihan Grounding 5-4-3-2-1</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">Langkah {groundingStep} dari 5</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tidak perlu memaksakan diri. Anda boleh melewati indera atau langkah yang tidak nyaman atau tidak sesuai.
                    </p>

                    {/* Step wizard content switcher */}
                    <AnimatePresence mode="wait">
                      {groundingStep === 1 && (
                        <motion.div
                          key="step1"
                          initial={stepInitial}
                          animate={stepAnimate}
                          exit={stepExit}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                              <Sparkles className={`w-4 h-4 ${shouldReduceMotion ? '' : 'animate-pulse'}`} />
                              5 Hal yang Dapat Anda Lihat
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Arahkan pandangan Anda ke sekeliling ruangan. Temukan dan ketikkan 5 objek visual yang ada di sekitar Anda saat ini.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                            {groundingInputs.sights.map((val, idx) => (
                              <input
                                key={`sight-${idx}`}
                                type="text"
                                value={val}
                                onChange={(e) => {
                                  const copy = [...groundingInputs.sights];
                                  copy[idx] = e.target.value;
                                  setGroundingInputs({ ...groundingInputs, sights: copy });
                                }}
                                placeholder={`Objek ${idx + 1}`}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {groundingStep === 2 && (
                        <motion.div
                          key="step2"
                          initial={stepInitial}
                          animate={stepAnimate}
                          exit={stepExit}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                              <Sparkles className={`w-4 h-4 ${shouldReduceMotion ? '' : 'animate-pulse'}`} />
                              4 Hal yang Dapat Anda Sentuh
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Rasakan sensasi fisik pada kulit Anda. Sentuh baju Anda, meja, dinding, atau permukaan barang lainnya, lalu catatkan.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            {groundingInputs.touches.map((val, idx) => (
                              <input
                                key={`touch-${idx}`}
                                type="text"
                                value={val}
                                onChange={(e) => {
                                  const copy = [...groundingInputs.touches];
                                  copy[idx] = e.target.value;
                                  setGroundingInputs({ ...groundingInputs, touches: copy });
                                }}
                                placeholder={`Sentuhan ${idx + 1}`}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {groundingStep === 3 && (
                        <motion.div
                          key="step3"
                          initial={stepInitial}
                          animate={stepAnimate}
                          exit={stepExit}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                              <Sparkles className={`w-4 h-4 ${shouldReduceMotion ? '' : 'animate-pulse'}`} />
                              3 Suara yang Dapat Anda Dengar
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Pejamkan mata sejenak jika membantu. Dengarkan bunyi kipas angin, deru jalan raya luar, atau detak jarum jam, lalu tuliskan.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {groundingInputs.sounds.map((val, idx) => (
                              <input
                                key={`sound-${idx}`}
                                type="text"
                                value={val}
                                onChange={(e) => {
                                  const copy = [...groundingInputs.sounds];
                                  copy[idx] = e.target.value;
                                  setGroundingInputs({ ...groundingInputs, sounds: copy });
                                }}
                                placeholder={`Suara ${idx + 1}`}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {groundingStep === 4 && (
                        <motion.div
                          key="step4"
                          initial={stepInitial}
                          animate={stepAnimate}
                          exit={stepExit}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                              <Sparkles className={`w-4 h-4 ${shouldReduceMotion ? '' : 'animate-pulse'}`} />
                              2 Aroma yang Dapat Anda Cium
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Jika nyaman, perhatikan aroma di sekitar dan tuliskan. Anda boleh melewati langkah ini.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {groundingInputs.smells.map((val, idx) => (
                              <input
                                key={`smell-${idx}`}
                                type="text"
                                value={val}
                                onChange={(e) => {
                                  const copy = [...groundingInputs.smells];
                                  copy[idx] = e.target.value;
                                  setGroundingInputs({ ...groundingInputs, smells: copy });
                                }}
                                placeholder={`Aroma ${idx + 1}`}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {groundingStep === 5 && (
                        <motion.div
                          key="step5"
                          initial={stepInitial}
                          animate={stepAnimate}
                          exit={stepExit}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                              <Sparkles className={`w-4 h-4 ${shouldReduceMotion ? '' : 'animate-pulse'}`} />
                              1 Hal yang Dapat Anda Rasakan (Mengecap)
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Jika nyaman, perhatikan rasa yang sudah ada di mulut Anda. Tidak perlu mencoba makanan atau minuman baru.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {groundingInputs.tastes.map((val, idx) => (
                              <input
                                key={`taste-${idx}`}
                                type="text"
                                value={val}
                                onChange={(e) => {
                                  const copy = [...groundingInputs.tastes];
                                  copy[idx] = e.target.value;
                                  setGroundingInputs({ ...groundingInputs, tastes: copy });
                                }}
                                placeholder="Rasa kecapan"
                                className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Progress navigation buttons */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => groundingStep > 1 && setGroundingStep(groundingStep - 1)}
                        disabled={groundingStep === 1}
                        className="btn-secondary px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Sebelumnya</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNextGrounding}
                        className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <span>{groundingStep === 5 ? 'Selesai' : 'Berikutnya'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Completed State */
                  <div className="text-center py-8 space-y-4">
                    <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-full w-14 h-14 flex items-center justify-center mx-auto shadow-2xs">
                      <Check className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Latihan selesai</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-normal">
                        Respons setiap orang berbeda. Jika latihan ini tidak membantu atau terasa kurang nyaman, berhenti dan pilih cara lain yang terasa aman.
                      </p>
                    </div>

                    <div className="flex justify-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={resetGrounding}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Ulangi Latihan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: DAILY GRATITUDE JOURNAL WITH PERSISTENT ENTRIES */}
          {activeTab === 'gratitude' && (
            <motion.div
              key="gratitude"
              initial={panelInitial}
              animate={panelAnimate}
              exit={panelExit}
              className="space-y-6"
            >
              {/* Gratitude Form */}
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-5 rounded-2xl">
                <form onSubmit={saveGratitudeLog} className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                      <Smile className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Tulis Catatan Syukur Hari Ini</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                        Catat tiga hal kecil atau besar yang membuat Anda bersyukur hari ini untuk meningkatkan kesehatan mental dan kebahagiaan Anda.
                      </p>
                    </div>
                  </div>

                  {showGSuccessMessage && (
                    <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
                      animate={shouldReduceMotion ? { opacity: 1, y: 0, transition: { duration: 0 } } : { opacity: 1, y: 0 }}
                      className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 rounded-xl text-xs flex items-center gap-2 border border-teal-200"
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Catatan syukur berhasil ditambahkan ke jurnal lokal Anda! ✨</span>
                    </motion.div>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="note1" className="text-xs font-semibold text-slate-600 dark:text-slate-300">1. Hal pertama yang saya syukuri hari ini:</label>
                      <input
                        id="note1"
                        type="text"
                        required
                        value={gFormNote1}
                        onChange={(e) => setGFormNote1(e.target.value)}
                        placeholder="Contoh: Bisa menikmati sarapan hangat tanpa terburu-buru"
                        className="px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="note2" className="text-xs font-semibold text-slate-600 dark:text-slate-300">2. Hal kedua yang saya syukuri:</label>
                      <input
                        id="note2"
                        type="text"
                        value={gFormNote2}
                        onChange={(e) => setGFormNote2(e.target.value)}
                        placeholder="Contoh: Diskusi materi kuliah dengan teman sekelas berjalan lancar"
                        className="px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="note3" className="text-xs font-semibold text-slate-600 dark:text-slate-300">3. Hal ketiga yang saya syukuri:</label>
                      <input
                        id="note3"
                        type="text"
                        value={gFormNote3}
                        onChange={(e) => setGFormNote3(e.target.value)}
                        placeholder="Contoh: Cuaca sore hari sangat sejuk dan segar"
                        className="px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="gperson" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Siapa orang yang ingin saya berterima kasih hari ini?</label>
                        <input
                          id="gperson"
                          type="text"
                          value={gFormPerson}
                          onChange={(e) => setGFormPerson(e.target.value)}
                          placeholder="Contoh: Ibu yang menelepon menanyakan kabar"
                          className="px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="gchallenge" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Satu tantangan kecil yang berhasil dilewati?</label>
                        <input
                          id="gchallenge"
                          type="text"
                          value={gFormChallenge}
                          onChange={(e) => setGFormChallenge(e.target.value)}
                          placeholder="Contoh: Akhirnya mengumpulkan draf bab 2 skripsi"
                          className="px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Kepuasan Hari Ini:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={`rating-${val}`}
                              type="button"
                              onClick={() => setGFormRating(val)}
                              className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                gFormRating === val
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-slate-200/60 hover:bg-slate-300/60 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingJournal || isJournalLoading}
                        className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Simpan ke Jurnal</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Gratitude Entries List */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Arsip Jurnal Syukur ({filteredGratitude.length})</span>

                  {/* Local Search bar inside gratitude list */}
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Cari kata kunci syukur..."
                      value={searchGratitude}
                      onChange={(e) => setSearchGratitude(e.target.value)}
                      className="px-8 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none w-full"
                    />
                  </div>
                </div>

                {filteredGratitude.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl">
                    <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Belum ada entri jurnal syukur yang cocok dengan pencarian Anda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredGratitude.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-4 rounded-xl space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700 relative group shadow-3xs"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{item.date}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tingkat Kebahagiaan: {item.moodRating}/5</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteGratitudeEntry(item.id)}
                            className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                            title="Hapus Jurnal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* List bullet points of what they appreciate */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-850 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 font-normal">
                          <p className="flex items-start gap-1.5"><span className="text-amber-500 shrink-0 font-bold">1.</span> <span>{item.note1}</span></p>
                          {item.note2 && <p className="flex items-start gap-1.5"><span className="text-amber-500 shrink-0 font-bold">2.</span> <span>{item.note2}</span></p>}
                          {item.note3 && <p className="flex items-start gap-1.5"><span className="text-amber-500 shrink-0 font-bold">3.</span> <span>{item.note3}</span></p>}
                        </div>

                        {/* Optional responses */}
                        {(item.personToThank || item.challengeOvercome) && (
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {item.personToThank && (
                              <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/50">
                                🤝 Berterima kasih kepada: <strong>{item.personToThank}</strong>
                              </span>
                            )}
                            {item.challengeOvercome && (
                              <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                                ⚡ Melewati tantangan: <strong>{item.challengeOvercome}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: SELF COMPASSION TIME CAPSULE */}
          {activeTab === 'compassion' && (
            <motion.div
              key="compassion"
              initial={panelInitial}
              animate={panelAnimate}
              exit={panelExit}
              className="space-y-6"
            >
              {/* Write a Compassion Letter Form */}
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-5 rounded-2xl">
                <form onSubmit={handleSaveLetter} className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shrink-0">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Kapsul Waktu: Surat Welas Asih</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                        Tulis surat penenang untuk diri Anda di masa depan yang sarat kasih sayang, lalu "kunci" surat ini hingga tanggal rilis tertentu saat Anda benar-benar membutuhkannya.
                      </p>
                    </div>
                  </div>

                  {showCompassionSuccess && (
                    <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
                      animate={shouldReduceMotion ? { opacity: 1, y: 0, transition: { duration: 0 } } : { opacity: 1, y: 0 }}
                      className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 rounded-xl text-xs flex items-center gap-2 border border-teal-200"
                    >
                      <Lock className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>Surat Welas Asih Anda telah berhasil dikunci dalam kapsul waktu lokal! 🔐</span>
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="lettertext" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tuliskan kata-kata penyemangat / keluh kesah Anda saat ini:</label>
                      <textarea
                        id="lettertext"
                        required
                        rows={4}
                        value={letterContent}
                        onChange={(e) => setLetterContent(e.target.value)}
                        placeholder="Tuliskan di sini... Ingatlah bahwa Anda berharga, kesalahan masa lalu adalah proses belajar, dan perjuangan Anda hari ini tidak sia-sia..."
                        className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none w-full resize-none font-normal leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="letterdate" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tanggal Buka Kunci:</label>
                        <input
                          id="letterdate"
                          type="date"
                          required
                          value={letterUnlockDate}
                          onChange={(e) => setLetterUnlockDate(e.target.value)}
                          className="px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="letterkey" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Frasa Kunci Pembuka:</label>
                        <input
                          id="letterkey"
                          type="text"
                          required
                          value={letterKeyPhrase}
                          onChange={(e) => setLetterKeyPhrase(e.target.value)}
                          placeholder="Frasa rahasia (misal: 'semangat')"
                          className="px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tema Visual Surat:</span>
                        <div className="flex items-center gap-2 h-9">
                          {(['teal', 'amber', 'slate'] as const).map((t) => (
                            <button
                              key={`theme-${t}`}
                              type="button"
                              onClick={() => setLetterTheme(t)}
                              className={`flex-1 h-full rounded-lg border text-xs font-semibold uppercase tracking-wider cursor-pointer ${
                                letterTheme === t
                                  ? t === 'teal' ? 'bg-teal-650 text-white border-teal-500' : t === 'amber' ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-white border-slate-700'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-200/50 dark:border-slate-800">
                      <button
                        type="submit"
                        disabled={isSavingJournal || isJournalLoading}
                        className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Simpan & Kunci Surat</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Letters locked list */}
              <div className="space-y-4">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Surat Tersimpan ({letters.length})</span>

                {letters.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl">
                    <Lock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Belum ada surat welas asih terkunci di kapsul waktu Anda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {letters.map((item) => {
                      const todayStr = localDateString();
                      const isDatePassed = new Date(todayStr).getTime() >= new Date(item.unlockDate).getTime();
                      const displayTheme = item.theme === 'teal' ? 'teal' : item.theme === 'amber' ? 'amber' : 'slate';

                      return (
                        <div
                          key={item.id}
                          className={`border rounded-2xl p-4 flex flex-col justify-between space-y-4 transition-all shadow-3xs relative group ${
                            displayTheme === 'teal'
                              ? 'bg-teal-50/20 border-teal-200/60'
                              : displayTheme === 'amber'
                              ? 'bg-amber-50/20 border-amber-200/60'
                              : 'bg-slate-100/30 border-slate-200/60 dark:border-slate-800'
                          }`}
                        >
                          {/* Close / deletion button */}
                          <button
                            type="button"
                            onClick={() => deleteLetter(item.id)}
                            className="absolute top-3 right-3 p-1 rounded-lg text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            title="Hapus Surat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {item.isUnlocked ? (
                                <Unlock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              ) : (
                                <Lock className="w-4 h-4 text-slate-400" />
                              )}
                              <span className="text-xs font-bold block text-slate-900 dark:text-slate-100">Surat Ditulis: {item.dateWritten}</span>
                            </div>

                            {item.isUnlocked ? (
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal italic surface-muted p-3 rounded-xl border border-default">
                                "{item.content}"
                              </p>
                            ) : (
                              <div className="p-3.5 bg-slate-200/30 dark:bg-slate-900/60 border border-dashed border-slate-300/80 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center py-6 space-y-1">
                                <Lock className="w-5 h-5 text-slate-400" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">Status: Terkunci</span>
                                <span className="text-[10px] text-slate-400">Rilis: {item.unlockDate}</span>
                                {!isDatePassed && (
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" /> Terbuka dalam {Math.ceil((new Date(item.unlockDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24))} hari
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {!item.isUnlocked && (
                            <div className="pt-2 border-t border-slate-200/40">
                              {unlockAttemptId === item.id ? (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Masukkan frasa pembuka..."
                                      value={unlockKeyPhraseInput}
                                      onChange={(e) => setUnlockKeyPhraseInput(e.target.value)}
                                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs focus:outline-none flex-1 min-w-0 text-slate-800 dark:text-slate-100"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUnlockLetterAttempt(item)}
                                      className="px-3.5 py-1.5 rounded-xl bg-teal-700 text-white font-semibold text-xs transition-all hover:bg-teal-800 cursor-pointer shrink-0"
                                    >
                                      Buka
                                    </button>
                                  </div>
                                  {unlockError && (
                                    <span className="text-[9.5px] text-rose-600 font-medium flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 shrink-0" />
                                      <span>{unlockError}</span>
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => { setUnlockAttemptId(null); setUnlockError(''); }}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                                  >
                                    Batalkan
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setUnlockAttemptId(item.id); setUnlockError(''); setUnlockKeyPhraseInput(''); }}
                                  className="w-full py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                                >
                                  Masukkan Kunci Verifikasi
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
