import { describe, it, expect } from 'vitest';
import {
  budgetChatHistory,
  generateLocalStructuredSummary,
  sessionSummaryService
} from '../../services/sessionSummaryService.js';

describe('SessionSummaryService Unit Tests', () => {
  it('budgetChatHistory should keep concise representations of conversation history', () => {
    const fakeMessages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Pesan nomor ${i} yang cukup panjang untuk menguji batasan token budget sistem.`
    }));

    const budgeted = budgetChatHistory(fakeMessages);
    expect(budgeted).toBeDefined();
    expect(typeof budgeted).toBe('string');
    expect(budgeted.length).toBeGreaterThan(0);
    // Should contain initial and recent messages
    expect(budgeted).toContain('Pesan nomor 0');
    expect(budgeted).toContain('Pesan nomor 29');
  });

  it('generateLocalStructuredSummary should provide a safe structured summary without medical diagnosis', () => {
    const messages = [
      { role: 'user', content: 'Saya merasa cemas dan overthinking karena skripsi dan deadline kuliah.' },
      { role: 'assistant', content: 'Wajar merasa cemas. Mari kita pecah beban skripsi menjadi bagian kecil.' }
    ];

    const summary = generateLocalStructuredSummary(messages);
    expect(summary).toBeDefined();
    expect(summary.masalahUtama).toContain('Tekanan pengerjaan tugas akhir');
    expect(summary.emosi).toContain('Cemas');
    expect(Array.isArray(summary.langkahBerikutnya)).toBe(true);
    expect(summary.disclaimer).toContain('diagnosis medis');
  });

  it('sessionSummaryService.generateSummary handles empty messages gracefully', async () => {
    const summary = await sessionSummaryService.generateSummary('user-empty', []);
    expect(summary.masalahUtama).toBe('Belum ada percakapan untuk diringkas.');
    expect(summary.disclaimer).toBeDefined();
  });
});
