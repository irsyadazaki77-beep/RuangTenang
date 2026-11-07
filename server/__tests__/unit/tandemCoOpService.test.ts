import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TandemCoOpService } from '../../services/ai/tandemCoOpService.js';
import { aiRequestService } from '../../services/ai/aiRequestService.js';

describe('TandemCoOpService (Si Pinter & Si Gacor)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes draft_and_verify pipeline where Si Pinter drafts and Si Gacor verifies', async () => {
    const mockGenerate = vi.spyOn(aiRequestService, 'generateChatResponse')
      .mockResolvedValueOnce({
        text: 'Kerangka draf fungsi debounce: class Debounce { ... }',
        modelUsed: 'ollama-si-pinter',
        isFallback: false
      })
      .mockResolvedValueOnce({
        text: 'export class ProductionDebounce<T> { ... 100% full implementation ... }',
        modelUsed: 'ollama-si-gacor',
        isFallback: false
      });

    const passEvents: any[] = [];
    const result = await TandemCoOpService.executeTandem({
      prompt: 'Buatkan class Debounce yang robust di TypeScript',
      mode: 'draft_and_verify',
      onPassComplete: (pass, res) => passEvents.push({ pass, ...res })
    });

    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(passEvents).toHaveLength(2);
    expect(passEvents[0].model).toBe('ollama-si-pinter');
    expect(passEvents[1].model).toBe('ollama-si-gacor');

    expect(result.pass1Model).toBe('ollama-si-pinter');
    expect(result.pass2Model).toBe('ollama-si-gacor');
    expect(result.draft).toContain('Kerangka draf');
    expect(result.finalContent).toContain('ProductionDebounce');
  });

  it('executes architect_and_explain pipeline where Si Gacor designs and Si Pinter explains', async () => {
    const mockGenerate = vi.spyOn(aiRequestService, 'generateChatResponse')
      .mockResolvedValueOnce({
        text: 'Architecture: Event-driven microservices pattern with outbox',
        modelUsed: 'ollama-si-gacor',
        isFallback: false
      })
      .mockResolvedValueOnce({
        text: '1. Sistem ini memastikan data tidak hilang.\n2. Cek database tabel outbox.',
        modelUsed: 'ollama-si-pinter',
        isFallback: false
      });

    const result = await TandemCoOpService.executeTandem({
      prompt: 'Rancang arsitektur sistem pembayaran',
      mode: 'architect_and_explain'
    });

    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(result.pass1Model).toBe('ollama-si-gacor');
    expect(result.pass2Model).toBe('ollama-si-pinter');
    expect(result.finalContent).toContain('Panduan Mahasiswa');
  });
});
