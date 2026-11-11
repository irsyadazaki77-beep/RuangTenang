"""
Unit test untuk verifikasi Hybrid RAG v2.0 (BM25 + Dense + RRF)
"""

import unittest
from local_ai_lab.local_rag import (
    BM25Ranker,
    tokenize_academic_text,
    cosine_similarity,
    query_local_rag
)

class TestLocalRagEngine(unittest.TestCase):
    def test_tokenization_and_stopwords(self):
        text = "Penulisan skripsi Bab 4 dan analisis data hasil penelitian di kampus"
        tokens = tokenize_academic_text(text)
        self.assertIn("penulisan", tokens)
        self.assertIn("skripsi", tokens)
        self.assertIn("bab", tokens)
        self.assertIn("penelitian", tokens)
        self.assertNotIn("dan", tokens)
        self.assertNotIn("di", tokens)

    def test_bm25_ranking_accuracy(self):
        corpus = [
            tokenize_academic_text("Panduan penulisan skripsi Bab 1 Latar Belakang dan Rumusan Masalah"),
            tokenize_academic_text("Ketentuan beasiswa unggulan mahasiswa berprestasi semester 5 ke atas"),
            tokenize_academic_text("Penggunaan rumus Slovin untuk penentuan jumlah sampel di Bab 3 Metodologi")
        ]
        bm25 = BM25Ranker(corpus)
        
        # Query 1: mencari beasiswa
        q1 = tokenize_academic_text("syarat beasiswa mahasiswa")
        scores1 = bm25.score(q1)
        # Indeks 1 (beasiswa) harus memiliki skor tertinggi
        self.assertGreater(scores1[1], scores1[0])
        self.assertGreater(scores1[1], scores1[2])

        # Query 2: mencari slovin
        q2 = tokenize_academic_text("rumus slovin ukuran sampel")
        scores2 = bm25.score(q2)
        # Indeks 2 (slovin) harus memiliki skor tertinggi
        self.assertGreater(scores2[2], scores2[0])
        self.assertGreater(scores2[2], scores2[1])

    def test_cosine_similarity_edge_cases(self):
        # Identical vectors
        v1 = [1.0, 0.0, 0.5]
        v2 = [1.0, 0.0, 0.5]
        self.assertAlmostEqual(cosine_similarity(v1, v2), 1.0, places=4)

        # Orthogonal vectors
        v3 = [1.0, 0.0]
        v4 = [0.0, 1.0]
        self.assertAlmostEqual(cosine_similarity(v3, v4), 0.0, places=4)

        # Empty vectors
        self.assertEqual(cosine_similarity([], []), 0.0)

    def test_query_local_rag_structure(self):
        result = query_local_rag("skripsi dan beasiswa", top_k=2)
        self.assertIn("question", result)
        self.assertIn("found", result)
        self.assertIn("chunks", result)

if __name__ == "__main__":
    unittest.main()
