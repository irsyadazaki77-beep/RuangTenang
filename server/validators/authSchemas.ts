import { z } from 'zod';

const COMMON_WEAK_PASSWORDS = new Set([
  'password123',
  'password1234',
  'password12345',
  'admin12345',
  'qwerty12345',
  '1234567890',
  'indonesia123',
  'kampus12345',
  'mahasiswa123',
  'rahasia12345',
  'rahasia123'
]);

export const strongPasswordSchema = z
  .string()
  .min(10, 'Kata sandi minimal 10 karakter untuk perlindungan akun')
  .max(128, 'Kata sandi maksimal 128 karakter')
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Kata sandi wajib memuat minimal 1 huruf kapital (A-Z)'
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Kata sandi wajib memuat minimal 1 huruf kecil (a-z)'
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'Kata sandi wajib memuat minimal 1 angka (0-9)'
  })
  .refine((val) => /[^A-Za-z0-9]/.test(val), {
    message: 'Kata sandi wajib memuat minimal 1 karakter khusus atau simbol (!@#$%^&* dll)'
  })
  .refine((val) => !COMMON_WEAK_PASSWORDS.has(val.toLowerCase()), {
    message: 'Kata sandi terlalu umum atau mudah ditebak. Harap gunakan kombinasi yang lebih unik'
  });

export const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: strongPasswordSchema,
  university: z.string().optional()
});

export const provisionUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: strongPasswordSchema,
  role: z.enum(['konselor', 'admin', 'campus_admin']),
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
  newPassword: strongPasswordSchema
});
