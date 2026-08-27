import { z } from 'zod';

// Zod Schema for Booking Appointment
export const appointmentBookingSchema = z.object({
  studentName: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama terlalu panjang'),
  studentNIM: z.string().min(5, 'NIM minimal 5 karakter').max(30, 'NIM terlalu panjang'),
  studentEmail: z.string().email('Format email tidak valid (contoh: nama@kampus.ac.id)'),
  studentPhone: z.string().min(10, 'Nomor HP minimal 10 digit').max(15, 'Nomor HP terlalu panjang'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
  timeSlot: z.string().min(2, 'Pilih slot jam konseling'),
  timezone: z.enum(['WIB', 'WITA', 'WIT']),
  mode: z.enum(['video_call', 'tele_counseling']),
  primaryConcern: z.string().min(5, 'Jelaskan keluhan utama minimal 5 karakter').max(500, 'Keluhan maksimal 500 karakter'),
});

// Zod Schema for Chat Message Input
export const chatInputSchema = z.object({
  message: z.string().min(1, 'Pesan tidak boleh kosong').max(1000, 'Pesan maksimal 1000 karakter'),
  userConsent: z.boolean().refine(val => val === true, {
    message: 'Izin consent pemrosesan data diperlukan untuk melanjutkan',
  }),
});

// Zod Schema for Safety Plan Personal
export const safetyPlanSchema = z.object({
  personalTriggers: z.array(z.string()).min(1, 'Pilih/tulis minimal 1 tanda bahaya'),
  copingStrategies: z.array(z.string()).min(1, 'Pilih/tulis minimal 1 strategi koping'),
  trustedContactName: z.string().min(2, 'Nama kontak darurat minimal 2 karakter'),
  trustedContactPhone: z.string().min(10, 'Nomor telepon kontak minimal 10 digit'),
  safePlace: z.string().min(3, 'Tuliskan lokasi tempat aman Anda'),
  meansRestriction: z.string().min(3, 'Tuliskan langkah mengurangi akses benda berbahaya'),
});

export type AppointmentBookingData = z.infer<typeof appointmentBookingSchema>;
export type ChatInputData = z.infer<typeof chatInputSchema>;
export type SafetyPlanData = z.infer<typeof safetyPlanSchema>;
