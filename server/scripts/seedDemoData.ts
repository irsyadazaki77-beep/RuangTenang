import dotenv from 'dotenv';
dotenv.config();

import { seedInitialDataIfNeeded } from '../database.js';
import { isProductionLikeEnvironment } from '../config/environment.js';

async function main() {
  if (isProductionLikeEnvironment()) {
    console.error('❌ Error: Demo seeding is forbidden outside development/test environments.');
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
