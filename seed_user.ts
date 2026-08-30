import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'zakiirsyad554@gmail.com';
  const passwordHash = await bcrypt.hash('password123', 10);
  
  await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      name: 'Zaki Irsyad',
      email: email,
      passwordHash: passwordHash,
      role: 'student',
      tier: 'pro'
    }
  });
  console.log('User created successfully');
}

main().catch(console.error).finally(() => prisma.$disconnect());
