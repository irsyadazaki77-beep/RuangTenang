import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Format email tidak valid').max(100),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(100),
  university: z.string().max(100).optional()
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi')
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const MfaVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFA Token wajib diisi'),
  code: z.string().length(6, 'Kode verifikasi harus 6 digit')
});
export type MfaVerifyInput = z.infer<typeof MfaVerifySchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid')
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  token: z.string().min(1, 'Token reset wajib diisi'),
  newPassword: z.string().min(8, 'Kata sandi baru minimal 8 karakter').max(100)
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
