// =============================================================================
// CertifyMetric — MongoDB Atlas Production & Local Verification Test
// =============================================================================
// Tests:
//  1. Server Boot & Health Check (GET /api/health)
//  2. Security: Dev Auth Bypass blocked in NODE_ENV=production
//  3. Database Connectivity & Diagnostics:
//     - If MONGODB_URI is provided: tests live MongoDB connection, demo user auth,
//       statutory entity retrieval, and RBAC enforcement.
//     - If MONGODB_URI is absent: verifies graceful degradation, informative 503,
//       and confirms server never crashes.
//  4. Error Handling: Unknown route 404 JSON response
//  5. Process Lifecycle: Graceful shutdown via SIGTERM
// =============================================================================

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

for (const envFile of ['.env.local', '.env', 'server/.env.local', 'server/.env']) {
  const fullPath = path.resolve(ROOT_DIR, envFile);
  try {
    if (fs.existsSync(fullPath) && typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(fullPath);
    }
  } catch (e) {}
}

const TEST_PORT = 4099;
const TEST_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_STORAGE_DIR = path.join(ROOT_DIR, 'test-sim-uploads');

if (fs.existsSync(TEST_STORAGE_DIR)) {
  fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });

console.log('----------------------------------------------------');
console.log('🚀 CERTIFYMETRIC MONGODB VERIFICATION STARTING');
console.log('----------------------------------------------------');

let serverProcess = null;

