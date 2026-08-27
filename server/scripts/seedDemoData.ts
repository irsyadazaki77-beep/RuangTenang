import dotenv from 'dotenv';
dotenv.config();

import { seedInitialDataIfNeeded } from '../database.js';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Error: Demo seeding is forbidden in production environment.');
    process.exit(1);
  }

  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.error('❌ Error: SEED_DEMO_DATA environment variable must be set to "true" to seed demo data.');
    process.exit(1);
  }

  console.log('🌱 Starting explicit demo data seeding...');
  await seedInitialDataIfNeeded();
  console.log('✅ Demo data seeding completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Demo seeding failed:', err);
  process.exit(1);
});
