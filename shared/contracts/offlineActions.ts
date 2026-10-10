import { z } from 'zod';
import { CreateMoodSchema } from './mood.js';
import { CreateAppointmentSchema } from './appointments.js';

export const OfflineActionTypeSchema = z.enum(['mood_log', 'appointment']);
export type OfflineActionType = z.infer<typeof OfflineActionTypeSchema>;

export const OfflineActionPayloadSchemas = {
  mood_log: CreateMoodSchema.strict(),
  appointment: CreateAppointmentSchema.omit({
    userId: true,
    studentName: true,
    studentEmail: true,
    meetingLink: true,
  }).strict(),
} as const;

export type OfflineMoodPayload = z.infer<typeof OfflineActionPayloadSchemas.mood_log>;
export type OfflineAppointmentPayload = z.infer<typeof OfflineActionPayloadSchemas.appointment>;

export const OFFLINE_ACTION_ENDPOINTS: Readonly<Record<OfflineActionType, '/api/v1/mood' | '/api/v1/appointments'>> = {
  mood_log: '/api/v1/mood',
  appointment: '/api/v1/appointments',
};

export const MAX_OFFLINE_ACTION_BYTES = 64 * 1024;
export const MAX_PENDING_OFFLINE_ACTIONS_PER_USER = 100;
