import { z } from 'zod';

export const TriggerSosSchema = z.object({
  emergencyContact: z.object({
    name: z.string().min(1).max(100),
    phone: z.string().min(5).max(30),
    relationship: z.string().max(50).optional(),
  }).strict().optional(),
  hasUserConsent: z.boolean().optional(),
  studentName: z.string().max(100).optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().max(300).optional(),
  }).strict().optional(),
  message: z.string().max(300).optional(),
  userNote: z.string().max(300).optional()
}).strict();
export type TriggerSosInput = z.infer<typeof TriggerSosSchema>;

export const UpdateEmergencyContactSchema = z.object({
  name: z.string().min(2, 'Nama kontak minimal 2 karakter').max(100),
  phone: z.string().min(8, 'Nomor telepon minimal 8 digit').max(20),
  relationship: z.string().min(2, 'Hubungan minimal 2 karakter').max(50),
  whatsapp: z.string().max(20).optional()
}).strict();
export type UpdateEmergencyContactInput = z.infer<typeof UpdateEmergencyContactSchema>;

export interface MaskedSosResponse {
  status: 'triggered' | 'cooldown' | 'no_contact' | 'SENT' | 'SIMULATED' | 'FAILED';
  cooldownSeconds?: number;
  contactMasked?: {
    name: string;
    phoneMasked: string;
    relationship?: string;
  };
  gatewayStatus?: string;
  dispatchedAt?: string;
  dispatchId?: string;
  message?: string;
}

