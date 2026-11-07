import React from 'react';
import {
  X,
  Sparkles,
  Code2,
  Gamepad2,
  TestTube2,
  ArrowRight,
  Palette
} from 'lucide-react';

export interface StarterTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  badgeColor: string;
  files: Record<string, string>;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'vanilla',
    name: 'Vanilla Modern & Utilities',
    category: 'Dasar',
    description: 'HTML5 semantik, CSS modern responsif dengan custom variables, dan JavaScript ES Module.',
    icon: Code2,
    badgeColor: 'sky',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RuangCoder Vanilla Modern</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="app-card">
    <div class="badge">⚡ RuangCoder Web Sandbox</div>
    <h1>RuangCoder Vanilla Modern</h1>
    <p>Aplikasi web modern berbasis HTML5 semantik, CSS modern, dan modular ES JavaScript.</p>
    
    <div class="counter-box">
      <button id="decBtn" class="btn btn-secondary">-</button>
      <span id="countValue">0</span>
      <button id="incBtn" class="btn btn-primary">+</button>
    </div>

    <div class="tools-grid">
      <button id="colorBtn" class="btn-outline">🎲 Acak Warna Tema</button>
      <button id="timeBtn" class="btn-outline">⏱️ Waktu Sekarang</button>
    </div>

    <p id="statusText" class="status-text">Siap menerima instruksi coding dari AI...</p>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>`,
      'styles.css': `:root {
  --bg-color: #090d16;
  --card-bg: rgba(15, 23, 42, 0.75);
  --primary: #38bdf8;
  --primary-hover: #0ea5e9;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --border: rgba(56, 189, 248, 0.2);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.app-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  padding: 32px;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(56, 189, 248, 0.15);
  color: var(--primary);
  border: 1px solid rgba(56, 189, 248, 0.3);
  margin-bottom: 16px;
}

h1 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.counter-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}

#countValue {
  font-size: 36px;
  font-weight: 800;
  min-width: 60px;
  color: #f8fafc;
}

.btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.btn:active {
  transform: scale(0.92);
}

.btn-primary {
  background: var(--primary);
  color: #031626;
}

.btn-secondary {
  background: #334155;
  color: #f8fafc;
}

.tools-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.btn-outline {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-main);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-outline:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: var(--primary);
}

.status-text {
  font-size: 12px;
  color: var(--primary);
  margin-bottom: 0;
}`,
      'app.js': `// RuangCoder Application Logic
import { calculateStats, formatDateTime } from './utils.js';

let count = 0;

