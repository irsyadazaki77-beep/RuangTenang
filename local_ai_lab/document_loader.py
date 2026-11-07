"""
Document Loader Module for Local AI Lab v1.2
Mendukung ekstraksi teks dari berbagai format file:
- Teks polos (.txt)
- Markdown (.md)
- Dokumen PDF (.pdf) via pypdf
- Dokumen Word (.docx) via python-docx
"""

import os
import re
from typing import List, Dict, Any

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False


def extract_text_from_file(filepath: str) -> List[Dict[str, Any]]:
    """
    Mengekstrak teks dari file berdasarkan ekstensinya.
    Mengembalikan list berisi dict: [{'text': str, 'page': int}]
    """
    ext = os.path.splitext(filepath)[1].lower()
    sections = []

    if ext in (".txt", ".md"):
        encodings = ["utf-8", "cp1252", "latin-1"]
        content = ""
        for enc in encodings:
            try:
                with open(filepath, "r", encoding=enc) as f:
                    content = f.read()
                break
            except (UnicodeDecodeError, OSError):
                continue
        if content.strip():
            sections.append({"text": content, "page": 1})

    elif ext == ".pdf":
        if not HAS_PYPDF:
            print(f"[Warning] Modul 'pypdf' tidak ditemukan. Gagal membaca {filepath}")
            return []
        try:
            reader = pypdf.PdfReader(filepath)
            for page_idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    sections.append({"text": page_text, "page": page_idx + 1})
        except Exception as e:
            print(f"[Warning] Gagal membaca PDF {filepath}: {e}")

    elif ext in (".docx", ".doc"):
        if not HAS_DOCX:
            print(f"[Warning] Modul 'python-docx' tidak ditemukan. Gagal membaca {filepath}")
            return []
        try:
            doc = docx.Document(filepath)
            full_text = []
            for p in doc.paragraphs:
                if p.text.strip():
                    full_text.append(p.text.strip())
            # Ambil juga teks dari tabel jika ada
            for table in doc.tables:
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_data:
                        full_text.append(" | ".join(row_data))
            if full_text:
                sections.append({"text": "\n\n".join(full_text), "page": 1})
        except Exception as e:
            print(f"[Warning] Gagal membaca DOCX {filepath}: {e}")

    return sections


def create_chunks(text: str, chunk_size: int = 400, chunk_overlap: int = 50) -> List[str]:
    """
    Membagi teks panjang menjadi potongan-potongan kecil (chunks)
    dengan sliding window overlap agar konteks tidak terpotong.
    """
    # Normalisasi spasi dan baris
    text = re.sub(r"\r\n", "\n", text)
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    current_chunk = ""

    for para in paragraphs:
        # Jika paragraf sendiri sudah lebih panjang dari chunk_size, potong berdasarkan kalimat
        if len(para) > chunk_size:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            for s in sentences:
                if not s.strip():
                    continue
                if len(current_chunk) + len(s) + 1 <= chunk_size:
                    current_chunk = f"{current_chunk} {s}".strip()
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                        # Ambil overlap dari ujung chunk sebelumnya
                        overlap = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else current_chunk
                        current_chunk = f"{overlap} {s}".strip()
                    else:
                        chunks.append(s[:chunk_size])
                        current_chunk = s[chunk_size - chunk_overlap:]
        else:
            if len(current_chunk) + len(para) + 2 <= chunk_size:
                current_chunk = f"{current_chunk}\n\n{para}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                    overlap = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else current_chunk
                    current_chunk = f"{overlap}\n\n{para}".strip()
                else:
                    current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return [c.strip() for c in chunks if len(c.strip()) > 15]


def load_and_chunk_document(filepath: str, chunk_size: int = 400, chunk_overlap: int = 50) -> List[Dict[str, Any]]:
    """
    Memuat file dan menghasilkan daftar chunk lengkap dengan metadata.
    """
    filename = os.path.basename(filepath)
    raw_sections = extract_text_from_file(filepath)
    document_chunks = []

    chunk_counter = 1
    for sec in raw_sections:
        page_num = sec["page"]
        text_content = sec["text"]
        chunks = create_chunks(text_content, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        for c in chunks:
            document_chunks.append({
                "source": filename,
                "page": page_num,
                "chunk_id": chunk_counter,
                "text": c
            })
            chunk_counter += 1

    return document_chunks
