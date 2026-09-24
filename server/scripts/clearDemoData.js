import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { connectMongo } from '../db/mongodb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
for (const envFile of ['.env.local', '.env', 'server/.env.local', 'server/.env', 'server/.env.render']) {
  const fullPath = path.resolve(rootDir, envFile);
  try {
    if (fs.existsSync(fullPath) && typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(fullPath);
    }
  } catch (e) {}
}
import {
  Instrument,
  Application,
  Assignment,
  Appointment,
  Verification,
  VerificationChecklistResponse,
  VerificationReading,
  VerificationEvidence,
  Certificate,
  Notification,
  AuditLog,
  User,
  Organization
} from '../models/index.js';

export async function clearDemoData() {
  console.log('🔄 Connecting to MongoDB to clear demo user business data...');
  await connectMongo();

  const counts = {
    instruments: await Instrument.countDocuments(),
    applications: await Application.countDocuments(),
    assignments: await Assignment.countDocuments(),
    appointments: await Appointment.countDocuments(),
    verifications: await Verification.countDocuments(),
    checklistResponses: await VerificationChecklistResponse.countDocuments(),
    readings: await VerificationReading.countDocuments(),
    evidence: await VerificationEvidence.countDocuments(),
    certificates: await Certificate.countDocuments(),
    notifications: await Notification.countDocuments(),
    auditLogs: await AuditLog.countDocuments()
  };

  console.log('Found records to remove:', counts);

  await Promise.all([
    Instrument.deleteMany({}),
    Application.deleteMany({}),
    Assignment.deleteMany({}),
    Appointment.deleteMany({}),
    Verification.deleteMany({}),
    VerificationChecklistResponse.deleteMany({}),
    VerificationReading.deleteMany({}),
    VerificationEvidence.deleteMany({}),
    Certificate.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  const preservedUsers = await User.countDocuments();
  const preservedOrgs = await Organization.countDocuments();

  console.log('✔ Successfully cleared all demo user business data.');
  console.log(`✔ Preserved ${preservedUsers} user accounts and ${preservedOrgs} organizations.`);
}

if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('clearDemoData.js'))) {
  clearDemoData()
    .then(() => {
      console.log('✔ Cleanup complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Cleanup failed:', err);
      process.exit(1);
    });
}