function updateDisplay() {
  const countEl = document.getElementById('countValue');
  const statusEl = document.getElementById('statusText');
  if (countEl) countEl.textContent = String(count);
  if (statusEl) {
    const stats = calculateStats([count, count * 2, count * 5]);
    statusEl.textContent = \`Statistik: Sum=\${stats.sum}, Avg=\${stats.avg}\`;
  }
}

document.getElementById('incBtn')?.addEventListener('click', () => {
  count++;
  updateDisplay();
});

document.getElementById('decBtn')?.addEventListener('click', () => {
  count--;
  updateDisplay();
});

document.getElementById('timeBtn')?.addEventListener('click', () => {
  const statusEl = document.getElementById('statusText');
  if (statusEl) statusEl.textContent = \`Waktu: \${formatDateTime(new Date())}\`;
});

document.getElementById('colorBtn')?.addEventListener('click', () => {
  const colors = ['#38bdf8', '#34d399', '#f43f5e', '#a855f7', '#fbbf24'];
  const picked = colors[Math.floor(Math.random() * colors.length)];
  document.documentElement.style.setProperty('--primary', picked);
});

console.log('RuangCoder Vanilla Modern App Initialized!');
updateDisplay();`,
      'utils.js': `// Utility functions supporting ESM imports
export function calculateStats(numbers) {
  if (!numbers || numbers.length === 0) return { sum: 0, avg: 0, count: 0 };
  const sum = numbers.reduce((acc, curr) => acc + curr, 0);
  const avg = Number((sum / numbers.length).toFixed(2));
  return { sum, avg, count: numbers.length };
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(date);
}`,
      'test.js': `// Automated Unit Test Suite for Vanilla Modern
const assert = require('assert');

function calculateStats(numbers) {
  if (!numbers || numbers.length === 0) return { sum: 0, avg: 0, count: 0 };
  const sum = numbers.reduce((acc, curr) => acc + curr, 0);
  const avg = Number((sum / numbers.length).toFixed(2));
  return { sum, avg, count: numbers.length };
}

console.log('🧪 Memulai pengujian unit...');

// Test 1: Hitung statistik array biasa
const res1 = calculateStats([10, 20, 30]);
assert.strictEqual(res1.sum, 60, 'Sum harus bernilai 60');
assert.strictEqual(res1.avg, 20, 'Average harus bernilai 20');
console.log('✅ Test 1: calculateStats normal array lulus.');

// Test 2: Array kosong
const res2 = calculateStats([]);
assert.strictEqual(res2.sum, 0, 'Sum array kosong harus 0');
console.log('✅ Test 2: calculateStats empty array lulus.');

console.log('🎉 Semua pengujian unit berhasil dilewati 100%!');`
    }
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS Glass Dashboard',
    category: 'Styling Modern',
    description: 'Antarmuka dasbor modern responsif menggunakan Tailwind CSS via CDN dengan efek Glassmorphism.',
    icon: Palette,
    badgeColor: 'teal',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tailwind Glassmorphism Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '#38bdf8'
          }
        }
      }
    }
  </script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6 selection:bg-sky-500/30">
  <div class="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
        <span class="text-xs font-semibold tracking-wider uppercase text-slate-400">Tailwind Playground</span>
      </div>
      <button id="themeToggle" class="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-white transition">
        🌙 Toggle Dark
      </button>
    </div>

    <div>
      <h1 class="text-2xl font-black bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
        Glassmorphism Card
      </h1>
      <p class="text-xs text-slate-400 mt-1 leading-relaxed">
        Eksperimen styling utility-first langsung di sandbox browser tanpa proses build lokal.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
        <span class="text-xs text-slate-400">Total Proyek</span>
        <div id="statProjects" class="text-2xl font-bold text-white mt-1">12</div>
      </div>
      <div class="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
        <span class="text-xs text-slate-400">Tingkat Efisiensi</span>
        <div class="text-2xl font-bold text-emerald-400 mt-1">98.5%</div>
      </div>
    </div>

    <div class="space-y-2">
      <button id="actionBtn" class="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm transition-all transform active:scale-95 shadow-lg shadow-sky-500/20">
        🚀 Tambah Proyek Baru
      </button>
      <div id="logOutput" class="text-[11px] text-center text-slate-400 font-mono">
        Siap beroperasi.
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>`,
      'app.js': `// Tailwind Dashboard Handler
let projects = 12;

const btn = document.getElementById('actionBtn');
const stat = document.getElementById('statProjects');
const log = document.getElementById('logOutput');
const themeToggle = document.getElementById('themeToggle');

