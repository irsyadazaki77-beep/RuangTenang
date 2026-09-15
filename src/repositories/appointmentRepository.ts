import { prisma } from "../../server/database";
import { AppointmentRecord } from "../../server/database";
import { encryptionService } from "../../server/services/encryptionService";
import { redisService } from "../../server/services/redisService";
import { blindIndexService } from "../services/crypto/BlindIndexService";

const HARD_MAX_PAGE_SIZE = 100;

/**
 * Transforms a raw database record from Prisma into a fully decrypted,
 * strongly-typed `AppointmentRecord` domain model.
 */
function mapDbAppointmentToRecord(a: any): AppointmentRecord {
  return {
    ...a,
    timezone: a.timezone as any,
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
  async getAppointmentAvailability(counselorId: string, date: string) {
    const cacheKey = `availability:${counselorId}:${date}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const standardSlots = ["09:00", "10:30", "14:00", "16:00"];

    const activeSlots = await prisma.appointmentSlot.findMany({
      where: {
        counselorId,
        date,
      },
    });

    const bookedSlots = activeSlots.map((s) => s.time);
    const availableSlots = standardSlots.filter(
      (slot) => !bookedSlots.includes(slot),
    );

    const result = {
      counselorId,
      date,
      allSlots: standardSlots,
      bookedSlots,
      availableSlots,
      fullyBooked: availableSlots.length === 0,
    };

    await redisService.set(cacheKey, result, 60);

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
    const id = "appt-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
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
        } else {
          const newCns = await tx.counselors.create({
            data: {
              id: "cns-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
              name: appt.counselorName,
              role: "Konselor Mahasiswa",
              specialties: JSON.stringify(["Konseling Umum"]),
              imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
              availability: JSON.stringify(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]),
              isVerified: true,
            },
          });
          resolvedCounselorId = newCns.id;
        }
      }

      if (!resolvedCounselorId) {
        const fallbackCns = await tx.counselors.findFirst();
        if (fallbackCns) {
          resolvedCounselorId = fallbackCns.id;
        } else {
          const defaultCns = await tx.counselors.create({
            data: {
              id: "cons-1",
              name: appt.counselorName || "Dr. Anita Rahmawati, M.Psi.",
              role: "Konselor Mahasiswa",
              specialties: JSON.stringify(["Konseling Umum"]),
              imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
              availability: JSON.stringify(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]),
              isVerified: true,
            },
          });
          resolvedCounselorId = defaultCns.id;
        }
      }

      // Check slot availability
      if (!isCancelledOrRejected) {
        const conflict = await tx.appointments.findFirst({
          where: {
            counselorId: resolvedCounselorId,
            date: appt.date,
            time: appt.time,
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
        });

        if (conflict) {
          throw new Error("SLOT_ALREADY_BOOKED");
        }
      }

      const created = await tx.appointments.create({
        data: {
          id,
          counselorId: resolvedCounselorId,
          counselorName: appt.counselorName,
          date: appt.date,
          time: appt.time,
          timezone: appt.timezone || "WIB",
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
        const slotId = `slot-${resolvedCounselorId}-${appt.date}-${appt.time}`;
        try {
          await tx.appointmentSlot.create({
            data: {
              id: slotId,
              counselorId: resolvedCounselorId,
              date: appt.date,
              time: appt.time,
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
            id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            action: "CREATE_APPOINTMENT",
            details: `Jadwal konseling (Status: ${initialStatus}) dibuat untuk ID sesi ${id} tanggal ${appt.date} (${created.timezone})`,
            timestamp: new Date(),
            userRole: appt.userId || "mahasiswa",
          },
        });
      } catch (logErr) {
        console.warn("Non-fatal audit log failure in transaction:", logErr);
      }

      await redisService.del(`availability:${resolvedCounselorId}:${appt.date}`);

      return mapDbAppointmentToRecord(created);
    });
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
  ): Promise<AppointmentRecord | null> {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.appointments.findUnique({ where: { id } });
      if (!current) return null;

      const targetCounselorId = updates.counselorId || current.counselorId;
      const targetDate = updates.date || current.date;
      const targetTime = updates.time || current.time;
      const targetStatus = updates.status || current.status;

      const isCancelledOrRejected = ["CANCELLED", "REJECTED"].includes(targetStatus);
      const isChangingSlot =
        (updates.date && updates.date !== current.date) ||
        (updates.time && updates.time !== current.time) ||
        (updates.counselorId && updates.counselorId !== current.counselorId);

      const wasCancelledOrRejected = ["CANCELLED", "REJECTED"].includes(current.status);

      if (isCancelledOrRejected) {
        await tx.appointmentSlot.deleteMany({
          where: { appointmentId: id },
        });
      } else if (isChangingSlot || wasCancelledOrRejected) {
        await tx.appointmentSlot.deleteMany({
          where: { appointmentId: id },
        });

        const slotId = `slot-${targetCounselorId}-${targetDate}-${targetTime}`;
        try {
          await tx.appointmentSlot.create({
            data: {
              id: slotId,
              counselorId: targetCounselorId,
              date: targetDate,
              time: targetTime,
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

      const updated = await tx.appointments.update({
        where: { id },
        data: {
          counselorId: updates.counselorId,
          counselorName: updates.counselorName,
          date: updates.date,
          time: updates.time,
          timezone: updates.timezone,
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
        },
      });

      try {
        await tx.auditLogs.create({
          data: {
            id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            action: "UPDATE_APPOINTMENT",
            details: `Jadwal konseling ID ${id} diperbarui. Status: ${updated.status}`,
            timestamp: new Date(),
            userRole: "konselor",
          },
        });
      } catch (logErr) {
        console.warn("Non-fatal audit log failure in transaction:", logErr);
      }

      await redisService.del(`availability:${current.counselorId}:${current.date}`);
      if (targetCounselorId !== current.counselorId || targetDate !== current.date) {
        await redisService.del(`availability:${targetCounselorId}:${targetDate}`);
      }

      return mapDbAppointmentToRecord(updated);
    });
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
            id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            action: "DELETE_APPOINTMENT",
            details: `Jadwal konseling ID ${id} dihapus.`,
            timestamp: new Date(),
            userRole: "admin",
          },
        });

        if (appt) {
          await redisService.del(`availability:${appt.counselorId}:${appt.date}`);
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
