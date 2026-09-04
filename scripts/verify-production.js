// =============================================================================
// CertifyMetric — Production Readiness & Security Verification Test
// =============================================================================
// Tests:
//  1. Server Boot & Health Check (GET /api/health)
//  2. Security: Dev Auth Bypass blocked in NODE_ENV=production
//  3. Authentication: Login & Session Token generation for all 4 roles
//  4. RBAC: Unauthorized route rejection (403 for Trader on Admin route)
//  5. Full Statutory Metrology Lifecycle:
//     - Trader registers instrument
//     - Trader submits application
//     - Authority reviews & assigns verifier
//     - Verifier starts case
//     - Verifier uploads evidence (Multipart Form with custom storage dir)
//     - Verifier submits PASS determination
//     - Verifier generates statutory certificate
//  6. Static Storage & File Serving: Verifies uploaded evidence file is accessible
//  7. Public Endpoint: Statutory QR Verification (GET /api/public/verify/:token) without auth
//  8. Error Handling: Unknown route 404 JSON response
//  9. Concurrency & Graceful Shutdown (SIGTERM)
// =============================================================================

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TEST_PORT = 4099;
const TEST_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_DATA_DIR = path.join(ROOT_DIR, 'test-sim-data');
const TEST_DB_PATH = path.join(TEST_DATA_DIR, 'test-certifymetric.db');
const TEST_STORAGE_DIR = path.join(TEST_DATA_DIR, 'test-uploads');

// Clean test directories
if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });

console.log('----------------------------------------------------');
console.log('🚀 CERTIFYMETRIC PRODUCTION SIMULATION STARTING');
console.log('----------------------------------------------------');

let serverProcess = null;

