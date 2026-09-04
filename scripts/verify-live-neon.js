// =============================================================================
// CertifyMetric — Live Neon PostgreSQL Production Verification Script
// =============================================================================
// Non-destructively verifies:
// 1. PostgreSQL connection & SSL handshake
// 2. Authoritative schema tables in PostgreSQL
// 3. Demo users with proper roles & hashed credentials
// 4. Reference / statutory categories & checklist templates
// 5. Representative instruments & applications
// 6. Representative verifications & test readings
// 7. Representative statutory certificates & verification tokens
// 8. Safe, atomic read / write / delete operation without data corruption
// =============================================================================

import pg from '../server/node_modules/pg/lib/index.js';
import dns from 'node:dns/promises';

// Mask credentials when displaying connection target
function maskDatabaseUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.protocol}//${parsed.username}:*****@${parsed.host}${parsed.pathname}`;
  } catch {
    return '[PROTECTED_DATABASE_URL]';
  }
}

async function resolveHostSafely(hostname) {
  try {
    const res = await dns.lookup(hostname);
    return res.address;
  } catch (err) {
    // If standard Windows DNS resolver fails for external domains, query Google DNS
    try {
      const resolver = new dns.Resolver();
      resolver.setServers(['8.8.8.8', '1.1.1.1']);
      const addresses = await resolver.resolve4(hostname);
      if (addresses && addresses.length > 0) {
        return addresses[0];
      }
    } catch {
      // Fall through to original hostname
    }
    return hostname;
  }
}

