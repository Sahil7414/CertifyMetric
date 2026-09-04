import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { seedDemoUsers } from './seed-demo-users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurable database path (e.g. persistent volume mount at /data/metrology.db)
export const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, 'metrology.db');

// Ensure parent directory exists on disk / volume mount
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Configure SQLite production pragmas for concurrency, safety, and durability
try {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
  `);
} catch (e) {
  console.warn('Could not set all SQLite pragmas:', e.message);
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      full_name TEXT,
      role TEXT,
      organization_id TEXT,
      phone TEXT,
      avatar TEXT,
      created_at TEXT
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

  // Safe automatic column migrations for verifications table
  try {
    const cols = db.prepare("PRAGMA table_info(verifications)").all().map(c => c.name);
    if (!cols.includes('status')) db.exec("ALTER TABLE verifications ADD COLUMN status TEXT DEFAULT 'IN_PROGRESS'");
    if (!cols.includes('started_at')) db.exec("ALTER TABLE verifications ADD COLUMN started_at TEXT");
    if (!cols.includes('created_at')) db.exec("ALTER TABLE verifications ADD COLUMN created_at TEXT");
    if (!cols.includes('updated_at')) db.exec("ALTER TABLE verifications ADD COLUMN updated_at TEXT");
  } catch (e) {
    console.error('Migration error:', e);
  }

  // Always initialize statutory categories and rules required for system operation
  initStatutoryReferenceData();

  // Seed demo data and demo users ONLY in development/staging or when explicitly requested
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldSeedDemo = !isProduction || process.env.SEED_DEMO_USERS === 'true';

  if (shouldSeedDemo) {
    seedDemoData();
    seedDemoUsers();
  }
}

function initStatutoryReferenceData() {
  const now = new Date().toISOString();

  // Baseline Directorate Organization
  db.prepare(`
    INSERT OR IGNORE INTO organizations (id, name, type, jurisdiction, created_at)
    VALUES ('ORG_GOV_DOCA', 'Department of Consumer Affairs - Legal Metrology Division', 'GOV_DIRECTORATE', 'National Capital Territory', ?)
  `).run(now);

  // Baseline Instrument Category (NAWI Class III)
  db.prepare(`
    INSERT OR IGNORE INTO instrument_categories (id, code, name, description, active)
    VALUES (
      'CAT_NAWI_III', 
      'NAWI_CLASS_III', 
      'Commercial Non-Automatic Weighing Instrument (Class III)', 
      'Counter scale, retail computing balance, digital platform scale up to 30kg used in retail trade',
      1
    )
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

  db.prepare(`
    INSERT OR IGNORE INTO rule_sets (id, category_id, name, validity_period_months, mpe_rules_json, checklist_schema_json)
    VALUES ('RULE_NAWI_DEFAULT', 'CAT_NAWI_III', 'Legal Metrology Standard (General Rules 2011 - NAWI Class III)', 12, ?, ?)
  `).run(mpeRules, checklistSchema);
}

function seedDemoData() {
  const now = new Date().toISOString();

  // Demo Organizations
  db.prepare(`
    INSERT OR IGNORE INTO organizations (id, name, type, jurisdiction, created_at)
    VALUES 
      ('ORG_TRADER_01', 'Apex Retail Traders Pvt Ltd', 'TRADER_ORG', 'Central District, Delhi', ?),
      ('ORG_GATC_01', 'National Metrology Testing Centre (GATC Lab 04)', 'TEST_CENTRE', 'Northern Region', ?)
  `).run(now, now);

  // Demo Instrument
  const instCount = db.prepare('SELECT COUNT(*) as count FROM instruments').get();
  if (instCount.count === 0) {
    db.prepare(`
      INSERT INTO instruments (id, owner_id, category_id, manufacturer, model, serial_number, max_capacity, min_capacity, verification_scale_interval_e, location, status, created_at)
      VALUES ('INST_001', 'USR_TRADER_01', 'CAT_NAWI_III', 'Precision Weigher India', 'PW-3000 Eco', 'SN-2026-9941', '30 kg', '100 g', '5 g', 'Counter 1, Main Grocery Section, Connaught Place, New Delhi', 'REGISTERED', ?)
    `).run(now);
  }
}
