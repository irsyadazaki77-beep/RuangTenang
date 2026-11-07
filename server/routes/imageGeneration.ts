import { Router, Request, Response } from 'express';
import { imageGenerationService } from '../services/imageGenerationService.js';
import { sanitizeInput } from '../security.js';
import { optionalAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { aiRequestService } from '../services/ai/aiRequestService.js';
import { DEFAULT_AI_MODEL } from '../config/aiConfig.js';

export const imageGenerationRouter = Router();

export function extractHtmlFromAiOutput(output: string): string {
  let text = output.trim();
  const codeBlockMatch = text.match(/```(?:html|xml)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  }

  const googleFontsLink = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@400;700&family=Patrick+Hand&family=Plus+Jakarta+Sans:wght@400;600;700&family=Fira+Code:wght@400;600&display=swap" rel="stylesheet">';

  if (!text.toLowerCase().includes('<!doctype') && !text.toLowerCase().includes('<html')) {
    text = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${googleFontsLink}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; padding: 24px; color: #1e293b; }
  </style>
</head>
<body>
  ${text}
</body>
</html>`;
  } else if (!text.includes('fonts.googleapis.com')) {
    text = text.replace(/<head[^>]*>/i, `$&${googleFontsLink}`);
  }

  return text;
}

// GET /api/ai/images/:filename -> Serving file gambar dengan HTTP Caching header
imageGenerationRouter.get('/images/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename || '';
  const imageId = filename.replace(/\.jpg$/, '');
  const filePath = imageGenerationService.getImagePath(imageId);

  if (!filePath) {
    res.status(404).json({ success: false, error: 'Gambar tidak ditemukan' });
    return;
  }

  // Cache agresif: gambar immutable disimpan di browser selama 7 hari
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendFile(filePath);
});

// POST /api/ai/generate-image
imageGenerationRouter.post('/generate-image', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawPrompt = req.body?.prompt;
    if (!rawPrompt || typeof rawPrompt !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Parameter prompt (string) wajib diisi',
      });
      return;
    }

    const sanitizedPrompt = sanitizeInput(rawPrompt).slice(0, 500);
    const width = typeof req.body?.width === 'number' ? Math.min(Math.max(req.body.width, 256), 1024) : 1024;
    const height = typeof req.body?.height === 'number' ? Math.min(Math.max(req.body.height, 256), 1024) : 1024;
    const style = typeof req.body?.style === 'string' ? req.body.style as any : undefined;

    logger.info(`[ImageGen] Request diterima: "${sanitizedPrompt.substring(0, 50)}..." (style: ${style || 'default'})`);

    const result = await imageGenerationService.generateImage({
      prompt: sanitizedPrompt,
      width,
      height,
      style,
    });

    res.status(200).json({
      success: true,
      imageUrl: result.imageUrl,
      provider: result.provider,
      prompt: sanitizedPrompt,
      enhancedPrompt: result.enhancedPrompt,
    });
  } catch (error: any) {
    logger.error(`[ImageGen] Error saat generate gambar: ${error?.message || error}`);
    res.status(500).json({
      success: false,
      error: error?.message || 'Gagal memproses pembuatan gambar',
    });
  }
});

