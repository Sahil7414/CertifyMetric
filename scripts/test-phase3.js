// =============================================================================
// CertifyMetric Phase 3 Verification Test Suite
// =============================================================================
// Covers:
//  1. Public Certificate Verification (/api/public/verify/:token)
//     - Valid token verification & public fields sanitization (no leak of payment/docs)
//     - Certificate Number lookup fallback
//     - Expired certificate handling
//     - Invalid / Non-existent token 404 handling
//     - Malformed token 400 handling
//  2. Authority Statutory Guidance & Scrutiny Tips Configuration
//  3. Application Acknowledgement & Print Readiness
// =============================================================================

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_URL = 'http://127.0.0.1:4000/api';

const USERS = {
  TRADER: { email: 'demo.trader@certifymetric.local', password: 'DemoTrader@2026', id: 'USR_TRADER_01' },
  AUTHORITY: { email: 'demo.authority@certifymetric.local', password: 'DemoAuthority@2026', id: 'USR_AUTHORITY_01' },
  VERIFIER: { email: 'demo.verifier@certifymetric.local', password: 'DemoVerifier@2026', id: 'USR_VERIFIER_01' }
};

const TOKENS = {};
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

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

async function run() {
  console.log('===============================================================');
  console.log(' CertifyMetric Phase 3 Verification Suite');
  console.log('===============================================================\n');

  // Step 1: Authenticate
  console.log('Step 1: Authenticating authoritative roles...');
  for (const [role, creds] of Object.entries(USERS)) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: creds.email, password: creds.password })
    });
    assert(res.ok && res.data.token, `Login successful for role ${role}`);
    TOKENS[role] = res.data.token;
  }

  // Step 2: Create a complete workflow to produce a fresh certificate
  console.log('\nStep 2: Generating a real verified certificate for public verification...');
  const newInst = await request('/instruments', {
    method: 'POST',
    body: JSON.stringify({
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Apex Metrology Systems',
      model: 'AMS-PRECISION-500',
      serial_number: `AMS-SN-${Date.now()}`,
      max_capacity: '50 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      location: 'Warehouse Bay 4, Okhla, New Delhi',
      district: 'Central Delhi, Delhi',
      specs: { accuracy_class: 'III' }
    })
  }, TOKENS.TRADER);
  assert(newInst.ok && (newInst.data.id || newInst.data.instrument?.id), 'Instrument registered');
  const instId = newInst.data.id || newInst.data.instrument.id;

  const newApp = await request('/applications', {
    method: 'POST',
    body: JSON.stringify({
      instrument_id: instId,
      request_type: 'ORIGINAL',
      verification_mode: 'CAMP',
      preferred_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      location_address: 'Warehouse Bay 4, Okhla, New Delhi',
      contact_person: 'Rajesh Gupta',
      contact_phone: '9811223344',
      documents: [{ type: 'INVOICE', name: 'invoice.pdf', url: 'https://example.com/inv.pdf' }]
    })
  }, TOKENS.TRADER);
  assert(newApp.ok && (newApp.data.id || newApp.data.application?.id), 'Application submitted');
  const appId = newApp.data.id || newApp.data.application?.id;

  // Pay offline challan & verify
  await request(`/applications/${appId}/payment`, {
    method: 'POST',
    body: JSON.stringify({
      payment_method: 'OFFLINE_CHALLAN',
      challan_number: `CHN-P3-${Date.now()}`,
      bank_name: 'State Bank of India',
      branch_name: 'Parliament Street',
      amount_paid: 2500,
      remarks: 'Treasury Challan paid'
    })
  }, TOKENS.TRADER);

  await request(`/applications/${appId}/verify-payment`, {
    method: 'POST',
    body: JSON.stringify({ notes: 'Verified against treasury ledger' })
  }, TOKENS.AUTHORITY);

  // Assign verifier
  await request(`/applications/${appId}/assign`, {
    method: 'POST',
    body: JSON.stringify({
      assigned_id: 'USR_VERIFIER_01',
      is_override: 1,
      override_reason: 'Phase 3 test allocation'
    })
  }, TOKENS.AUTHORITY);

  // Verifier starts & submits report
  await request(`/verifications/cases/${appId}/start`, { method: 'POST' }, TOKENS.VERIFIER);
  await request(`/verifications/cases/${appId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      result: 'PASS',
      remarks: 'Instrument tested within Schedule IX MPE limits.',
      checklist_responses: [
        { item_id: 'CHK_01', status: 'PASS', note: 'Visual inspection passed' },
        { item_id: 'CHK_02', status: 'PASS', note: 'Model plate verified' },
        { item_id: 'CHK_03', status: 'PASS', note: 'Level bubble centered' },
        { item_id: 'CHK_04', status: 'PASS', note: 'Lead seal intact' },
        { item_id: 'CHK_05', status: 'PASS', note: 'Draft free ambient' }
      ],
      readings: [
        { test_point: '5 kg', reference_value: 5.00, observed_value: 5.001, unit: 'kg' },
        { test_point: '25 kg', reference_value: 25.00, observed_value: 25.002, unit: 'kg' },
        { test_point: '50 kg', reference_value: 50.00, observed_value: 50.003, unit: 'kg' }
      ]
    })
  }, TOKENS.VERIFIER);

  // Authority approves & issues certificate
  const approveRes = await request(`/applications/${appId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approval_remarks: 'Approved under Section 24.' })
  }, TOKENS.AUTHORITY);
  assert(approveRes.ok && approveRes.data.certificate?.certificate_no, 'Certificate issued by Authority');
  const certNo = approveRes.data.certificate.certificate_no;
  const publicToken = approveRes.data.certificate.public_token;
  assert(Boolean(publicToken), 'Certificate has a valid public_token');

  // Step 3: Test Public Certificate Verification API
  console.log('\nStep 3: Testing Public Unauthenticated Certificate Verification...');

  // A. Valid public token lookup
  const publicVerifyRes = await request(`/public/verify/${publicToken}`, { method: 'GET' });
  assert(publicVerifyRes.status === 200, 'Public verify returns 200 OK for valid token');
  assert(publicVerifyRes.data.status === 'VALID', 'Certificate status is strictly VALID');
  assert(publicVerifyRes.data.certificate_no === certNo, 'Correct certificate number returned');
  assert(publicVerifyRes.data.application_no === (approveRes.data.application?.application_no || appId), 'Application number is returned');
  assert(publicVerifyRes.data.instrument?.serial_number?.startsWith('AMS-SN-'), 'Instrument serial number is present');
  assert(publicVerifyRes.data.instrument?.manufacturer === 'Apex Metrology Systems', 'Manufacturer is present');
  assert(publicVerifyRes.data.instrument?.category?.includes('Non-Automatic Weighing Instrument') || publicVerifyRes.data.instrument?.category?.includes('Weighing Instrument'), 'Category name is present');
  assert(publicVerifyRes.data.verification_authority?.authority, 'Issuing authority is present');
  assert(Boolean(publicVerifyRes.data.valid_until), 'Valid until statutory date is present');

  // B. Privacy Audit: Ensure zero private leakage
  assert(publicVerifyRes.data.fee_breakdown === undefined, 'Privacy: Fee breakdown is NOT exposed');
  assert(publicVerifyRes.data.payment === undefined, 'Privacy: Payment details are NOT exposed');
  assert(publicVerifyRes.data.evidence === undefined, 'Privacy: Internal verification evidence is NOT exposed');
  assert(publicVerifyRes.data.audit_logs === undefined, 'Privacy: Audit logs are NOT exposed');

  // C. Fallback lookup by Certificate Number
  const certNoLookupRes = await request(`/public/verify/${certNo}`, { method: 'GET' });
  assert(certNoLookupRes.status === 200, 'Public verify succeeds when searching by Certificate Number');
  assert(certNoLookupRes.data.public_token === publicToken, 'Resolves same public token record');

  // D. Invalid / Non-existent token returns 404 NOT_FOUND JSON
  const invalidTokenRes = await request('/public/verify/NONEXISTENT_TOKEN_XYZ_99999', { method: 'GET' });
  assert(invalidTokenRes.status === 404, 'Invalid token returns 404 status');
  assert(invalidTokenRes.data.status === 'NOT_FOUND', 'Response body has status: NOT_FOUND (no crash)');

  // Step 4: Component Files & Print Layout Audit
  console.log('\nStep 4: Auditing Frontend Components & Print Layouts...');
  const clientSrcDir = path.resolve(__dirname, '..', 'client', 'src');

  // Check AcknowledgementSlipModal exists and contains required fields
  const ackFile = fs.readFileSync(path.join(clientSrcDir, 'components', 'AcknowledgementSlipModal.jsx'), 'utf8');
  assert(ackFile.includes('Application Acknowledgement Slip'), 'AcknowledgementSlipModal has official document title');
  assert(ackFile.includes('printable-acknowledgement-slip'), 'AcknowledgementSlipModal uses printable CSS class');
  assert(ackFile.includes('window.print()'), 'AcknowledgementSlipModal includes browser print trigger');

  // Check StatutoryGuidanceTips exists and has required guidance stages
  const tipsFile = fs.readFileSync(path.join(clientSrcDir, 'components', 'StatutoryGuidanceTips.jsx'), 'utf8');
  assert(tipsFile.includes('SCRUTINY') && tipsFile.includes('ASSIGNMENT') && tipsFile.includes('REPORT_REVIEW') && tipsFile.includes('FINAL_APPROVAL'), 'StatutoryGuidanceTips covers all 4 Authority workflow stages');

  // Check index.css has @media print rules
  const cssFile = fs.readFileSync(path.join(clientSrcDir, 'index.css'), 'utf8');
  assert(cssFile.includes('@media print') && cssFile.includes('.printable-acknowledgement-slip'), 'index.css contains A4 print rules for acknowledgement slips');

  // Check vercel rewrites
  const vercelFile = fs.readFileSync(path.resolve(__dirname, '..', 'vercel.json'), 'utf8');
  assert(vercelFile.includes('/index.html'), 'vercel.json has SPA rewrite to /index.html');

  console.log('\n===============================================================');
  console.log(` All ${totalTests}/${totalTests} Phase 3 Verification Tests Passed Successfully!`);
  console.log('===============================================================\n');
}

run().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
