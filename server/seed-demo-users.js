import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth-utils.js';
import { db, isPostgres } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.join(__dirname, '..');

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
    phone: '+91 99990 00001',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    description: 'System administrator who audits platform events, reviews operational logs, and monitors compliance.'
  }
];

export async function seedDemoUsers() {
  // 1. Ensure required schema columns and tables exist (SQLite only)
  if (!isPostgres) {
    try {
      const userCols = (await db.prepare("PRAGMA table_info(users)").all()).map(c => c.name);
      if (!userCols.includes('password_hash')) await db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
      if (!userCols.includes('is_demo')) await db.exec("ALTER TABLE users ADD COLUMN is_demo INTEGER DEFAULT 0");

      await db.exec(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT,
          role TEXT,
          created_at TEXT,
          expires_at TEXT
        );
      `);
    } catch (err) {
      console.error('Schema update error:', err);
    }
  }

  // 2. Ensure baseline and demo organizations exist for foreign keys
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO organizations (id, name, type, jurisdiction, created_at)
    VALUES 
      ('ORG_GOV_DOCA', 'Department of Consumer Affairs - Legal Metrology Division', 'GOV_DIRECTORATE', 'National Capital Territory', ?),
      ('ORG_TRADER_01', 'Apex Retail Traders Pvt Ltd', 'TRADER_ORG', 'Central District, Delhi', ?),
      ('ORG_GATC_01', 'National Metrology Testing Centre (GATC Lab 04)', 'TEST_CENTRE', 'Northern Region', ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now, now, now);

  // 3. Upsert each demo account with hashed password
  for (const acc of DEMO_ACCOUNTS) {
    const hashed = hashPassword(acc.password);

    const existing = await db.prepare('SELECT id FROM users WHERE id = ? OR LOWER(email) = LOWER(?)').get(acc.id, acc.email);

    if (existing) {
      await db.prepare(`
        UPDATE users 
        SET email = ?, password_hash = ?, full_name = ?, role = ?, organization_id = ?, phone = ?, avatar = ?, is_demo = 1
        WHERE id = ?
      `).run(acc.email, hashed, acc.full_name, acc.role, acc.organization_id, acc.phone, acc.avatar, existing.id);
    } else {
      await db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, organization_id, phone, avatar, is_demo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(acc.id, acc.email, hashed, acc.full_name, acc.role, acc.organization_id, acc.phone, acc.avatar, now);
    }
  }

  // 4. Generate DEMO_CREDENTIALS.md in project root for local development reference
  const credsMarkdown = `# Local Development Demo Credentials

> [!NOTE]
> These credentials are generated by the local seed script (\`node server/seed-demo-users.js\`).
> Passwords are encrypted in the database using Node.js \`scrypt\` algorithm.
> These demo accounts are strictly for development and MVP evaluation.

## Demo Accounts Table

| Role | Email | Password | Full Name | Associated Dashboard |
| :--- | :--- | :--- | :--- | :--- |
| **Trader** | \`demo.trader@certifymetric.local\` | \`DemoTrader@2026\` | Demo Trader (Ramesh Sharma) | **Trader Dashboard** (\`/\`) |
| **Authority** | \`demo.authority@certifymetric.local\` | \`DemoAuthority@2026\` | Demo Authority Officer (Dr. S. K. Verma) | **Operations Dashboard** (\`/authority\`) |
| **Verifier** | \`demo.verifier@certifymetric.local\` | \`DemoVerifier@2026\` | Demo Field Verifier (Vikram Singh LMO) | **Verifier Workspace & Cases** (\`/cases\`) |
| **GATC** | \`demo.gatc@certifymetric.local\` | \`DemoGatc@2026\` | Demo GATC Testing Lab (MetroLab) | **GATC Inspection Cases** (\`/cases\`) |
| **Platform Admin** | \`demo.admin@certifymetric.local\` | \`DemoAdmin@2026\` | Demo Platform Admin (Rajesh Nair) | **Operations & Audit Ledger** (\`/audit-logs\`) |

---

## How to Switch Accounts During Development

1. Click **Sign Out** in the top-right user profile header in the app.
2. Enter the email and password for any role above on the **Sign In** screen.
3. Upon authentication, the system securely determines the dashboard and permissions based **strictly on the user's role in the database**.
`;

  if (process.env.NODE_ENV !== 'production') {
    try {
      fs.writeFileSync(path.join(workspaceRoot, 'DEMO_CREDENTIALS.md'), credsMarkdown, 'utf-8');
    } catch (err) {
      console.error('Failed to write DEMO_CREDENTIALS.md:', err);
    }
  }

  console.log('✔ Successfully seeded demo accounts with scrypt hashed passwords.');
}

export async function seedDemoData() {
  const now = new Date().toISOString();
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  // Ensure category and ruleset exist
  await db.prepare(`
    INSERT INTO instrument_categories (id, code, name, description, active)
    VALUES (
      'CAT_NAWI_III', 
      'NAWI_CLASS_III', 
      'Commercial Non-Automatic Weighing Instrument (Class III)', 
      'Counter scale, retail computing balance, digital platform scale up to 30kg used in retail trade',
      1
    )
    ON CONFLICT (id) DO NOTHING
  `).run();

  const checklistSchema = JSON.stringify([
    { id: 'CHK_01', title: 'Physical Condition & Body Integrity', description: 'Inspect casing, platter, and display for physical damage, cracks, or unauthorized alterations.', required: true },
    { id: 'CHK_02', title: 'Stamping & Nameplate Legibility', description: 'Verify manufacturer name, model, serial number, and class designation are clearly stamped.', required: true },
    { id: 'CHK_03', title: 'Level Indicator & Zero Setting', description: 'Confirm zero indication returns within ±0.25e and bubble level is properly centered on the counter.', required: true },
    { id: 'CHK_04', title: 'Lead/Wire Tamper-Evident Seals', description: 'Check that calibration adjustment port seals and wire lead seals are intact.', required: true },
    { id: 'CHK_05', title: 'Environmental Suitability', description: 'Verify the weighing instrument is placed away from heavy drafts, vibration, or direct thermal interference.', required: false }
  ]);

  const mpeRules = JSON.stringify({
    step1: { min_e: 0, max_e: 500, mpe_e: 0.5 },
    step2: { min_e: 501, max_e: 2000, mpe_e: 1.0 },
    step3: { min_e: 2001, max_e: 10000, mpe_e: 1.5 }
  });

  await db.prepare(`
    INSERT INTO rule_sets (id, category_id, name, validity_period_months, mpe_rules_json, checklist_schema_json)
    VALUES ('RULE_NAWI_DEFAULT', 'CAT_NAWI_III', 'Legal Metrology Standard (General Rules 2011 - NAWI Class III)', 12, ?, ?)
    ON CONFLICT (id) DO NOTHING
  `).run(mpeRules, checklistSchema);

  // 1. Seed Demo Instruments (for Demo Trader USR_TRADER_01)
  await db.prepare(`
    INSERT INTO instruments (id, owner_id, category_id, manufacturer, model, serial_number, max_capacity, min_capacity, verification_scale_interval_e, location, status, created_at)
    VALUES 
      ('INST_001', 'USR_TRADER_01', 'CAT_NAWI_III', 'Precision Weigher India', 'PW-3000 Eco', 'SN-2026-9941', '30 kg', '100 g', '5 g', 'Counter 1, Main Grocery Section, Connaught Place, New Delhi', 'UNDER_VERIFICATION', ?),
      ('INST_002', 'USR_TRADER_01', 'CAT_NAWI_III', 'Avery Weigh-Tronix', 'ZK830 High Precision', 'SN-CERT-PASS-8801', '30 kg', '100 g', '5 g', 'Depot 4, Okhla Phase III, New Delhi', 'VERIFIED', ?),
      ('INST_003', 'USR_TRADER_01', 'CAT_NAWI_III', 'Mettler Toledo', 'b-Plus Dual Range', 'SN-S4-QR-9902', '15 kg', '40 g', '2 g', 'Store 18, Terminal 3, IGI Airport, New Delhi', 'VERIFIED', ?),
      ('INST_004', 'USR_TRADER_01', 'CAT_NAWI_III', 'Essae Teraoka', 'DS-215 Bench Scale', 'SN-EXP-2026-4410', '20 kg', '50 g', '2 g', 'Billing Counter 3, South Extension Part II, New Delhi', 'EXPIRING', ?),
      ('INST_005', 'USR_TRADER_01', 'CAT_NAWI_III', 'CAS Corporation', 'SW-1 Plus Digital', 'SN-CAS-2026-1024', '30 kg', '100 g', '5 g', 'Fruit Market Stall 12, Azadpur Mandi, Delhi', 'REGISTERED', ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now, now, now, now, now);

  // 2. Seed Demo Applications
  await db.prepare(`
    INSERT INTO applications (id, application_no, instrument_id, trader_id, request_type, status, documents_json, fee_status, created_at, updated_at)
    VALUES 
      ('APP_DEMO_01', 'APP-2026-2641', 'INST_001', 'USR_TRADER_01', 'INITIAL_VERIFICATION', 'IN_PROGRESS', '[]', 'PAID', ?, ?),
      ('APP_DEMO_02', 'APP-2026-8506', 'INST_002', 'USR_TRADER_01', 'INITIAL_VERIFICATION', 'VERIFICATION_COMPLETED', '[]', 'PAID', ?, ?),
      ('APP_DEMO_03', 'APP-2026-1311', 'INST_003', 'USR_TRADER_01', 'INITIAL_VERIFICATION', 'VERIFICATION_COMPLETED', '[]', 'PAID', ?, ?),
      ('APP_DEMO_04', 'APP-2026-9022', 'INST_004', 'USR_TRADER_01', 'RE_VERIFICATION', 'SUBMITTED', '[]', 'PAID', ?, ?),
      ('APP_DEMO_05', 'APP-2026-3398', 'INST_005', 'USR_TRADER_01', 'INITIAL_VERIFICATION', 'ASSIGNED', '[]', 'PAID', ?, ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now, now, now, now, now, now, now, now, now, now);

  // 3. Seed Demo Assignments
  await db.prepare(`
    INSERT INTO assignments (id, application_id, assigned_type, assigned_id, recommended_id, is_override, override_reason, assigned_by, created_at)
    VALUES 
      ('ASN_DEMO_01', 'APP_DEMO_01', 'VERIFIER', 'USR_VERIFIER_01', 'USR_VERIFIER_01', 0, NULL, 'USR_AUTHORITY_01', ?),
      ('ASN_DEMO_02', 'APP_DEMO_02', 'VERIFIER', 'USR_VERIFIER_01', 'USR_VERIFIER_01', 0, NULL, 'USR_AUTHORITY_01', ?),
      ('ASN_DEMO_03', 'APP_DEMO_03', 'GATC', 'USR_GATC_01', 'USR_GATC_01', 0, NULL, 'USR_AUTHORITY_01', ?),
      ('ASN_DEMO_05', 'APP_DEMO_05', 'GATC', 'USR_GATC_01', 'USR_GATC_01', 0, NULL, 'USR_AUTHORITY_01', ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now, now, now, now);

  // 4. Seed Demo Appointments
  await db.prepare(`
    INSERT INTO appointments (id, assignment_id, scheduled_date, time_slot, arrangement_type, status, created_at)
    VALUES 
      ('APT_DEMO_01', 'ASN_DEMO_01', '2026-09-05', '10:00 AM - 01:00 PM', 'ON_SITE', 'SCHEDULED', ?),
      ('APT_DEMO_02', 'ASN_DEMO_02', '2026-09-02', '02:00 PM - 05:00 PM', 'ON_SITE', 'COMPLETED', ?),
      ('APT_DEMO_03', 'ASN_DEMO_03', '2026-09-03', '11:00 AM - 02:00 PM', 'LAB_DISPATCH', 'COMPLETED', ?),
      ('APT_DEMO_05', 'ASN_DEMO_05', '2026-09-06', '02:00 PM - 05:00 PM', 'LAB_DISPATCH', 'SCHEDULED', ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now, now, now, now);

  // 5. Seed Demo Verifications
  await db.prepare(`
    INSERT INTO verifications (id, application_id, appointment_id, verifier_id, status, result, remarks, started_at, completed_at, created_at, updated_at)
    VALUES 
      ('VERIF_DEMO_01', 'APP_DEMO_01', 'APT_DEMO_01', 'USR_VERIFIER_01', 'IN_PROGRESS', NULL, 'Physical inspection started. Platter integrity verified.', ?, NULL, ?, ?),
      ('VERIF_DEMO_02', 'APP_DEMO_02', 'APT_DEMO_02', 'USR_VERIFIER_01', 'COMPLETED', 'PASS', 'Instrument conforms to NAWI Class III MPE statutory limits.', ?, ?, ?, ?),
      ('VERIF_DEMO_03', 'APP_DEMO_03', 'APT_DEMO_03', 'USR_GATC_01', 'COMPLETED', 'PASS', 'Laboratory verification passed. Stamping intact.', ?, ?, ?, ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now, now, now, now, now, now, now, now, now, now, now);

  // 6. Seed Checklist Responses for Completed & In-Progress Verifications
  const checklistResponses = [
    { id: 'CHK_RES_01_1', verifId: 'VERIF_DEMO_01', itemId: 'CHK_01', status: 'PASS', note: 'Enclosure in good condition.' },
    { id: 'CHK_RES_01_2', verifId: 'VERIF_DEMO_01', itemId: 'CHK_02', status: 'PASS', note: 'Nameplate clear.' },
    { id: 'CHK_RES_01_3', verifId: 'VERIF_DEMO_01', itemId: 'CHK_03', status: 'PASS', note: 'Level indicator centered.' },
    { id: 'CHK_RES_02_1', verifId: 'VERIF_DEMO_02', itemId: 'CHK_01', status: 'PASS', note: 'Body integrity verified.' },
    { id: 'CHK_RES_02_2', verifId: 'VERIF_DEMO_02', itemId: 'CHK_02', status: 'PASS', note: 'Stamping intact.' },
    { id: 'CHK_RES_02_3', verifId: 'VERIF_DEMO_02', itemId: 'CHK_03', status: 'PASS', note: 'Zero setting confirmed.' },
    { id: 'CHK_RES_02_4', verifId: 'VERIF_DEMO_02', itemId: 'CHK_04', status: 'PASS', note: 'Lead wire seals verified.' },
    { id: 'CHK_RES_02_5', verifId: 'VERIF_DEMO_02', itemId: 'CHK_05', status: 'PASS', note: 'Environment suitable.' },
    { id: 'CHK_RES_03_1', verifId: 'VERIF_DEMO_03', itemId: 'CHK_01', status: 'PASS', note: 'Laboratory inspection pass.' },
    { id: 'CHK_RES_03_2', verifId: 'VERIF_DEMO_03', itemId: 'CHK_02', status: 'PASS', note: 'Nameplate legible.' },
    { id: 'CHK_RES_03_3', verifId: 'VERIF_DEMO_03', itemId: 'CHK_03', status: 'PASS', note: 'Zero indicator exact.' },
    { id: 'CHK_RES_03_4', verifId: 'VERIF_DEMO_03', itemId: 'CHK_04', status: 'PASS', note: 'Calibration ports sealed.' },
    { id: 'CHK_RES_03_5', verifId: 'VERIF_DEMO_03', itemId: 'CHK_05', status: 'PASS', note: 'Lab conditions controlled.' }
  ];

  for (const c of checklistResponses) {
    await db.prepare(`
      INSERT INTO verification_checklist_responses (id, verification_id, item_id, status, note, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (verification_id, item_id) DO NOTHING
    `).run(c.id, c.verifId, c.itemId, c.status, c.note, now);
  }

  // 7. Seed Verification Readings
  const readings = [
    { id: 'RDG_DEMO_01_1', verifId: 'VERIF_DEMO_01', point: 'Initial Test Load', ref: 5.0, obs: 5.0, unit: 'kg', res: 'PASS' },
    { id: 'RDG_DEMO_02_1', verifId: 'VERIF_DEMO_02', point: 'Minimum Load (100g)', ref: 0.1, obs: 0.1, unit: 'kg', res: 'PASS' },
    { id: 'RDG_DEMO_02_2', verifId: 'VERIF_DEMO_02', point: 'Half Capacity (15kg)', ref: 15.0, obs: 15.001, unit: 'kg', res: 'PASS' },
    { id: 'RDG_DEMO_02_3', verifId: 'VERIF_DEMO_02', point: 'Maximum Capacity (30kg)', ref: 30.0, obs: 30.002, unit: 'kg', res: 'PASS' },
    { id: 'RDG_DEMO_03_1', verifId: 'VERIF_DEMO_03', point: 'Minimum Load (40g)', ref: 0.04, obs: 0.04, unit: 'kg', res: 'PASS' },
    { id: 'RDG_DEMO_03_2', verifId: 'VERIF_DEMO_03', point: 'Half Capacity (7.5kg)', ref: 7.5, obs: 7.5, unit: 'kg', res: 'PASS' },
    { id: 'RDG_DEMO_03_3', verifId: 'VERIF_DEMO_03', point: 'Maximum Capacity (15kg)', ref: 15.0, obs: 15.001, unit: 'kg', res: 'PASS' }
  ];

  for (const r of readings) {
    await db.prepare(`
      INSERT INTO verification_readings (id, verification_id, test_point, reference_value, observed_value, unit, reading_result, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `).run(r.id, r.verifId, r.point, r.ref, r.obs, r.unit, r.res, now);
  }

  // 8. Seed Demo Certificates (Form 6)
  await db.prepare(`
    INSERT INTO certificates (id, certificate_no, verification_id, instrument_id, public_token, issue_date, valid_until, status, issuing_officer, issuing_authority, created_at)
    VALUES 
      ('CERT_DEMO_01', 'LM-2026-54715-DL', 'VERIF_DEMO_02', 'INST_002', '8a94dd11-9af0-41d5-a986-cbf70bffdecf', ?, ?, 'VALID', 'Vikram Singh (LMO)', 'Department of Consumer Affairs - Legal Metrology Division', ?),
      ('CERT_DEMO_02', 'LM-2026-74750-DL', 'VERIF_DEMO_03', 'INST_003', '15fcaf47-2be8-463a-bb34-97781d333771', ?, ?, 'VALID', 'Vikram Singh (LMO)', 'Department of Consumer Affairs - Legal Metrology Division', ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now, validUntil, now, now, validUntil, now);

  // 9. Seed Demo Audit Logs
  await db.prepare(`
    INSERT INTO audit_logs (id, entity_name, entity_id, action, actor_id, actor_role, details_json, created_at)
    VALUES 
      ('LOG_DEMO_01', 'Certificate', 'CERT_DEMO_01', 'CERTIFICATE_GENERATED', 'USR_VERIFIER_01', 'VERIFIER', '{"certificate_no":"LM-2026-54715-DL","instrument_id":"INST_002"}', ?),
      ('LOG_DEMO_02', 'Certificate', 'CERT_DEMO_02', 'CERTIFICATE_GENERATED', 'USR_GATC_01', 'GATC', '{"certificate_no":"LM-2026-74750-DL","instrument_id":"INST_003"}', ?),
      ('LOG_DEMO_03', 'Application', 'APP_DEMO_01', 'ASSIGNMENT_CREATED', 'USR_AUTHORITY_01', 'AUTHORITY', '{"application_id":"APP_DEMO_01","assigned_to":"USR_VERIFIER_01"}', ?),
      ('LOG_DEMO_04', 'Instrument', 'INST_001', 'REGISTER', 'USR_TRADER_01', 'TRADER', '{"serial_number":"SN-2026-9941","model":"PW-3000 Eco"}', ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now, now, now, now);

  console.log('✔ Successfully seeded demo business data (instruments, applications, verifications, certificates).');
}

export async function seedAllDemoData() {
  await seedDemoUsers();
  await seedDemoData();
}

// Execute directly if run via CLI: node server/seed-demo-users.js
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('seed-demo-users.js'))) {
  seedAllDemoData().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