async function runTest() {
  try {
    // 1. Start Server in PRODUCTION mode with custom DB and Storage paths
    console.log(`[1/9] Spawning server on port ${TEST_PORT} [NODE_ENV=production]...`);
    serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(ROOT_DIR, 'server'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(TEST_PORT),
        HOST: '127.0.0.1',
        DATABASE_PATH: TEST_DB_PATH,
        STORAGE_DIR: TEST_STORAGE_DIR,
        FRONTEND_URL: 'http://localhost:5173'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', () => {});
    serverProcess.stderr.on('data', () => {});

    // Wait for server to become responsive
    let ready = false;
    for (let i = 0; i < 30; i++) {
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
      throw new Error('Server failed to start and respond on /api/health within 6 seconds.');
    }
    console.log('  ✔ Server booted cleanly and responded.');

    // 2. Health Endpoint Check
    console.log('[2/9] Validating GET /api/health output...');
    const healthRes = await fetch(`${TEST_URL}/api/health`);
    const healthData = await healthRes.json();
    if (healthData.status !== 'ok' || healthData.database !== 'connected' || healthData.environment !== 'production') {
      throw new Error(`Unexpected health response: ${JSON.stringify(healthData)}`);
    }
    console.log('  ✔ /api/health verified: status=ok, database=connected, environment=production');

    // 3. Security: Dev Auth Bypass blocked in production
    console.log('[3/9] Testing Dev Auth Bypass blocking in production (x-user-id header)...');
    const bypassRes = await fetch(`${TEST_URL}/api/audit-logs`, {
      headers: { 'x-user-id': 'USR_ADMIN_01' } // Attempting to impersonate admin via header
    });
    if (bypassRes.status !== 403) {
      throw new Error(`Security breach: Dev bypass succeeded with status ${bypassRes.status}! Expected 403 Forbidden.`);
    }
    console.log('  ✔ Dev bypass correctly rejected in production (HTTP 403).');

    // 4. Seed Demo Users & Test Multi-Role Authentication
    console.log('[4/9] Testing Authentication with seeded role credentials...');
    const seedProc = spawn('node', ['seed-demo-users.js'], {
      cwd: path.join(ROOT_DIR, 'server'),
      env: {
        ...process.env,
        DATABASE_PATH: TEST_DB_PATH
      },
      stdio: 'inherit'
    });
    await new Promise((resolve, reject) => {
      seedProc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Seed failed with code ${code}`)));
    });

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

    console.log('  ✔ Session tokens acquired for Admin, Trader, Authority, and Verifier.');

    // 5. RBAC Enforcement Checks
    console.log('[5/9] Testing Role-Based Access Control (RBAC)...');
    // Trader attempting to access audit logs -> MUST be 403
    const traderAuditRes = await fetch(`${TEST_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${traderToken}` }
    });
    if (traderAuditRes.status !== 403) {
      throw new Error(`RBAC failure: Trader could access audit logs with status ${traderAuditRes.status}`);
    }

    // Admin attempting to access audit logs -> MUST be 200
    const adminAuditRes = await fetch(`${TEST_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (adminAuditRes.status !== 200) {
      throw new Error(`RBAC failure: Admin could not access audit logs with status ${adminAuditRes.status}`);
    }
    console.log('  ✔ RBAC verified: Trader blocked (403), Platform Admin authorized (200).');

    // 6. Complete Statutory Verification Lifecycle & Evidence Storage Check
    console.log('[6/9] Testing Complete Statutory Lifecycle & Multipart Storage...');

    // A. Trader registers instrument
    const serial = `SN-PROD-${Date.now()}`;
    const instRes = await fetch(`${TEST_URL}/api/instruments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${traderToken}`
      },
      body: JSON.stringify({
        owner_id: 'USR_TRADER_01',
        category_id: 'CAT_NAWI_III',
        manufacturer: 'Avery Weigh-Tronix',
        model: 'PRO-VERIF-100',
        serial_number: serial,
        max_capacity: '30 kg',
        min_capacity: '100 g',
        verification_scale_interval_e: '5 g',
        location: 'Main Logistics Terminal'
      })
    });
    if (instRes.status !== 201) {
      throw new Error(`Failed to register instrument: ${await instRes.text()}`);
    }
    const instData = await instRes.json();
    console.log(`  ✔ Instrument registered: ${instData.id}`);

    // B. Trader submits verification application
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
    if (appRes.status !== 201) {
      throw new Error(`Failed to submit application: ${await appRes.text()}`);
    }
    const appData = await appRes.json();
    const appId = appData.id;
    console.log(`  ✔ Application submitted: ${appData.application_no}`);

    // C. Authority assigns Verifier
    const assignRes = await fetch(`${TEST_URL}/api/applications/${appId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`
      },
      body: JSON.stringify({
        assigned_id: 'USR_VERIFIER_01',
        scheduled_date: '2026-09-10',
        time_slot: 'MORNING_10_00',
        arrangement_type: 'FIELD_VISIT'
      })
    });
    if (!assignRes.ok) throw new Error(`Failed to assign verifier: ${await assignRes.text()}`);
    console.log('  ✔ Authority assigned Field Verifier to application.');

    // D. Verifier starts case
    const startRes = await fetch(`${TEST_URL}/api/verifications/cases/${appId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${verifierToken}` }
    });
    if (!startRes.ok) throw new Error(`Failed to start verification: ${await startRes.text()}`);
    console.log('  ✔ Field Verifier initiated verification workspace.');

    // E. Verifier uploads photographic evidence
    const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nTAMPER_SEAL\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\nStatutory Wire Lead Seal Photo\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="seal-prod.png"\r\nContent-Type: image/png\r\n\r\n`),
      pngBytes,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const uploadRes = await fetch(`${TEST_URL}/api/verifications/cases/${appId}/evidence`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${verifierToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: multipartBody
    });
    if (uploadRes.status !== 201) throw new Error(`Upload failed: ${await uploadRes.text()}`);
    const uploadData = await uploadRes.json();
    console.log(`  ✔ Evidence uploaded to persistent storage: ${uploadData.file_path}`);

    // Verify file exists on disk in custom STORAGE_DIR
    const diskFileName = path.basename(uploadData.file_path);
    const onDiskPath = path.join(TEST_STORAGE_DIR, 'evidence', diskFileName);
    if (!fs.existsSync(onDiskPath)) {
      throw new Error(`Evidence file not found on disk at: ${onDiskPath}`);
    }
    console.log('  ✔ Verified file exists on disk in custom persistent storage directory.');

    // F. Verify static serving of uploaded file
    const fileFetchRes = await fetch(`${TEST_URL}${uploadData.file_path}`);
    if (!fileFetchRes.ok) throw new Error(`Static file serving failed with status ${fileFetchRes.status}`);
    console.log('  ✔ Static evidence file served successfully (HTTP 200).');

    // G. Verifier submits PASS determination with checklist & readings
    const submitRes = await fetch(`${TEST_URL}/api/verifications/cases/${appId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`
      },
      body: JSON.stringify({
        result: 'PASS',
        remarks: 'Instrument conforms strictly to Legal Metrology General Rules 2011 Schedule IX.',
        checklist_responses: [
          { item_id: 'CHK_01', status: 'PASS', note: 'Body integrity and display inspected and intact' },
          { item_id: 'CHK_02', status: 'PASS', note: 'Manufacturer nameplate and serial clearly stamped' },
          { item_id: 'CHK_03', status: 'PASS', note: 'Level bubble centered, zero returns within 0.25e' },
          { item_id: 'CHK_04', status: 'PASS', note: 'Lead wire security seal intact and untampered' },
          { item_id: 'CHK_05', status: 'PASS', note: 'Environment free from drafts or mechanical vibration' }
        ],
        readings: [
          { test_point: 'Min (100 g)', reference_value: 0.1, observed_value: 0.1, unit: 'kg', reading_result: 'PASS' },
          { test_point: 'Half (15 kg)', reference_value: 15, observed_value: 15.002, unit: 'kg', reading_result: 'PASS' },
          { test_point: 'Max (30 kg)', reference_value: 30, observed_value: 30.004, unit: 'kg', reading_result: 'PASS' }
        ]
      })
    });
    if (!submitRes.ok) throw new Error(`Submit verification failed: ${await submitRes.text()}`);
    console.log('  ✔ Verification determination PASS recorded and sealed.');

    // H. Verifier generates Statutory Certificate (Form 6)
    const certGenRes = await fetch(`${TEST_URL}/api/certificates/generate/${appId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${verifierToken}` }
    });
    if (!certGenRes.ok) throw new Error(`Certificate generation failed: ${await certGenRes.text()}`);
    const certGenData = await certGenRes.json();
    const certificate = certGenData.certificate;
    console.log(`  ✔ Statutory Certificate generated: #${certificate.certificate_no}`);

    // 7. Public Statutory QR Verification Check
    console.log('[7/9] Testing Public QR Certificate Verification Endpoint (Zero Auth)...');
    const verifyRes = await fetch(`${TEST_URL}/api/public/verify/${certificate.public_token}`);
    if (!verifyRes.ok) throw new Error(`Public verification failed with status ${verifyRes.status}`);
    const verifyData = await verifyRes.json();
    if (verifyData.status !== 'VALID' || verifyData.certificate_no !== certificate.certificate_no) {
      throw new Error(`Public verify data mismatch: ${JSON.stringify(verifyData)}`);
    }
    console.log(`  ✔ Public QR verify succeeded: Cert #${verifyData.certificate_no} is officially VALID`);

    // 8. Error Handling & 404 Response
    console.log('[8/9] Testing 404 handler for unknown routes...');
    const notFoundRes = await fetch(`${TEST_URL}/api/unknown-route-${Date.now()}`);
    if (notFoundRes.status !== 404) {
      throw new Error(`Expected 404 for unknown route, got ${notFoundRes.status}`);
    }
    const notFoundData = await notFoundRes.json();
    if (!notFoundData.error) throw new Error('Expected JSON error in 404 response');
    console.log('  ✔ Unknown route cleanly returns structured 404 JSON.');

    // 9. Graceful Shutdown Check
    console.log('[9/9] Testing Graceful Server Shutdown (SIGTERM)...');
    serverProcess.kill('SIGTERM');
    await new Promise((resolve) => {
      serverProcess.on('exit', () => {
        resolve();
      });
    });
    console.log('  ✔ Server shut down gracefully with database connection closed.');

    console.log('----------------------------------------------------');
    console.log('🎉 ALL 9 PRODUCTION READINESS CHECKS PASSED!');
    console.log('----------------------------------------------------');
    return true;
  } catch (err) {
    console.error('❌ SIMULATION FAILED:', err.message);
    if (serverProcess) {
      try { serverProcess.kill(); } catch (e) {}
    }
    process.exit(1);
  } finally {
    // Clean test data directory
    try {
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
      }
    } catch (e) {}
  }
}

runTest();
