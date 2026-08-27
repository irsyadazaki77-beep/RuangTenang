import { PrismaClient } from '@prisma/client';
import { encryptionService } from '../services/encryptionService.js';

const prisma = new PrismaClient();

async function isEncrypted(text: string | null): Promise<boolean> {
  if (!text) return true; // null/empty is implicitly "safe"
  return text.startsWith('v1:');
}

async function migrateData() {
  console.log('Starting encryption migration...');

  try {
    // 1. Chats
    console.log('Migrating Chats...');
    const chats = await prisma.chats.findMany();
    let chatUpdates = 0;
    for (const chat of chats) {
      if (!(await isEncrypted(chat.title))) {
        const encryptedTitle = encryptionService.encryptSensitive(chat.title) || chat.title;
        await prisma.chats.update({
          where: { id: chat.id },
          data: { title: encryptedTitle }
        });
        chatUpdates++;
      }
    }
    console.log(`Migrated ${chatUpdates} Chats.`);

    // 2. ChatMessages
    console.log('Migrating ChatMessages...');
    const chatMessages = await prisma.chatMessages.findMany();
    let msgUpdates = 0;
    for (const msg of chatMessages) {
      if (!(await isEncrypted(msg.content))) {
        const encryptedContent = encryptionService.encryptSensitive(msg.content) || msg.content;
        await prisma.chatMessages.update({
          where: { id: msg.id },
          data: { content: encryptedContent }
        });
        msgUpdates++;
      }
    }
    console.log(`Migrated ${msgUpdates} ChatMessages.`);

    // 3. UserMemories
    console.log('Migrating UserMemories...');
    const memories = await prisma.userMemories.findMany();
    let memUpdates = 0;
    for (const mem of memories) {
      if (!(await isEncrypted(mem.content))) {
        const encryptedContent = encryptionService.encryptSensitive(mem.content) || mem.content;
        await prisma.userMemories.update({
          where: { id: mem.id },
          data: { content: encryptedContent }
        });
        memUpdates++;
      }
    }
    console.log(`Migrated ${memUpdates} UserMemories.`);

    // 4. MoodLogs
    console.log('Migrating MoodLogs...');
    const moodLogs = await prisma.moodLogs.findMany();
    let moodUpdates = 0;
    for (const log of moodLogs) {
      let needsUpdate = false;
      const dataToUpdate: any = {};

      if (log.notes && !(await isEncrypted(log.notes))) {
        dataToUpdate.notes = encryptionService.encryptSensitive(log.notes) || log.notes;
        needsUpdate = true;
      }

      // If we wanted to encrypt factors (JSON string), we could, but we only did notes in userData.ts.
      
      if (needsUpdate) {
        await prisma.moodLogs.update({
          where: { id: log.id },
          data: dataToUpdate
        });
        moodUpdates++;
      }
    }
    console.log(`Migrated ${moodUpdates} MoodLogs.`);

    // 5. EmergencyContacts
    console.log('Migrating EmergencyContacts...');
    const contacts = await prisma.emergencyContacts.findMany();
    let contactUpdates = 0;
    for (const contact of contacts) {
      let needsUpdate = false;
      const dataToUpdate: any = {};

      if (!(await isEncrypted(contact.name))) {
        dataToUpdate.name = encryptionService.encryptSensitive(contact.name) || contact.name;
        needsUpdate = true;
      }
      if (!(await isEncrypted(contact.relationship))) {
        dataToUpdate.relationship = encryptionService.encryptSensitive(contact.relationship) || contact.relationship;
        needsUpdate = true;
      }
      if (!(await isEncrypted(contact.phone))) {
        dataToUpdate.phone = encryptionService.encryptSensitive(contact.phone) || contact.phone;
        needsUpdate = true;
      }
      if (contact.whatsapp && !(await isEncrypted(contact.whatsapp))) {
        dataToUpdate.whatsapp = encryptionService.encryptSensitive(contact.whatsapp) || contact.whatsapp;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await prisma.emergencyContacts.update({
          where: { userId: contact.userId },
          data: dataToUpdate
        });
        contactUpdates++;
      }
    }
    console.log(`Migrated ${contactUpdates} EmergencyContacts.`);

    console.log('Encryption migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();