"""
Local RAG Engine v2.0 (Local AI Lab) - Hybrid Search Edition
Fitur Utama:
- Hybrid Retrieval: Dense Vector Embedding (all-minilm) + BM25Okapi Lexical Ranker
- Reciprocal Rank Fusion (RRF) & Dynamic Thresholding
- Smart Incremental Auto-Sync (MD5 tracking untuk PDF, DOCX, TXT, MD)
- Real-time Token Streaming dengan penanganan tag <think>
- Anti-halusinasi presisi tinggi dengan penguncian konteks dokumen resmi
"""

import os
import sys
import glob
import json
import math
import hashlib
import re
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

# Stopwords umum bahasa Indonesia untuk tokenisasi leksikal BM25
INDONESIAN_STOPWORDS = {
    "yang", "di", "ke", "dari", "dan", "atau", "ini", "itu", "pada", "untuk",
    "dengan", "adalah", "sebagai", "oleh", "dalam", "bisa", "dapat", "akan",
    "saya", "kami", "anda", "dia", "mereka", "kita", "sudah", "telah", "belum",
    "ada", "tidak", "bukan", "hanya", "juga", "lagi", "pun", "serta"
}


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
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def tokenize_academic_text(text: str) -> List[str]:
    """Tokenisasi teks akademik untuk pencarian leksikal BM25."""
    tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
    return [t for t in tokens if t not in INDONESIAN_STOPWORDS]


