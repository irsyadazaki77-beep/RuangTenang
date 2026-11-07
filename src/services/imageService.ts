import { apiClient } from '../lib/apiClient';

export interface GenerateImagePayload {
  prompt: string;
  width?: number;
  height?: number;
  style?: 'academic_illustration' | 'vector_infographic' | 'photorealistic' | 'minimalist_diagram' | 'none';
}

export interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  provider?: 'local-sd' | 'huggingface' | 'pollinations';
  prompt?: string;
  enhancedPrompt?: string;
  error?: string;
}

export interface GenerateVisualCanvasPayload {
  prompt: string;
  style?: 'handwritten_notes' | 'infographic' | 'cheatsheet' | 'poster' | 'flashcard';
  title?: string;
}

export interface GenerateVisualCanvasResponse {
  success: boolean;
  htmlContent?: string;
  title?: string;
  style?: string;
  modelUsed?: string;
  error?: string;
}

/**
 * Panggil backend untuk generate Catatan Visual & Infografis HTML/Canvas (100% Gratis, Nol API Key Tambahan).
 */
export async function generateVisualCanvas(payload: GenerateVisualCanvasPayload): Promise<GenerateVisualCanvasResponse> {
  const response = await apiClient.post<GenerateVisualCanvasResponse>('/api/ai/generate-visual-canvas', payload);

  if (!response.success || !response.data) {
    throw new Error(response.error || response.message || 'Gagal menghasilkan visual canvas');
  }

  return response.data;
}

/**
 * Ekspor string HTML/SVG menjadi gambar PNG dan memicu download di browser.
 */
export async function downloadHtmlAsPng(htmlString: string, filename = 'catatan-visual.png'): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const width = 1200;
      const height = 1600;

      // Ekstrak tag <style> jika ada
      let extractedStyles = '';
      const styleMatches = htmlString.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches) {
        extractedStyles = styleMatches.join('\n');
      }

      // Ekstrak isi body atau bersihkan tag pembungkus HTML
      let cleanBody = htmlString;
      const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        cleanBody = bodyMatch[1];
      } else {
        cleanBody = cleanBody
          .replace(/<!DOCTYPE[^>]*>/gi, '')
          .replace(/<html[^>]*>|<\/html>/gi, '')
          .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
      }

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; min-height: 100%; box-sizing: border-box; background: #ffffff;">
            ${extractedStyles}
            ${cleanBody}
          </div>
        </foreignObject>
      </svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0);
            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch {
          resolve(false);
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: unduh sebagai file html mandiri yang siap dibuka dan disimpan
        try {
          const htmlBlob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
          const htmlUrl = URL.createObjectURL(htmlBlob);
          const a = document.createElement('a');
          a.href = htmlUrl;
          a.download = filename.replace(/\.png$/i, '') + '.html';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(htmlUrl);
          resolve(true);
        } catch {
          resolve(false);
        }
      };

      img.src = url;
    } catch {
      resolve(false);
    }
  });
}
export async function generateAiImage(payload: GenerateImagePayload): Promise<GenerateImageResponse> {
  const response = await apiClient.post<GenerateImageResponse>('/api/ai/generate-image', payload);

  if (!response.success || !response.data) {
    throw new Error(response.error || response.message || 'Gagal menghasilkan gambar');
  }

  return response.data;
}
