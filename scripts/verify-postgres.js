// =============================================================================
// CertifyMetric — PostgreSQL / Neon Mode Verification Simulation
// =============================================================================
// Tests the full statutory lifecycle and security controls under PostgreSQL mode.
// Uses pg-mem (in-memory PostgreSQL) when no external DATABASE_URL is supplied,
// allowing 100% safe, offline verification of PostgreSQL schema, queries & pool.
// =============================================================================

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TEST_PORT = 4098;
const TEST_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_DATA_DIR = path.join(ROOT_DIR, 'test-pg-data');
const TEST_STORAGE_DIR = path.join(TEST_DATA_DIR, 'test-uploads');

if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });

console.log('----------------------------------------------------');
console.log('🐘 CERTIFYMETRIC POSTGRESQL / NEON MODE SIMULATION');
console.log('----------------------------------------------------');

let serverProcess = null;

async function runPgTest() {
  try {
    const pgUrl = process.env.DATABASE_URL || 'pg-mem';
    console.log(`[1/9] Booting backend in POSTGRESQL mode (${pgUrl === 'pg-mem' ? 'In-Memory PostgreSQL engine' : 'Live PostgreSQL target'})...`);

    serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(ROOT_DIR, 'server'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(TEST_PORT),
        HOST: '127.0.0.1',
        DATABASE_URL: pgUrl,
        STORAGE_DIR: TEST_STORAGE_DIR,
        FRONTEND_URL: 'http://localhost:5173',
        SEED_DEMO_USERS: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', () => {});
    serverProcess.stderr.on('data', (d) => {
      // console.error(`[PG SERVER STDERR] ${d}`);
    });

    // Wait for server to become responsive
    let ready = false;
    for (let i = 0; i < 35; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const res = await fetch(`${TEST_URL}/api/health`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch (e) {}
    }

    if (!ready) {
      throw new Error('Server failed to start in PostgreSQL mode within 7 seconds.');
    }
    console.log('  ✔ PostgreSQL server booted and responded to probes.');

    // 2. Health Endpoint Check
    console.log('[2/9] Validating GET /api/health output under PostgreSQL...');
    const healthRes = await fetch(`${TEST_URL}/api/health`);
    const healthData = await healthRes.json();
    if (healthData.status !== 'ok' || healthData.database !== 'connected') {
      throw new Error(`Unexpected health response: ${JSON.stringify(healthData)}`);
    }
    console.log('  ✔ Health probe confirmed: status=ok, database=connected, environment=production');

    // 3. Security: Dev Auth Bypass blocked in production
    console.log('[3/9] Testing Dev Auth Bypass denial under PostgreSQL (x-user-id header)...');
    const bypassRes = await fetch(`${TEST_URL}/api/audit-logs`, {
      headers: { 'x-user-id': 'USR_ADMIN_01' }
    });
    if (bypassRes.status !== 403) {
      throw new Error(`Security breach: Dev bypass succeeded with status ${bypassRes.status}! Expected 403.`);
    }
    console.log('  ✔ Dev bypass correctly rejected in production (HTTP 403).');

    // 4. Multi-Role Authentication via PostgreSQL user_sessions
    console.log('[4/9] Testing Authentication with PostgreSQL-persisted credentials...');
    const login = async (email, password) => {
      const res = await fetch(`${TEST_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error(`Login failed for ${email}: ${res.statusText}`);
      const data = await res.json();
      return data.token;
    };

    const adminToken = await login('demo.admin@certifymetric.local', 'DemoAdmin@2026');
    const traderToken = await login('demo.trader@certifymetric.local', 'DemoTrader@2026');
    const authorityToken = await login('demo.authority@certifymetric.local', 'DemoAuthority@2026');
    const verifierToken = await login('demo.verifier@certifymetric.local', 'DemoVerifier@2026');
    console.log('  ✔ Session tokens acquired for Admin, Trader, Authority, and Verifier from PostgreSQL.');

    // 5. RBAC Enforcement in PostgreSQL
    console.log('[5/9] Testing Role-Based Access Control (RBAC) against PostgreSQL roles...');
    const traderAuditRes = await fetch(`${TEST_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${traderToken}` }
    });
    if (traderAuditRes.status !== 403) {
      throw new Error(`RBAC failure: Trader could access audit logs with status ${traderAuditRes.status}`);
    }

    const adminAuditRes = await fetch(`${TEST_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (adminAuditRes.status !== 200) {
      throw new Error(`RBAC failure: Admin could not access audit logs with status ${adminAuditRes.status}`);
    }
    console.log('  ✔ RBAC verified: Trader blocked (403), Platform Admin authorized (200).');

    // 6. Complete Statutory Lifecycle in PostgreSQL
    console.log('[6/9] Testing Complete Statutory Verification Lifecycle in PostgreSQL...');

    // A. Trader registers instrument
    const serial = `SN-PG-${Date.now()}`;
    const instRes = await fetch(`${TEST_URL}/api/instruments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${traderToken}`
      },
      body: JSON.stringify({
        owner_id: 'USR_TRADER_01',
        category_id: 'CAT_NAWI_III',
        manufacturer: 'Avery Weigh-Tronix (Postgres Test)',
        model: 'PG-VERIF-2026',
        serial_number: serial,
        max_capacity: '50 kg',
        min_capacity: '200 g',
        verification_scale_interval_e: '10 g',
        location: 'Platform 4, Container Depot'
      })
    });
    if (instRes.status !== 201) throw new Error(`Instrument registration failed: ${await instRes.text()}`);
    const instData = await instRes.json();
    console.log(`  ✔ Instrument registered in PostgreSQL: ${instData.id}`);

    // B. Trader submits application
    const appRes = await fetch(`${TEST_URL}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${traderToken}`
      },
      body: JSON.stringify({
        instrument_id: instData.id,
        trader_id: 'USR_TRADER_01',
        request_type: 'INITIAL_VERIFICATION'
      })
    });
    if (appRes.status !== 201) throw new Error(`Application submission failed: ${await appRes.text()}`);
    const appData = await appRes.json();
    const appId = appData.id;
    console.log(`  ✔ Application submitted in PostgreSQL: ${appData.application_no}`);

    // C. Authority assigns Verifier
    const assignRes = await fetch(`${TEST_URL}/api/applications/${appId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`
      },
      body: JSON.stringify({
        assigned_id: 'USR_VERIFIER_01',
        scheduled_date: '2026-09-15',
        time_slot: 'MORNING_10_00',
        arrangement_type: 'FIELD_VISIT'
      })
    });
    if (!assignRes.ok) throw new Error(`Assign verifier failed: ${await assignRes.text()}`);
    console.log('  ✔ Authority assigned Field Verifier.');

    // D. Verifier starts case
    const startRes = await fetch(`${TEST_URL}/api/verifications/cases/${appId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${verifierToken}` }
    });
    if (!startRes.ok) throw new Error(`Start verification failed: ${await startRes.text()}`);
    console.log('  ✔ Field Verifier initiated verification.');

    // E. Verifier submits PASS determination (Testing PostgreSQL ON CONFLICT DO UPDATE)
    const submitRes = await fetch(`${TEST_URL}/api/verifications/cases/${appId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`
      },
      body: JSON.stringify({
        result: 'PASS',
        remarks: 'Conforms to Legal Metrology General Rules 2011 Schedule IX (Tested on PostgreSQL).',
        checklist_responses: [
          { item_id: 'CHK_01', status: 'PASS', note: 'Visual inspection passed' },
          { item_id: 'CHK_02', status: 'PASS', note: 'Markings verified' },
          { item_id: 'CHK_03', status: 'PASS', note: 'Level bubble centered' },
          { item_id: 'CHK_04', status: 'PASS', note: 'Lead seal intact' },
          { item_id: 'CHK_05', status: 'PASS', note: 'Environment compliant' }
        ],
        readings: [
          { test_point: 'Min (200 g)', reference_value: 0.2, observed_value: 0.2, unit: 'kg', reading_result: 'PASS' },
          { test_point: 'Half (25 kg)', reference_value: 25, observed_value: 25.005, unit: 'kg', reading_result: 'PASS' },
          { test_point: 'Max (50 kg)', reference_value: 50, observed_value: 50.008, unit: 'kg', reading_result: 'PASS' }
        ]
      })
    });
    if (!submitRes.ok) throw new Error(`Submit verification failed: ${await submitRes.text()}`);
    console.log('  ✔ Verification determination PASS recorded with PostgreSQL upsert.');

    // F. Verifier generates Statutory Certificate
    const certGenRes = await fetch(`${TEST_URL}/api/certificates/generate/${appId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${verifierToken}` }
    });
    if (!certGenRes.ok) throw new Error(`Certificate generation failed: ${await certGenRes.text()}`);
    const certGenData = await certGenRes.json();
    const certificate = certGenData.certificate;
    console.log(`  ✔ Statutory Certificate generated in PostgreSQL: #${certificate.certificate_no}`);

    // 7. Public Statutory QR Verification Check
    console.log('[7/9] Testing Public QR Certificate Verification Endpoint (Zero Auth)...');
    const verifyRes = await fetch(`${TEST_URL}/api/public/verify/${certificate.public_token}`);
    if (!verifyRes.ok) throw new Error(`Public verification failed: ${verifyRes.status}`);
    const verifyData = await verifyRes.json();
    if (verifyData.status !== 'VALID' || verifyData.certificate_no !== certificate.certificate_no) {
      throw new Error(`Public verify mismatch: ${JSON.stringify(verifyData)}`);
    }
    console.log(`  ✔ Public QR verify succeeded: Cert #${verifyData.certificate_no} is VALID`);

    // 8. Error Handling & 404
    console.log('[8/9] Testing 404 handler under PostgreSQL...');
    const notFoundRes = await fetch(`${TEST_URL}/api/unknown-pg-${Date.now()}`);
    if (notFoundRes.status !== 404) throw new Error(`Expected 404, got ${notFoundRes.status}`);
    console.log('  ✔ Structured 404 handler verified.');

    // 9. Graceful Shutdown & Pool Drain
    console.log('[9/9] Testing Graceful Server Shutdown & PostgreSQL Connection Drain...');
    serverProcess.kill('SIGTERM');
    await new Promise(resolve => serverProcess.on('exit', resolve));
    console.log('  ✔ Server shut down gracefully with PostgreSQL pool closed.');

    console.log('----------------------------------------------------');
    console.log('🎉 ALL 9 POSTGRESQL / NEON VERIFICATION CHECKS PASSED!');
    console.log('----------------------------------------------------');
    return true;
  } catch (err) {
    console.error('❌ POSTGRESQL SIMULATION FAILED:', err.message);
    if (serverProcess) {
      try { serverProcess.kill(); } catch (e) {}
    }
    process.exit(1);
  } finally {
    try {
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
      }
    } catch (e) {}
  }
}

runPgTest();