class BM25Ranker:
    """Implementasi BM25Okapi mandiri untuk pencarian leksikal presisi."""
    def __init__(self, corpus_tokens: List[List[str]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = len(corpus_tokens)
        self.doc_lens = [len(doc) for doc in corpus_tokens]
        self.avgdl = (sum(self.doc_lens) / self.corpus_size) if self.corpus_size > 0 else 1.0
        self.doc_freqs: List[Dict[str, int]] = []
        self.idf: Dict[str, float] = {}

        df: Dict[str, int] = {}
        for doc in corpus_tokens:
            freq: Dict[str, int] = {}
            for token in doc:
                freq[token] = freq.get(token, 0) + 1
            self.doc_freqs.append(freq)
            for token in freq.keys():
                df[token] = df.get(token, 0) + 1

        for token, n in df.items():
            self.idf[token] = math.log(1.0 + (self.corpus_size - n + 0.5) / (n + 0.5))

    def score(self, query_tokens: List[str]) -> List[float]:
        scores = [0.0] * self.corpus_size
        if self.corpus_size == 0 or not query_tokens:
            return scores

        for token in query_tokens:
            idf_val = self.idf.get(token, 0.0)
            if idf_val <= 0:
                continue
            for i, doc_freq in enumerate(self.doc_freqs):
                tf = doc_freq.get(token, 0)
                if tf == 0:
                    continue
                denom = tf + self.k1 * (1.0 - self.b + self.b * (self.doc_lens[i] / self.avgdl))
                scores[i] += idf_val * (tf * (self.k1 + 1.0)) / denom
        return scores


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
    return {"version": "2.0", "file_hashes": {}, "chunks": []}


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
    store = load_vector_store() if not force else {"version": "2.0", "file_hashes": {}, "chunks": []}
    existing_hashes = store.get("file_hashes", {})
    chunks = store.get("chunks", [])

    supported_exts = (".txt", ".md", ".pdf", ".docx", ".doc")
    all_files = [
        f for f in glob.glob(os.path.join(DATA_DIR, "*.*"))
        if os.path.splitext(f)[1].lower() in supported_exts
    ]

    current_files = {os.path.basename(f): f for f in all_files}
    current_hashes = {name: compute_file_hash(path) for name, path in current_files.items()}

    new_or_modified = []
    for name, h in current_hashes.items():
        if name not in existing_hashes or existing_hashes[name] != h:
            new_or_modified.append(name)

    deleted_files = [name for name in existing_hashes if name not in current_hashes]

    if not new_or_modified and not deleted_files and chunks:
        return store

    print("\n" + "-" * 50)
    print("[Smart Sync v2.0] Memeriksa perubahan dokumen kampus...")

    files_to_remove = set(deleted_files + new_or_modified)
    if files_to_remove:
        chunks = [c for c in chunks if c.get("source") not in files_to_remove]
        for name in deleted_files:
            existing_hashes.pop(name, None)
            print(f"  [-] Menghapus cache file lama: {name}")

    for name in new_or_modified:
        filepath = current_files[name]
        print(f"  [+] Memproses file: {name} ...")
        new_doc_chunks = load_and_chunk_document(filepath, chunk_size=450, chunk_overlap=60)
        print(f"      Dibuat {len(new_doc_chunks)} potongan informasi. Menghitung embedding...")

        for c in new_doc_chunks:
            vec = call_ollama_embed(c["text"])
            if vec:
                c["vector"] = vec
                chunks.append(c)

        existing_hashes[name] = current_hashes[name]

    store["file_hashes"] = existing_hashes
    store["chunks"] = chunks
    store["version"] = "2.0"
    save_vector_store(store)

    print(f"[OK] Sync selesai! Total {len(chunks)} potongan informasi dari {len(existing_hashes)} dokumen.")
    print("-" * 50 + "\n")
    return store


def hybrid_search(question: str, top_k: int = 3, rrf_k: int = 60) -> List[Tuple[Dict[str, Any], float, float, float]]:
    """
    Melakukan Hybrid Search (Dense Cosine Similarity + BM25 Lexical Ranking)
    menggunakan Reciprocal Rank Fusion (RRF).
    Mengembalikan list tuple: (chunk, rrf_score, cosine_score, bm25_score)
    """
    store = sync_documents()
    chunks = store.get("chunks", [])
    if not chunks:
        return []

    # 1. Dense Vector Scoring
    q_vec = call_ollama_embed(question)
    dense_scores = []
    if q_vec:
        for c in chunks:
            s = cosine_similarity(q_vec, c.get("vector", []))
            dense_scores.append(s)
    else:
        dense_scores = [0.0] * len(chunks)

    # 2. BM25 Lexical Scoring
    q_tokens = tokenize_academic_text(question)
    corpus_tokens = [tokenize_academic_text(c["text"]) for c in chunks]
    bm25 = BM25Ranker(corpus_tokens)
    bm25_scores = bm25.score(q_tokens)

    # Max normalization
    max_dense = max(dense_scores) if dense_scores and max(dense_scores) > 0 else 1.0
    max_bm25 = max(bm25_scores) if bm25_scores and max(bm25_scores) > 0 else 1.0

    # Sort ranks for RRF
    dense_ranked_indices = sorted(range(len(chunks)), key=lambda i: dense_scores[i], reverse=True)
    bm25_ranked_indices = sorted(range(len(chunks)), key=lambda i: bm25_scores[i], reverse=True)

    dense_rank_map = {idx: rank for rank, idx in enumerate(dense_ranked_indices)}
    bm25_rank_map = {idx: rank for rank, idx in enumerate(bm25_ranked_indices)}

    # 3. Reciprocal Rank Fusion & Combined Score
    fused_results = []
    for idx, c in enumerate(chunks):
        d_score = dense_scores[idx]
        b_score = bm25_scores[idx]

        # RRF formula
        rrf = (1.0 / (rrf_k + dense_rank_map[idx])) + (1.0 / (rrf_k + bm25_rank_map[idx]))

        # Linear blend for safety thresholding
        norm_dense = d_score / max_dense if max_dense > 0 else 0.0
        norm_bm25 = b_score / max_bm25 if max_bm25 > 0 else 0.0
        blended = (0.55 * norm_dense) + (0.45 * norm_bm25)

        # Pertahankan jika ada relevansi memadai
        if d_score >= 0.22 or b_score > 0.1:
            fused_results.append((c, rrf, d_score, b_score, blended))

    # Urutkan berdasarkan gabungan RRF dan blended score
    fused_results.sort(key=lambda x: (x[1] * 0.5 + x[4] * 0.5), reverse=True)

    return [(item[0], item[1], item[2], item[3]) for item in fused_results[:top_k]]


def stream_ollama_generate(prompt: str):
    """Mengirim prompt ke LLM lokal dan men-stream kata-per-kata ke layar secara real-time."""
    url = f"{OLLAMA_HOST}/api/generate"
    payload = json.dumps({
        "model": LLM_MODEL,
        "prompt": prompt,
        "stream": True,
        "think": False,
        "options": {
            "temperature": 0.2,
            "top_p": 0.85,
            "num_predict": 1024,
            "num_ctx": 4096
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
    """Menjawab pertanyaan menggunakan Hybrid RAG v2.0."""
    scored_chunks = hybrid_search(question, top_k=3)

    print("\n" + "=" * 55)
    print(f"PERTANYAAN: {question}")
    print("=" * 55)

    if not scored_chunks:
        print("\n[Info Dokumen] Tidak ada informasi yang relevan dalam dokumen internal.")
        print("Tips: Coba tambahkan dokumen terkait ke folder: local_ai_lab/data/")
        print("=" * 55 + "\n")
        return

    print(f"[Hybrid Context Ditemukan] {len(scored_chunks)} bagian dokumen relevan:")
    for idx, (c, rrf, dense_s, bm25_s) in enumerate(scored_chunks):
        page_info = f" (Halaman {c.get('page')})" if c.get("page") else ""
        print(f"  * Sumber {idx+1}: {c['source']}{page_info} [Bagian {c['chunk_id']}] (Vektor: {dense_s:.2f}, BM25: {bm25_s:.2f})")

    print("\n[Jawaban Si Pinter v4.0 (Streaming)]:\n")

    context_text = "\n\n---\n\n".join([
        f"Dokumen: {c['source']}\n{c['text']}" for c, _, _, _ in scored_chunks
    ])

    rag_prompt = f"""Kamu adalah Si Pinter — asisten akademik cerdas RuangTenang & RuangKerja Kampus.
Jawab pertanyaan pengguna secara terstruktur, akurat, dan HANYA berdasarkan KONTEKS DOKUMEN resmi yang diberikan di bawah ini.

Aturan Penting:
1. Sebutkan nama dokumen sumber saat menyampaikan poin penting.
2. Jika jawabannya tidak ada di dalam konteks dokumen, nyatakan dengan jujur bahwa informasi tersebut tidak tercantum dalam dokumen resmi yang tersedia.
3. Hindari mengarang aturan, jadwal, atau angka di luar teks dokumen.

[KONTEKS DOKUMEN]:
{context_text}

[PERTANYAAN PENGGUNA]:
{question}

[JAWABAN LENGKAP & TERSTRUKTUR]:"""

    stream_ollama_generate(rag_prompt)
    print("=" * 55 + "\n")


def query_local_rag(question: str, top_k: int = 3) -> Dict[str, Any]:
    """API Helper untuk eksekusi terprogram dari modul lain."""
    results = hybrid_search(question, top_k=top_k)
    return {
        "question": question,
        "found": len(results) > 0,
        "chunks": [
            {
                "source": c["source"],
                "page": c.get("page", 1),
                "chunk_id": c.get("chunk_id"),
                "text": c["text"],
                "rrf_score": round(rrf, 4),
                "dense_score": round(dense_s, 4),
                "bm25_score": round(bm25_s, 4)
            }
            for c, rrf, dense_s, bm25_s in results
        ]
    }


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

    print("=" * 55)
    print("   Local AI Lab - Hybrid RAG v2.0 Engine")
    print("   Model: si-pinter (Qwen 1.7B) | Hybrid: Dense + BM25")
    print("=" * 55)

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
