import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAiImage } from '../../services/imageService';
import { apiClient } from '../../lib/apiClient';

describe('imageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully generates an image through apiClient with CSRF protection', async () => {
    const mockPost = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      status: 200,
      data: {
        success: true,
        imageUrl: '/api/ai/images/generated-123.jpg',
        provider: 'pollinations',
        prompt: 'test prompt'
      }
    });

    const result = await generateAiImage({
      prompt: 'test prompt',
      width: 1024,
      height: 1024
    });

    expect(mockPost).toHaveBeenCalledWith('/api/ai/generate-image', {
      prompt: 'test prompt',
      width: 1024,
      height: 1024
    });
    expect(result.imageUrl).toBe('/api/ai/images/generated-123.jpg');
    expect(result.provider).toBe('pollinations');
  });

  it('throws an error with message when API call fails', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: false,
      status: 400,
      error: 'Parameter prompt (string) wajib diisi'
    });

    await expect(generateAiImage({ prompt: '' })).rejects.toThrow(
      'Parameter prompt (string) wajib diisi'
    );
  });
});
