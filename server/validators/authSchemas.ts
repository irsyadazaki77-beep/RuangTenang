import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(10, 'Kata sandi minimal 10 karakter untuk perlindungan akun'),
  university: z.string().optional()
});

export const provisionUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(10, 'Kata sandi minimal 10 karakter untuk perlindungan akun'),
  role: z.enum(['konselor', 'admin']),
  university: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi')
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  university: z.string().optional(),
  avatar: z.string().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
  newPassword: z.string().min(10, 'Kata sandi baru minimal 10 karakter')
});

