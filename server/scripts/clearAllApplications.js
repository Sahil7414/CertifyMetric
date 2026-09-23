// =============================================================================
// CertifyMetric — Script to remove all applications and related test data
// =============================================================================
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connectMongo } from '../db/mongodb.js';
import {
  Application,
  Assignment,
  Appointment,
  Verification,
  VerificationChecklistResponse,
  VerificationReading,
  VerificationEvidence,
  Certificate,
  GeoVisit,
  Instrument
} from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

for (const envFile of ['.env.local', '.env', 'server/.env.local', 'server/.env']) {
  const fullPath = path.resolve(rootDir, envFile);
  try {
    if (fs.existsSync(fullPath) && typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(fullPath);
    }
  } catch (e) {}
}

async function clearApplications() {
  await connectMongo();
  console.log('Clearing all applications and associated verification records from MongoDB...');

  const appResult = await Application.deleteMany({});
  console.log(`- Deleted ${appResult.deletedCount} Application records.`);

  const asnResult = await Assignment.deleteMany({});
  console.log(`- Deleted ${asnResult.deletedCount} Assignment records.`);

  const aptResult = await Appointment.deleteMany({});
  console.log(`- Deleted ${aptResult.deletedCount} Appointment records.`);

  const verifResult = await Verification.deleteMany({});
  console.log(`- Deleted ${verifResult.deletedCount} Verification records.`);

  const chkResult = await VerificationChecklistResponse.deleteMany({});
  console.log(`- Deleted ${chkResult.deletedCount} VerificationChecklistResponse records.`);

  const readResult = await VerificationReading.deleteMany({});
  console.log(`- Deleted ${readResult.deletedCount} VerificationReading records.`);

  const evResult = await VerificationEvidence.deleteMany({});
  console.log(`- Deleted ${evResult.deletedCount} VerificationEvidence records.`);

  const certResult = await Certificate.deleteMany({});
  console.log(`- Deleted ${certResult.deletedCount} Certificate records.`);

  const gvResult = await GeoVisit.deleteMany({});
  console.log(`- Deleted ${gvResult.deletedCount} GeoVisit records.`);

  const instResult = await Instrument.updateMany({}, { $set: { status: 'REGISTERED' } });
  console.log(`- Reset ${instResult.modifiedCount} Instruments to 'REGISTERED' status.`);

  console.log('\n✔ All applications removed! The database is now ready for testing from 0 applications.');
  process.exit(0);
}

clearApplications().catch((err) => {
  console.error('❌ Failed to clear applications:', err);
  process.exit(1);
});
