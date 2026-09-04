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
    await initSqliteDatabase();
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

  // 3. Seed demo accounts & complete application business data
  const shouldSeedDemo = process.env.SEED_DEMO_USERS !== 'false';
  if (shouldSeedDemo) {
    const { seedAllDemoData } = await import('./seed-demo-users.js');
    await seedAllDemoData();
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
  const shouldSeedDemo = process.env.SEED_DEMO_USERS !== 'false';
  if (shouldSeedDemo) {
    const { seedAllDemoData } = await import('./seed-demo-users.js');
    await seedAllDemoData();
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


