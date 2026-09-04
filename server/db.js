// =============================================================================
// CertifyMetric — Dual-Mode Database Layer (SQLite & PostgreSQL / Neon)
// =============================================================================
// - Local Development: Uses built-in node:sqlite (metrology.db)
// - Production / Neon: Uses pg.Pool when DATABASE_URL is configured
// =============================================================================

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isPostgres = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

// Helper: Convert SQLite '?' parameter placeholders to PostgreSQL '$1, $2, ...'
export function convertPlaceholders(sql) {
  let index = 1;
  let inString = false;
  let result = '';
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      // Check for escaped single quote ''
      if (inString && sql[i + 1] === "'") {
        result += "''";
        i++;
        continue;
      }
      inString = !inString;
      result += char;
    } else if (char === '?' && !inString) {
      result += `$${index++}`;
    } else {
      result += char;
    }
  }
  return result;
}

// Helper: Normalize query dialect differences (e.g. INSERT OR IGNORE -> ON CONFLICT DO NOTHING)
export function normalizeQuery(sql) {
  let s = sql;
  if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(s)) {
    s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(s)) {
      s += ' ON CONFLICT DO NOTHING';
    }
  }
  return convertPlaceholders(s);
}

// Flatten parameter arguments (supports both stmt.run(a, b) and stmt.run([a, b]))
function flattenArgs(args) {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

// =============================================================================
// PostgreSQL / Neon Implementation
// =============================================================================

let pgPool = null;

async function getPgPool() {
  if (pgPool) return pgPool;

  const dbUrl = process.env.DATABASE_URL;

  // Support local in-memory PostgreSQL testing without live network credentials
  if (dbUrl === 'pg-mem' || process.env.TEST_PG_MEM === 'true') {
    const { newDb } = await import('pg-mem');
    const memDb = newDb();
    const { Pool } = memDb.adapters.createPg();
    pgPool = new Pool();
    return pgPool;
  }

  const { default: pg } = await import('pg');
  const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

  pgPool = new pg.Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  return pgPool;
}

function createPostgresStatement(sql) {
  const pgSql = normalizeQuery(sql);

  return {
    get: async (...args) => {
      const pool = await getPgPool();
      const params = flattenArgs(args);
      const res = await pool.query(pgSql, params);
      return res.rows[0] || undefined;
    },
    all: async (...args) => {
      const pool = await getPgPool();
      const params = flattenArgs(args);
      const res = await pool.query(pgSql, params);
      return res.rows;
    },
    run: async (...args) => {
      const pool = await getPgPool();
      const params = flattenArgs(args);
      const res = await pool.query(pgSql, params);
      return { changes: res.rowCount || 0 };
    }
  };
}

// =============================================================================
// SQLite Implementation (Local Development)
// =============================================================================

export const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, 'metrology.db');

let sqliteInstance = null;