btn?.addEventListener('click', () => {
  projects++;
  if (stat) stat.textContent = String(projects);
  if (log) log.textContent = \`Proyek #\${projects} berhasil dibuat pada \${new Date().toLocaleTimeString()}!\`;
});

themeToggle?.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  if (themeToggle) themeToggle.textContent = isDark ? '🌙 Toggle Dark' : '☀️ Toggle Light';
});`,
      'test.js': `// Test runner for Tailwind logic
const assert = require('assert');

let counter = 12;
function addProject() {
  counter++;
  return counter;
}

assert.strictEqual(addProject(), 13);
console.log('✅ Project increment test passed!');`
    }
  },
  {
    id: 'game',
    name: 'Canvas 2D Arcade: Snake Game',
    category: 'Game Interaktif',
    description: 'Game klasik Snake 2D lengkap dengan kontrol keyboard panah/WASD, skor, dan deteksi tabrakan.',
    icon: Gamepad2,
    badgeColor: 'amber',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RuangCoder 2D Snake Arcade</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="game-container">
    <div class="header">
      <h2>🐍 RuangCoder Snake</h2>
      <div class="score-badge">Score: <span id="scoreVal">0</span></div>
    </div>
    <canvas id="gameCanvas" width="400" height="400"></canvas>
    <div class="controls-hint">Gunakan tombol panah ⬅️ ⬆️ ➡️ ⬇️ atau W A S D untuk mengarahkan ular.</div>
    <button id="restartBtn" class="restart-btn">Mulai Ulang Game</button>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      'styles.css': `body {
  margin: 0;
  background: #070a12;
  color: #f8fafc;
  font-family: system-ui, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.game-container {
  display: flex;
  flex-col;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: #0f172a;
  padding: 20px;
  border-radius: 20px;
  border: 1px solid #1e293b;
  box-shadow: 0 20px 40px rgba(0,0,0,0.6);
}
.header {
  width: 400px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
h2 {
  margin: 0;
  font-size: 18px;
  color: #34d399;
}
.score-badge {
  font-weight: bold;
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
}
canvas {
  background: #020617;
  border: 2px solid #334155;
  border-radius: 12px;
}
.controls-hint {
  font-size: 11px;
  color: #94a3b8;
}
.restart-btn {
  background: #34d399;
  color: #022c22;
  border: none;
  font-weight: bold;
  padding: 8px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
}`,
      'app.js': `// 2D Snake Arcade Game Engine
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreVal');
const restartBtn = document.getElementById('restartBtn');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let dx = 1;
let dy = 0;
let food = { x: 15, y: 15 };
let score = 0;
let gameOver = false;
let gameLoop;

function placeFood() {
  food.x = Math.floor(Math.random() * tileCount);
  food.y = Math.floor(Math.random() * tileCount);
}

function update() {
  if (gameOver) return;

  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Collision with walls
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    gameOver = true;
    return;
  }

  // Collision with self
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      gameOver = true;
      return;
    }
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    if (scoreEl) scoreEl.textContent = String(score);
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw food
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Draw snake
  snake.forEach((seg, index) => {
    ctx.fillStyle = index === 0 ? '#34d399' : '#059669';
    ctx.fillRect(seg.x * gridSize + 1, seg.y * gridSize + 1, gridSize - 2, gridSize - 2);
  });

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px system-ui';
    ctx.fillText('Klik tombol Mulai Ulang untuk bermain lagi', canvas.width / 2, canvas.height / 2 + 20);
  }
}

function loop() {
  update();
  draw();
}

window.addEventListener('keydown', e => {
  if ((e.key === 'ArrowUp' || e.key === 'w') && dy === 0) { dx = 0; dy = -1; }
  else if ((e.key === 'ArrowDown' || e.key === 's') && dy === 0) { dx = 0; dy = 1; }
  else if ((e.key === 'ArrowLeft' || e.key === 'a') && dx === 0) { dx = -1; dy = 0; }
  else if ((e.key === 'ArrowRight' || e.key === 'd') && dx === 0) { dx = 1; dy = 0; }
});

restartBtn?.addEventListener('click', () => {
  snake = [{ x: 10, y: 10 }];
  dx = 1;
  dy = 0;
  score = 0;
  if (scoreEl) scoreEl.textContent = '0';
  gameOver = false;
  placeFood();
});

gameLoop = setInterval(loop, 120);`,
      'test.js': `// Game logic tests
const assert = require('assert');

function checkCollision(head, tileCount) {
  return head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount;
}

assert.strictEqual(checkCollision({ x: -1, y: 5 }, 20), true);
assert.strictEqual(checkCollision({ x: 5, y: 5 }, 20), false);
console.log('✅ Snake collision boundary check passed!');`
    }
  },
  {
    id: 'algorithm',
    name: 'Algorithm & Test Suite Scratchpad',
    category: 'Computer Science',
    description: 'Pusat implementasi algoritma (Binary Search, Sorting, Graph traversal) dengan suite unit test komprehensif.',
    icon: TestTube2,
    badgeColor: 'purple',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RuangCoder Algorithm Lab</title>
  <style>
    body {
      background: #090d16;
      color: #e2e8f0;
      font-family: monospace;
      padding: 30px;
      line-height: 1.6;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293d;
      border-radius: 16px;
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }
    h1 { color: #a855f7; font-size: 20px; margin-top: 0; }
    pre { background: #020617; padding: 12px; border-radius: 8px; border: 1px solid #334155; }
    button {
      background: #a855f7;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🧠 RuangCoder Algorithm & Test Runner</h1>
    <p>Buka tab <strong>TEST RUNNER</strong> di panel Terminal bawah untuk menjalankan eksekusi pengujian otomatis.</p>
    <button id="runBtn">Jalankan Binary Search Demo</button>
    <pre id="output">Hasil eksekusi akan muncul di sini...</pre>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      'app.js': `// Algorithm Lab Implementations
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

document.getElementById('runBtn')?.addEventListener('click', () => {
  const dataset = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  const target = 23;
  const index = binarySearch(dataset, target);
  const out = document.getElementById('output');
  if (out) {
    out.textContent = \`Dataset: [\${dataset.join(', ')}]\nTarget: \${target}\nDitemukan pada Index: \${index}\`;
  }
});`,
      'test.js': `// Automated Test Suite for Algorithms
const assert = require('assert');

function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[arr.length - 1];
  const left = [];
  const right = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < pivot) left.push(arr[i]);
    else right.push(arr[i]);
  }
  return [...quickSort(left), pivot, ...quickSort(right)];
}

console.log('🧪 Menjalankan pengujian Binary Search...');
assert.strictEqual(binarySearch([1, 3, 5, 7, 9], 5), 2);
assert.strictEqual(binarySearch([1, 3, 5, 7, 9], 10), -1);
console.log('✅ Binary search tests passed!');

console.log('🧪 Menjalankan pengujian Quick Sort...');
const sorted = quickSort([5, 2, 9, 1, 5, 6]);
assert.deepStrictEqual(sorted, [1, 2, 5, 5, 6, 9]);
console.log('✅ Quick sort tests passed!');

console.log('🎉 Seluruh rangkaian pengujian algoritma berhasil dilewati!');`
    }
  }
];

interface StarterTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: StarterTemplate) => void;
  isDark?: boolean;
}

