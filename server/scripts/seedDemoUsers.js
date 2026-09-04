// =============================================================================
// CertifyMetric — MongoDB Atlas Idempotent Demo Seeding Script
// =============================================================================
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { hashPassword } from '../auth-utils.js';
import { connectMongo } from '../db/mongodb.js';

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
import {
  User,
  Organization,
  InstrumentCategory,
  RuleSet,
  Instrument,
  Application,
  Assignment,
  Appointment,
  Verification,
  VerificationChecklistResponse,
  VerificationReading,
  Certificate,
  AuditLog
} from '../models/index.js';

export const DEMO_ACCOUNTS = [
  {
    id: 'USR_TRADER_01',
    email: 'demo.trader@certifymetric.local',
    password: 'DemoTrader@2026',
    role: 'TRADER',
    full_name: 'Demo Trader (Ramesh Sharma)',
    organization_id: 'ORG_TRADER_01',
    phone: '+91 98110 23456',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    description: 'Commercial trader who registers instruments, requests verifications, and receives digital Form 6 certificates.'
  },
  {
    id: 'USR_AUTHORITY_01',
    email: 'demo.authority@certifymetric.local',
    password: 'DemoAuthority@2026',
    role: 'AUTHORITY',
    full_name: 'Demo Authority Officer (Dr. S. K. Verma)',
    organization_id: 'ORG_GOV_DOCA',
    phone: '+91 94120 78901',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    description: 'Statutory metrology officer who evaluates verification requests, reviews workloads, and assigns verifiers/GATCs.'
  },
  {
    id: 'USR_VERIFIER_01',
    email: 'demo.verifier@certifymetric.local',
    password: 'DemoVerifier@2026',
    role: 'VERIFIER',
    full_name: 'Demo Field Verifier (Vikram Singh LMO)',
    organization_id: 'ORG_GOV_DOCA',
    phone: '+91 98230 45678',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    description: 'Field inspection officer who conducts physical testing in the workspace, takes error readings, records evidence, and issues certificates.'
  },
  {
    id: 'USR_GATC_01',
    email: 'demo.gatc@certifymetric.local',
    password: 'DemoGatc@2026',
    role: 'GATC',
    full_name: 'Demo GATC Testing Lab (MetroLab)',
    organization_id: 'ORG_GATC_01',
    phone: '+91 99340 11223',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    description: 'Government Approved Test Centre that performs laboratory verification for complex instruments.'
  },
  {
    id: 'USR_ADMIN_01',
    email: 'demo.admin@certifymetric.local',
    password: 'DemoAdmin@2026',
    role: 'PLATFORM_ADMIN',
    full_name: 'Demo Platform Admin (Rajesh Nair)',
    organization_id: 'ORG_GOV_DOCA',
    phone: '+91 98990 00112',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    description: 'System administrator with oversight across audit trails, category definitions, and platform health.'
  }
];

export async function seedDemoUsers() {
  const now = new Date().toISOString();

  // 1. Seed Organizations
  const orgs = [
    {
      id: 'ORG_TRADER_01',
      name: 'Apex Retail Traders Pvt Ltd',
      type: 'TRADER_ORG',
      jurisdiction: 'Central District, Delhi',
      created_at: now
    },
    {
      id: 'ORG_GOV_DOCA',
      name: 'Department of Consumer Affairs - Legal Metrology Division',
      type: 'STATUTORY_AUTHORITY',
      jurisdiction: 'National Capital Territory of Delhi',
      created_at: now
    },
    {
      id: 'ORG_GATC_01',
      name: 'National Metrology Testing Centre (GATC Lab 04)',
      type: 'TEST_CENTRE',
      jurisdiction: 'Northern Region',
      created_at: now
    }
  ];

  for (const org of orgs) {
    await Organization.findOneAndUpdate(
      { id: org.id },
      { $set: org },
      { upsert: true, new: true }
    );
  }

  // 2. Seed Users
  for (const acc of DEMO_ACCOUNTS) {
    const password_hash = hashPassword(acc.password);
    await User.findOneAndUpdate(
      { email: acc.email.toLowerCase() },
      {
        $set: {
          id: acc.id,
          email: acc.email.toLowerCase(),
          password_hash,
          role: acc.role,
          full_name: acc.full_name,
          organization_id: acc.organization_id,
          phone: acc.phone,
          avatar: acc.avatar,
          is_demo: 1,
          active: true,
          updated_at: now
        },
        $setOnInsert: { created_at: now }
      },
      { upsert: true, new: true }
    );
  }

  console.log('✔ Successfully seeded demo accounts with scrypt hashed passwords in MongoDB.');
}