// POST /api/ai/generate-visual-canvas (Generative UI / HTML Canvas Visuals - 100% Free, Zero External API Keys)
imageGenerationRouter.post('/generate-visual-canvas', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawPrompt = req.body?.prompt;
    if (!rawPrompt || typeof rawPrompt !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Parameter prompt (string) wajib diisi',
      });
      return;
    }

    const sanitizedPrompt = sanitizeInput(rawPrompt).slice(0, 1000);
    const style = (req.body?.style || 'handwritten_notes') as string;
    const customTitle = req.body?.title ? sanitizeInput(String(req.body.title)).slice(0, 80) : undefined;

    logger.info(`[VisualCanvas] Request visual diterima: "${sanitizedPrompt.substring(0, 50)}..." (style: ${style})`);

    const systemInstruction = `Kamu adalah Visual Design Engine & Generative UI Specialist untuk RuangKerja Mahasiswa.
Tugasmu adalah menghasilkan SATU blok kode HTML/CSS/SVG lengkap yang mandiri (self-contained) yang memvisualisasikan permintaan materi/topik dari mahasiswa menjadi kanvas grafis yang sangat memukau, terstruktur, tajam, dan elegan.

PANDUAN GAYA VISUAL (${style}):
- Jika "handwritten_notes" (Catatan Tulis Tangan Estetik):
  * Wajib gunakan Google Fonts: font-family: 'Caveat', 'Kalam', 'Patrick Hand', cursive;
  * Tampilan kertas binder atau lembar buku catatan bergaris biru halus (#e0e7ff atau #cbd5e1) dengan margin garis merah vertikal di sisi kiri (#fca5a5 atau #f87171).
  * Ukuran teks mudah dibaca: 18px-24px untuk isi tulisan tangan, 28px-36px untuk judul utama.
  * Gunakan efek stabilo pastel (misal: background: #fef08a, #bbf7d0, #fed7aa; padding: 2px 6px; border-radius: 4px).
  * Buat sticky note miring (transform: rotate(-1.5deg) atau rotate(1.5deg); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); background: #fef9c3; padding: 12px; border-radius: 8px) dengan pin atau klip kertas kecil.
  * Tambahkan coretan lingkaran penegas, panah panah kecil, atau sketsa visual diagram SVG yang relevan dengan topik.
  
- Jika "infographic" (Infografis & Rangkuman Materi Modern):
  * Gunakan font modern 'Plus Jakarta Sans', sans-serif.
  * Desain kartu modern dengan palet warna akademik elegan (navy #0f172a, emerald #065f46, atau indigo #3730a3).
  * Susunan grid responsif 2 atau 3 kolom, badge metrik dengan angka besar, ikon SVG inline, dan kesimpulan ringkas.

- Jika "cheatsheet" (Lembar Rumus & Sains):
  * Kotak-kotak rumus dengan background kontras tinggi, definisi variabel berpasangan, tip penting, dan tabel ringkas mini.

- Jika "poster" (Poster Konsep & Presentasi Visual):
  * Header formal dengan judul besar tebal, identitas/instansi, modular section teratur, dan callout box.

- Jika "flashcard" (Kartu Konsep Ringkas):
  * Format kartu tanya-jawab atau konsep kunci berpasangan dengan visualisasi singkat.

ATURAN WAJIB:
1. Wajib menghasilkan KODE HTML LENGKAP yang valid di dalam tag <!DOCTYPE html><html><head><meta charset="utf-8"/><style>...</style></head><body>...</body></html>.
2. Seluruh CSS dimasukkan dalam tag <style> di dalam dokumen.
3. Desain harus mandiri, responsif, dan siap diekspor menjadi gambar resolusi tinggi (PNG/PDF).
4. Jangan menyertakan JavaScript berbahaya.
5. HANYA kembalikan kode HTML murni tanpa pengantar atau penutup.`;

    const aiRes = await aiRequestService.generateChatResponse({
      userId: (req as any).user?.id,
      userTier: (req as any).user?.tier || 'Free',
      requestedModelId: DEFAULT_AI_MODEL,
      prompt: `Buatkan visualisasi grafis/catatan visual lengkap untuk topik berikut: "${sanitizedPrompt}"`,
      systemInstruction,
    });

    const htmlContent = extractHtmlFromAiOutput(aiRes.text);
    const title = customTitle || sanitizedPrompt.slice(0, 50);

    res.status(200).json({
      success: true,
      htmlContent,
      title,
      style,
      modelUsed: aiRes.modelUsed,
    });
  } catch (error: any) {
    logger.error(`[VisualCanvas] Error saat generate visual canvas: ${error?.message || error}`);
    res.status(500).json({
      success: false,
      error: error?.message || 'Gagal memproses visual canvas AI',
    });
  }
});