export const StarterTemplateModal: React.FC<StarterTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  isDark = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden ${
          isDark ? 'bg-[#0b0f19] border-[#1f293d] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'border-[#1f293d] bg-slate-900/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Galeri Starter Template Proyek</h3>
              <p className="text-[11px] text-slate-400">Pilih template untuk langsung mulai coding di sandbox virtual</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STARTER_TEMPLATES.map(tmpl => {
            const Icon = tmpl.icon;
            return (
              <div
                key={tmpl.id}
                onClick={() => {
                  onSelectTemplate(tmpl);
                  onClose();
                }}
                className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all group ${
                  isDark
                    ? 'bg-slate-900/40 border-slate-800 hover:border-sky-500/50 hover:bg-slate-850'
                    : 'bg-white border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 shadow-xs'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {tmpl.category}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100 group-hover:text-sky-300 transition-colors">
                      {tmpl.name}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">{tmpl.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/60 mt-3 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Gunakan Template Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div
          className={`px-5 py-3 border-t text-[11px] text-slate-500 flex items-center justify-between ${
            isDark ? 'border-[#1f293d] bg-slate-950/60' : 'border-slate-200 bg-slate-100'
          }`}
        >
          <span>💡 Mengganti template akan menyimpan snapshot otomatis, kamu dapat kembali kapan saja via tab Diff.</span>
        </div>
      </div>
    </div>
  );
};
