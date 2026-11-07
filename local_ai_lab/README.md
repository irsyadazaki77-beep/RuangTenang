# Local AI Lab - RuangTenang & RuangKerja Kampus

Direktori ini berisi konfigurasi, skrip otomatisasi, modelfiles Ollama, dan alat RAG (Retrieval-Augmented Generation) lokal untuk ekosistem AI Kampus RuangTenang.

---

## 🏛️ Arsitektur Dual-Core AI

RuangTenang menggabungkan dua lingkungan AI:
1. **Teman RuangTenang**: Pendamping reflektif berbasis prinsip CBT, mindfulness, dan pertolongan pertama emosional kampus.
2. **RuangKerja & RuangCoder**: Workspace akademik terintegrasi untuk bimbingan skripsi, audit metodologi, simulasi sidang komprehensif, dan Monaco IDE dengan autograder koding.

Platform ini menggunakan **Hybrid Routing** (Cloud API + Local Ollama):
- **Cloud Models**: Gemini 2.5 Flash, Claude 3.5 Sonnet, GPT-4o mini via API gateway.
- **Local On-Premise Models**: Berjalan 100% offline di laptop mahasiswa atau server kampus via Ollama.

---

## 🤖 Katalog Model Lokal (Modelfiles)

| Model Name | Modelfile | Base Model | Karakteristik & Peruntukan |
| :--- | :--- | :--- | :--- |
| **`si-pinter`** | `Modelfile.pinter` (fallback: `Modelfile.asisten`) | `qwen3:1.7b` / `qwen2.5:1.5b` | v3.5 Supreme Local Genius: penalaran adaptif First-Principles, Min-P sampling (0.05), few-shot in-context learning, pemecahan masalah akademik presisi, dan koding type-safe tanpa placeholder pemalas. |
| **`si-tangguh`** | `Modelfile.tangguh` | `deepseek-r1:1.5b` / `qwen2.5-coder:1.5b` | Penalaran mendalam step-by-step, audit metodologi skripsi, autograding logika, dan responsi praktikum. |
| **`si-gacor`** | `Modelfile.gacor` | `qwen2.5:3b` | Kecepatan tinggi untuk brainstorming ide penelitian, sintesis narasi, dan ringkasan literatur. |

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
Skrip ini mengunduh bobot model penalaran dan mengonfigurasi `Modelfile.tangguh` dengan guardrails integritas akademik.

---

## 🧪 Pengujian & Diagnostik Model Lokal

Anda dapat menguji apakah model lokal telah terdaftar dan siap melayani permintaan inferensi menggunakan skrip otomatis proyek:

```bash
# Diagnostik Si Pinter
npm run check:si-pinter

# Diagnostik Si Tangguh
npm run check:si-tangguh
```

Output diagnostik akan memverifikasi:
- Status registri `AI_MODEL_REGISTRY`.
- Keputusan auto-routing `smartModelRouter`.
- Ketersediaan bobot model di daemon Ollama lokal.
- Inferensi nyata (real test prompt) ke model lokal.

---

## 📚 Local Document Intelligence & RAG

Untuk kampus yang menghendaki panduan skripsi dan kurikulum universitas dicari secara offline:
- `document_loader.py`: Membaca dokumen PDF/DOCX/TXT panduan kampus dan memotongnya menjadi potongan terindeks.
- `local_rag.py`: Menjalankan pencarian semantik vektor lokal berbasis cosine similarity tanpa mengirim data mahasiswa ke internet.
- `vector_store.json`: Database representasi vektor dokumen lokal (diabaikan oleh git untuk menjaga privasi data).