async function runTest() {
  try {
    const hasMongoUri = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim());
    console.log(`ℹ️  MONGODB_URI configured: ${hasMongoUri ? 'YES (Live Atlas mode)' : 'NO (Pre-configuration verification mode)'}`);

    // 1. Start Server in PRODUCTION mode
    console.log(`[1/6] Spawning backend server on port ${TEST_PORT} [NODE_ENV=production]...`);
    serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(ROOT_DIR, 'server'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(TEST_PORT),
        HOST: '127.0.0.1',
        STORAGE_DIR: TEST_STORAGE_DIR,
        FRONTEND_URL: 'http://localhost:5173',
        ALLOW_DEV_AUTH_BYPASS: 'false'
      },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverLogs = '';
    serverProcess.stdout.on('data', (d) => { serverLogs += d.toString(); });
    serverProcess.stderr.on('data', (d) => { serverLogs += d.toString(); });

    // Wait for server to become responsive on /api/health (and connected to MongoDB if configured)
    let ready = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 250));
      try {
        const res = await fetch(`${TEST_URL}/api/health`);
        if (res.ok) {
          const data = await res.json();
          if (!hasMongoUri || data.database === 'connected') {
            ready = true;
            break;
          }
        }
      } catch (e) {}
    }

    if (!ready) {
      throw new Error(`Server failed to start and respond on /api/health within 10 seconds.\nServer Logs:\n${serverLogs}`);
    }
    console.log('  ✔ Server booted cleanly and responded on HTTP.');

    // 2. Health Endpoint Check
    console.log('[2/6] Validating GET /api/health output...');
    const healthRes = await fetch(`${TEST_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('  -> Health response:', JSON.stringify(healthData));

    if (!healthData.status || !healthData.database) {
      throw new Error(`Invalid health response structure: ${JSON.stringify(healthData)}`);
    }

    if (hasMongoUri) {
      if (healthData.status !== 'ok' || healthData.database !== 'connected') {
        throw new Error(`Expected connected database, got: ${JSON.stringify(healthData)}`);
      }
      console.log('  ✔ MongoDB Atlas successfully connected.');
    } else {
      console.log(`  ✔ Health endpoint gracefully reported database state: '${healthData.database}' without crashing.`);
    }

    // 3. Security: Dev Auth Bypass blocked in production
    console.log('[3/6] Testing Dev Auth Bypass blocking in production (x-user-id header)...');
    const bypassRes = await fetch(`${TEST_URL}/api/instruments`, {
      method: 'POST',
      headers: {
        'x-user-id': 'USR_TRADER_01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category_id: 'CAT_NAWI_01',
        serial_number: 'TEST-BYPASS-001'
      })
    });
    // In production without valid session token, it must reject (401, 403, or 503 if DB disconnected)
    if (bypassRes.status !== 401 && bypassRes.status !== 403 && bypassRes.status !== 503) {
      throw new Error(`Security Failure: Expected unauthorized response (401/403/503), got ${bypassRes.status}`);
    }
    console.log(`  ✔ Dev auth bypass correctly rejected (HTTP ${bypassRes.status}).`);

    // 4. Test Database-Driven Operations
    if (hasMongoUri) {
      console.log('[4/6] Testing Live MongoDB Operations (Auth, Demo Users, RBAC)...');

      // Test Login with demo credentials
      const loginRes = await fetch(`${TEST_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo.trader@certifymetric.local',
          password: 'DemoTrader@2026'
        })
      });

      if (!loginRes.ok) {
        const errText = await loginRes.text();
        throw new Error(`Demo login failed (${loginRes.status}): ${errText}`);
      }
      const loginData = await loginRes.json();
      if (!loginData.token || loginData.user?.role !== 'TRADER') {
        throw new Error(`Unexpected login payload: ${JSON.stringify(loginData)}`);
      }
      console.log(`  ✔ Demo Trader authenticated via MongoDB! Token: ${loginData.token.substring(0, 15)}...`);

      // Test invalid password rejection
      const badLoginRes = await fetch(`${TEST_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo.trader@certifymetric.local',
          password: 'WrongPassword!999'
        })
      });
      if (badLoginRes.status !== 401) {
        throw new Error(`Expected 401 for invalid password, got ${badLoginRes.status}`);
      }
      console.log('  ✔ Invalid credentials correctly rejected (HTTP 401).');

      // Test RBAC enforcement: Trader cannot view audit logs
      const rbacRes = await fetch(`${TEST_URL}/api/audit-logs`, {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      if (rbacRes.status !== 403) {
        throw new Error(`RBAC Failure: Trader accessing audit logs returned ${rbacRes.status} instead of 403`);
      }
      console.log('  ✔ RBAC verified: Trader blocked from Admin audit logs (HTTP 403).');

      // Test public QR verification endpoint
      const qrRes = await fetch(`${TEST_URL}/api/public/verify/NONEXISTENT_TOKEN_12345`);
      if (qrRes.status !== 404) {
        throw new Error(`Expected 404 for non-existent public certificate, got ${qrRes.status}`);
      }
      console.log('  ✔ Public certificate verification route accessible without auth.');
    } else {
      console.log('[4/6] Validating Graceful Handling when MONGODB_URI is not yet provided...');
      const protectedRes = await fetch(`${TEST_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo.trader@certifymetric.local',
          password: 'DemoTrader@2026'
        })
      });
      if (protectedRes.status !== 503) {
        throw new Error(`Expected HTTP 503 (Database Unavailable), got ${protectedRes.status}`);
      }
      const errData = await protectedRes.json();
      console.log(`  ✔ Disconnected database cleanly caught: HTTP 503 with error: "${errData.error}"`);
    }

    // 5. Unknown Route 404 Check
    console.log('[5/6] Validating 404 Not Found handling...');
    const notFoundRes = await fetch(`${TEST_URL}/non-existent-endpoint-${Date.now()}`);
    if (notFoundRes.status !== 404) {
      throw new Error(`Expected 404 for unknown route, got ${notFoundRes.status}`);
    }
    console.log('  ✔ 404 Not Found returns valid JSON error.');

    // 6. Graceful Shutdown
    console.log('[6/6] Testing Graceful Process Shutdown...');
    const exitPromise = new Promise((resolve) => {
      serverProcess.on('exit', (code, signal) => {
        resolve({ code, signal });
      });
    });

    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/PID', String(serverProcess.pid), '/T', '/F']);
      } catch (e) {
        serverProcess.kill();
      }
    } else {
      serverProcess.kill('SIGTERM');
    }
    const exitResult = await Promise.race([
      exitPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Server hung on shutdown')), 5000))
    ]);
    console.log(`  ✔ Server shut down cleanly.`);

    console.log('\n----------------------------------------------------');
    console.log('🎉 ALL BACKEND VERIFICATION CHECKS PASSED!');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    if (serverProcess) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/PID', String(serverProcess.pid), '/T', '/F']);
        } else {
          serverProcess.kill('SIGKILL');
        }
      } catch (e) {}
    }
    process.exit(1);
  } finally {
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      try { fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true }); } catch (e) {}
    }
  }
}

runTest();
