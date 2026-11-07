import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Wind,
  Timer,
  Heart,
  ArrowRight,
  Code2,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SelfCarePreset {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  description: string;
  badge: string;
  badgeColor: string;
  files: Record<string, string>;
  promptToCoder: string;
}

const SELF_CARE_PRESETS: SelfCarePreset[] = [
  {
    id: 'breathing_478',
    name: 'Interactive Breathing 4-7-8',
    category: 'Relaksasi & Panic Relief',
    icon: Wind,
    badge: 'Pernapasan Rileks',
    badgeColor: 'teal',
    description: 'Visualizer pernapasan melingkar dengan hitungan audio-visual (Tarik 4 detik, Tahan 7 detik, Buang 8 detik).',
    promptToCoder: 'Halo Mbak Dewi & Pak Habibie! Saya mengimpor preset Latihan Pernapasan 4-7-8 dari Ruang Chat. Tolong buatkan animasi gelombang lingkaran breathing yang menenangkan dengan suara ambient rileks!',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Latihan Pernapasan 4-7-8 - RuangTenang</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="card">
    <div class="badge">🌿 RuangTenang Self-Care Widget</div>
    <h2>Latihan Pernapasan 4-7-8</h2>
    <p class="subtitle">Tarik napas dalam 4 detik, tahan 7 detik, lalu hembuskan perlahan 8 detik.</p>

    <div class="circle-container">
      <div id="breathCircle" class="circle">
        <span id="breathPhase">Tarik Napas</span>
        <span id="breathTimer">4</span>
      </div>
    </div>

    <div class="controls">
      <button id="toggleBtn" class="btn btn-primary">Mulai Sesi</button>
      <button id="resetBtn" class="btn btn-secondary">Reset</button>
    </div>
    <div id="cycleCount" class="cycle-text">Siklus selesai: 0</div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      'styles.css': `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: radial-gradient(circle at 50% 20%, #0d9488, #042f2e 70%, #021a19);
  color: #f0fdfa;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.card {
  background: rgba(13, 148, 136, 0.15);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(45, 212, 191, 0.3);
  border-radius: 24px;
  padding: 36px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
}
.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(45, 212, 191, 0.2);
  color: #5eead4;
  margin-bottom: 12px;
}
h2 {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 8px;
}
.subtitle {
  color: #99f6e4;
  font-size: 12px;
  line-height: 1.5;
  margin-bottom: 28px;
}
.circle-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  margin-bottom: 24px;
}
.circle {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: radial-gradient(circle, #2dd4bf 0%, #0f766e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 35px rgba(45, 212, 191, 0.5);
  transition: transform 1s ease-in-out;
}
.circle.inhale {
  transform: scale(1.35);
}
.circle.hold {
  transform: scale(1.35);
  box-shadow: 0 0 45px rgba(251, 191, 36, 0.6);
}
.circle.exhale {
  transform: scale(0.9);
}
#breathPhase {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
#breathTimer {
  font-size: 32px;
  font-weight: 800;
}
.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}
.btn {
  padding: 10px 22px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}
.btn-primary {
  background: #2dd4bf;
  color: #042f2e;
}
.btn-primary:hover {
  background: #5eead4;
}
.btn-secondary {
  background: rgba(255, 255, 255, 0.15);
  color: #f0fdfa;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.25);
}
.cycle-text {
  font-size: 11px;
  color: #99f6e4;
}`,
      'app.js': `let running = false;
let currentPhase = 'inhale';
let secondsLeft = 4;
let interval = null;
let cycles = 0;

const phaseDurations = {
  inhale: { label: 'Tarik Napas', dur: 4, next: 'hold', class: 'inhale' },
  hold: { label: 'Tahan', dur: 7, next: 'exhale', class: 'hold' },
  exhale: { label: 'Hembuskan', dur: 8, next: 'inhale', class: 'exhale' }
};

const circle = document.getElementById('breathCircle');
const phaseEl = document.getElementById('breathPhase');
const timerEl = document.getElementById('breathTimer');
const toggleBtn = document.getElementById('toggleBtn');
const resetBtn = document.getElementById('resetBtn');
const cycleEl = document.getElementById('cycleCount');

function updateUI() {
  if (!phaseEl || !timerEl || !circle) return;
  const cfg = phaseDurations[currentPhase];
  phaseEl.textContent = cfg.label;
  timerEl.textContent = String(secondsLeft);
  circle.className = 'circle ' + cfg.class;
}

function tick() {
  secondsLeft--;
  if (secondsLeft <= 0) {
    if (currentPhase === 'exhale') {
      cycles++;
      if (cycleEl) cycleEl.textContent = 'Siklus selesai: ' + cycles;
    }
    currentPhase = phaseDurations[currentPhase].next;
    secondsLeft = phaseDurations[currentPhase].dur;
  }
  updateUI();
}

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    if (running) {
      clearInterval(interval);
      running = false;
      toggleBtn.textContent = 'Lanjutkan';
    } else {
      running = true;
      toggleBtn.textContent = 'Jeda';
      interval = setInterval(tick, 1000);
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    clearInterval(interval);
    running = false;
    currentPhase = 'inhale';
    secondsLeft = 4;
    cycles = 0;
    if (toggleBtn) toggleBtn.textContent = 'Mulai Sesi';
    if (cycleEl) cycleEl.textContent = 'Siklus selesai: 0';
    updateUI();
  });
}`
    }
  },
  {
    id: 'focus_pomodoro',
    name: 'Pomodoro Focus & Study Timer',
    category: 'Manajemen Belajar Mahasiswa',
    icon: Timer,
    badge: 'Produktivitas',
    badgeColor: 'amber',
    description: 'Timer fokus 25 menit sesi kuliah / skripsi dengan visual ring progress dan tombol jeda relaksasi 5 menit.',
    promptToCoder: 'Tolong buatkan visualisasi timer Pomodoro dengan tema minimalis RuangTenang, lengkap dengan log riwayat sesi belajar!',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Focus Pomodoro - RuangTenang</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="card">
    <div class="badge">⏳ RuangTenang Focus Lab</div>
    <h2 id="sessionLabel">Sesi Belajar & Skripsi</h2>
    <div id="timerDisplay" class="timer">25:00</div>
    <div class="btn-group">
      <button id="startBtn" class="btn btn-main">Mulai Sesi</button>
      <button id="breakBtn" class="btn btn-alt">Istirahat 5m</button>
      <button id="resetBtn" class="btn btn-alt">Reset</button>
    </div>
    <p class="quote">"Satu langkah kecil yang konsisten lebih berarti daripada maraton semalam."</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      'styles.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: radial-gradient(circle at 50% 20%, #451a03, #1c1917 80%);
  color: #fef3c7;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.card {
  background: rgba(28, 25, 23, 0.85);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 24px;
  padding: 36px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
}
.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  margin-bottom: 12px;
}
.timer {
  font-size: 54px;
  font-weight: 800;
  letter-spacing: 2px;
  margin: 20px 0;
  font-variant-numeric: tabular-nums;
  color: #fbbf24;
}
.btn-group { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; }
.btn {
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: transform 0.1s ease;
}
.btn:active { transform: scale(0.95); }
.btn-main { background: #f59e0b; color: #451a03; }
.btn-alt { background: rgba(255, 255, 255, 0.1); color: #fef3c7; }
.quote { font-size: 11px; color: #d97706; font-style: italic; }`,
      'app.js': `let totalSec = 25 * 60;
let timer = null;
let isBreak = false;

const display = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const breakBtn = document.getElementById('breakBtn');
const resetBtn = document.getElementById('resetBtn');
const label = document.getElementById('sessionLabel');

function render() {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  if (display) display.textContent = m + ':' + s;
}

if (startBtn) {
  startBtn.addEventListener('click', () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      startBtn.textContent = 'Lanjutkan';
    } else {
      timer = setInterval(() => {
        if (totalSec > 0) {
          totalSec--;
          render();
        } else {
          clearInterval(timer);
          timer = null;
          alert(isBreak ? '☕ Waktu istirahat selesai! Siap fokus lagi?' : '🎉 Sesi fokus 25 menit selesai! Ambil jeda 5 menit.');
        }
      }, 1000);
      startBtn.textContent = 'Jeda';
    }
  });
}

if (breakBtn) {
  breakBtn.addEventListener('click', () => {
    clearInterval(timer);
    timer = null;
    isBreak = true;
    totalSec = 5 * 60;
    if (label) label.textContent = 'Istirahat Singkat (5m)';
    if (startBtn) startBtn.textContent = 'Mulai';
    render();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    clearInterval(timer);
    timer = null;
    isBreak = false;
    totalSec = 25 * 60;
    if (label) label.textContent = 'Sesi Belajar & Skripsi';
    if (startBtn) startBtn.textContent = 'Mulai Sesi';
    render();
  });
}`
    }
  },
  {
    id: 'mood_pulse',
    name: 'Mood & Energy Level Tracker',
    category: 'Mood & Emotional Reflection',
    icon: Heart,
    badge: 'Jurnal Emosi',
    badgeColor: 'rose',
    description: 'Papan klik kilat level emosi (Senang, Tenang, Lelah, Cemas, Kewalahan) dengan log visual dan tips penenang.',
    promptToCoder: 'Buatkan visualisasi Mood Tracker harian mahasiswa dengan chart visual bar sederhana dan rekomendasi aktivitas penyeimbang emosi!',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mood Pulse - RuangTenang</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="card">
    <div class="badge">💖 RuangTenang Mood Pulse</div>
    <h2>Bagaimana Perasaanmu Saat Ini?</h2>
    <div class="mood-grid">
      <button class="mood-btn" data-mood="Tenang">🌱<br>Tenang</button>
      <button class="mood-btn" data-mood="Senang">✨<br>Senang</button>
      <button class="mood-btn" data-mood="Lelah">🌙<br>Lelah</button>
      <button class="mood-btn" data-mood="Cemas">🌪️<br>Cemas</button>
    </div>
    <div id="tipBox" class="tip-box">Pilih salah satu emosi untuk melihat afirmasi dan tips khusus.</div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      'styles.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: radial-gradient(circle at 50% 20%, #881337, #1e1b4b);
  color: #fff1f2;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(251, 113, 133, 0.3);
  border-radius: 24px;
  padding: 32px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(244, 63, 94, 0.2);
  color: #fda4af;
  margin-bottom: 12px;
}
.mood-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 20px 0;
}
.mood-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  padding: 12px 6px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.mood-btn:hover { background: rgba(244, 63, 94, 0.4); transform: translateY(-2px); }
.tip-box {
  background: rgba(0, 0, 0, 0.3);
  padding: 14px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #fecdd3;
}`,
      'app.js': `const tips = {
  Tenang: 'Pertahankan ketenangan ini. Lanjutkan aktivitas dengan tempo yang nyaman.',
  Senang: 'Syukuri energi positifmu! Kamu bisa membagikan senyum ke teman di kampus hari ini.',
  Lelah: 'Tubuhmu meminta jeda sejenak. Minum air putih hangat dan hindari layar selama 10 menit.',
  Cemas: 'Tarik napas panjang. Ingat: apa yang kamu khawatirkan belum tentu terjadi. Kamu aman saat ini.'
};

