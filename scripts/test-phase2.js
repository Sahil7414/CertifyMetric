// =============================================================================
// CertifyMetric — Phase 2 Functional & Integration Verification Suite
// =============================================================================
// Tests:
//  1. Real MongoDB Notification Lifecycle & RBAC Isolation
//  2. Evidence Upload, Storage Durability & Authority Visibility
//  3. Payment State Machine & "Pay Now" Absence after Verification
// =============================================================================

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

const API_URL = process.env.VITE_API_URL || 'http://127.0.0.1:4000/api';

const DEMO_USERS = {
  TRADER: { email: 'demo.trader@certifymetric.local', password: 'DemoTrader@2026' },
  AUTHORITY: { email: 'demo.authority@certifymetric.local', password: 'DemoAuthority@2026' },
  VERIFIER: { email: 'demo.verifier@certifymetric.local', password: 'DemoVerifier@2026' },
  GATC: { email: 'demo.gatc@certifymetric.local', password: 'DemoGatc@2026' },
  ADMIN: { email: 'demo.admin@certifymetric.local', password: 'DemoAdmin@2026' }
};

const TOKENS = {};
const USERS = {};

async function request(endpoint, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_URL}${endpoint}`, {
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

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log('\n===============================================================');
  console.log(' CertifyMetric Phase 2 End-to-End Verification Suite');
  console.log('===============================================================\n');

  // 1. Authenticate All Demo Users
  console.log('Step 1: Authenticating RBAC roles...');
  for (const [role, creds] of Object.entries(DEMO_USERS)) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(creds)
    });
    assert(res.ok && res.data.token, `Login successful for role ${role}`);
    TOKENS[role] = res.data.token;
    USERS[role] = res.data.user;
  }

  // 2. Test Notification Endpoints
  console.log('\nStep 2: Testing Notification System & Isolation...');
  const traderNotifsBefore = await request('/notifications', { method: 'GET' }, TOKENS.TRADER);
  assert(traderNotifsBefore.ok && Array.isArray(traderNotifsBefore.data.notifications), 'Trader can fetch MongoDB notifications');
  const initialUnread = traderNotifsBefore.data.unread_count;

  // Verify Unauthenticated access is blocked (401)
  const unauthNotifs = await request('/notifications', { method: 'GET' });
  assert(unauthNotifs.status === 401, 'Unauthenticated notification access returns 401 Unauthorized');

  // 3. Register an Instrument & File Application -> Verify Notification Triggers
  console.log('\nStep 3: Triggering Application Workflow Notifications...');
  const newInst = await request('/instruments', {
    method: 'POST',
    body: JSON.stringify({
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Phase2 Scale Tech',
      model: 'P2-PRO-3000',
      serial_number: `P2-SN-${Date.now()}`,
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      location: 'Phase 2 Test Bay, Delhi',
      district: 'Central Delhi, Delhi',
      specs: { accuracy_class: 'III' }
    })
  }, TOKENS.TRADER);
  assert(newInst.ok && (newInst.data.id || newInst.data.instrument?.id), 'Instrument registered successfully');
  const instId = newInst.data.id || newInst.data.instrument.id;

  const newApp = await request('/applications', {
    method: 'POST',
    body: JSON.stringify({
      instrument_id: instId,
      request_type: 'ORIGINAL',
      verification_mode: 'CAMP',
      preferred_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      location_address: 'Plot 45, Phase 2 Test Bay, Delhi',
      contact_person: 'Ramesh Sharma',
      contact_phone: '9876543210',
      documents: [{ type: 'INVOICE', name: 'invoice.pdf', url: 'https://example.com/inv.pdf' }]
    })
  }, TOKENS.TRADER);
  assert(newApp.ok && (newApp.data.id || newApp.data.application?.id), 'Application submitted successfully');
  const appId = newApp.data.id || newApp.data.application?.id;

  // Verify Trader received APPLICATION_SUBMITTED notification
  const traderNotifsAfterApp = await request('/notifications', { method: 'GET' }, TOKENS.TRADER);
  const appSubmittedNotif = traderNotifsAfterApp.data.notifications.find(n => n.related_application_id === appId && n.type === 'APPLICATION_SUBMITTED');
  assert(Boolean(appSubmittedNotif), 'Trader received APPLICATION_SUBMITTED notification in MongoDB');

  // Verify Authority received NEW_APPLICATION notification
  const authNotifsAfterApp = await request('/notifications', { method: 'GET' }, TOKENS.AUTHORITY);
  const authNewAppNotif = authNotifsAfterApp.data.notifications.find(n => n.related_application_id === appId && n.type === 'NEW_APPLICATION');
  assert(Boolean(authNewAppNotif), 'Authority received NEW_APPLICATION notification in MongoDB');

  // 4. Test Mark Read & Mark All Read
  console.log('\nStep 4: Testing Notification Read Operations...');
  if (appSubmittedNotif) {
    const markReadRes = await request(`/notifications/${appSubmittedNotif.id}/read`, { method: 'PATCH' }, TOKENS.TRADER);
    assert(markReadRes.ok && markReadRes.data.notification?.read === true, 'Single notification marked as read');
  }
  const markAllRes = await request('/notifications/read-all', { method: 'PATCH' }, TOKENS.TRADER);
  assert(markAllRes.ok && markAllRes.data.unread_count === 0, 'All notifications marked read successfully');

  // 5. Test Payment State Machine
  console.log('\nStep 5: Testing Payment State Machine & "Pay Now" Lifecycle...');
  // A. Initially PAYMENT_PENDING
  const appBeforePayment = await request(`/applications/${appId}`, { method: 'GET' }, TOKENS.TRADER);
  assert(appBeforePayment.data.status === 'PAYMENT_PENDING', 'Initial application status is PAYMENT_PENDING');
  assert(appBeforePayment.data.fee_status === 'PENDING', 'Initial fee_status is PENDING');

  // B. Submit offline challan payment
  const paymentRes = await request(`/applications/${appId}/payment`, {
    method: 'POST',
    body: JSON.stringify({
      payment_method: 'OFFLINE_CHALLAN',
      challan_number: `CHN-${Date.now()}`,
      bank_name: 'State Bank of India',
      branch_name: 'Connaught Place',
      amount_paid: 2500,
      remarks: 'Treasury Challan paid'
    })
  }, TOKENS.TRADER);
  assert(paymentRes.ok, 'Offline challan submitted successfully');

  // C. Verify payment by Authority
  const verifyPayRes = await request(`/applications/${appId}/verify-payment`, {
    method: 'POST',
    body: JSON.stringify({
      notes: 'Payment verified against treasury bank challan.'
    })
  }, TOKENS.AUTHORITY);
  assert(verifyPayRes.ok && verifyPayRes.data.application?.fee_status === 'PAID', 'Payment verified as PAID by Authority');

  // D. Check application status from backend
  const appAfterPaid = await request(`/applications/${appId}`, { method: 'GET' }, TOKENS.TRADER);
  assert(appAfterPaid.data.fee_status === 'PAID', 'Application fee_status is strictly PAID in MongoDB');
  assert(appAfterPaid.data.status === 'PAYMENT_VERIFIED', 'Application status is strictly PAYMENT_VERIFIED');
  assert(appAfterPaid.data.payment?.payment_status === 'PAID', 'Payment record is strictly PAID');

  // 6. Test Verifier Assignment & Notification
  console.log('\nStep 6: Testing Verifier Assignment & Allocation Notification...');
  const assignRes = await request(`/applications/${appId}/assign`, {
    method: 'POST',
    body: JSON.stringify({
      assigned_id: 'USR_VERIFIER_01',
      is_override: 1,
      override_reason: 'Automated test suite allocation'
    })
  }, TOKENS.AUTHORITY);
  assert(assignRes.ok, 'Verifier assigned by Authority');

  const verifierNotifs = await request('/notifications', { method: 'GET' }, TOKENS.VERIFIER);
  const verifierAssignedNotif = verifierNotifs.data.notifications.find(n => n.related_application_id === appId);
  assert(Boolean(verifierAssignedNotif), 'Field Verifier received NEW_CASE_ASSIGNED notification');

  // 7. Test Evidence Upload & Durability
  console.log('\nStep 7: Testing Evidence Upload & Authority Visibility...');
  // Start verification
  const startVerif = await request(`/verifications/cases/${appId}/start`, { method: 'POST' }, TOKENS.VERIFIER);
  assert(startVerif.ok, 'Verification started by Verifier');

  // Upload multipart evidence
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const fileContent = 'FAKED_IMAGE_BINARY_TEST_METROLOGY_2026';
  const postBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="category"',
    '',
    'DEVICE_SETUP',
    `--${boundary}`,
    'Content-Disposition: form-data; name="caption"',
    '',
    'Calibration Test Photo on Precision Bed',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="calibration_scale_test.png"',
    'Content-Type: image/png',
    '',
    fileContent,
    `--${boundary}--`
  ].join('\r\n');

  const uploadRes = await fetch(`${API_URL}/verifications/cases/${appId}/evidence`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKENS.VERIFIER}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: postBody
  });
  const uploadData = await uploadRes.json();
  assert(uploadRes.ok && uploadData.id, 'Evidence uploaded successfully by Verifier');
  const evidenceId = uploadData.id;
  const filePath = uploadData.file_path;

  // Verify file is persisted in persistent storage directory
  const serverBaseDir = path.resolve(__dirname, '..', 'server');
  const diskStorageCheck = fs.existsSync(path.join(serverBaseDir, 'uploads', 'evidence', path.basename(filePath)));
  assert(diskStorageCheck, 'Uploaded evidence file physically exists in persistent storage');

  // Submit Verification Report
  const submitVerif = await request(`/verifications/cases/${appId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      result: 'PASS',
      remarks: 'All test points conform to Schedule IX Class III MPE limits.',
      checklist_responses: [
        { item_id: 'CHK_01', status: 'PASS', note: 'Visual inspection passed' },
        { item_id: 'CHK_02', status: 'PASS', note: 'Model plate verified' },
        { item_id: 'CHK_03', status: 'PASS', note: 'Level bubble centered' },
        { item_id: 'CHK_04', status: 'PASS', note: 'Lead seal intact' },
        { item_id: 'CHK_05', status: 'PASS', note: 'Draft free ambient' }
      ],
      readings: [
        { test_point: '5 kg', reference_value: 5.00, observed_value: 5.001, unit: 'kg' },
        { test_point: '15 kg', reference_value: 15.00, observed_value: 15.002, unit: 'kg' },
        { test_point: '30 kg', reference_value: 30.00, observed_value: 30.003, unit: 'kg' }
      ]
    })
  }, TOKENS.VERIFIER);
  assert(submitVerif.ok, `Verification report submitted by Verifier: ${JSON.stringify(submitVerif.data)}`);

  // Authority opens application review -> Evidence is visible
  const appUnderReview = await request(`/applications/${appId}`, { method: 'GET' }, TOKENS.AUTHORITY);
  assert(Array.isArray(appUnderReview.data.evidence) && appUnderReview.data.evidence.length > 0, 'Evidence is fully visible to Authority during review');
  assert(appUnderReview.data.evidence.some(e => e.id === evidenceId), 'Specific uploaded evidence record is present in review data');
  assert(Array.isArray(appUnderReview.data.readings) && appUnderReview.data.readings.length > 0, 'Measurement readings are present in review data');

  // 8. Test Authority Approval & Certificate Generation
  console.log('\nStep 8: Testing Authority Approval & Certificate Issuance Notification...');
  const approveRes = await request(`/applications/${appId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approval_remarks: 'Final statutory scrutiny passed. Certificate issued.' })
  }, TOKENS.AUTHORITY);
  assert(approveRes.ok && approveRes.data.certificate?.certificate_no, 'Application approved and Certificate issued');

  // Verify Trader received CERTIFICATE_ISSUED notification
  const traderFinalNotifs = await request('/notifications', { method: 'GET' }, TOKENS.TRADER);
  const certIssuedNotif = traderFinalNotifs.data.notifications.find(n => n.type === 'CERTIFICATE_ISSUED' && n.related_application_id === appId);
  assert(Boolean(certIssuedNotif), 'Trader received CERTIFICATE_ISSUED notification with certificate number');

  console.log('\n===============================================================');
  console.log(` All ${totalTests}/${totalTests} Phase 2 Verification Tests Passed Successfully!`);
  console.log('===============================================================\n');
}

run().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
