// =============================================================================
// CertifyMetric — Complete End-to-End Workflow & Security Verification Suite
// =============================================================================
// Covers Scenarios:
//  - Scenario A: Field Verification Workflow (Trader -> Authority -> Verifier -> Authority -> Cert -> QR)
//  - Scenario B: GATC Testing Workflow (Trader -> Authority -> GATC Lab -> Authority -> Cert)
//  - Scenario C: Return & Resubmit Workflow (Authority Return -> Trader Resubmit -> Scrutiny)
//  - Scenario D: Rejection Workflow (Authority Reject -> Terminal state)
//  - Scenario E: Security & RBAC 403 Matrix (Forbidden role operations, unauthenticated isolation)
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

const TEST_PORT = 4250 + Math.floor(Math.random() * 50);
const TEST_URL = `http://127.0.0.1:${TEST_PORT}`;
let serverProcess = null;

const DEMO_USERS = {
  TRADER: { email: 'demo.trader@certifymetric.local', password: 'DemoTrader@2026' },
  AUTHORITY: { email: 'demo.authority@certifymetric.local', password: 'DemoAuthority@2026' },
  VERIFIER: { email: 'demo.verifier@certifymetric.local', password: 'DemoVerifier@2026' },
  GATC: { email: 'demo.gatc@certifymetric.local', password: 'DemoGatc@2026' },
  ADMIN: { email: 'demo.admin@certifymetric.local', password: 'DemoAdmin@2026' }
};

const TOKENS = {};

