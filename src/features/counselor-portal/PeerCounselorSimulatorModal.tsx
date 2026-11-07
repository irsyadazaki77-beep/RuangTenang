import React, { useState } from 'react';
import {
  Send,
  AlertTriangle,
  RotateCcw,
  Brain
} from 'lucide-react';

export interface CrisisScenario {
  id: string;
  title: string;
  category: string;
  studentName: string;
  semester: string;
  initialMessage: string;
  triggerContext: string;
  coreIssues: string[];
  recommendedApproaches: string[];
}

export const CRISIS_SCENARIOS: CrisisScenario[] = [
  {
    id: 'burnout_skripsi',
    title: 'Burnout Akut & Tekanan Sidang Skripsi',
    category: 'Akademik & Perfeksionisme',
    studentName: 'Rian (Teknik Informatika, Sem 8)',
    semester: 'Semester 8',
    initialMessage: 'Halo kak... saya gatau harus cerita ke siapa lagi. Dosen pembimbing saya tolak revisi bab 4 untuk ketiga kalinya. Rasanya hampa banget, udah seminggu gabisa tidur dan mual setiap buka laptop. Teman-teman udah pada wisuda...',
    triggerContext: 'Mahasiswa mengalami sindrom komparasi sosial intens dan kelelahan mental menjelang deadline registrasi sidang.',
    coreIssues: ['Sleep deprivation', 'Imposter syndrome', 'Fear of failure'],
    recommendedApproaches: ['Validasi emosi tanpa penghakiman', 'Teknik grounding & de-eskalasi', 'Fokus pada micro-steps realistis']
  },
  {
    id: 'financial_anxiety',
    title: 'Krisis Biaya UKT & Tekanan Keluarga',
    category: 'Sosio-Ekonomi & Stres Finansial',
    studentName: 'Dina (Ilmu Komunikasi, Sem 4)',
    semester: 'Semester 4',
    initialMessage: 'Kak, ortu di kampung baru aja kena PHK. Tagihan UKT keluar minggu depan dan kalau telat saya harus cuti paksa. Saya takut banget ngecewain orang tua, rasanya pengen kabur aja...',
    triggerContext: 'Kecemasan finansial mendadak yang memicu rasa bersalah (guilt) dan ide melarikan diri (escapism).',
    coreIssues: ['Financial vulnerability', 'Guilt and parental burden', 'Academic continuity threat'],
    recommendedApproaches: ['Dukungan afektif awal', 'Eksplorasi advokasi beasiswa/keringanan kampus', 'Stabilisasi rasa panik']
  },
  {
    id: 'social_isolation',
    title: 'Isolasi Sosial & Imposter Syndrome Kampus',
    category: 'Adaptasi & Kesehatan Mental',
    studentName: 'Farhan (Kedokteran, Sem 2)',
    semester: 'Semester 2',
    initialMessage: 'Permisi kak... dari semester 1 saya ngerasa salah jurusan. Teman-teman sekelas pada pinter dan punya circle sendiri. Saya di kosan seharian, nangis terus dan ngerasa ga pantas ada di kampus ini.',
    triggerContext: 'Kesepian mendalam mahasiswa perantau baru dengan penurunan self-efficacy.',
    coreIssues: ['Social alienation', 'Low self-esteem', 'Homesickness'],
    recommendedApproaches: ['Eksplorasi kekuatan personal', 'Normalisasi kurva adaptasi semester awal', 'Dorongan keterlibatan komunitas']
  }
];

