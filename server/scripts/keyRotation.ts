/**
 * RuangTenang Database Encryption Key Rotation Utility
 * Re-encrypts all database encrypted columns to the latest active key version.
 */

import { prisma } from '../database.js';
import { encryptionService } from '../services/encryptionService.js';

export interface KeyRotationStats {
  targetVersion: string;
  appointmentsReencrypted: number;
  screeningsReencrypted: number;
  emergencyContactsReencrypted: number;
  moodLogsReencrypted: number;
  chatsReencrypted: number;
  messagesReencrypted: number;
  memoriesReencrypted: number;
  totalReencrypted: number;
  timestamp: string;
}

export async function rotateDatabaseEncryptionKeys(targetVersion?: string): Promise<KeyRotationStats> {
  const currentTarget = targetVersion || encryptionService.getCurrentKeyVersion();
  encryptionService.setActiveKeyVersion(currentTarget);

  let appointmentsReencrypted = 0;
  let screeningsReencrypted = 0;
  let emergencyContactsReencrypted = 0;
  let moodLogsReencrypted = 0;
  let chatsReencrypted = 0;
  let messagesReencrypted = 0;
  let memoriesReencrypted = 0;

  // 1. Appointments (notes, studentNIM, studentEmail)
  const appts = await prisma.appointments.findMany();
  for (const appt of appts) {
    let changed = false;
    let newNotes = appt.notes;
    let newNIM = appt.studentNIM;
    let newEmail = appt.studentEmail;

    if (appt.notes && (!appt.notes.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(appt.notes))) {
      newNotes = encryptionService.reencryptWithCurrentKey(appt.notes);
      changed = true;
    }
    if (appt.studentNIM && (!appt.studentNIM.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(appt.studentNIM))) {
      newNIM = encryptionService.reencryptWithCurrentKey(appt.studentNIM);
      changed = true;
    }
    if (appt.studentEmail && (!appt.studentEmail.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(appt.studentEmail))) {
      newEmail = encryptionService.reencryptWithCurrentKey(appt.studentEmail);
      changed = true;
    }

    if (changed) {
      await prisma.appointments.update({
        where: { id: appt.id },
        data: { notes: newNotes, studentNIM: newNIM, studentEmail: newEmail }
      });
      appointmentsReencrypted++;
    }
  }

  // 2. Screenings (riskIndicators)
  const screenings = await prisma.screenings.findMany();
  for (const scr of screenings) {
    if (scr.riskIndicators && (!scr.riskIndicators.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(scr.riskIndicators))) {
      const reencrypted = encryptionService.reencryptWithCurrentKey(scr.riskIndicators);
      await prisma.screenings.update({
        where: { id: scr.id },
        data: { riskIndicators: reencrypted }
      });
      screeningsReencrypted++;
    }
  }

  // 3. Emergency Contacts (name, relationship, phone, whatsapp)
  const contacts = await prisma.emergencyContacts.findMany();
  for (const c of contacts) {
    let changed = false;
    let newName = c.name;
    let newRel = c.relationship;
    let newPhone = c.phone;
    let newWa = c.whatsapp;

    if (c.name && (!c.name.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(c.name))) {
      newName = encryptionService.reencryptWithCurrentKey(c.name)!;
      changed = true;
    }
    if (c.relationship && (!c.relationship.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(c.relationship))) {
      newRel = encryptionService.reencryptWithCurrentKey(c.relationship)!;
      changed = true;
    }
    if (c.phone && (!c.phone.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(c.phone))) {
      newPhone = encryptionService.reencryptWithCurrentKey(c.phone)!;
      changed = true;
    }
    if (c.whatsapp && (!c.whatsapp.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(c.whatsapp))) {
      newWa = encryptionService.reencryptWithCurrentKey(c.whatsapp);
      changed = true;
    }

    if (changed) {
      await prisma.emergencyContacts.update({
        where: { userId: c.userId },
        data: { name: newName, relationship: newRel, phone: newPhone, whatsapp: newWa }
      });
      emergencyContactsReencrypted++;
    }
  }

  // 4. Mood Logs (notes, factors)
  const moods = await prisma.moodLogs.findMany();
  for (const m of moods) {
    let changed = false;
    let newNotes = m.notes;
    let newFactors = m.factors;

    if (m.notes && (!m.notes.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(m.notes))) {
      newNotes = encryptionService.reencryptWithCurrentKey(m.notes);
      changed = true;
    }
    if (m.factors && (!m.factors.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(m.factors))) {
      newFactors = encryptionService.reencryptWithCurrentKey(m.factors);
      changed = true;
    }

    if (changed) {
      await prisma.moodLogs.update({
        where: { id: m.id },
        data: { notes: newNotes, factors: newFactors }
      });
      moodLogsReencrypted++;
    }
  }

  // 5. Chats & Messages
  const chats = await prisma.chats.findMany();
  for (const ch of chats) {
    if (ch.title && (!ch.title.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(ch.title))) {
      const newTitle = encryptionService.reencryptWithCurrentKey(ch.title)!;
      await prisma.chats.update({
        where: { id: ch.id },
        data: { title: newTitle }
      });
      chatsReencrypted++;
    }
  }

  const messages = await prisma.chatMessages.findMany();
  for (const msg of messages) {
    if (msg.content && (!msg.content.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(msg.content))) {
      const newContent = encryptionService.reencryptWithCurrentKey(msg.content)!;
      await prisma.chatMessages.update({
        where: { id: msg.id },
        data: { content: newContent }
      });
      messagesReencrypted++;
    }
  }

  // 6. User Memories
  const memories = await prisma.userMemories.findMany();
  for (const mem of memories) {
    if (mem.content && (!mem.content.startsWith(`${currentTarget}:`) || !encryptionService.isEncrypted(mem.content))) {
      const newContent = encryptionService.reencryptWithCurrentKey(mem.content)!;
      await prisma.userMemories.update({
        where: { id: mem.id },
        data: { content: newContent }
      });
      memoriesReencrypted++;
    }
  }

  const totalReencrypted = appointmentsReencrypted + screeningsReencrypted + emergencyContactsReencrypted + moodLogsReencrypted + chatsReencrypted + messagesReencrypted + memoriesReencrypted;

  return {
    targetVersion: currentTarget,
    appointmentsReencrypted,
    screeningsReencrypted,
    emergencyContactsReencrypted,
    moodLogsReencrypted,
    chatsReencrypted,
    messagesReencrypted,
    memoriesReencrypted,
    totalReencrypted,
    timestamp: new Date().toISOString()
  };
}