function getSqliteInstance() {
  if (sqliteInstance) return sqliteInstance;

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteInstance = new DatabaseSync(dbPath);

  try {
    sqliteInstance.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
      PRAGMA synchronous = NORMAL;
    `);
  } catch (e) {
    console.warn('Could not set all SQLite pragmas:', e.message);
  }

  return sqliteInstance;
}

// =============================================================================
// Unified Database Interface Export
// =============================================================================

export const db = {
  type: isPostgres ? 'postgres' : 'sqlite',

  prepare(sql) {
    if (isPostgres) {
      return createPostgresStatement(sql);
    }
    const sqlite = getSqliteInstance();
    const stmt = sqlite.prepare(sql);
    return {
      get: (...args) => stmt.get(...flattenArgs(args)),
      all: (...args) => stmt.all(...flattenArgs(args)),
      run: (...args) => stmt.run(...flattenArgs(args))
    };
  },

  async query(sql, params = []) {
    if (isPostgres) {
      const pool = await getPgPool();
      return pool.query(normalizeQuery(sql), flattenArgs(params));
    }
    const sqlite = getSqliteInstance();
    return sqlite.prepare(sql).all(...flattenArgs(params));
  },

  async exec(sql) {
    if (isPostgres) {
      const pool = await getPgPool();
      return pool.query(sql);
    }
    const sqlite = getSqliteInstance();
    return sqlite.exec(sql);
  },

  async close() {
    if (isPostgres && pgPool) {
      await pgPool.end();
      pgPool = null;
    } else if (sqliteInstance) {
      sqliteInstance.close();
      sqliteInstance = null;
    }
  }
};

// =============================================================================
// Database Initialization & Statutory Reference Data
// =============================================================================

export async function initDatabase() {
  if (isPostgres) {
    await initPostgresDatabase();
  } else {
    initSqliteDatabase();
  }
}

async function initPostgresDatabase() {
  const pool = await getPgPool();

  // 1. Run schema migration DDL
  const schemaPath = path.join(__dirname, 'migrations', 'postgresql-schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
  }

  // 2. Insert statutory reference data
  await initStatutoryReferenceData();

  // 3. Seed demo users if explicitly requested
  if (process.env.SEED_DEMO_USERS === 'true') {
    const { seedDemoUsers } = await import('./seed-demo-users.js');
    await seedDemoUsers();
  }
}

async function initSqliteDatabase() {
  const sqlite = getSqliteInstance();

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      full_name TEXT,
      role TEXT,
      organization_id TEXT,
      phone TEXT,
      avatar TEXT,
      password_hash TEXT,
      is_demo INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT,
      role TEXT,
      created_at TEXT,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      jurisdiction TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS instrument_categories (
      id TEXT PRIMARY KEY,
      code TEXT,
      name TEXT,
      description TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS rule_sets (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      name TEXT,
      validity_period_months INTEGER,
      mpe_rules_json TEXT,
      checklist_schema_json TEXT
    );

    CREATE TABLE IF NOT EXISTS instruments (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      category_id TEXT,
      manufacturer TEXT,
      model TEXT,
      serial_number TEXT UNIQUE,
      max_capacity TEXT,
      min_capacity TEXT,
      verification_scale_interval_e TEXT,
      location TEXT,
      status TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      application_no TEXT UNIQUE,
      instrument_id TEXT,
      trader_id TEXT,
      request_type TEXT,
      status TEXT,
      documents_json TEXT,
      fee_status TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      application_id TEXT UNIQUE,
      assigned_type TEXT,
      assigned_id TEXT,
      recommended_id TEXT,
      is_override INTEGER DEFAULT 0,
      override_reason TEXT,
      assigned_by TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      assignment_id TEXT UNIQUE,
      scheduled_date TEXT,
      time_slot TEXT,
      arrangement_type TEXT,
      status TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS verifications (
      id TEXT PRIMARY KEY,
      application_id TEXT UNIQUE,
      appointment_id TEXT,
      verifier_id TEXT,
      status TEXT DEFAULT 'IN_PROGRESS',
      result TEXT,
      remarks TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS verification_checklist_responses (
      id TEXT PRIMARY KEY,
      verification_id TEXT,
      item_id TEXT,
      status TEXT,
      note TEXT,
      updated_at TEXT,
      UNIQUE(verification_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS verification_readings (
      id TEXT PRIMARY KEY,
      verification_id TEXT,
      test_point TEXT,
      reference_value REAL,
      observed_value REAL,
      unit TEXT,
      reading_result TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS verification_evidence (
      id TEXT PRIMARY KEY,
      verification_id TEXT,
      file_name TEXT,
      file_path TEXT,
      file_type TEXT,
      category TEXT,
      caption TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      certificate_no TEXT UNIQUE,
      verification_id TEXT,
      instrument_id TEXT,
      public_token TEXT UNIQUE,
      issue_date TEXT,
      valid_until TEXT,
      status TEXT,
      issuing_officer TEXT,
      issuing_authority TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entity_name TEXT,
      entity_id TEXT,
      action TEXT,
      actor_id TEXT,
      actor_role TEXT,
      details_json TEXT,
      created_at TEXT
    );
  `);

  // Column migrations
  try {
    const cols = sqlite.prepare("PRAGMA table_info(verifications)").all().map(c => c.name);
    if (!cols.includes('status')) sqlite.exec("ALTER TABLE verifications ADD COLUMN status TEXT DEFAULT 'IN_PROGRESS'");
    if (!cols.includes('started_at')) sqlite.exec("ALTER TABLE verifications ADD COLUMN started_at TEXT");
    if (!cols.includes('created_at')) sqlite.exec("ALTER TABLE verifications ADD COLUMN created_at TEXT");
    if (!cols.includes('updated_at')) sqlite.exec("ALTER TABLE verifications ADD COLUMN updated_at TEXT");
  } catch (e) {
    console.error('SQLite migration error:', e);
  }

  // Statutory reference data
  await initStatutoryReferenceData();

  // Demo seeding
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldSeedDemo = !isProduction || process.env.SEED_DEMO_USERS === 'true';
  if (shouldSeedDemo) {
    const { seedDemoUsers } = await import('./seed-demo-users.js');
    await seedDemoUsers();
    await seedDemoData();
  }
}