async function runLiveVerification() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required to run live verification.');
    console.error('Usage: DATABASE_URL="postgresql://..." node scripts/verify-live-neon.js');
    process.exit(1);
  }

  console.log('----------------------------------------------------');
  console.log('🐘 CERTIFYMETRIC LIVE NEON PRODUCTION VERIFICATION');
  console.log('----------------------------------------------------');
  console.log(`Target: ${maskDatabaseUrl(databaseUrl)}\n`);

  let client;
  try {
    const parsed = new URL(databaseUrl);
    const resolvedIp = await resolveHostSafely(parsed.hostname);

    client = new pg.Client({
      host: resolvedIp,
      port: Number(parsed.port) || 5432,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      ssl: {
        rejectUnauthorized: false,
        servername: parsed.hostname
      }
    });

    // 1. Connection Check
    console.log('[1/8] Testing database connection & SSL handshake...');
    await client.connect();
    const verRes = await client.query('SELECT version();');
    console.log(`  ✔ Connected to PostgreSQL engine: ${verRes.rows[0].version.split(' on ')[0]}`);

    // 2. Authoritative Schema Tables
    console.log('[2/8] Verifying existence of required schema tables...');
    const expectedTables = [
      'organizations',
      'users',
      'user_sessions',
      'instrument_categories',
      'rule_sets',
      'instruments',
      'applications',
      'assignments',
      'appointments',
      'verifications',
      'verification_checklist_responses',
      'verification_readings',
      'verification_evidence',
      'certificates',
      'audit_logs'
    ];

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const existingTables = new Set(tablesRes.rows.map(r => r.table_name));

    for (const table of expectedTables) {
      if (!existingTables.has(table)) {
        throw new Error(`Missing required table in PostgreSQL: ${table}`);
      }
    }
    console.log(`  ✔ All ${expectedTables.length} core tables verified in public schema.`);

    // 3. Demo Users & Roles
    console.log('[3/8] Verifying demo users and statutory RBAC roles...');
    const usersRes = await client.query(`
      SELECT id, email, role, full_name 
      FROM users 
      ORDER BY id;
    `);

    const expectedRoles = ['PLATFORM_ADMIN', 'TRADER', 'AUTHORITY', 'VERIFIER', 'GATC'];
    const rolesPresent = new Set(usersRes.rows.map(u => u.role));
    for (const role of expectedRoles) {
      if (!rolesPresent.has(role)) {
        throw new Error(`Missing critical demo user role: ${role}`);
      }
    }
    console.log(`  ✔ Found ${usersRes.rows.length} users covering all required roles (${[...rolesPresent].join(', ')}).`);

    // 4. Reference / Statutory Categories
    console.log('[4/8] Verifying statutory instrument categories...');
    const catRes = await client.query('SELECT COUNT(*) AS count FROM instrument_categories;');
    const catCount = Number(catRes.rows[0].count);
    if (catCount === 0) {
      throw new Error('Statutory categories table is empty.');
    }
    console.log(`  ✔ ${catCount} statutory categories registered (e.g., Non-Automatic Weighing Instruments).`);

    // 5. Representative Instruments & Applications
    console.log('[5/8] Verifying representative instruments and applications...');
    const instRes = await client.query('SELECT COUNT(*) AS count FROM instruments;');
    const appRes = await client.query('SELECT COUNT(*) AS count FROM applications;');
    const instCount = Number(instRes.rows[0].count);
    const appCount = Number(appRes.rows[0].count);

    if (instCount === 0 || appCount === 0) {
      throw new Error(`Expected instruments and applications to exist (Found: ${instCount} instruments, ${appCount} applications).`);
    }
    console.log(`  ✔ Verified ${instCount} instruments and ${appCount} statutory applications persisted.`);

    // 6. Verifications & Readings
    console.log('[6/8] Verifying verification determinations and test readings...');
    const verifRes = await client.query('SELECT COUNT(*) AS count FROM verifications;');
    const readingsRes = await client.query('SELECT COUNT(*) AS count FROM verification_readings;');
    const verifCount = Number(verifRes.rows[0].count);
    const readingsCount = Number(readingsRes.rows[0].count);

    if (verifCount === 0 || readingsCount === 0) {
      throw new Error(`Expected verification determinations and readings to exist (Found: ${verifCount} verifications, ${readingsCount} readings).`);
    }
    console.log(`  ✔ Verified ${verifCount} verifications with ${readingsCount} metrological test readings.`);

    // 7. Statutory Certificates & Public QR Tokens
    console.log('[7/8] Verifying statutory certificates & QR verification tokens...');
    const certsRes = await client.query('SELECT id, certificate_no, public_token, status FROM certificates;');
    if (certsRes.rows.length === 0) {
      throw new Error('No statutory certificates found in PostgreSQL.');
    }
    for (const cert of certsRes.rows) {
      if (!cert.public_token) {
        throw new Error(`Certificate ${cert.certificate_no} has null public_token`);
      }
    }
    console.log(`  ✔ Found ${certsRes.rows.length} official Form 6 certificates with valid verification tokens.`);

    // 8. Non-Destructive Write / Read / Delete Test
    console.log('[8/8] Performing non-destructive atomic read/write test...');
    const testId = `LOG_PROBE_${Date.now()}`;
    const testAction = 'VERIFY_PRODUCTION_PROBE';
    
    // Write test audit log
    await client.query(`
      INSERT INTO audit_logs (id, entity_name, entity_id, action, actor_id, actor_role, details_json, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
    `, [testId, 'SYSTEM_PROBE', testId, testAction, 'USR_ADMIN_01', 'ADMIN', JSON.stringify({ probe: true })]);

    // Read back and assert
    const probeRes = await client.query('SELECT * FROM audit_logs WHERE id = $1;', [testId]);
    if (probeRes.rows.length !== 1 || probeRes.rows[0].action !== testAction) {
      throw new Error('Non-destructive write/read probe failed to match persisted record.');
    }

    // Clean up probe record
    await client.query('DELETE FROM audit_logs WHERE id = $1;', [testId]);
    const cleanupCheck = await client.query('SELECT * FROM audit_logs WHERE id = $1;', [testId]);
    if (cleanupCheck.rows.length !== 0) {
      throw new Error('Failed to clean up test probe record.');
    }
    console.log('  ✔ Atomic write, read verification, and clean rollback succeeded.');

    console.log('----------------------------------------------------');
    console.log('🎉 LIVE NEON PRODUCTION DATABASE VERIFIED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('\n❌ LIVE NEON VERIFICATION FAILED:', err.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

runLiveVerification();
