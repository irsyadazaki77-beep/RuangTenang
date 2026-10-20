import crypto from "crypto";
import { prisma } from "../../server/database";
import { AppointmentRecord } from "../../server/database";
import { encryptionService } from "../../server/services/encryptionService";
import { redisService } from "../../server/services/redisService";
import { blindIndexService } from "../services/crypto/BlindIndexService";
import { buildScheduledAppointmentTime, DEFAULT_SESSION_DURATION_MINUTES } from "../../server/services/appointmentRoomPolicy";

const HARD_MAX_PAGE_SIZE = 100;
const SERIALIZABLE_TX_OPTIONS = process.env.DATABASE_URL?.startsWith('postgres')
  ? { isolationLevel: 'Serializable' as const }
  : undefined;
const INDONESIAN_WEEKDAYS = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const APPOINTMENT_SLOT_TIMES = ['09:00', '10:30', '14:00', '16:00'] as const;

function parseCounselorAvailability(availability: string): string[] {
  try {
    const parsed: unknown = JSON.parse(availability);
    if (Array.isArray(parsed)) return parsed.filter((entry): entry is string => typeof entry === 'string').map(entry => entry.trim()).filter(Boolean);
    if (typeof parsed === 'string' && parsed.trim()) return parsed.split(/[;,]/).map(entry => entry.trim()).filter(Boolean);
    return [];
  } catch {
    return availability.split(/[;,]/).map(entry => entry.trim()).filter(Boolean);
  }
}

function getConfiguredCounselorWeekdays(availability: string): Set<string> {
  const weekdays = parseCounselorAvailability(availability)
    .map(entry => entry.toLocaleLowerCase('id-ID'))
    .filter(entry => INDONESIAN_WEEKDAYS.includes(entry));
  return new Set(weekdays);
}

function getIndonesianWeekday(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return INDONESIAN_WEEKDAYS[parsed.getUTCDay()];
}

export function isCounselorScheduledOnDate(availability: string, date: string): boolean {
  const configuredWeekdays = getConfiguredCounselorWeekdays(availability);
  const requestedWeekday = getIndonesianWeekday(date);
  if (!requestedWeekday) return false;
  if (configuredWeekdays.size > 0) return configuredWeekdays.has(requestedWeekday);

  // Keep older profiles that stored daily clock hours usable, while treating an empty or invalid schedule as unavailable.
  const legacyDailyHours = parseCounselorAvailability(availability);
  return legacyDailyHours.length > 0 && legacyDailyHours.every(entry => /^([01]\d|2[0-3]):[0-5]\d$/.test(entry));
}

function isOfferedAppointmentTime(time: string): boolean {
  return APPOINTMENT_SLOT_TIMES.some(slot => slot === time);
}

/**
 * Calculates absolute UTC DateTime from local date string, time string, and timezone.
 * Handles WIB (+07:00), WITA (+08:00), and WIT (+09:00).
 */
export function calculateScheduledAtUtc(dateStr: string, timeStr: string, timezoneStr: string = 'WIB'): Date {
  return buildScheduledAppointmentTime(dateStr, timeStr, timezoneStr);
}

/**
 * Converts a UTC scheduledAt date back into local date, time, and timezone fields.
 */
export function utcToLocalAppointmentFields(scheduledAt: Date, tz: string = 'WIB'): { date: string; time: string; timezone: "WIB" | "WITA" | "WIT" } {
  const offsetMap: Record<string, number> = {
    WIB: 7 * 60, // +07:00 in minutes
    WITA: 8 * 60, // +08:00 in minutes
    WIT: 9 * 60  // +09:00 in minutes
  };
  const offsetMinutes = offsetMap[tz] || 7 * 60;
  // Apply local offset to the UTC date
  const localTime = new Date(scheduledAt.getTime() + offsetMinutes * 60 * 1000);
  const isoString = localTime.toISOString();
  const date = isoString.split('T')[0];
  const timeMatch = isoString.split('T')[1].match(/^(\d{2}):(\d{2})/);
  const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '09:00';
  return { date, time, timezone: tz as "WIB" | "WITA" | "WIT" };
}

