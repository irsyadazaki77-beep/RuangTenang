# Local AI Lab - RuangTenang & RuangKerja Kampus

Direktori ini berisi konfigurasi, skrip otomatisasi, modelfiles Ollama, dan alat RAG (Retrieval-Augmented Generation) lokal untuk ekosistem AI Kampus RuangTenang.

---

## 🏛️ Arsitektur Dual-Core AI

RuangTenang menggabungkan dua lingkungan AI terintegrasi:
1. **Teman RuangTenang**: Pendamping reflektif berbasis prinsip CBT, mindfulness, anti-prokrastinasi, dan pertolongan pertama emosional kampus (termasuk eskalasi krisis darurat hotline 119).
2. **RuangKerja & RuangCoder**: Workspace akademik komprehensif untuk penyusunan naskah skripsi Bab 1–5, audit metodologi, simulasi sidang komprehensif, standarisasi sitasi APA 7th & IEEE, dan Monaco IDE dengan autograder koding.

Platform ini menggunakan **Hybrid Routing** (Cloud API + Local Ollama):
- **Cloud Models**: Gemini 2.5 Flash, Claude 3.5 Sonnet, GPT-4o mini via API gateway.
- **Local On-Premise Models**: Berjalan 100% offline di laptop mahasiswa atau server kampus via Ollama.

---

## 🤖 Katalog Model Lokal (Modelfiles)

| Model Name | Modelfile | Base Model | Karakteristik & Peruntukan |
| :--- | :--- | :--- | :--- |
| **`si-pinter`** | `Modelfile.pinter` (fallback: `Modelfile.asisten`) | `qwen3:1.7b` / `qwen2.5:1.5b` | **v4.0 Supreme Local Genius & Research Co-Pilot**: Penalaran adaptif First-Principles, Min-P sampling (0.08), draf naskah skripsi Bab 1–5, sitasi ilmiah APA 7th & IEEE, rumus baku Slovin presisi, anti-halusinasi data privat, AST Balance Guarantee koding, dan CBT micro-stepping. |
| **`si-tangguh`** | `Modelfile.tangguh` | `deepseek-r1:1.5b` / `qwen2.5-coder:1.5b` | Penalaran mendalam step-by-step, audit metodologi skripsi, autograding logika, dan responsi praktikum. |
| **`si-gacor`** | `Modelfile.gacor` | `qwen2.5:3b` | Kecepatan tinggi untuk brainstorming ide penelitian, sintesis narasi, dan ringkasan literatur. |

---

## ⚡ Tandem Co-Op 2.0 (Dual-Engine AI Pipeline)

Fitur `/tandem` memanfaatkan kolaborasi dua model:
1. **`draft_and_verify`**: Si Pinter menyusun kerangka struktural secara kilat, lalu Si Gacor mengaudit arsitektur dan mengeksekusi detail siap produksi tanpa placeholder.
2. **`draft_verify_and_polish` (Tri-Pass)**: Si Pinter membuat draf $\rightarrow$ Auditor menelaah celah logika $\rightarrow$ Si Pinter menyatukan sintesis final yang siap pakai lengkap dengan checklist aksi.
3. **`architect_and_explain`**: Si Gacor merancang solusi kompleks, lalu Si Pinter menerjemahkan menjadi panduan ramah mahasiswa (*Maba Explainer*).

---

## 📚 Local Hybrid RAG v2.0 (Dense Vector + BM25Okapi)

Untuk kampus yang menghendaki panduan skripsi dan kurikulum universitas dicari secara offline:
- **`local_rag.py` (v2.0)**: Menggabungkan pencarian semantik vektor (`all-minilm`) dan pencarian leksikal `BM25Okapi` dengan **Reciprocal Rank Fusion (RRF)**. Mampu menemukan pasal/SK spesifik sekaligus menangkap maksud pertanyaan secara konseptual tanpa kebocoran data keluar.
- **`document_loader.py`**: Membaca dokumen PDF/DOCX/TXT panduan kampus dan memotongnya menjadi potongan terindeks.
- **Smart Incremental Sync**: Melacak MD5 setiap file sehingga hanya dokumen baru/berubah yang dihitung ulang.

---

## 🚀 Skrip Setup Cepat (Windows)

Pastikan [Ollama](https://ollama.com) telah terpasang di sistem Anda.

### 1. Memasang `si-pinter` (Qwen3 1.7B)
Jalankan file batch:
```cmd
local_ai_lab\setup_si_pinter.bat
```
Skrip ini akan secara otomatis:
1. Memeriksa daemon Ollama di `http://127.0.0.1:11434`.
2. Melakukan `ollama pull qwen3:1.7b`.
3. Membangun model dengan instruksi khusus RuangTenang via `Modelfile.pinter`.

### 2. Memasang `si-tangguh` (DeepSeek-R1 / Qwen Coder)
Jalankan file batch:
```cmd
local_ai_lab\setup_si_tangguh.bat
```

---

## 🧪 Pengujian & Diagnostik Otomatis

```bash
# Diagnostik Si Pinter v4.0 (3 Tahap Uji: Rumus Slovin, Kejujuran Epistemik, Draf Skripsi APA 7)
npm run check:si-pinter

# Diagnostik Si Tangguh
npm run check:si-tangguh

# Pengujian Unit Test Vitest
npm test

# Pengujian Hybrid RAG Lokal
python -m unittest local_ai_lab/test_local_rag.py
```
