export interface StarterTemplate {
  id: string;
  name: string;
  category: 'web' | 'react' | 'data' | 'python' | 'algorithm';
  badge: string;
  badgeColor: string;
  description: string;
  iconName: string;
  recommendedPersonaId: string;
  files: Record<string, string>;
  activeFile: string;
  openTabs: string[];
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'starter_counter',
    name: 'Vanilla Minimal Counter',
    category: 'web',
    badge: 'HTML & CSS',
    badgeColor: 'sky',
    description: 'Proyek vanilla JS minimal dengan styling glassmorphism dan counter interaktif.',
    iconName: 'FileCode',
    recommendedPersonaId: 'sutarjo',
    activeFile: 'index.html',
    openTabs: ['index.html', 'styles.css', 'app.js'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RuangCoder Vanilla Sandbox</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="app-card">
    <div class="badge">⚡ RuangCoder Live Sandbox</div>
    <h1>Halo dari RuangCoder!</h1>
    <p>AI Coding Agent otonom berbasis Local AI. Minta agent di panel kanan untuk menambahkan fitur baru atau merombak UI.</p>
    <div class="counter-box">
      <button id="decBtn" class="btn btn-secondary">-</button>
      <span id="countValue">0</span>
      <button id="incBtn" class="btn btn-primary">+</button>
    </div>
    <p id="statusText" class="status-text">Siap mengeksekusi instruksi koding...</p>
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
  background: radial-gradient(circle at 50% 10%, #1e293b, #090d16);
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.app-card {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 20px;
  padding: 32px;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
.badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  margin-bottom: 16px;
}
h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
p {
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 24px;
}
.counter-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
}
.btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-primary {
  background: linear-gradient(135deg, #0284c7, #2563eb);
  color: white;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
}
.btn-secondary {
  background: rgba(51, 65, 85, 0.8);
  color: #cbd5e1;
}
.btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}
#countValue {
  font-size: 32px;
  font-weight: 800;
  min-width: 60px;
  color: #f1f5f9;
}
.status-text {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 0;
}`,
      'app.js': `// Inisialisasi Counter
let count = 0;
const countValue = document.getElementById('countValue');
const statusText = document.getElementById('statusText');

document.getElementById('incBtn').addEventListener('click', () => {
  count++;
  countValue.textContent = count;
  statusText.textContent = 'Counter bertambah menjadi ' + count;
});

document.getElementById('decBtn').addEventListener('click', () => {
  count--;
  countValue.textContent = count;
  statusText.textContent = 'Counter berkurang menjadi ' + count;
});
`
    }
  },
  {
    id: 'landing_tailwind',
    name: 'Modern SaaS Landing Page',
    category: 'web',
    badge: 'Tailwind CDN',
    badgeColor: 'teal',
    description: 'Landing page modern siap saji dengan Hero Section, Feature Grid, Testimonial, dan Glassmorphism.',
    iconName: 'Layout',
    recommendedPersonaId: 'dewi',
    activeFile: 'index.html',
    openTabs: ['index.html', 'styles.css', 'app.js'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AuraFlow - Solusi Workflow Modern</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-teal-500 selection:text-white">

  <!-- Navbar -->
  <header class="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-800">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-400 to-sky-500 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-teal-500/20">A</span>
        <span class="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-300 to-sky-400 bg-clip-text text-transparent">AuraFlow</span>
      </div>
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
        <a href="#fitur" class="hover:text-teal-300 transition-colors">Fitur</a>
        <a href="#solusi" class="hover:text-teal-300 transition-colors">Solusi</a>
        <a href="#harga" class="hover:text-teal-300 transition-colors">Harga</a>
      </nav>
      <button class="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-md shadow-teal-500/20">
        Mulai Gratis
      </button>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative pt-20 pb-16 px-6 text-center max-w-4xl mx-auto">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-medium mb-6">
      <span class="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
      Versi 2.0 Kini Didukung Agentic AI
    </div>
    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
      Bangun & Eksekusi Ide <br/>
      <span class="bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">10x Lebih Cepat</span>
    </h1>
    <p class="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-8">
      Platform cerdas yang mengotomasi alur kerja coding, review tim, dan deploy aplikasi dengan kolaborasi AI lokal terpercaya.
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <button class="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/25 transition-all">
        Eksplorasi Sekarang
      </button>
      <button class="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2">
        <i class="fa-solid fa-play text-xs text-teal-400"></i> Lihat Demo 2 Menit
      </button>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="fitur" class="max-w-6xl mx-auto px-6 py-16">
    <div class="text-center mb-12">
      <h2 class="text-2xl sm:text-3xl font-bold mb-3">Dirancang untuk Pengembang Modern</h2>
      <p class="text-slate-400 text-sm max-w-xl mx-auto">Semua alat esensial yang Anda butuhkan untuk produktivitas tanpa hambatan.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur hover:border-teal-500/40 transition-all group">
        <div class="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <i class="fa-solid fa-bolt"></i>
        </div>
        <h3 class="text-lg font-bold mb-2 text-white">Eksekusi Kilat</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Sandbox terisolasi dengan hot-reload waktu nyata tanpa dependensi berat.</p>
      </div>

      <div class="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur hover:border-sky-500/40 transition-all group">
        <div class="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <h3 class="text-lg font-bold mb-2 text-white">Privasi Tertinggi</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Pemrosesan lokal tanpa mengirim kode sensitif ke cloud pihak ketiga.</p>
      </div>

      <div class="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur hover:border-purple-500/40 transition-all group">
        <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <i class="fa-solid fa-users-gear"></i>
        </div>
        <h3 class="text-lg font-bold mb-2 text-white">Dewan AI Multi-Role</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Kolaborasi arsitek, implementor, dan QA inspector dalam satu layar.</p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
    <p>© 2026 AuraFlow. Dibuat dengan cinta di RuangCoder.</p>
  </footer>

  <script src="app.js"></script>
</body>
</html>`,
      'styles.css': `/* Custom styles & subtle animations */
html {
  scroll-behavior: smooth;
}
`,
      'app.js': `console.log('AuraFlow Landing Page Loaded Successfully!');
`
    }
  },
  {
    id: 'dashboard_chart',
    name: 'Interactive Analytics Dashboard',
    category: 'data',
    badge: 'Chart.js & Data',
    badgeColor: 'amber',
    description: 'Dashboard metrik interaktif dengan grafik Chart.js, KPI metric cards, dan table filterable.',
    iconName: 'BarChart3',
    recommendedPersonaId: 'habibie',
    activeFile: 'index.html',
    openTabs: ['index.html', 'app.js', 'styles.css'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pulse Analytics Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <h1 class="text-2xl font-bold text-white flex items-center gap-2">
          <span>📊</span> Pulse Analytics
        </h1>
        <p class="text-xs text-slate-400">Ringkasan performa sistem dan metrik pengguna aktif.</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="refreshBtn" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors">
          🔄 Acak Data Metrik
        </button>
      </div>
    </div>

    <!-- Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <span class="text-xs text-slate-400 font-medium">Total Sesi Coding</span>
        <div class="text-2xl font-extrabold text-white mt-1" id="statSessions">12,480</div>
        <span class="text-[11px] text-emerald-400 font-semibold mt-1 inline-block">↑ +18.4% minggu ini</span>
      </div>

      <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <span class="text-xs text-slate-400 font-medium">Latensi AI Rata-rata</span>
        <div class="text-2xl font-extrabold text-sky-400 mt-1" id="statLatency">142 ms</div>
        <span class="text-[11px] text-sky-400/80 font-medium mt-1 inline-block">⚡ Model Lokal Ollama</span>
      </div>

      <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <span class="text-xs text-slate-400 font-medium">Akurasi Build Test</span>
        <div class="text-2xl font-extrabold text-emerald-400 mt-1" id="statAccuracy">99.2%</div>
        <span class="text-[11px] text-emerald-400 font-medium mt-1 inline-block">✓ Sanitasi Pak Bambang</span>
      </div>

      <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <span class="text-xs text-slate-400 font-medium">Token Hemat (Lokal)</span>
        <div class="text-2xl font-extrabold text-amber-400 mt-1" id="statTokens">4.8M</div>
        <span class="text-[11px] text-amber-400/80 font-medium mt-1 inline-block">💰 100% Bebas Biaya API</span>
      </div>
    </div>

    <!-- Chart Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 p-5 rounded-xl border border-slate-800 bg-slate-900/40">
        <h3 class="text-sm font-semibold text-slate-200 mb-4">Tren Eksekusi Kode Harian</h3>
        <div class="h-64">
          <canvas id="lineChart"></canvas>
        </div>
      </div>

      <div class="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
        <h3 class="text-sm font-semibold text-slate-200 mb-4">Distribusi Bahasa Pemrograman</h3>
        <div class="h-64 flex items-center justify-center">
          <canvas id="doughnutChart"></canvas>
        </div>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>`,
      'styles.css': `/* Dashboard styling */
body {
  margin: 0;
}
`,
      'app.js': `// Inisialisasi Chart.js
const ctxLine = document.getElementById('lineChart').getContext('2d');
const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

let lineChart = new Chart(ctxLine, {
  type: 'line',
  data: {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    datasets: [{
      label: 'Eksekusi Sukses',
      data: [120, 190, 240, 310, 280, 390, 450],
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      tension: 0.3,
      fill: true
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
    }
  }
});

let doughnutChart = new Chart(ctxDoughnut, {
  type: 'doughnut',
  data: {
    labels: ['TypeScript/JS', 'Python', 'HTML/CSS', 'SQL/Lainnya'],
    datasets: [{
      data: [50, 25, 15, 10],
      backgroundColor: ['#38bdf8', '#34d399', '#f59e0b', '#a855f7'],
      borderWidth: 0
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } } }
  }
});

document.getElementById('refreshBtn').addEventListener('click', () => {
  const randomData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 400) + 100);
  lineChart.data.datasets[0].data = randomData;
  lineChart.update();

  const sessions = Math.floor(Math.random() * 5000) + 10000;
  document.getElementById('statSessions').textContent = sessions.toLocaleString('id-ID');
});
`
    }
  },
  {
    id: 'python_pyodide',
    name: 'Python In-Browser Playground',
    category: 'python',
    badge: 'Pyodide WASM',
    badgeColor: 'emerald',
    description: 'Jalankan skrip Python langsung di browser dengan Pyodide WASM tanpa butuh server!',
    iconName: 'Terminal',
    recommendedPersonaId: 'kihadjar',
    activeFile: 'script.py',
    openTabs: ['script.py', 'index.html'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Python WASM Runner</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-mono">
  <div class="max-w-3xl mx-auto space-y-4">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div>
        <h1 class="text-lg font-bold text-emerald-400 flex items-center gap-2">
          <span>🐍</span> Python Browser Engine (Pyodide WASM)
        </h1>
        <p class="text-xs text-slate-400 font-sans">Kompilasi & eksekusi Python langsung di client-side tanpa server eksternal.</p>
      </div>
      <button id="runPyBtn" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20">
        ▶ Jalankan Python
      </button>
    </div>

    <!-- Output Box -->
    <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <div class="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between font-sans">
        <span>Terminal Output</span>
        <span id="engineStatus" class="text-amber-400 text-[11px]">Memuat runtime Pyodide...</span>
      </div>
      <pre id="outputConsole" class="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">Menginisialisasi Python runtime via WebAssembly...</pre>
    </div>
  </div>

  <script>
    let pyodideInstance = null;
    const outputConsole = document.getElementById('outputConsole');
    const engineStatus = document.getElementById('engineStatus');
    const runPyBtn = document.getElementById('runPyBtn');

    async function initPyodide() {
      try {
        pyodideInstance = await loadPyodide();
        engineStatus.textContent = '● Runtime Siap';
        engineStatus.className = 'text-emerald-400 text-[11px]';
        outputConsole.textContent = 'Pyodide Python 3.11 WASM siap dieksekusi.\\nKlik tombol "Jalankan Python" di atas.';
      } catch (err) {
        engineStatus.textContent = '✖ Gagal memuat runtime';
        engineStatus.className = 'text-rose-400 text-[11px]';
        outputConsole.textContent = 'Gagal memuat Pyodide: ' + err.message;
      }
    }

    runPyBtn.addEventListener('click', async () => {
      if (!pyodideInstance) {
        alert('Runtime Pyodide masih memuat, silakan tunggu beberapa detik...');
        return;
      }
      outputConsole.textContent = 'Mengeksekusi script.py...\\n';
      try {
        // Ambil isi script.py dari virtual storage jika ada atau default
        const scriptCode = \`
import math
import sys

def sieve_of_eratosthenes(limit):
    primes = []
    is_prime = [True] * (limit + 1)
    for p in range(2, limit + 1):
        if is_prime[p]:
            primes.append(p)
            for i in range(p * p, limit + 1, p):
                is_prime[i] = False
    return primes

print("==========================================")
print("  Halo dari Python di dalam RuangCoder!  ")
print("==========================================")
print(f"Versi Python: {sys.version.split()[0]}")
print(f"Nilai Pi: {math.pi:.6f}")

primes_100 = sieve_of_eratosthenes(100)
print(f"Bilangan prima di bawah 100 ({len(primes_100)} buah):")
print(primes_100)
print("Eksekusi selesai dengan sukses!")
\`;
        
        // Redirect stdout
        pyodideInstance.setStdout({ batched: (str) => {
          outputConsole.textContent += str + '\\n';
        }});

        await pyodideInstance.runPythonAsync(scriptCode);
      } catch (err) {
        outputConsole.textContent += '\\n[Error]: ' + err.message;
      }
    });

    initPyodide();
  </script>
</body>
</html>`,
      'script.py': `# Script Python yang dieksekusi di browser
import math
import sys

def sieve_of_eratosthenes(limit):
    """Mencari bilangan prima hingga limit dengan algoritma Sieve"""
    primes = []
    is_prime = [True] * (limit + 1)
    for p in range(2, limit + 1):
        if is_prime[p]:
            primes.append(p)
            for i in range(p * p, limit + 1, p):
                is_prime[i] = False
    return primes

print("==========================================")
print("  Halo dari Python di dalam RuangCoder!  ")
print("==========================================")
print(f"Versi Python: {sys.version.split()[0]}")
print(f"Nilai Pi: {math.pi:.6f}")

primes_100 = sieve_of_eratosthenes(100)
print(f"Bilangan prima di bawah 100 ({len(primes_100)} buah):")
print(primes_100)
`
    }
  },
  {
    id: 'algo_scratchpad',
    name: 'Algorithm & Data Structure Lab',
    category: 'algorithm',
    badge: 'LeetCode Style',
    badgeColor: 'purple',
    description: 'Lab algoritma dengan benchmarking test case, visualizer kompleksitas waktu, dan editor terpisah.',
    iconName: 'Cpu',
    recommendedPersonaId: 'kihadjar',
    activeFile: 'solution.js',
    openTabs: ['solution.js', 'testcases.json', 'index.html'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Algorithm Playground</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-mono">
  <div class="max-w-3xl mx-auto space-y-4">
    <div class="border-b border-slate-800 pb-3 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-purple-400">🧠 Algoritma: Two Sum & Binary Search</h1>
        <p class="text-xs text-slate-400 font-sans">Uji algoritma Anda terhadap kumpulan test case otomatis.</p>
      </div>
      <button id="runTestsBtn" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-600/20">
        ▶ Jalankan Test Suite
      </button>
    </div>

    <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
      <div class="text-xs font-semibold text-slate-400 font-sans">Hasil Pengujian Test Cases:</div>
      <div id="testResults" class="space-y-1.5 text-xs text-slate-300">
        <p class="text-slate-500 italic">Klik "Jalankan Test Suite" untuk mengevaluasi solution.js</p>
      </div>
    </div>
  </div>

  <script src="solution.js"></script>
  <script>
    document.getElementById('runTestsBtn').addEventListener('click', () => {
      const container = document.getElementById('testResults');
      container.innerHTML = '';

      const testCases = [
        { nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
        { nums: [3, 2, 4], target: 6, expected: [1, 2] },
        { nums: [3, 3], target: 6, expected: [0, 1] }
      ];

      testCases.forEach((tc, idx) => {
        const t0 = performance.now();
        const res = typeof twoSum === 'function' ? twoSum(tc.nums, tc.target) : null;
        const dur = (performance.now() - t0).toFixed(3);
        const pass = JSON.stringify(res) === JSON.stringify(tc.expected);

        const row = document.createElement('div');
        row.className = \`p-2.5 rounded-lg border \${pass ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'} flex items-center justify-between\`;
        row.innerHTML = \`
          <span>Test #\${idx + 1}: nums=\${JSON.stringify(tc.nums)}, target=\${tc.target} → Result: \${JSON.stringify(res)}</span>
          <span class="font-bold">\${pass ? '✓ PASS' : '✖ FAIL'} (\${dur}ms)</span>
        \`;
        container.appendChild(row);
      });
    });
  </script>
</body>
</html>`,
      'solution.js': `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
`,
      'testcases.json': `[
  { "nums": [2, 7, 11, 15], "target": 9, "expected": [0, 1] },
  { "nums": [3, 2, 4], "target": 6, "expected": [1, 2] },
  { "nums": [3, 3], "target": 6, "expected": [0, 1] }
]`
    }
  }
];