async function clearAppointmentAvailabilityCache(counselorId: string, date: string): Promise<void> {
  await Promise.all([
    redisService.del(`availability:${counselorId}:${date}`),
    ...(['WIB', 'WITA', 'WIT'] as const).map(timezone =>
      redisService.del(`availability:${counselorId}:${date}:${timezone}`)
    )
  ]);
}

/**
 * Transforms a raw database record from Prisma into a fully decrypted,
 * strongly-typed `AppointmentRecord` domain model.
 */
function mapDbAppointmentToRecord(a: any): AppointmentRecord {
  const timezone = ['WIB', 'WITA', 'WIT'].includes(a.timezone) ? a.timezone : 'WIB';
  const fields = utcToLocalAppointmentFields(new Date(a.scheduledAt), timezone);
  return {
    ...a,
    date: fields.date,
    time: fields.time,
    timezone: fields.timezone,
    status: a.status as any,
    approvalStatus: a.approvalStatus as any,
    attendanceStatus: a.attendanceStatus as any,
    mode: a.mode as any,
    createdAt: typeof a.createdAt === "string" ? a.createdAt : a.createdAt.toISOString(),
    notes: a.notes ? (encryptionService.decryptSensitive(a.notes) || a.notes) : undefined,
    meetingLink: a.meetingLink || undefined,
    userId: a.userId || undefined,
    studentName: a.studentName || undefined,
    studentNIM: a.studentNIM ? (encryptionService.decryptSensitive(a.studentNIM) || a.studentNIM) : undefined,
    studentEmail: a.studentEmail ? (encryptionService.decryptSensitive(a.studentEmail) || a.studentEmail) : undefined,
    studentNimHash: a.studentNimHash || undefined,
    studentEmailHash: a.studentEmailHash || undefined,
  };
}

/**
 * ============================================================================
 * RUANGTENANG KAMPUS - APPOINTMENT REPOSITORY (WITH BLIND INDEXING)
 * ============================================================================
 *
 * @class AppointmentRepository
 * @description
 * High-security Repository for managing student mental health appointments.
 * Implements Application-Level AES-256-GCM encryption for sensitive fields
 * (`notes`, `studentNIM`, `studentEmail`) paired with HMAC-SHA256 Blind Indexing
 * (`studentNimHash`, `studentEmailHash`) to support high-speed, database-indexed
 * exact match searching without compromising data confidentiality.
 */
export class AppointmentRepository {
  /**
   * Cleans up appointments older than a given cutoff date.
   *
   * @param cutoffDate - Expiration date boundary.
   * @returns Total number of records deleted.
   */
  async cleanOldAppointments(cutoffDate: Date): Promise<number> {
    const { count } = await prisma.appointments.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    return count;
  }

  /**
   * Retrieves a paginated list of appointments with optional user filtering.
   * Decrypts AES-256-GCM encrypted fields before returning records.
   *
   * @param limit - Page size limit (capped at HARD_MAX_PAGE_SIZE = 100).
   * @param offset - Pagination offset count.
   * @param userId - Optional student user ID filter.
   */
  async getAppointments(limit = 100, offset = 0, userId?: string): Promise<AppointmentRecord[]> {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);
    const where = userId ? { userId } : {};

