export interface GenerateImagePayload {
  prompt: string;
  width?: number;
  height?: number;
}

export interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  provider?: 'huggingface' | 'pollinations';
  prompt?: string;
  error?: string;
}

/**
 * Panggil backend RuangTenang untuk generate gambar AI gratis.
 */
export async function generateAiImage(payload: GenerateImagePayload): Promise<GenerateImageResponse> {
  const response = await fetch('/api/ai/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Gagal menghasilkan gambar');
  }

  return data;
}
