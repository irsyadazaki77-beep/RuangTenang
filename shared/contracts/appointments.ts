import { z } from 'zod';

export const CreateAppointmentSchema = z.object({
  counselorId: z.string().max(100).optional(),
  counselorName: z.string().min(2, 'Nama konselor minimal 2 karakter').max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
  time: z.string().min(2, 'Format jam tidak valid').max(50),
  timezone: z.enum(['WIB', 'WITA', 'WIT']).optional(),
  mode: z.enum(['video_call', 'in_person', 'tele_counseling']).optional(),
  notes: z.string().max(500).optional(),
  meetingLink: z.string().max(255).optional(),
  userId: z.string().max(100).optional(),
  studentName: z.string().max(100).optional(),
  studentNIM: z.string().max(30).optional(),
  studentEmail: z.string().email().optional().or(z.literal(''))
}).strict();
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = z.object({
  counselorId: z.string().max(100).optional(),
  counselorName: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)').optional(),
  time: z.string().max(50).optional(),
  timezone: z.enum(['WIB', 'WITA', 'WIT']).optional(),
  mode: z.enum(['video_call', 'in_person', 'tele_counseling']).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'Selesai', 'requested', 'confirmed', 'completed', 'cancelled']).optional(),
  approvalStatus: z.enum(['PENDING_APPROVAL', 'APPROVED', 'REJECTED']).optional(),
  attendanceStatus: z.enum(['SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED']).optional(),
  meetingLink: z.string().max(255).optional(),
  studentName: z.string().max(100).optional(),
  studentNIM: z.string().max(30).optional(),
  studentEmail: z.string().email().optional().or(z.literal('')).optional()
}).strict();
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;

export const RescheduleAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
  time: z.string().min(2, 'Format jam tidak valid').max(50),
  timezone: z.enum(['WIB', 'WITA', 'WIT']).optional(),
  reason: z.string().max(500).optional()
}).strict();
export type RescheduleAppointmentInput = z.infer<typeof RescheduleAppointmentSchema>;
