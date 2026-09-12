import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { apiClient } from '../../lib/apiClient';
import { SessionSummaryModal } from '../../features/chat/components/SessionSummaryModal';
import { BookmarksModal } from '../../features/chat/components/BookmarksModal';
import { BranchChatModal } from '../../features/chat/components/BranchChatModal';
import { ChatMemoryModal } from '../../features/chat/components/ChatMemoryModal';
import { ChatSearchBar } from '../../features/chat/components/ChatSearchBar';

describe('Chat New Features UI Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature 1: SessionSummaryModal UI', () => {
    it('renders structured summary sections and non-clinical disclaimer', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        success: true,
        data: {
          summary: {
            masalahUtama: 'Kelelahan menghadapi ujian skripsi.',
            emosi: ['Cemas', 'Lelah', 'Berharap'],
            polaPemicu: 'Menunda istirahat dan begadang maraton.',
            poinPenting: ['Ingin metode belajar realistis', 'Takut mengecewakan orang tua'],
            halYangSudahDicoba: ['Minum kopi larut malam'],
            langkahBerikutnya: ['Tidur sebelum jam 11 malam', 'Gunakan Pomodoro 25 menit'],
            disclaimer: 'Ringkasan ini dihasilkan secara otomatis sebagai bahan refleksi mandiri, BUKAN diagnosis medis atau pengganti saran klinis profesional.',
            generatedAt: new Date().toISOString()
          }
        }
      });

      render(<SessionSummaryModal isOpen={true} onClose={() => {}} chatId="chat-1" />);

      await waitFor(() => {
        expect(screen.getByText('Ringkasan Sesi Obrolan')).toBeDefined();
        expect(screen.getByText('Kelelahan menghadapi ujian skripsi.')).toBeDefined();
        expect(screen.getByText('Cemas')).toBeDefined();
        expect(screen.getByText('Menunda istirahat dan begadang maraton.')).toBeDefined();
        expect(screen.getByText('Tidur sebelum jam 11 malam')).toBeDefined();
      });

      // Non-clinical disclaimer must be visible
      expect(screen.getByText(/BUKAN diagnosis medis/i)).toBeDefined();
    });
  });

  describe('Feature 2: BookmarksModal UI', () => {
    it('renders saved messages and filters by current chat', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        success: true,
        data: {
          bookmarks: [
            {
              id: 'b1',
              chatId: 'chat-1',
              chatTitle: 'Obrolan Ujian',
              messageId: 'msg-1',
              message: {
                id: 'msg-1',
                role: 'assistant',
                content: 'Tarik nafas perlahan dan hembuskan.',
                createdAt: new Date().toISOString()
              },
              createdAt: new Date().toISOString()
            },
            {
              id: 'b2',
              chatId: 'chat-2',
              chatTitle: 'Obrolan Lain',
              messageId: 'msg-2',
              message: {
                id: 'msg-2',
                role: 'user',
                content: 'Saya sudah mencoba rileks kemarin.',
                createdAt: new Date().toISOString()
              },
              createdAt: new Date().toISOString()
            }
          ]
        }
      });

      render(<BookmarksModal isOpen={true} onClose={() => {}} currentChatId="chat-1" />);

      await waitFor(() => {
        expect(screen.getByText('Pesan Tersimpan')).toBeDefined();
        expect(screen.getByText('Tarik nafas perlahan dan hembuskan.')).toBeDefined();
        expect(screen.getByText('Saya sudah mencoba rileks kemarin.')).toBeDefined();
      });

      // Filter to current session only
      const sessionButton = screen.getByText(/Sesi Ini/i);
      fireEvent.click(sessionButton);

      expect(screen.getByText('Tarik nafas perlahan dan hembuskan.')).toBeDefined();
      expect(screen.queryByText('Saya sudah mencoba rileks kemarin.')).toBeNull();
    });
  });

  describe('Feature 3: BranchChatModal UI', () => {
    it('displays message snippet and allows custom title', () => {
      const onChatBranched = vi.fn();
      render(
        <BranchChatModal
          isOpen={true}
          onClose={() => {}}
          parentChatId="chat-1"
          parentChatTitle="Obrolan Utama"
          messageId="msg-10"
          messageSnippet="Bagaimana kalau kita coba teknik Pomodoro?"
          onChatBranched={onChatBranched}
        />
      );

      expect(screen.getByText('Buat Cabang Obrolan')).toBeDefined();
      expect(screen.getByText(/"Bagaimana kalau kita coba teknik Pomodoro\?"/i)).toBeDefined();
      expect(screen.getByText('Riwayat Asli Tetap Utuh')).toBeDefined();

      const input = screen.getByPlaceholderText(/Cabang: Obrolan Utama/i);
      expect(input).toBeDefined();
    });
  });

  describe('Feature 4: ChatMemoryModal UI', () => {
    it('allows toggling memory and lists existing memories', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        success: true,
        data: {
          memories: [
            { id: 'mem-1', content: 'Menyukai penjelasan singkat & terstruktur', createdAt: new Date().toISOString() }
          ]
        }
      });

      const onToggleChatMemory = vi.fn();
      render(
        <ChatMemoryModal
          isOpen={true}
          onClose={() => {}}
          chatId="chat-1"
          useMemoryForChat={true}
          onToggleChatMemory={onToggleChatMemory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Kontrol Memori AI')).toBeDefined();
        expect(screen.getByText('Gunakan Memori pada Sesi Ini')).toBeDefined();
        expect(screen.getByText('Menyukai penjelasan singkat & terstruktur')).toBeDefined();
      });

      // Quick suggestion chip
      expect(screen.getByText(/\+ Gaya santai & suportif/i)).toBeDefined();
    });
  });

  describe('Feature 5: ChatSearchBar UI', () => {
    it('renders search query and cycles through matches', () => {
      const onNext = vi.fn();
      const onPrev = vi.fn();
      const onClose = vi.fn();

      render(
        <ChatSearchBar
          isOpen={true}
          onClose={onClose}
          query="cemas"
          onQueryChange={() => {}}
          totalMatches={3}
          currentIndex={0}
          onNext={onNext}
          onPrev={onPrev}
        />
      );

      expect(screen.getByDisplayValue('cemas')).toBeDefined();
      expect(screen.getByText('1 / 3')).toBeDefined();

      const nextButton = screen.getByLabelText('Pesan Berikutnya');
      fireEvent.click(nextButton);
      expect(onNext).toHaveBeenCalledTimes(1);

      const prevButton = screen.getByLabelText('Pesan Sebelumnya');
      fireEvent.click(prevButton);
      expect(onPrev).toHaveBeenCalledTimes(1);
    });
  });
});
