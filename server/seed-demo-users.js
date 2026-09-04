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

// Execute directly if run via CLI: node server/seed-demo-users.js
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('seed-demo-users.js'))) {
  seedDemoUsers().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
