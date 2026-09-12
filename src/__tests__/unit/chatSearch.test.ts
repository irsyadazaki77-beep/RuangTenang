import { describe, it, expect } from 'vitest';
import { Message } from '../../features/chat/types';

describe('Chat Search and Highlight Logic Unit Tests', () => {
  const sampleMessages: Message[] = [
    { id: 'm1', role: 'user', content: 'Halo, saya merasa sangat cemas tentang masa depan.' },
    { id: 'm2', role: 'assistant', content: 'Halo. Cemas adalah respons alami tubuh. Ceritakan apa yang sedang dipikirkan.' },
    { id: 'm3', role: 'user', content: 'Ujian skripsi saya minggu depan dan saya sulit tidur.' },
    { id: 'm4', role: 'assistant', content: 'Pola tidur sangat berkaitan dengan kecemasan. Mari kita coba teknik relaksasi.' }
  ];

  it('should find matching messages case-insensitively', () => {
    const query = 'CEMAS';
    const q = query.toLowerCase();
    const matches = sampleMessages.filter(m => m.content.toLowerCase().includes(q)).map(m => m.id);
    expect(matches).toEqual(['m1', 'm2', 'm4']);
  });

  it('should return empty matches when query does not match', () => {
    const query = 'keuangan';
    const q = query.toLowerCase();
    const matches = sampleMessages.filter(m => m.content.toLowerCase().includes(q)).map(m => m.id);
    expect(matches).toEqual([]);
  });

  it('should navigate search results cyclically', () => {
    const matches = ['m1', 'm2', 'm4'];
    let currentIndex = 0;

    // Next
    currentIndex = (currentIndex + 1) % matches.length;
    expect(currentIndex).toBe(1);

    // Next
    currentIndex = (currentIndex + 1) % matches.length;
    expect(currentIndex).toBe(2);

    // Loop to 0
    currentIndex = (currentIndex + 1) % matches.length;
    expect(currentIndex).toBe(0);

    // Prev
    currentIndex = (currentIndex - 1 + matches.length) % matches.length;
    expect(currentIndex).toBe(2);
  });
});