export async function seedDemoData() {
  const now = new Date().toISOString();
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Categories
  const category = {
    id: 'CAT_NAWI_III',
    code: 'NAWI_CLASS_III',
    name: 'Non-Automatic Weighing Instruments (Class III)',
    description: 'Commercial counter scales, platform scales, and retail computing scales up to 150 kg.',
    active: 1
  };
  await InstrumentCategory.findOneAndUpdate({ id: category.id }, { $set: category }, { upsert: true });

  // 2. Rule Sets
  const ruleSet = {
    id: 'RULE_NAWI_III_2011',
    category_id: 'CAT_NAWI_III',
    name: 'Legal Metrology General Rules 2011 Schedule IX',
    validity_period_months: 12,
    mpe_rules: [
      { max_e: 500, initial_mpe_e: 0.5, subsequent_mpe_e: 1.0 },
      { max_e: 2000, initial_mpe_e: 1.0, subsequent_mpe_e: 2.0 },
      { max_e: 10000, initial_mpe_e: 1.5, subsequent_mpe_e: 3.0 }
    ],
    checklist_schema: [
      { id: 'CHK_01', text: 'Platter, frame, and housing are free from cracks or intentional tampering.', mandatory: true },
      { id: 'CHK_02', text: 'Model approval number and Class III mark are clearly legible on stamping plate.', mandatory: true },
      { id: 'CHK_03', text: 'Level indicator bubble is precisely centered in inner reference circle.', mandatory: true },
      { id: 'CHK_04', text: 'Lead/wire calibration seal is intact with valid previous stamp.', mandatory: true },
      { id: 'CHK_05', text: 'Operating environment is stable, draft-free, and within statutory temperature range.', mandatory: true }
    ]
  };
  await RuleSet.findOneAndUpdate({ id: ruleSet.id }, { $set: ruleSet }, { upsert: true });

  // 3. Instruments
  const instruments = [
    {
      id: 'INST_001',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Precision Weigher India',
      model: 'PW-3000 Eco',
      serial_number: 'SN-2026-9941',
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      location: 'Counter 1, Main Grocery Section, Connaught Place, New Delhi',
      status: 'UNDER_VERIFICATION',
      created_at: now
    },
    {
      id: 'INST_002',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Avery Weigh-Tronix',
      model: 'ZK830 High Precision',
      serial_number: 'SN-CERT-PASS-8801',
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      location: 'Depot 4, Okhla Phase III, New Delhi',
      status: 'VERIFIED',
      created_at: now
    },
    {
      id: 'INST_003',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Mettler Toledo',
      model: 'b-Plus Dual Range',
      serial_number: 'SN-S4-QR-9902',
      max_capacity: '15 kg',
      min_capacity: '40 g',
      verification_scale_interval_e: '2 g',
      location: 'Store 18, Terminal 3, IGI Airport, New Delhi',
      status: 'VERIFIED',
      created_at: now
    },
    {
      id: 'INST_004',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Essae Teraoka',
      model: 'DS-215 Bench Scale',
      serial_number: 'SN-EXP-2026-4410',
      max_capacity: '20 kg',
      min_capacity: '50 g',
      verification_scale_interval_e: '2 g',
      location: 'Billing Counter 3, South Extension Part II, New Delhi',
      status: 'EXPIRING',
      created_at: now
    },
    {
      id: 'INST_005',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'CAS Corporation',
      model: 'SW-1 Plus Digital',
      serial_number: 'SN-CAS-2026-1024',
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      location: 'Fruit Market Stall 12, Azadpur Mandi, Delhi',
      status: 'REGISTERED',
      created_at: now
    }
  ];

  for (const inst of instruments) {
    await Instrument.findOneAndUpdate({ id: inst.id }, { $set: inst }, { upsert: true });
  }

  // 4. Applications
  const applications = [
    {
      id: 'APP_DEMO_01',
      application_no: 'APP-2026-2641',
      instrument_id: 'INST_001',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      status: 'IN_PROGRESS',
      documents: [],
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_02',
      application_no: 'APP-2026-8506',
      instrument_id: 'INST_002',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      status: 'VERIFICATION_COMPLETED',
      documents: [],
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_03',
      application_no: 'APP-2026-1311',
      instrument_id: 'INST_003',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      status: 'VERIFICATION_COMPLETED',
      documents: [],
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_04',
      application_no: 'APP-2026-9022',
      instrument_id: 'INST_004',
      trader_id: 'USR_TRADER_01',
      request_type: 'RE_VERIFICATION',
      status: 'SUBMITTED',
      documents: [],
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_05',
      application_no: 'APP-2026-3398',
      instrument_id: 'INST_005',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      status: 'ASSIGNED',
      documents: [],
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    }
  ];

  for (const app of applications) {
    await Application.findOneAndUpdate({ id: app.id }, { $set: app }, { upsert: true });
  }

  // 5. Assignments & Appointments
  const assignments = [
    {
      id: 'ASN_DEMO_01',
      application_id: 'APP_DEMO_01',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_01',
      recommended_id: 'USR_VERIFIER_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    {
      id: 'ASN_DEMO_02',
      application_id: 'APP_DEMO_02',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_01',
      recommended_id: 'USR_VERIFIER_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    {
      id: 'ASN_DEMO_03',
      application_id: 'APP_DEMO_03',
      assigned_type: 'GATC',
      assigned_id: 'USR_GATC_01',
      recommended_id: 'USR_GATC_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    {
      id: 'ASN_DEMO_05',
      application_id: 'APP_DEMO_05',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_01',
      recommended_id: 'USR_VERIFIER_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    }
  ];

  for (const asn of assignments) {
    await Assignment.findOneAndUpdate({ id: asn.id }, { $set: asn }, { upsert: true });
  }

  const appointments = [
    {
      id: 'APT_DEMO_01',
      assignment_id: 'ASN_DEMO_01',
      scheduled_date: '2026-09-05',
      time_slot: '10:00 AM - 01:00 PM',
      arrangement_type: 'FIELD_VISIT',
      status: 'SCHEDULED',
      created_at: now
    },
    {
      id: 'APT_DEMO_02',
      assignment_id: 'ASN_DEMO_02',
      scheduled_date: '2026-09-02',
      time_slot: '02:00 PM - 05:00 PM',
      arrangement_type: 'FIELD_VISIT',
      status: 'COMPLETED',
      created_at: now
    },
    {
      id: 'APT_DEMO_03',
      assignment_id: 'ASN_DEMO_03',
      scheduled_date: '2026-09-03',
      time_slot: '11:00 AM - 02:00 PM',
      arrangement_type: 'LAB_DISPATCH',
      status: 'COMPLETED',
      created_at: now
    },
    {
      id: 'APT_DEMO_05',
      assignment_id: 'ASN_DEMO_05',
      scheduled_date: '2026-09-10',
      time_slot: '09:00 AM - 12:00 PM',
      arrangement_type: 'FIELD_VISIT',
      status: 'SCHEDULED',
      created_at: now
    }
  ];

  for (const apt of appointments) {
    await Appointment.findOneAndUpdate({ id: apt.id }, { $set: apt }, { upsert: true });
  }

  // 6. Verifications
  const verifications = [
    {
      id: 'VERIF_DEMO_01',
      application_id: 'APP_DEMO_01',
      appointment_id: 'APT_DEMO_01',
      verifier_id: 'USR_VERIFIER_01',
      status: 'IN_PROGRESS',
      result: null,
      remarks: 'Physical inspection initiated. Scale level checked and verified.',
      started_at: now,
      created_at: now,
      updated_at: now
    },
    {
      id: 'VERIF_DEMO_02',
      application_id: 'APP_DEMO_02',
      appointment_id: 'APT_DEMO_02',
      verifier_id: 'USR_VERIFIER_01',
      status: 'COMPLETED',
      result: 'PASS',
      remarks: 'Full verification completed. Errors well within MPE limits prescribed in Schedule IX.',
      started_at: now,
      completed_at: now,
      created_at: now,
      updated_at: now
    },
    {
      id: 'VERIF_DEMO_03',
      application_id: 'APP_DEMO_03',
      appointment_id: 'APT_DEMO_03',
      verifier_id: 'USR_GATC_01',
      status: 'COMPLETED',
      result: 'PASS',
      remarks: 'High-precision dual range calibration verified under controlled laboratory test conditions.',
      started_at: now,
      completed_at: now,
      created_at: now,
      updated_at: now
    }
  ];

  for (const v of verifications) {
    await Verification.findOneAndUpdate({ id: v.id }, { $set: v }, { upsert: true });
  }

  // 7. Checklist responses
  const checklistResponses = [
    { id: 'CHK_RES_01_1', verification_id: 'VERIF_DEMO_01', item_id: 'CHK_01', status: 'PASS', note: 'Visual inspection clear.' },
    { id: 'CHK_RES_01_2', verification_id: 'VERIF_DEMO_01', item_id: 'CHK_02', status: 'PASS', note: 'Markings verified.' },
    { id: 'CHK_RES_02_1', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_01', status: 'PASS', note: 'Compliant.' },
    { id: 'CHK_RES_02_2', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_02', status: 'PASS', note: 'Stamp plate verified.' },
    { id: 'CHK_RES_02_3', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_03', status: 'PASS', note: 'Level bubble centered.' },
    { id: 'CHK_RES_02_4', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_04', status: 'PASS', note: 'Seal intact.' },
    { id: 'CHK_RES_02_5', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_05', status: 'PASS', note: 'Temperature 23C.' },
    { id: 'CHK_RES_03_1', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_01', status: 'PASS', note: 'Laboratory housing verified.' },
    { id: 'CHK_RES_03_2', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_02', status: 'PASS', note: 'Model plate authenticated.' },
    { id: 'CHK_RES_03_3', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_03', status: 'PASS', note: 'Precision bubble aligned.' },
    { id: 'CHK_RES_03_4', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_04', status: 'PASS', note: 'Laboratory audit wire sealed.' },
    { id: 'CHK_RES_03_5', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_05', status: 'PASS', note: 'Lab conditions controlled.' }
  ];

  for (const c of checklistResponses) {
    await VerificationChecklistResponse.findOneAndUpdate(
      { verification_id: c.verification_id, item_id: c.item_id },
      { $set: { ...c, updated_at: now } },
      { upsert: true }
    );
  }

  // 8. Verification Readings
  const readings = [
    { id: 'RDG_DEMO_01_1', verification_id: 'VERIF_DEMO_01', test_point: 'Initial Test Load', reference_value: 5.0, observed_value: 5.0, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_02_1', verification_id: 'VERIF_DEMO_02', test_point: 'Minimum Load (100g)', reference_value: 0.1, observed_value: 0.1, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_02_2', verification_id: 'VERIF_DEMO_02', test_point: 'Half Capacity (15kg)', reference_value: 15.0, observed_value: 15.001, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_02_3', verification_id: 'VERIF_DEMO_02', test_point: 'Maximum Capacity (30kg)', reference_value: 30.0, observed_value: 30.002, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_03_1', verification_id: 'VERIF_DEMO_03', test_point: 'Minimum Load (40g)', reference_value: 0.04, observed_value: 0.04, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_03_2', verification_id: 'VERIF_DEMO_03', test_point: 'Half Capacity (7.5kg)', reference_value: 7.5, observed_value: 7.5, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_03_3', verification_id: 'VERIF_DEMO_03', test_point: 'Maximum Capacity (15kg)', reference_value: 15.0, observed_value: 15.001, unit: 'kg', reading_result: 'PASS' }
  ];

  for (const r of readings) {
    await VerificationReading.findOneAndUpdate(
      { id: r.id },
      { $set: { ...r, updated_at: now } },
      { upsert: true }
    );
  }

  // 9. Certificates (Form 6)
  const certificates = [
    {
      id: 'CERT_DEMO_01',
      certificate_no: 'LM-2026-54715-DL',
      verification_id: 'VERIF_DEMO_02',
      instrument_id: 'INST_002',
      public_token: '8a94dd11-9af0-41d5-a986-cbf70bffdecf',
      issue_date: now,
      valid_until: validUntil,
      status: 'VALID',
      issuing_officer: 'Vikram Singh (LMO)',
      issuing_authority: 'Department of Consumer Affairs - Legal Metrology Division',
      created_at: now
    },
    {
      id: 'CERT_DEMO_02',
      certificate_no: 'LM-2026-74750-DL',
      verification_id: 'VERIF_DEMO_03',
      instrument_id: 'INST_003',
      public_token: '15fcaf47-2be8-463a-bb34-97781d333771',
      issue_date: now,
      valid_until: validUntil,
      status: 'VALID',
      issuing_officer: 'Vikram Singh (LMO)',
      issuing_authority: 'Department of Consumer Affairs - Legal Metrology Division',
      created_at: now
    }
  ];

  for (const cert of certificates) {
    await Certificate.findOneAndUpdate({ id: cert.id }, { $set: cert }, { upsert: true });
  }

  // 10. Audit Logs
  const logs = [
    {
      id: 'LOG_DEMO_01',
      entity_name: 'Certificate',
      entity_id: 'CERT_DEMO_01',
      action: 'CERTIFICATE_GENERATED',
      actor_id: 'USR_VERIFIER_01',
      actor_role: 'VERIFIER',
      details: { certificate_no: 'LM-2026-54715-DL', instrument_id: 'INST_002' },
      created_at: now
    },
    {
      id: 'LOG_DEMO_02',
      entity_name: 'Certificate',
      entity_id: 'CERT_DEMO_02',
      action: 'CERTIFICATE_GENERATED',
      actor_id: 'USR_GATC_01',
      actor_role: 'GATC',
      details: { certificate_no: 'LM-2026-74750-DL', instrument_id: 'INST_003' },
      created_at: now
    },
    {
      id: 'LOG_DEMO_03',
      entity_name: 'Application',
      entity_id: 'APP_DEMO_01',
      action: 'ASSIGNMENT_CREATED',
      actor_id: 'USR_AUTHORITY_01',
      actor_role: 'AUTHORITY',
      details: { application_id: 'APP_DEMO_01', assigned_to: 'USR_VERIFIER_01' },
      created_at: now
    },
    {
      id: 'LOG_DEMO_04',
      entity_name: 'Instrument',
      entity_id: 'INST_001',
      action: 'REGISTER',
      actor_id: 'USR_TRADER_01',
      actor_role: 'TRADER',
      details: { serial_number: 'SN-2026-9941', model: 'PW-3000 Eco' },
      created_at: now
    }
  ];

  for (const log of logs) {
    await AuditLog.findOneAndUpdate({ id: log.id }, { $set: log }, { upsert: true });
  }

  console.log('✔ Successfully seeded demo business data (instruments, applications, verifications, certificates) in MongoDB.');
}

export async function seedAllDemoData() {
  await seedDemoUsers();
  await seedDemoData();
}

// Standalone execution: node server/scripts/seedDemoUsers.js
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('seedDemoUsers.js'))) {
  connectMongo()
    .then(() => seedAllDemoData())
    .then(() => {
      console.log('✔ Seeding complete.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Seeding failed:', err.message);
      process.exit(1);
    });
}