async function api(endpoint, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${TEST_URL}${endpoint}`, {
    ...options,
    headers
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runSuite() {
  try {
    console.log('=============================================================================');
    console.log('🚀 CERTIFYMETRIC END-TO-END WORKFLOW & SECURITY TEST SUITE');
    console.log('=============================================================================');

    // 1. Start Server
    console.log(`\n[INIT] Starting test backend server on port ${TEST_PORT}...`);
    serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(ROOT_DIR, 'server'),
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        HOST: '127.0.0.1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (d) => {
      const line = d.toString().trim();
      if (line && !line.includes('connecting')) console.log('  [SERVER]', line);
    });
    serverProcess.stderr.on('data', (d) => {
      const line = d.toString().trim();
      if (line) console.error('  [SERVER ERR]', line);
    });

    let ready = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 250));
      try {
        const res = await fetch(`${TEST_URL}/api/health`);
        if (res.ok) {
          const data = await res.json();
          if (data.database === 'connected') {
            ready = true;
            break;
          }
        }
      } catch (e) {}
    }

    if (!ready) {
      throw new Error(`Server failed to start or connect to MongoDB Atlas within 10s.`);
    }
    console.log('✔ Backend server booted and connected to MongoDB Atlas.\n');

    // 2. Authenticate all roles
    console.log('[AUTH] Logging in all authoritative roles...');
    for (const [role, creds] of Object.entries(DEMO_USERS)) {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(creds)
      });
      assert(res.ok && res.data.token, `Failed to login as ${role}: ${JSON.stringify(res.data)}`);
      TOKENS[role] = res.data.token;
      console.log(`  ✔ Authenticated ${role} (${creds.email})`);
    }

    // -------------------------------------------------------------------------
    // SCENARIO A: FIELD VERIFICATION WORKFLOW
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------------------------------');
    console.log('▶ SCENARIO A: Complete Field Verification Lifecycle');
    console.log('-----------------------------------------------------------------------------');

    // A1: Trader creates instrument
    const serialA = `INST-AUTO-${Date.now()}-A`;
    const instResA = await api('/api/instruments', {
      method: 'POST',
      body: JSON.stringify({
        category_id: 'CAT_NAWI_III',
        serial_number: serialA,
        manufacturer: 'Precision Weighing India Pvt Ltd',
        model: 'WeighMaster Alpha Pro 5000',
        max_capacity: '1000',
        min_capacity: '2',
        verification_scale_interval_e: '0.1',
        location: 'Plot 45, Okhla Industrial Area Phase-III, New Delhi',
        district: 'Central Delhi, Delhi',
        specs: { accuracy_class: 'III' }
      })
    }, TOKENS.TRADER);
    assert(instResA.ok && instResA.data.id, `Trader failed to create instrument: ${JSON.stringify(instResA.data)}`);
    const instrumentIdA = instResA.data.id;
    console.log(`  [A1] Trader created instrument: ${instrumentIdA} (${serialA})`);

    // A2: Trader creates application
    const appResA = await api('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        instrument_id: instrumentIdA,
        request_type: 'ORIGINAL',
        verification_mode: 'IN_SITU',
        preferred_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        location_address: 'Plot 45, Okhla Industrial Area Phase-III, New Delhi',
        contact_person: 'Ramesh Sharma',
        contact_phone: '9876543210',
        documents: [
          { type: 'INVOICE', name: 'Purchase_Invoice.pdf', url: 'https://example.com/inv.pdf' }
        ]
      })
    }, TOKENS.TRADER);
    assert(appResA.ok && appResA.data.id, `Trader failed to create application: ${JSON.stringify(appResA.data)}`);
    const appIdA = appResA.data.id;
    console.log(`  [A2] Trader submitted application: ${appIdA} (status: ${appResA.data.status}, fee_status: ${appResA.data.fee_status})`);

    // A3: Trader submits offline payment challan
    const payResA = await api(`/api/applications/${appIdA}/payment`, {
      method: 'POST',
      body: JSON.stringify({
        payment_method: 'OFFLINE_CHALLAN',
        challan_number: `CHALLAN-DELHI-2026-${Date.now()}`,
        bank_name: 'State Bank of India',
        branch_name: 'Okhla Branch',
        amount_paid: 2500,
        remarks: 'Paid via SBI Treasury Portal'
      })
    }, TOKENS.TRADER);
    assert(payResA.ok && payResA.data.application?.fee_status === 'PENDING_VERIFICATION', `Offline payment failed: ${JSON.stringify(payResA.data)}`);
    console.log(`  [A3] Trader submitted offline challan payment -> fee_status: PENDING_VERIFICATION`);

    // A4: Authority officer verifies offline payment
    const verifyPayResA = await api(`/api/applications/${appIdA}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({
        notes: 'Challan verified against SBI Treasury portal bank statement.'
      })
    }, TOKENS.AUTHORITY);
    assert(verifyPayResA.ok && verifyPayResA.data.application?.fee_status === 'PAID', `Authority failed to verify payment: ${JSON.stringify(verifyPayResA.data)}`);
    console.log(`  [A4] Authority Officer verified offline payment -> fee_status: PAID, app status: ${verifyPayResA.data.application.status}`);

    // A5: Authority reviews and puts UNDER_REVIEW
    const reviewResA = await api(`/api/applications/${appIdA}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'UNDER_REVIEW',
        remarks: 'Documents and treasury challan verified. Proceeding with field verifier assignment.'
      })
    }, TOKENS.AUTHORITY);
    assert(reviewResA.ok, `Authority failed review: ${JSON.stringify(reviewResA.data)}`);
    console.log(`  [A5] Authority scrutiny completed -> status: UNDER_REVIEW`);

    // A6: Authority assigns to Field Verifier (USR_VERIFIER_01)
    const assignResA = await api(`/api/applications/${appIdA}/assign`, {
      method: 'POST',
      body: JSON.stringify({
        assigned_id: 'USR_VERIFIER_01',
        is_override: 0,
        override_reason: ''
      })
    }, TOKENS.AUTHORITY);
    assert(assignResA.ok && (assignResA.data.status === 'ASSIGNED' || assignResA.data.application?.status === 'ASSIGNED'), `Authority failed to assign: ${JSON.stringify(assignResA.data)}`);
    console.log(`  [A6] Authority assigned case to Field Verifier (USR_VERIFIER_01) -> status: ASSIGNED`);

    // A7: Field Verifier fetches assigned cases
    const verifierCases = await api('/api/verifications/cases', {}, TOKENS.VERIFIER);
    assert(verifierCases.ok && Array.isArray(verifierCases.data), `Verifier failed to list cases`);
    const myCase = verifierCases.data.find(c => c.application_id === appIdA);
    assert(myCase, `Assigned case ${appIdA} not found in Field Verifier's queue`);
    console.log(`  [A7] Field Verifier fetched assigned cases -> found case ${appIdA}`);

    // A8: Field Verifier starts verification
    await api(`/api/verifications/cases/${appIdA}/start`, { method: 'POST' }, TOKENS.VERIFIER);

    // A9: Field Verifier submits technical inspection report with readings
    // Readings: Class III e=0.1kg, max=1000kg.
    // 50kg (500e): error 0.02kg <= MPE 0.05kg (PASS)
    // 100kg (1000e): error 0.04kg <= MPE 0.10kg (PASS)
    // 500kg (5000e): error 0.08kg <= MPE 0.15kg (PASS)
    const submitReportResA = await api(`/api/verifications/cases/${appIdA}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        result: 'PASS',
        remarks: 'Physical inspection completed. Model stamp intact, level bubble centered, load cell calibrated.',
        readings: [
          { test_point: '50 kg', reference_value: 50.00, observed_value: 50.02, unit: 'kg' },
          { test_point: '100 kg', reference_value: 100.00, observed_value: 100.04, unit: 'kg' },
          { test_point: '500 kg', reference_value: 500.00, observed_value: 500.08, unit: 'kg' }
        ],
        checklist_responses: [
          { item_id: 'CHK_01', status: 'PASS', note: 'Visual inspection passed' },
          { item_id: 'CHK_02', status: 'PASS', note: 'Model plate verified' },
          { item_id: 'CHK_03', status: 'PASS', note: 'Level bubble centered' },
          { item_id: 'CHK_04', status: 'PASS', note: 'Lead seal intact' },
          { item_id: 'CHK_05', status: 'PASS', note: 'Draft free ambient' }
        ]
      })
    }, TOKENS.VERIFIER);
    assert(submitReportResA.ok, `Field Verifier report submission failed: ${JSON.stringify(submitReportResA.data)}`);
    assert(submitReportResA.data.result === 'PASS', `Expected server-calculated result PASS, got ${submitReportResA.data.result}`);
    console.log(`  [A8] Field Verifier submitted technical report -> Server MPE evaluated: PASS, readings recorded with permissible errors.`);

    // A10: Verify application status transitioned to REPORT_SUBMITTED
    const appCheckA = await api(`/api/applications/${appIdA}`, {}, TOKENS.AUTHORITY);
    assert(appCheckA.ok && appCheckA.data.status === 'REPORT_SUBMITTED', `Expected status REPORT_SUBMITTED, got ${appCheckA.data.status}`);
    console.log(`  [A9] Application state updated to: REPORT_SUBMITTED`);

    // A11: Authority reviews report and gives Legal Approval + Certificate Generation
    const approveResA = await api(`/api/applications/${appIdA}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        remarks: 'Verification verified against Legal Metrology Rules 2011 Schedule IX. Certificate authorized.'
      })
    }, TOKENS.AUTHORITY);
    assert(approveResA.ok && approveResA.data.certificate, `Authority approval failed: ${JSON.stringify(approveResA.data)}`);
    const certA = approveResA.data.certificate;
    const certNoA = certA.certificate_no || certA.certificate_number;
    const publicTokenA = certA.public_token || certA.public_verification_token;
    console.log(`  [A10] Authority approved application & issued Certificate: ${certNoA}`);
    assert(certNoA && certNoA.startsWith('LM-2026-'), `Invalid certificate number format: ${certNoA}`);
    assert(publicTokenA, `Missing public verification token`);

    // A12: Idempotency check: Calling certificate generate again returns the same certificate
    const reGenRes = await api(`/api/certificates/generate/${appIdA}`, { method: 'POST' }, TOKENS.AUTHORITY);
    const reGenCert = reGenRes.data.certificate || reGenRes.data;
    const reGenNo = reGenCert.certificate_no || reGenCert.certificate_number;
    assert(reGenRes.ok && reGenNo === certNoA, `Certificate generation not idempotent: ${JSON.stringify(reGenRes.data)}`);
    console.log(`  [A11] Certificate issuance idempotency confirmed: Returned existing certificate ${reGenNo}`);

    // A13: Unauthenticated Public QR Verification
    const publicVerifyRes = await api(`/api/public/verify/${publicTokenA}`);
    assert(publicVerifyRes.ok && publicVerifyRes.data.status === 'VALID', `Public verification failed: ${JSON.stringify(publicVerifyRes.data)}`);
    assert(!publicVerifyRes.data.applicant_internal_id, `Internal private data leaked in public QR verification`);
    console.log(`  [A12] Public QR Verification succeeded (unauthenticated): Status ${publicVerifyRes.data.status}, Certificate: ${publicVerifyRes.data.certificate_no}`);

    // -------------------------------------------------------------------------
    // SCENARIO B: GATC LAB WORKFLOW
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------------------------------');
    console.log('▶ SCENARIO B: GATC Lab Testing Workflow');
    console.log('-----------------------------------------------------------------------------');

    // B1: Trader creates instrument & application (Fuel Dispenser on GATC First Schedule)
    const serialB = `INST-GATC-${Date.now()}-B`;
    const instResB = await api('/api/instruments', {
      method: 'POST',
      body: JSON.stringify({
        category_id: 'CAT_FUEL_DISPENSER',
        serial_number: serialB,
        manufacturer: 'Gilbarco Veeder-Root India',
        model: 'SK700-II Multi-Product Pump',
        location: 'Bay 2, IOCL Retail Outlet, Delhi',
        district: 'Central Delhi, Delhi',
        specs: {
          product_type: 'Multi-Product (Petrol + Diesel)',
          number_of_nozzles: 4
        }
      })
    }, TOKENS.TRADER);
    assert(instResB.ok, `Failed to create instrument B: ${JSON.stringify(instResB.data)}`);
    const instrumentIdB = instResB.data.id;

    const appResB = await api('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        instrument_id: instrumentIdB,
        request_type: 'ORIGINAL',
        verification_mode: 'IN_SITU',
        preferred_date: new Date().toISOString().split('T')[0],
        location_address: 'Bay 2, IOCL Retail Outlet, Delhi',
        contact_person: 'Rajiv Malhotra',
        contact_phone: '9811223344'
      })
    }, TOKENS.TRADER);
    assert(appResB.ok, `Failed to create application B: ${JSON.stringify(appResB.data)}`);
    const appIdB = appResB.data.id;

    // B2: Pay & verify
    await api(`/api/applications/${appIdB}/payment`, {
      method: 'POST',
      body: JSON.stringify({
        payment_method: 'OFFLINE_CHALLAN',
        challan_number: `CHALLAN-GATC-${Date.now()}`,
        bank_name: 'Punjab National Bank',
        branch_name: 'Connaught Place',
        amount_paid: 5000
      })
    }, TOKENS.TRADER);
    await api(`/api/applications/${appIdB}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Verified GATC testing fee deposit.' })
    }, TOKENS.AUTHORITY);

    // B3: Authority assigns to GATC Lab
    const assignResB = await api(`/api/applications/${appIdB}/assign`, {
      method: 'POST',
      body: JSON.stringify({
        assigned_id: 'USR_GATC_01',
        is_override: 0,
        override_reason: ''
      })
    }, TOKENS.AUTHORITY);
    assert(assignResB.ok, `Failed to assign GATC: ${JSON.stringify(assignResB.data)}`);
    console.log(`  [B1] Case assigned to GATC Testing Lab (USR_GATC_01) -> status: ASSIGNED`);

    // B4: GATC fetches assigned cases
    const gatcCases = await api('/api/verifications/cases', {}, TOKENS.GATC);
    assert(gatcCases.ok && gatcCases.data.some(c => c.application_id === appIdB), `GATC case not found`);
    console.log(`  [B2] GATC Lab retrieved assigned case in lab queue`);

    // B5: GATC starts & submits Lab Test Report with environmental conditions
    await api(`/api/verifications/cases/${appIdB}/start`, { method: 'POST' }, TOKENS.GATC);

    const gatcSubmitRes = await api(`/api/verifications/cases/${appIdB}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        result: 'PASS',
        remarks: 'Laboratory environmental conditions stabilized. Reference E2 weights utilized.',
        lab_parameters: {
          chamber_temperature_c: '20.2',
          relative_humidity_pct: '52',
          standards_class: 'Class E2 & F1',
          calibration_certificate_ref: 'NPLI-CAL-2026-9812'
        },
        readings: [
          { test_point: '10 kg test', reference_value: 10.00, observed_value: 10.0002, unit: 'kg' },
          { test_point: '25 kg test', reference_value: 25.00, observed_value: 25.0005, unit: 'kg' }
        ],
        checklist_responses: [
          { item_id: 'CHK_SEAL', status: 'PASS', note: 'Standard traceability verified' },
          { item_id: 'CHK_TAMPER', status: 'PASS', note: 'Environmental chamber stable' }
        ]
      })
    }, TOKENS.GATC);
    assert(gatcSubmitRes.ok, `GATC submission failed: ${JSON.stringify(gatcSubmitRes.data)}`);
    console.log(`  [B3] GATC submitted Lab Test Report -> transitioned to GATC_REPORT_SUBMITTED with ambient parameters.`);

    // B6: Authority Final Review & Certificate
    const appCheckB = await api(`/api/applications/${appIdB}`, {}, TOKENS.AUTHORITY);
    assert(appCheckB.data.status === 'GATC_REPORT_SUBMITTED', `Expected status GATC_REPORT_SUBMITTED, got ${appCheckB.data.status}`);

    const approveResB = await api(`/api/applications/${appIdB}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks: 'GATC test data and NPL traceability certificates verified.' })
    }, TOKENS.AUTHORITY);
    const certB = approveResB.data.certificate;
    const certNoB = certB.certificate_no || certB.certificate_number;
    console.log(`  [B4] Authority reviewed GATC Report & issued Certificate: ${certNoB}`);

    // -------------------------------------------------------------------------
    // SCENARIO C: SCRUTINY RETURN & RESUBMISSION
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------------------------------');
    console.log('▶ SCENARIO C: Scrutiny Return & Resubmission Workflow');
    console.log('-----------------------------------------------------------------------------');

    const serialC = `INST-RETURN-${Date.now()}-C`;
    const instResC = await api('/api/instruments', {
      method: 'POST',
      body: JSON.stringify({
        category_id: 'CAT_NAWI_III',
        serial_number: serialC,
        manufacturer: 'Bharat Scales',
        model: 'Counter Scale CS-100',
        max_capacity: '30',
        min_capacity: '0.1',
        verification_scale_interval_e: '0.01',
        location: 'Shop 12, Main Bazaar, Chandni Chowk',
        district: 'Central Delhi, Delhi',
        specs: { accuracy_class: 'III' }
      })
    }, TOKENS.TRADER);
    const appIdC = (await api('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        instrument_id: instResC.data.id,
        request_type: 'REVERIFICATION',
        verification_mode: 'IN_SITU',
        preferred_date: new Date().toISOString().split('T')[0],
        location_address: 'Shop 12, Main Bazaar, Chandni Chowk',
        contact_person: 'Ramesh Sharma'
      })
    }, TOKENS.TRADER)).data.id;

    // Pay & verify
    await api(`/api/applications/${appIdC}/payment`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: 'OFFLINE_CHALLAN', challan_number: `CH-RET-${Date.now()}` })
    }, TOKENS.TRADER);
    await api(`/api/applications/${appIdC}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Challan verified' })
    }, TOKENS.AUTHORITY);

    // C1: Authority Returns application with mandatory reason
    const returnRes = await api(`/api/applications/${appIdC}/return`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Photograph of manufacturer identification plate and stamping seal is illegible. Please re-upload clear photos.'
      })
    }, TOKENS.AUTHORITY);
    assert(returnRes.ok, `Return failed: ${JSON.stringify(returnRes.data)}`);
    console.log(`  [C1] Authority returned application with mandatory reason -> status: RETURNED`);

    // C2: Trader views application and sees exact return reason
    const traderViewC = await api(`/api/applications/${appIdC}`, {}, TOKENS.TRADER);
    assert(traderViewC.data.status === 'RETURNED', `Status is not RETURNED`);
    assert(traderViewC.data.return_reason && traderViewC.data.return_reason.includes('manufacturer identification plate'), `Return remarks not visible to Trader`);
    console.log(`  [C2] Trader inspected returned application and read return remarks: "${traderViewC.data.return_reason}"`);

    // C3: Trader edits documents and resubmits
    const resubmitRes = await api(`/api/applications/${appIdC}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({
        documents: [
          { type: 'ID_PLATE_PHOTO', name: 'Clear_ID_Plate.jpg', url: 'https://example.com/clear_plate.jpg' }
        ],
        remarks: 'Uploaded high resolution photograph of stamping seal and ID plate.'
      })
    }, TOKENS.TRADER);
    assert(resubmitRes.ok, `Trader resubmit failed: ${JSON.stringify(resubmitRes.data)}`);
    console.log(`  [C3] Trader resubmitted application -> status returned to: ${resubmitRes.data.application.status}`);

    // C4: Authority sees application back in scrutiny queue
    const authorityViewC = await api(`/api/applications/${appIdC}`, {}, TOKENS.AUTHORITY);
    assert(authorityViewC.data.status === 'UNDER_REVIEW' || authorityViewC.data.status === 'SUBMITTED', `Status not back in review`);
    console.log(`  [C4] Authority verified resubmitted application is back under scrutiny.`);

    // -------------------------------------------------------------------------
    // SCENARIO D: STATUTORY REJECTION
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------------------------------');
    console.log('▶ SCENARIO D: Statutory Rejection Workflow');
    console.log('-----------------------------------------------------------------------------');

    const serialD = `INST-REJECT-${Date.now()}-D`;
    const instResD = await api('/api/instruments', {
      method: 'POST',
      body: JSON.stringify({
        category_id: 'CAT_NAWI_III',
        serial_number: serialD,
        manufacturer: 'Unapproved Scale Maker',
        model: 'Unapproved Scale X-10',
        max_capacity: '10',
        min_capacity: '0.1',
        verification_scale_interval_e: '0.01',
        location: 'Shop 99, Old Delhi',
        district: 'Central Delhi, Delhi',
        specs: { accuracy_class: 'III' }
      })
    }, TOKENS.TRADER);
    const appIdD = (await api('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        instrument_id: instResD.data.id,
        request_type: 'ORIGINAL',
        verification_mode: 'IN_SITU',
        preferred_date: new Date().toISOString().split('T')[0],
        location_address: 'Shop 99, Old Delhi'
      })
    }, TOKENS.TRADER)).data.id;

    // Authority rejects application
    const rejectRes = await api(`/api/applications/${appIdD}/reject`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Model approval number does not exist in national metrology repository. Rejected under Legal Metrology Act Section 19.'
      })
    }, TOKENS.AUTHORITY);
    assert(rejectRes.ok && rejectRes.data.status === 'REJECTED', `Rejection failed: ${JSON.stringify(rejectRes.data)}`);
    console.log(`  [D1] Authority rejected application -> status: REJECTED (terminal state)`);

    // Verify rejection cannot be approved for certificate
    const illegalApprove = await api(`/api/applications/${appIdD}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks: 'Illegal approve attempt' })
    }, TOKENS.AUTHORITY);
    assert(illegalApprove.status === 400 || illegalApprove.status === 403, `Illegal approval of rejected application was not blocked (HTTP ${illegalApprove.status})`);
    console.log(`  [D2] Verified rejected application cannot be approved or certified (HTTP ${illegalApprove.status}).`);

    // -------------------------------------------------------------------------
    // SCENARIO E: RBAC & SECURITY MATRIX ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------------------------------');
    console.log('▶ SCENARIO E: Security & RBAC 403 Forbidden Matrix');
    console.log('-----------------------------------------------------------------------------');

    // E1: Trader attempts Authority Approval -> 403
    const e1 = await api(`/api/applications/${appIdA}/approve`, { method: 'POST' }, TOKENS.TRADER);
    assert(e1.status === 403, `Expected 403 for Trader approval, got ${e1.status}`);
    console.log('  ✔ [E1] Trader blocked from approving application (HTTP 403 Forbidden)');

    // E2: Trader attempts Verifier Assignment -> 403
    const e2 = await api(`/api/applications/${appIdA}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_id: 'USR_VERIFIER_01' })
    }, TOKENS.TRADER);
    assert(e2.status === 403, `Expected 403 for Trader assignment, got ${e2.status}`);
    console.log('  ✔ [E2] Trader blocked from assigning verifiers (HTTP 403 Forbidden)');

    // E3: Field Verifier attempts Certificate Generation -> 403
    const e3 = await api(`/api/certificates/generate/${appIdA}`, { method: 'POST' }, TOKENS.VERIFIER);
    assert(e3.status === 403, `Expected 403 for Verifier cert generation, got ${e3.status}`);
    console.log('  ✔ [E3] Field Verifier blocked from generating certificates (HTTP 403 Forbidden)');

    // E4: Field Verifier attempts Application Legal Approval -> 403
    const e4 = await api(`/api/applications/${appIdA}/approve`, { method: 'POST' }, TOKENS.VERIFIER);
    assert(e4.status === 403, `Expected 403 for Verifier legal approval, got ${e4.status}`);
    console.log('  ✔ [E4] Field Verifier blocked from approving applications (HTTP 403 Forbidden)');

    // E5: GATC Lab attempts Certificate Generation -> 403
    const e5 = await api(`/api/certificates/generate/${appIdB}`, { method: 'POST' }, TOKENS.GATC);
    assert(e5.status === 403, `Expected 403 for GATC cert generation, got ${e5.status}`);
    console.log('  ✔ [E5] GATC Lab blocked from generating certificates (HTTP 403 Forbidden)');

    // E6: GATC Lab attempts Application Legal Approval -> 403
    const e6 = await api(`/api/applications/${appIdB}/approve`, { method: 'POST' }, TOKENS.GATC);
    assert(e6.status === 403, `Expected 403 for GATC legal approval, got ${e6.status}`);
    console.log('  ✔ [E6] GATC Lab blocked from approving applications (HTTP 403 Forbidden)');

    // E7: Platform Admin blocked from statutory certificate generation (Admin != Authority)
    const e7 = await api(`/api/certificates/generate/${appIdA}`, { method: 'POST' }, TOKENS.ADMIN);
    assert(e7.status === 403, `Expected 403 for Admin cert generation, got ${e7.status}`);
    console.log('  ✔ [E7] Platform Admin blocked from statutory certificate generation (HTTP 403 Forbidden)');

    // E8: Unauthenticated access to protected cases list -> 401 / 403
    const e8 = await api('/api/verifications/cases');
    assert(e8.status === 401 || e8.status === 403, `Expected 401/403 for unauthenticated request, got ${e8.status}`);
    console.log(`  ✔ [E8] Unauthenticated requests rejected (HTTP ${e8.status})`);

    // E9: Public QR verify does not require auth and returns 404 for invalid token
    const e9 = await api('/api/public/verify/INVALID-TOKEN-XYZ-999');
    assert(e9.status === 404, `Expected 404 for invalid public QR token, got ${e9.status}`);
    console.log('  ✔ [E9] Public QR route handles non-existent tokens with clean 404');

    console.log('\n=============================================================================');
    console.log('🎉 ALL WORKFLOW SCENARIOS & SECURITY CHECKS PASSED WITH 100% SUCCESS!');
    console.log('=============================================================================');

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    process.exit(1);
  } finally {
    if (serverProcess) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/PID', String(serverProcess.pid), '/T', '/F']);
        } else {
          serverProcess.kill('SIGTERM');
        }
      } catch (e) {}
    }
  }
}

runSuite();
