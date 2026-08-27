import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { prisma, serverDb } from '../database.js';

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const name = process.env.ADMIN_BOOTSTRAP_NAME || 'System Administrator';

  if (!email || !password) {
    console.error('❌ Error: ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD environment variables are required.');
    console.error('Usage: ADMIN_BOOTSTRAP_EMAIL=admin@domain.com ADMIN_BOOTSTRAP_PASSWORD=StrongSecretPassword123! npm run admin:bootstrap');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('❌ Error: ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters long.');
    process.exit(1);
  }

  const existing = await prisma.users.findUnique({
    where: { email: email.toLowerCase().trim() }
  });

  if (existing) {
    console.log(`ℹ️ Admin user ${email} already exists.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = 'usr-admin-' + Date.now();

  const adminUser = await prisma.users.create({
    data: {
      id,
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'admin',
      tier: 'Pro',
      university: 'Perguruan Tinggi Indonesia',
      emailVerified: true,
      mfaEnabled: true,
      activeSessions: '[]',
      loginHistory: '[]',
      securityNotifications: '[]'
    }
  });

  await serverDb.logAudit(
    'ADMIN_BOOTSTRAPPED',
    `Admin account ${email} created via explicit server-side bootstrap script.`,
    'system'
  );

  console.log(`✅ Admin account successfully provisioned: ${adminUser.email} (ID: ${adminUser.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Admin bootstrap failed:', err);
  process.exit(1);
});