document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mood = btn.getAttribute('data-mood');
    const box = document.getElementById('tipBox');
    if (box && tips[mood]) {
      box.textContent = \`💡 [\${mood}]: \${tips[mood]}\`;
    }
  });
});`
    }
  }
];

interface SelfCareWidgetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SelfCareWidgetGeneratorModal: React.FC<SelfCareWidgetGeneratorModalProps> = ({
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const [selectedPresetId, setSelectedPresetId] = useState<string>('breathing_478');

  if (!isOpen) return null;

  const currentPreset = SELF_CARE_PRESETS.find(p => p.id === selectedPresetId) || SELF_CARE_PRESETS[0];

  const handleLaunchToCoder = () => {
    try {
      const bridgePayload = {
        title: `Self-Care: ${currentPreset.name}`,
        type: 'web_app',
        content: currentPreset.files['index.html'] || '',
        language: 'html',
        presetFiles: currentPreset.files,
        prompt: currentPreset.promptToCoder,
        createdAt: Date.now()
      };
      sessionStorage.setItem('ruangkerja_to_coder_bridge', JSON.stringify(bridgePayload));
      onClose();
      navigate('/ruang-coder');
    } catch (e) {
      console.error('Failed to bridge to RuangCoder:', e);
      navigate('/ruang-coder');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-[#0b0f19] border border-teal-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Self-Care & Mental Health Widget Generator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                  RuangCoder 🤝 Kampus
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Generate widget relaksasi dan produktivitas interaktif langsung ke sandbox kode.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Preset Cards */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Pilih Template Widget:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SELF_CARE_PRESETS.map(preset => {
              const Icon = preset.icon;
              const isSelected = preset.id === selectedPresetId;
              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-teal-950/40 border-teal-400 shadow-md shadow-teal-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-teal-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white leading-tight">{preset.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{preset.description}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-teal-400 mt-2 block">
                    {preset.category}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Preset Detail Preview */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-teal-400" />
                <span>File Bundling yang Dihasilkan</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {Object.keys(currentPreset.files).join(' • ')}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentPreset.description}
            </p>
            <div className="text-[11px] text-teal-300/90 font-mono bg-teal-950/60 p-2.5 rounded-lg border border-teal-500/20">
              💬 <em>"{currentPreset.promptToCoder}"</em>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Akan membuka RuangCoder dengan preview instan.
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleLaunchToCoder}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20 transition cursor-pointer"
            >
              <span>Buka & Render di RuangCoder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