async function initStatutoryReferenceData() {
  const now = new Date().toISOString();

  // Baseline Directorate Organization
  await db.prepare(`
    INSERT INTO organizations (id, name, type, jurisdiction, created_at)
    VALUES ('ORG_GOV_DOCA', 'Department of Consumer Affairs - Legal Metrology Division', 'GOV_DIRECTORATE', 'National Capital Territory', ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now);

  // Baseline Instrument Category (NAWI Class III)
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

  // Statutory Verification Rule Set
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
}

async function seedDemoData() {
  const now = new Date().toISOString();
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  // Demo Organizations
  await db.prepare(`
    INSERT INTO organizations (id, name, type, jurisdiction, created_at)
    VALUES 
      ('ORG_TRADER_01', 'Apex Retail Traders Pvt Ltd', 'TRADER_ORG', 'Central District, Delhi', ?),
      ('ORG_GATC_01', 'National Metrology Testing Centre (GATC Lab 04)', 'TEST_CENTRE', 'Northern Region', ?)
    ON CONFLICT (id) DO NOTHING
  `).run(now, now);

  // Check existing instruments count
  const instCountRes = await db.prepare('SELECT COUNT(*) as count FROM instruments').get();
  const count = instCountRes ? parseInt(instCountRes.count || 0, 10) : 0;

  if (count === 0) {
    // 1. Demo Instruments for Demo Trader (Ramesh Sharma)
    await db.prepare(`
      INSERT INTO instruments (id, owner_id, category_id, manufacturer, model, serial_number, max_capacity, min_capacity, verification_scale_interval_e, location, status, created_at)
      VALUES 
        ('INST_001', 'USR_TRADER_01', 'CAT_NAWI_III', 'Precision Weigher India', 'PW-3000 Eco', 'SN-2026-9941', '30 kg', '100 g', '5 g', 'Counter 1, Main Grocery Section, Connaught Place, New Delhi', 'UNDER_VERIFICATION', ?),
        ('INST_002', 'USR_TRADER_01', 'CAT_NAWI_III', 'Avery Weigh-Tronix', 'ZK830 High Precision', 'SN-CERT-PASS-8801', '30 kg', '100 g', '5 g', 'Depot 4, Okhla Phase III, New Delhi', 'VERIFIED', ?),
        ('INST_003', 'USR_TRADER_01', 'CAT_NAWI_III', 'Mettler Toledo', 'b-Plus Dual Range', 'SN-S4-QR-9902', '15 kg', '40 g', '2 g', 'Store 18, Terminal 3, IGI Airport, New Delhi', 'VERIFIED', ?),
        ('INST_004', 'USR_TRADER_01', 'CAT_NAWI_III', 'Essae Teraoka', 'DS-215 Bench Scale', 'SN-EXP-2026-4410', '20 kg', '50 g', '2 g', 'Billing Counter 3, South Extension Part II, New Delhi', 'EXPIRING', ?)
      ON CONFLICT (id) DO NOTHING
    `).run(now, now, now, now);

    // 2. Demo Applications
    await db.prepare(`
      INSERT INTO applications (id, application_no, instrument_id, trader_id, request_type, status, documents_json, fee_status, created_at, updated_at)
      VALUES 
        ('APP_DEMO_01', 'APP-2026-2641', 'INST_001', 'USR_TRADER_01', 'INITIAL_VERIFICATION', 'IN_PROGRESS', '[]', 'PAID', ?, ?),
        ('APP_DEMO_02', 'APP-2026-8506', 'INST_002', 'USR_TRADER_01', 'INITIAL_VERIFICATION', 'VERIFICATION_COMPLETED', '[]', 'PAID', ?, ?),
        ('APP_DEMO_03', 'APP-2026-1311', 'INST_003', 'USR_TRADER_01', 'INITIAL_VERIFICATION', 'VERIFICATION_COMPLETED', '[]', 'PAID', ?, ?),
        ('APP_DEMO_04', 'APP-2026-9022', 'INST_004', 'USR_TRADER_01', 'RE_VERIFICATION', 'SUBMITTED', '[]', 'PAID', ?, ?)
      ON CONFLICT (id) DO NOTHING
    `).run(now, now, now, now, now, now, now, now);

    // 3. Demo Assignments
    await db.prepare(`
      INSERT INTO assignments (id, application_id, assigned_type, assigned_id, recommended_id, is_override, override_reason, assigned_by, created_at)
      VALUES 
        ('ASN_DEMO_01', 'APP_DEMO_01', 'VERIFIER', 'USR_VERIFIER_01', 'USR_VERIFIER_01', 0, NULL, 'USR_AUTHORITY_01', ?),
        ('ASN_DEMO_02', 'APP_DEMO_02', 'VERIFIER', 'USR_VERIFIER_01', 'USR_VERIFIER_01', 0, NULL, 'USR_AUTHORITY_01', ?),
        ('ASN_DEMO_03', 'APP_DEMO_03', 'GATC', 'USR_GATC_01', 'USR_GATC_01', 0, NULL, 'USR_AUTHORITY_01', ?)
      ON CONFLICT (id) DO NOTHING
    `).run(now, now, now);

    // 4. Demo Appointments
    await db.prepare(`
      INSERT INTO appointments (id, assignment_id, scheduled_date, time_slot, arrangement_type, status, created_at)
      VALUES 
        ('APT_DEMO_01', 'ASN_DEMO_01', '2026-09-05', '10:00 AM - 01:00 PM', 'ON_SITE', 'SCHEDULED', ?),
        ('APT_DEMO_02', 'ASN_DEMO_02', '2026-09-02', '02:00 PM - 05:00 PM', 'ON_SITE', 'COMPLETED', ?),
        ('APT_DEMO_03', 'ASN_DEMO_03', '2026-09-03', '11:00 AM - 02:00 PM', 'LAB_DISPATCH', 'COMPLETED', ?)
      ON CONFLICT (id) DO NOTHING
    `).run(now, now, now);

    // 5. Demo Verifications
    await db.prepare(`
      INSERT INTO verifications (id, application_id, appointment_id, verifier_id, status, result, remarks, started_at, completed_at, created_at, updated_at)
      VALUES 
        ('VERIF_DEMO_01', 'APP_DEMO_01', 'APT_DEMO_01', 'USR_VERIFIER_01', 'IN_PROGRESS', NULL, 'Physical inspection started. Platter integrity verified.', ?, NULL, ?, ?),
        ('VERIF_DEMO_02', 'APP_DEMO_02', 'APT_DEMO_02', 'USR_VERIFIER_01', 'COMPLETED', 'PASS', 'Instrument conforms to NAWI Class III MPE statutory limits.', ?, ?, ?, ?),
        ('VERIF_DEMO_03', 'APP_DEMO_03', 'APT_DEMO_03', 'USR_GATC_01', 'COMPLETED', 'PASS', 'Laboratory verification passed. Stamping intact.', ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `).run(now, now, now, now, now, now, now, now, now, now, now);

    // 6. Demo Certificates (Form 6)
    await db.prepare(`
      INSERT INTO certificates (id, certificate_no, verification_id, instrument_id, public_token, issue_date, valid_until, status, issuing_officer, issuing_authority, created_at)
      VALUES 
        ('CERT_DEMO_01', 'LM-2026-54715-DL', 'VERIF_DEMO_02', 'INST_002', '8a94dd11-9af0-41d5-a986-cbf70bffdecf', ?, ?, 'VALID', 'Vikram Singh (LMO)', 'Department of Consumer Affairs - Legal Metrology Division', ?),
        ('CERT_DEMO_02', 'LM-2026-74750-DL', 'VERIF_DEMO_03', 'INST_003', '15fcaf47-2be8-463a-bb34-97781d333771', ?, ?, 'VALID', 'Vikram Singh (LMO)', 'Department of Consumer Affairs - Legal Metrology Division', ?)
      ON CONFLICT (id) DO NOTHING
    `).run(now, validUntil, now, now, validUntil, now);

    // 7. Demo Audit Logs
    await db.prepare(`
      INSERT INTO audit_logs (id, entity_name, entity_id, action, actor_id, actor_role, details_json, created_at)
      VALUES 
        ('LOG_DEMO_01', 'Certificate', 'CERT_DEMO_01', 'CERTIFICATE_GENERATED', 'USR_VERIFIER_01', 'VERIFIER', '{"certificate_no":"LM-2026-54715-DL","instrument_id":"INST_002"}', ?),
        ('LOG_DEMO_02', 'Certificate', 'CERT_DEMO_02', 'CERTIFICATE_GENERATED', 'USR_GATC_01', 'GATC', '{"certificate_no":"LM-2026-74750-DL","instrument_id":"INST_003"}', ?),
        ('LOG_DEMO_03', 'Application', 'APP_DEMO_01', 'ASSIGNMENT_CREATED', 'USR_AUTHORITY_01', 'AUTHORITY', '{"application_id":"APP_DEMO_01","assigned_to":"USR_VERIFIER_01"}', ?)
      ON CONFLICT (id) DO NOTHING
    `).run(now, now, now);
  }
}
