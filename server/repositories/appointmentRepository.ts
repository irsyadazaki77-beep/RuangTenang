import { prisma } from "../database";
import { AppointmentRecord } from "../database";
import { auditRepository } from "./auditRepository";
import { encryptionService } from "../services/encryptionService";
import { redisService } from "../services/redisService";

const HARD_MAX_PAGE_SIZE = 100;

function mapDbAppointmentToRecord(a: any): AppointmentRecord {
  return {
    ...a,
    timezone: a.timezone as any,
    status: a.status as any,
    approvalStatus: a.approvalStatus as any,
    attendanceStatus: a.attendanceStatus as any,
    mode: a.mode as any,
    createdAt: a.createdAt.toISOString(),
    notes: a.notes ? (encryptionService.decryptSensitive(a.notes) || a.notes) : undefined,
    meetingLink: a.meetingLink || undefined,
    userId: a.userId || undefined,
    studentName: a.studentName || undefined,
    studentNIM: a.studentNIM ? (encryptionService.decryptSensitive(a.studentNIM) || a.studentNIM) : undefined,
    studentEmail: a.studentEmail ? (encryptionService.decryptSensitive(a.studentEmail) || a.studentEmail) : undefined,
  };
}

export const appointmentRepository = {
  async cleanOldAppointments(cutoffDate: Date): Promise<number> {
    const { count } = await prisma.appointments.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    return count;
  },

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
  },

  async findAppointmentById(id: string): Promise<AppointmentRecord | null> {
    const a = await prisma.appointments.findUnique({
      where: { id },
    });
    if (!a) return null;

    return mapDbAppointmentToRecord(a);
  },

  async getAppointmentAvailability(counselorId: string, date: string) {
    const cacheKey = `availability:${counselorId}:${date}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const standardSlots = ["09:00", "10:30", "14:00", "16:00"];
    
    // Find slots currently reserved in the database
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

    // Cache availability for 60 seconds
    await redisService.set(cacheKey, result, 60);

    return result;
  },

  async addAppointment(
    appt: Omit<AppointmentRecord, "id" | "createdAt">,
  ): Promise<AppointmentRecord> {
    const id = "appt-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const initialStatus = appt.status || "PENDING";
    const initialApproval =
      appt.approvalStatus ||
      (initialStatus === "CONFIRMED" ? "APPROVED" : "PENDING_APPROVAL");

    // Application-Level AES-256-GCM encryption with key versioning
    const encryptedNotes = appt.notes ? encryptionService.encryptSensitive(appt.notes) : null;
    const encryptedNIM = appt.studentNIM ? encryptionService.encryptSensitive(appt.studentNIM) : null;
    const encryptedEmail = appt.studentEmail ? encryptionService.encryptSensitive(appt.studentEmail) : null;

    return await prisma.$transaction(async (tx) => {
      const isCancelledOrRejected = ["CANCELLED", "REJECTED"].includes(initialStatus);

      const created = await tx.appointments.create({
        data: {
          id,
          counselorId: appt.counselorId,
          counselorName: appt.counselorName,
          date: appt.date,
          time: appt.time,
          timezone: appt.timezone || "WIB",
          notes: encryptedNotes,
          status: initialStatus,
          approvalStatus: initialApproval,
          attendanceStatus: appt.attendanceStatus || "SCHEDULED",
          meetingLink:
            appt.meetingLink ||
            `https://meet.jit.si/ruangtenang-session-${Date.now().toString().slice(-6)}`,
          mode: appt.mode || "Virtual Video Call",
          userId: appt.userId || null,
          studentName: appt.studentName || null,
          studentNIM: encryptedNIM,
          studentEmail: encryptedEmail,
        },
      });

      if (!isCancelledOrRejected) {
        // Enforce slot constraint at database level
        const slotId = `slot-${appt.counselorId}-${appt.date}-${appt.time}`;
        try {
          await tx.appointmentSlot.create({
            data: {
              id: slotId,
              counselorId: appt.counselorId,
              date: appt.date,
              time: appt.time,
              appointmentId: id,
            },
          });
        } catch (error: any) {
          // P2002 is Prisma unique constraint violation code
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
          }
        });
      } catch (logErr) {
        console.warn('Non-fatal audit log failure in transaction:', logErr);
      }

      // Invalidate slot availability cache
      await redisService.del(`availability:${appt.counselorId}:${appt.date}`);

      return mapDbAppointmentToRecord(created);
    });
  },

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
        // Free up slot immediately
        await tx.appointmentSlot.deleteMany({
          where: { appointmentId: id },
        });
      } else if (isChangingSlot || wasCancelledOrRejected) {
        // Clear previous slot
        await tx.appointmentSlot.deleteMany({
          where: { appointmentId: id },
        });

        // Reserve new slot under transaction
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

      const encryptedNotes = updates.notes !== undefined 
        ? (updates.notes ? encryptionService.encryptSensitive(updates.notes) : null) 
        : current.notes;
      const encryptedNIM = updates.studentNIM !== undefined 
        ? (updates.studentNIM ? encryptionService.encryptSensitive(updates.studentNIM) : null) 
        : current.studentNIM;
      const encryptedEmail = updates.studentEmail !== undefined 
        ? (updates.studentEmail ? encryptionService.encryptSensitive(updates.studentEmail) : null) 
        : current.studentEmail;

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
          }
        });
      } catch (logErr) {
        console.warn('Non-fatal audit log failure in transaction:', logErr);
      }

      // Invalidate slot availability cache
      await redisService.del(`availability:${current.counselorId}:${current.date}`);
      if (targetCounselorId !== current.counselorId || targetDate !== current.date) {
        await redisService.del(`availability:${targetCounselorId}:${targetDate}`);
      }

      return mapDbAppointmentToRecord(updated);
    });
  },

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
          }
        });

        if (appt) {
          await redisService.del(`availability:${appt.counselorId}:${appt.date}`);
        }
      });

      return true;
    } catch {
      return false;
    }
  },
};