export const PeerCounselorSimulatorModal: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<CrisisScenario>(CRISIS_SCENARIOS[0]);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      role: 'user',
      text: CRISIS_SCENARIOS[0].initialMessage,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [rubricScores, setRubricScores] = useState<{ empathy: number; activeListening: number; safetyDeescalation: number }>({
    empathy: 85,
    activeListening: 80,
    safetyDeescalation: 90
  });

  const handleSelectScenario = (sc: CrisisScenario) => {
    setSelectedScenario(sc);
    setMessages([
      {
        role: 'user',
        text: sc.initialMessage,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    const txt = inputText.trim();
    if (!txt || isSimulating) return;

    const userTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const counselorMsg = { role: 'assistant' as const, text: txt, time: userTime };
    setMessages(prev => [...prev, counselorMsg]);
    setInputText('');
    setIsSimulating(true);

    // Evaluasi kata kunci empati (refleksi perasaan, validasi, keterbukaan)
    const lower = txt.toLowerCase();
    const hasEmpathyWords = ['paham', 'dengar', 'wajar', 'berat', 'rasakan', 'terima kasih sudah berbagi'].some(w => lower.includes(w));
    const hasGroundingWords = ['napas', 'pelan-pelan', 'tenang', 'bersama', 'langkah'].some(w => lower.includes(w));

    setRubricScores(prev => ({
      empathy: Math.min(100, prev.empathy + (hasEmpathyWords ? 4 : -2)),
      activeListening: Math.min(100, prev.activeListening + (txt.length > 30 ? 3 : -1)),
      safetyDeescalation: Math.min(100, prev.safetyDeescalation + (hasGroundingWords ? 5 : 0))
    }));

    // Simulasi respon emosional mahasiswa simulasi
    setTimeout(() => {
      let reply = '';
      if (hasEmpathyWords) {
        reply = `Makasih banyak kak udah dengerin tanpa nge-judge... Rasanya sedikit lebih lega karena ada yang ngerti posisi saya. Menurut kakak apa yang sebaiknya saya lakukan pertama kali malam ini?`;
      } else {
        reply = `Iya kak... tapi rasanya tetep berat banget. Masalahnya orang-orang sering cuma bilang 'sabar', padahal kepala saya udah mau pecah mikirin ini...`;
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'user',
          text: reply,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsSimulating(false);
    }, 1200);
  };

  return (
    <div className="surface-card rounded-2xl border border-default shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-default bg-stone-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <span>Simulator Latihan Konselor Sebaya (Peer-Counseling)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                AI Training Lab
              </span>
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Ruang uji coba bagi konselor sebaya untuk mengasah empati, active listening, dan de-eskalasi kasus krisis.
            </p>
          </div>
        </div>

        {/* Live Competency Gauge */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2 rounded-xl border border-default text-xs">
          <div className="text-center px-2">
            <span className="text-[10px] text-muted block">Empati</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{rubricScores.empathy}%</span>
          </div>
          <div className="w-px h-6 bg-stone-200 dark:bg-slate-800" />
          <div className="text-center px-2">
            <span className="text-[10px] text-muted block">Listening</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">{rubricScores.activeListening}%</span>
          </div>
          <div className="w-px h-6 bg-stone-200 dark:bg-slate-800" />
          <div className="text-center px-2">
            <span className="text-[10px] text-muted block">De-eskalasi</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{rubricScores.safetyDeescalation}%</span>
          </div>
        </div>
      </div>

      {/* Grid: Scenario Selector vs Chat Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
        {/* Left: Scenarios list */}
        <div className="lg:col-span-4 border-r border-default p-4 space-y-3 bg-stone-50/30 dark:bg-slate-950/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted px-1 block">
            Pilih Skenario Kasus Mahasiswa:
          </span>
          <div className="space-y-2">
            {CRISIS_SCENARIOS.map(sc => {
              const active = sc.id === selectedScenario.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    active
                      ? 'bg-indigo-50/70 border-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-default hover:border-stone-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-muted mb-1">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{sc.category}</span>
                    <span>{sc.semester}</span>
                  </div>
                  <h4 className="font-bold text-xs text-primary leading-tight">{sc.title}</h4>
                  <p className="text-[11px] text-secondary mt-1 line-clamp-2">{sc.studentName}</p>
                </div>
              );
            })}
          </div>

          {/* Context Card */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Panduan Pendampingan:</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-amber-900/80 dark:text-amber-300/80 space-y-1">
              {selectedScenario.recommendedApproaches.map((app, idx) => (
                <li key={idx}>{app}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Simulation Chat Arena */}
        <div className="lg:col-span-8 flex flex-col justify-between p-4 bg-white dark:bg-slate-900">
          {/* Active Student Profile Banner */}
          <div className="pb-3 border-b border-default flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-primary">{selectedScenario.studentName}</span>
              <span className="text-muted text-[11px]">• Roleplay Pasien Simulasi</span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectScenario(selectedScenario)}
              className="text-[11px] text-muted hover:text-primary flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Dialog</span>
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 max-h-[380px]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'assistant' ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[10px] text-muted mb-1 px-1">
                  {m.role === 'assistant' ? 'Anda (Konselor Sebaya)' : selectedScenario.studentName} • {m.time}
                </div>
                <div
                  className={`p-3 rounded-2xl max-w-lg text-xs leading-relaxed ${
                    m.role === 'assistant'
                      ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                      : 'bg-stone-100 dark:bg-slate-800 text-primary rounded-tl-xs'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isSimulating && (
              <div className="text-[11px] text-muted italic flex items-center gap-1.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                <span>{selectedScenario.studentName} sedang merespons...</span>
              </div>
            )}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendResponse} className="pt-3 border-t border-default flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ketik respon konseling empatik Anda..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-default bg-stone-50 dark:bg-slate-950 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSimulating}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