    const list = await prisma.appointments.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip: offset,
    });

    return list.map(mapDbAppointmentToRecord);
  }

  /**
   * Finds a single appointment by its primary key ID and returns decrypted contents.
   *
   * @param id - Unique appointment record ID.
   * @returns Decrypted `AppointmentRecord` or `null` if not found.
   */
  async findAppointmentById(id: string): Promise<AppointmentRecord | null> {
    const a = await prisma.appointments.findUnique({
      where: { id },
    });
    if (!a) return null;

    return mapDbAppointmentToRecord(a);
  }

  /**
   * Finds appointments associated with a specific Student NIM using HMAC-SHA256 Blind Indexing.
   *
   * Cryptographic Workflow:
   * 1. Computes the deterministic HMAC-SHA256 blind index hash for the input `nim`.
   * 2. Executes a database-indexed query (`SELECT * FROM Appointments WHERE studentNimHash = ?`).
   * 3. Maps raw database records through `encryptionService.decryptSensitive()` to reveal
   *    plaintext `studentNIM`, `studentEmail`, and `notes`.
   *
   * @param nim - Plaintext Student NIM (e.g. "13520999").
   * @returns Array of matching, fully decrypted `AppointmentRecord` objects.
   */
  async findAppointmentsByNIM(nim: string): Promise<AppointmentRecord[]> {
    if (!nim || typeof nim !== "string" || nim.trim() === "") {
      return [];
    }

    // Generate deterministic HMAC-SHA256 hash for database query
    const nimHash = blindIndexService.generateHash(nim);
    if (!nimHash) {
      return [];
    }

    // Query database using optimized database-level index @@index([studentNimHash])
    const matches = await prisma.appointments.findMany({
      where: {
        studentNimHash: nimHash,
      },
      orderBy: { createdAt: "desc" },
    });

    // Return mapped and decrypted appointment records
    return matches.map(mapDbAppointmentToRecord);
  }

  /**
   * Finds appointments associated with a specific Student Email using HMAC-SHA256 Blind Indexing.
   *
   * Cryptographic Workflow:
   * 1. Computes the deterministic HMAC-SHA256 blind index hash for the input `email`.
   * 2. Executes a database-indexed query (`SELECT * FROM Appointments WHERE studentEmailHash = ?`).
   * 3. Maps raw database records through `encryptionService.decryptSensitive()`.
   *
   * @param email - Plaintext Student Email (e.g. "mahasiswa@ui.ac.id").
   * @returns Array of matching, fully decrypted `AppointmentRecord` objects.
   */
  async findAppointmentsByEmail(email: string): Promise<AppointmentRecord[]> {
    if (!email || typeof email !== "string" || email.trim() === "") {
      return [];
    }

    const emailHash = blindIndexService.generateHash(email);
    if (!emailHash) {
      return [];
    }

    const matches = await prisma.appointments.findMany({
      where: {
        studentEmailHash: emailHash,
      },
      orderBy: { createdAt: "desc" },
    });

    return matches.map(mapDbAppointmentToRecord);
  }

  /**
   * Checks slot availability for a counselor on a given date with Redis caching.
   *
   * @param counselorId - ID of the target counselor.
   * @param date - Date string in YYYY-MM-DD format.
   */
  async getAppointmentAvailability(counselorId: string, date: string, timezone: 'WIB' | 'WITA' | 'WIT' = 'WIB') {
    const cacheKey = `availability:${counselorId}:${date}:${timezone}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const counselor = await prisma.counselors.findUnique({
      where: { id: counselorId },
      select: { availability: true },
    });
    const isScheduledDay = counselor ? isCounselorScheduledOnDate(counselor.availability, date) : false;
    const standardSlots = isScheduledDay ? [...APPOINTMENT_SLOT_TIMES] : [];
    const slotTimes = standardSlots.map(time => calculateScheduledAtUtc(date, time, timezone));
    const sessionWindowMs = DEFAULT_SESSION_DURATION_MINUTES * 60_000;
    const minimumStartTime = Date.now() + 5 * 60_000;
    const candidateSlots = standardSlots
      .map((time, index) => ({ time, scheduledAt: slotTimes[index] }))
      .filter(slot => slot.scheduledAt.getTime() > minimumStartTime);
    const activeAppointments = candidateSlots.length ? await prisma.appointments.findMany({
      where: {
        counselorId,
        scheduledAt: {
          gt: new Date(Math.min(...candidateSlots.map(slot => slot.scheduledAt.getTime())) - sessionWindowMs),
          lt: new Date(Math.max(...candidateSlots.map(slot => slot.scheduledAt.getTime())) + sessionWindowMs),
        },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      select: { scheduledAt: true },
    }) : [];

    const bookedSlots = candidateSlots.filter(slot => {
      const candidateTime = slot.scheduledAt.getTime();
      return activeAppointments.some(appointment => {
        const existingTime = new Date(appointment.scheduledAt).getTime();
        return existingTime > candidateTime - sessionWindowMs && existingTime < candidateTime + sessionWindowMs;
      });
    }).map(slot => slot.time);
    const availableSlots = candidateSlots.map(slot => slot.time).filter(slot => !bookedSlots.includes(slot));

    const result = {
      counselorId,
      date,
      timezone,
      allSlots: standardSlots,
      bookedSlots,
      availableSlots,
      fullyBooked: availableSlots.length === 0,
    };

    await redisService.set(cacheKey, result, 15);

    return result;
  }

  /**
   * Adds a new appointment to the database with dual security mechanisms:
   * 1. AES-256-GCM Application-Level Encryption for `notes`, `studentNIM`, and `studentEmail`.
   * 2. HMAC-SHA256 Blind Index generation for `studentNimHash` and `studentEmailHash`.
   *
   * @param appt - Appointment data containing raw student details and notes.
   * @returns Saved and decrypted `AppointmentRecord`.
   * @throws {Error} Throws "SLOT_ALREADY_BOOKED" if the target slot is unavailable.
   */
  async addAppointment(
    appt: Omit<AppointmentRecord, "id" | "createdAt">,
  ): Promise<AppointmentRecord> {
    const id = `appt-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const initialStatus = appt.status || "PENDING";
    const initialApproval =
      appt.approvalStatus ||
      (initialStatus === "CONFIRMED" ? "APPROVED" : "PENDING_APPROVAL");

    // 1. Application-Level AES-256-GCM encryption with key versioning
    const encryptedNotes = appt.notes ? encryptionService.encryptSensitive(appt.notes) : null;
    const encryptedNIM = appt.studentNIM ? encryptionService.encryptSensitive(appt.studentNIM) : null;
    const encryptedEmail = appt.studentEmail ? encryptionService.encryptSensitive(appt.studentEmail) : null;

    // 2. Simultaneous HMAC-SHA256 Blind Index generation for fast exact-match search
    const nimHash = appt.studentNIM ? blindIndexService.generateHash(appt.studentNIM) : null;
    const emailHash = appt.studentEmail ? blindIndexService.generateHash(appt.studentEmail) : null;

    return await prisma.$transaction(async (tx) => {
      const isCancelledOrRejected = ["CANCELLED", "REJECTED"].includes(initialStatus);

      let resolvedCounselorId = appt.counselorId;
      if (!resolvedCounselorId && appt.counselorName) {
        const found = await tx.counselors.findFirst({
          where: { name: appt.counselorName },
        });
        if (found) {
          resolvedCounselorId = found.id;
        }
      }

      // Check if counselor exists in authoritative database
      let counselorRecord = resolvedCounselorId
        ? await tx.counselors.findUnique({ where: { id: resolvedCounselorId } })
        : null;

      if (!counselorRecord) {
        // In test or explicit demo mode only, provision test fixture with isDemoData: true
        if (process.env.NODE_ENV === 'test' || process.env.VITE_PUBLIC_DEMO_MODE === 'true' || process.env.VITEST === 'true') {
          counselorRecord = await tx.counselors.create({
            data: {
              id: resolvedCounselorId || `cns-test-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
              name: appt.counselorName || "Test Counselor",
              role: "Konselor Mahasiswa",
              specialties: JSON.stringify(["Konseling Umum"]),
              imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
              availability: JSON.stringify(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]),
              isVerified: true,
              isDemoData: true,
            },
          });
          resolvedCounselorId = counselorRecord.id;
        } else {
          throw new Error("COUNSELOR_NOT_FOUND");
        }
      }

      const scheduledAt = calculateScheduledAtUtc(appt.date, appt.time, appt.timezone || "WIB");

      // Validate slot timing: expired/past slots cannot be booked in production
      const minimumStartTime = Date.now() + 5 * 60 * 1000;
      if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true' && scheduledAt.getTime() <= minimumStartTime) {
        throw new Error("SLOT_EXPIRED");
      }

      if (!isCancelledOrRejected && (!isCounselorScheduledOnDate(counselorRecord.availability, appt.date) || !isOfferedAppointmentTime(appt.time))) {
        throw new Error('SLOT_UNAVAILABLE');
      }

      // Check slot availability
      if (!isCancelledOrRejected) {
        const durationMs = DEFAULT_SESSION_DURATION_MINUTES * 60_000;
        const overlapWhere = {
          scheduledAt: { gt: new Date(scheduledAt.getTime() - durationMs), lt: new Date(scheduledAt.getTime() + durationMs) },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        };
        const counselorConflict = await tx.appointments.findFirst({
          where: {
            counselorId: resolvedCounselorId,
            ...overlapWhere,
          },
        });
        const studentConflict = appt.userId ? await tx.appointments.findFirst({
          where: { userId: appt.userId, ...overlapWhere },
        }) : null;
        if (counselorConflict || studentConflict) {
          throw new Error("SLOT_ALREADY_BOOKED");
        }
      }

      const created = await tx.appointments.create({
        data: {
          id,
          counselorId: resolvedCounselorId,
          campusId: appt.campusId || null,
          counselorName: appt.counselorName,
          scheduledAt,
          timezone: appt.timezone || 'WIB',
          notes: encryptedNotes,
          status: initialStatus,
          approvalStatus: initialApproval,
          attendanceStatus: appt.attendanceStatus || "SCHEDULED",
          meetingLink: appt.meetingLink || "",
          mode: appt.mode || "Virtual Video Call",
          userId: appt.userId || null,
          studentName: appt.studentName || null,
          studentNIM: encryptedNIM,
          studentEmail: encryptedEmail,
          studentNimHash: nimHash,
          studentEmailHash: emailHash,
        },
      });

      if (!isCancelledOrRejected) {
        const slotId = `slot-${resolvedCounselorId}-${scheduledAt.getTime()}`;
        try {
          await tx.appointmentSlot.create({
            data: {
              id: slotId,
              counselorId: resolvedCounselorId,
              scheduledAt,
              appointmentId: id,
            },
          });
        } catch (error: any) {
          if (error.code === "P2002") {
            throw new Error("SLOT_ALREADY_BOOKED");
          }
          throw error;
        }
      }

      try {
        await tx.auditLogs.create({
          data: {
            id: `log-${crypto.randomUUID()}`,
            action: "CREATE_APPOINTMENT",
            details: `Jadwal konseling (Status: ${initialStatus}) dibuat untuk ID sesi ${id} tanggal ${appt.date} (${created.scheduledAt.toISOString()})`,
            timestamp: new Date(),
            userRole: appt.userId || "mahasiswa",
          },
        });
      } catch (logErr) {
        console.warn("Non-fatal audit log failure in transaction:", logErr);
      }

      await clearAppointmentAvailabilityCache(resolvedCounselorId, appt.date);

      return mapDbAppointmentToRecord(created);
    }, SERIALIZABLE_TX_OPTIONS);
  }

  /**
   * Updates an existing appointment, recalculating ciphertexts and blind index hashes
   * whenever sensitive student NIM or Email fields are updated.
   *
   * @param id - Appointment ID.
   * @param updates - Partial object containing updated appointment fields.
   */
  async updateAppointment(
    id: string,
    updates: Partial<AppointmentRecord>,
    expectedStatus?: string,
  ): Promise<AppointmentRecord | null> {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.appointments.findUnique({ where: { id } });
      if (!current) return null;

      const currentTimezone = ['WIB', 'WITA', 'WIT'].includes(current.timezone) ? current.timezone : 'WIB';
      const currentFields = utcToLocalAppointmentFields(new Date(current.scheduledAt), currentTimezone);
      const targetCounselorId = updates.counselorId || current.counselorId;
      const targetDate = updates.date || currentFields.date;
      const targetTime = updates.time || currentFields.time;
      const targetStatus = updates.status || current.status;

      const isCancelledOrRejected = ["CANCELLED", "REJECTED"].includes(targetStatus);
      const isChangingSlot =
        (updates.date && updates.date !== currentFields.date) ||
        (updates.time && updates.time !== currentFields.time) ||
        (updates.timezone !== undefined && updates.timezone !== currentTimezone) ||
        (updates.counselorId && updates.counselorId !== current.counselorId);

      const wasCancelledOrRejected = ["CANCELLED", "REJECTED"].includes(current.status);

      const targetTimezone = updates.timezone || currentTimezone || "WIB";
      const scheduledAt = calculateScheduledAtUtc(targetDate, targetTime, targetTimezone);
      const confirmingAppointment = updates.status === 'CONFIRMED' && current.status !== 'CONFIRMED';
      if (!isCancelledOrRejected && (isChangingSlot || confirmingAppointment) && process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true' && scheduledAt.getTime() <= Date.now() + 5 * 60_000) {
        throw new Error('SLOT_EXPIRED');
      }
      const shouldReserveSlot = !isCancelledOrRejected && (isChangingSlot || wasCancelledOrRejected || confirmingAppointment);
      if (shouldReserveSlot) {
        const targetCounselor = await tx.counselors.findUnique({ where: { id: targetCounselorId }, select: { availability: true } });
        if (!targetCounselor || !isCounselorScheduledOnDate(targetCounselor.availability, targetDate) || !isOfferedAppointmentTime(targetTime)) {
          throw new Error('SLOT_UNAVAILABLE');
        }
      }

      if (isCancelledOrRejected) {
        await tx.appointmentSlot.deleteMany({
          where: { appointmentId: id },
        });
      } else if (isChangingSlot || wasCancelledOrRejected || confirmingAppointment) {
        await tx.appointmentSlot.deleteMany({
          where: { appointmentId: id },
        });

        if (!isCancelledOrRejected) {
          const durationMs = DEFAULT_SESSION_DURATION_MINUTES * 60_000;
          const overlapWhere = {
            id: { not: id },
            scheduledAt: { gt: new Date(scheduledAt.getTime() - durationMs), lt: new Date(scheduledAt.getTime() + durationMs) },
            status: { notIn: ["CANCELLED", "REJECTED"] },
          };
          const counselorConflict = await tx.appointments.findFirst({ where: { counselorId: targetCounselorId, ...overlapWhere } });
          const studentConflict = current.userId ? await tx.appointments.findFirst({ where: { userId: current.userId, ...overlapWhere } }) : null;
          if (counselorConflict || studentConflict) throw new Error("SLOT_ALREADY_BOOKED");
        }

        const slotId = `slot-${targetCounselorId}-${scheduledAt.getTime()}`;
        try {
          await tx.appointmentSlot.create({
            data: {
              id: slotId,
              counselorId: targetCounselorId,
              scheduledAt,
              appointmentId: id,
            },
          });
        } catch (error: any) {
          if (error.code === "P2002") {
            throw new Error("SLOT_ALREADY_BOOKED");
          }
          throw error;
        }
      }

      // Re-encrypt notes if modified
      const encryptedNotes = updates.notes !== undefined
        ? (updates.notes ? encryptionService.encryptSensitive(updates.notes) : null)
        : current.notes;

      // Re-encrypt and re-hash studentNIM if modified
      const encryptedNIM = updates.studentNIM !== undefined
        ? (updates.studentNIM ? encryptionService.encryptSensitive(updates.studentNIM) : null)
        : current.studentNIM;

      const nimHash = updates.studentNIM !== undefined
        ? (updates.studentNIM ? blindIndexService.generateHash(updates.studentNIM) : null)
        : current.studentNimHash;

      // Re-encrypt and re-hash studentEmail if modified
      const encryptedEmail = updates.studentEmail !== undefined
        ? (updates.studentEmail ? encryptionService.encryptSensitive(updates.studentEmail) : null)
        : current.studentEmail;

      const emailHash = updates.studentEmail !== undefined
        ? (updates.studentEmail ? blindIndexService.generateHash(updates.studentEmail) : null)
        : current.studentEmailHash;

      const updateData = {
          counselorId: updates.counselorId,
          campusId: updates.campusId,
          counselorName: updates.counselorName,
          scheduledAt,
          timezone: targetTimezone,
          notes: encryptedNotes,
          status: updates.status,
          approvalStatus: updates.approvalStatus,
          attendanceStatus: updates.attendanceStatus,
          meetingLink: updates.meetingLink,
          mode: updates.mode,
          userId: updates.userId,
          studentName: updates.studentName,
          studentNIM: encryptedNIM,
          studentEmail: encryptedEmail,
          studentNimHash: nimHash,
          studentEmailHash: emailHash,
        };
      if (expectedStatus !== undefined) {
        const result = await tx.appointments.updateMany({
          where: { id, status: expectedStatus },
          data: updateData,
        });
        if (result.count === 0) throw new Error('APPOINTMENT_STATUS_CONFLICT');
      } else {
        await tx.appointments.update({ where: { id }, data: updateData });
      }
      const updated = await tx.appointments.findUnique({ where: { id } });
      if (!updated) return null;

      try {
        await tx.auditLogs.create({
          data: {
            id: `log-${crypto.randomUUID()}`,
            action: "UPDATE_APPOINTMENT",
            details: `Jadwal konseling ID ${id} diperbarui. Status: ${updated.status}`,
            timestamp: new Date(),
            userRole: "konselor",
          },
        });
      } catch (logErr) {
        console.warn("Non-fatal audit log failure in transaction:", logErr);
      }

      await clearAppointmentAvailabilityCache(current.counselorId, currentFields.date);
      if (targetCounselorId !== current.counselorId || targetDate !== currentFields.date) {
        await clearAppointmentAvailabilityCache(targetCounselorId, targetDate);
      }

      return mapDbAppointmentToRecord(updated);
    }, SERIALIZABLE_TX_OPTIONS);
  }

  /**
   * Deletes an appointment record and associated slot reservations.
   *
   * @param id - Appointment ID to remove.
   * @returns `true` if deleted successfully, `false` otherwise.
   */
  async deleteAppointment(id: string): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        const appt = await tx.appointments.findUnique({ where: { id } });

        await tx.appointmentSlot.deleteMany({
          where: { appointmentId: id },
        });

        await tx.appointments.delete({
          where: { id },
        });

        await tx.auditLogs.create({
          data: {
            id: `log-${crypto.randomUUID()}`,
            action: "DELETE_APPOINTMENT",
            details: `Jadwal konseling ID ${id} dihapus.`,
            timestamp: new Date(),
            userRole: "admin",
          },
        });

        if (appt) {
          const apptFields = utcToLocalAppointmentFields(new Date(appt.scheduledAt), appt.timezone || 'WIB');
          await clearAppointmentAvailabilityCache(appt.counselorId, apptFields.date);
        }
      });

      return true;
    } catch {
      return false;
    }
  }
}

export const appointmentRepository = new AppointmentRepository();
export default appointmentRepository;
