"""
Local RAG Engine v1.2 (Local AI Lab)
Fitur Utama:
- Smart Incremental Auto-Sync (hanya embed file baru/diedit lewat MD5 tracking)
- Multi-format ingestion (.pdf, .docx, .txt, .md)
- Real-time Token Streaming di terminal
- Anti-halusinasi dengan penguncian konteks dokumen
"""

import os
import sys
import glob
import json
import math
import hashlib
import urllib.request
import urllib.error
from typing import List, Dict, Any, Tuple

# Pastikan UTF-8 di Windows Console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from local_ai_lab.document_loader import load_and_chunk_document
except ImportError:
    from document_loader import load_and_chunk_document

OLLAMA_HOST = "http://localhost:11434"
EMBED_MODEL = "all-minilm"
LLM_MODEL = "si-pinter"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CACHE_FILE = os.path.join(BASE_DIR, "vector_store.json")


def compute_file_hash(filepath: str) -> str:
    """Menghitung hash MD5 dari file untuk deteksi perubahan konten."""
    hasher = hashlib.md5()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    except OSError:
        return ""


def call_ollama_embed(text: str) -> List[float]:
    """Mengubah teks menjadi embedding vektor lewat Ollama."""
    url = f"{OLLAMA_HOST}/api/embeddings"
    payload = json.dumps({"model": EMBED_MODEL, "prompt": text}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("embedding", [])
    except Exception as e:
        print(f"\n[Error Embedding] Gagal memanggil '{EMBED_MODEL}' di Ollama: {e}")
        return []


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Menghitung kemiripan sudut (cosine similarity) antara dua vektor."""
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def load_vector_store() -> Dict[str, Any]:
    """Memuat database vektor lokal dari file cache."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "chunks" in data:
                    return data
        except Exception:
            pass
    return {"version": "1.2", "file_hashes": {}, "chunks": []}


def save_vector_store(store: Dict[str, Any]):
    """Menyimpan database vektor lokal ke file cache."""
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def sync_documents(force: bool = False) -> Dict[str, Any]:
    """
    Sinkronisasi pintar (Smart Incremental Sync):
    Hanya meng-embed file yang BARU atau BERUBAH.
    File yang dihapus akan otomatis dibersihkan dari database vektor.
    """
    store = load_vector_store() if not force else {"version": "1.2", "file_hashes": {}, "chunks": []}
    existing_hashes = store.get("file_hashes", {})
    chunks = store.get("chunks", [])

    # Ambil semua file yang didukung di folder data/
    supported_exts = (".txt", ".md", ".pdf", ".docx", ".doc")
    all_files = [
        f for f in glob.glob(os.path.join(DATA_DIR, "*.*"))
        if os.path.splitext(f)[1].lower() in supported_exts
    ]

    current_files = {os.path.basename(f): f for f in all_files}
    current_hashes = {name: compute_file_hash(path) for name, path in current_files.items()}

    # Deteksi perubahan
    new_or_modified = []
    for name, h in current_hashes.items():
        if name not in existing_hashes or existing_hashes[name] != h:
            new_or_modified.append(name)

    deleted_files = [name for name in existing_hashes if name not in current_hashes]

    if not new_or_modified and not deleted_files and chunks:
        # Tidak ada perubahan sama sekali
        return store

    print("\n" + "-" * 50)
    print("[Smart Sync v1.2] Memeriksa perubahan dokumen...")

    # 1. Hapus chunk dari file yang dihapus atau file yang dimodifikasi (akan di-embed ulang)
    files_to_remove = set(deleted_files + new_or_modified)
    if files_to_remove:
        chunks = [c for c in chunks if c.get("source") not in files_to_remove]
        for name in deleted_files:
            existing_hashes.pop(name, None)
            print(f"  [-] Menghapus cache file lama: {name}")

    # 2. Proses file baru / termodifikasi
    for name in new_or_modified:
        filepath = current_files[name]
        print(f"  [+] Memproses file: {name} ...")
        new_doc_chunks = load_and_chunk_document(filepath, chunk_size=400, chunk_overlap=50)
        print(f"      Dibuat {len(new_doc_chunks)} potongan informasi. Menghitung embedding...")

        for c in new_doc_chunks:
            vec = call_ollama_embed(c["text"])
            if vec:
                c["vector"] = vec
                chunks.append(c)

        existing_hashes[name] = current_hashes[name]

    # Simpan hasil pembaruan
    store["file_hashes"] = existing_hashes
    store["chunks"] = chunks
    save_vector_store(store)

    print(f"[OK] Sync selesai! Total {len(chunks)} potongan informasi dari {len(existing_hashes)} dokumen.")
    print("-" * 50 + "\n")
    return store


def stream_ollama_generate(prompt: str):
    """Mengirim prompt ke LLM lokal dan men-stream kata-per-kata ke layar secara real-time."""
    url = f"{OLLAMA_HOST}/api/generate"
    payload = json.dumps({
        "model": LLM_MODEL,
        "prompt": prompt,
        "stream": True,
        "options": {
            "temperature": 0.25
        }
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            in_think_block = False
            for line in resp:
                if not line:
                    continue
                data = json.loads(line.decode("utf-8"))
                token = data.get("response", "")

                # Penanganan jika model menggunakan tag reasoning <think>
                if "<think>" in token:
                    in_think_block = True
                    continue
                if "</think>" in token:
                    in_think_block = False
                    continue
                if in_think_block:
                    continue

                sys.stdout.write(token)
                sys.stdout.flush()
        print()
    except Exception as e:
        print(f"\n[Error LLM] Gagal stream dari '{LLM_MODEL}': {e}")


def ask_rag(question: str):
    """Menjawab pertanyaan menggunakan RAG v1.2."""
    store = sync_documents()
    chunks = store.get("chunks", [])

    if not chunks:
        print("\n[!] Belum ada dokumen di folder data/. Masukkan file .txt, .md, .pdf, atau .docx.")
        return

    # 1. Hitung embedding pertanyaan
    q_vec = call_ollama_embed(question)
    if not q_vec:
        print("[!] Gagal menghitung embedding pertanyaan.")
        return

    # 2. Ranking relevansi dokumen
    scored = []
    for c in chunks:
        score = cosine_similarity(q_vec, c.get("vector", []))
        scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Ambil 3 chunk paling relevan dengan skor minimal 0.25
    top_chunks = [c for score, c in scored[:3] if score >= 0.25]

    print("\n" + "=" * 55)
    print(f"PERTANYAAN: {question}")
    print("=" * 55)

    if not top_chunks:
        print("\n[Info Dokumen] Tidak ada informasi yang relevan dalam dokumen internal.")
        print("Tips: Coba tambahkan dokumen terkait ke folder: local_ai_lab/data/")
        print("=" * 55 + "\n")
        return

    print(f"[Konteks Ditemukan] {len(top_chunks)} bagian dokumen relevan:")
    for idx, c in enumerate(top_chunks):
        page_info = f" (Halaman {c.get('page')})" if c.get("page") else ""
        print(f"  * Sumber {idx+1}: {c['source']}{page_info} [Bagian {c['chunk_id']}]")

    print("\n[Jawaban AI (Streaming)]:\n")

    # 3. Bentuk prompt terspesifikasi
    context_text = "\n\n---\n\n".join([
        f"Dokumen: {c['source']}\n{c['text']}" for c in top_chunks
    ])

    rag_prompt = f"""Kamu adalah asisten pintar. Jawab pertanyaan pengguna HANYA berdasarkan KONTEKS DOKUMEN resmi yang diberikan di bawah ini.
Sebutkan nama dokumen saat memberikan informasi penting. Jika jawabannya tidak ada di dalam konteks, nyatakan bahwa informasi tersebut tidak tercantum dalam dokumen resmi.

[KONTEKS DOKUMEN]:
{context_text}

[PERTANYAAN PENGGUNA]:
{question}

[JAWABAN LENGKAP & TERSTRUKTUR]:"""

    # 4. Stream jawaban langsung ke terminal
    stream_ollama_generate(rag_prompt)
    print("=" * 55 + "\n")


def print_help():
    print("""
Perintah Tersedia:
  /sync   -> Periksa & sinkronkan ulang dokumen di folder data/
  /docs   -> Tampilkan daftar dokumen yang sudah terindeks
  /help   -> Tampilkan bantuan ini
  keluar  -> Menutup program (atau tekan Ctrl+C)
""")


def list_docs():
    store = load_vector_store()
    hashes = store.get("file_hashes", {})
    chunks = store.get("chunks", [])
    if not hashes:
        print("[Info] Belum ada dokumen yang terindeks.")
        return
    print(f"\n[Dokumen Terindeks] ({len(hashes)} file, {len(chunks)} total chunks):")
    for name in hashes:
        file_chunks = sum(1 for c in chunks if c.get("source") == name)
        print(f"  * {name}: {file_chunks} chunks")
    print()


def main():
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        ask_rag(query)
        return

    # Mode Interaktif REPL
    print("=" * 55)
    print("   Local AI Lab - RAG & Modelfile Engine v1.2")
    print("   Model: si-pinter (Qwen 1.7B) | Embedding: all-minilm")
    print("=" * 55)

    # Auto-sync dokumen awal
    sync_documents()
    print_help()

    while True:
        try:
            q = input("Tanya Dokumen > ").strip()
            if not q:
                continue
            if q.lower() in ("keluar", "exit", "quit", "q"):
                print("Sampai jumpa!")
                break
            elif q.lower() == "/sync":
                sync_documents(force=True)
            elif q.lower() == "/docs":
                list_docs()
            elif q.lower() == "/help":
                print_help()
            else:
                ask_rag(q)
        except (KeyboardInterrupt, EOFError):
            print("\nSampai jumpa!")
            break


if __name__ == "__main__":
    main()
