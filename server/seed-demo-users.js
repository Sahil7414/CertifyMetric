// =============================================================================
// CertifyMetric — Demo Seeding Entry Point (Delegates to MongoDB Seeder)
// =============================================================================
export * from './scripts/seedDemoUsers.js';
import { seedAllDemoData } from './scripts/seedDemoUsers.js';
import { connectMongo } from './db/mongodb.js';
import { fileURLToPath } from 'node:url';

if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('seed-demo-users.js'))) {
  connectMongo()
    .then(() => seedAllDemoData())
    .then(() => {
      console.log('✔ Demo seeding finished successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Demo seeding failed:', err.message);
      process.exit(1);
    });
}
