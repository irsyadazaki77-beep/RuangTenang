import { z } from 'zod';

export const SendMessageSchema = z.object({
  chatId: z.string().min(1, 'Chat ID wajib diisi'),
  message: z.string().min(1, 'Pesan tidak boleh kosong').max(4000),
  aiModel: z.string().optional()
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export const UpdateChatTitleSchema = z.object({
  title: z.string().min(1, 'Judul tidak boleh kosong').max(100)
});
export type UpdateChatTitleInput = z.infer<typeof UpdateChatTitleSchema>;
