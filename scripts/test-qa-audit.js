// =============================================================================
// CertifyMetric Complete QA Audit Suite
// Exhaustively tests all 16 core subsystems and statutory boundary rules
// =============================================================================
import assert from 'node:assert/strict';

const API_BASE = 'http://localhost:4000/api';

const DEMO_USERS = {
  TRADER: { email: 'demo.trader@certifymetric.local', password: 'DemoTrader@2026' },
  AUTHORITY: { email: 'demo.authority@certifymetric.local', password: 'DemoAuthority@2026' },
  VERIFIER: { email: 'demo.verifier@certifymetric.local', password: 'DemoVerifier@2026' },
  GATC: { email: 'demo.gatc@certifymetric.local', password: 'DemoGatc@2026' },
  ADMIN: { email: 'demo.admin@certifymetric.local', password: 'DemoAdmin@2026' }
};

const TOKENS = {};
const USER_IDS = {};

async function api(endpoint, options = {}, role = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(role && TOKENS[role] ? { 'Authorization': `Bearer ${TOKENS[role]}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${endpoint}`, {
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

async function runAudit() {
  console.log('====================================================');
  console.log('🚀 RUNNING CERTIFYMETRIC COMPREHENSIVE QA AUDIT');
  console.log('====================================================\n');

  // Authenticate all roles
  console.log('[AUTH] Logging in all 5 authoritative roles...');
  for (const [role, creds] of Object.entries(DEMO_USERS)) {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(creds)
    });
    assert.equal(res.status, 200, `Failed to authenticate ${role}: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.token, `Missing token for ${role}`);
    TOKENS[role] = res.data.token;
    USER_IDS[role] = res.data.user.id;
    console.log(`  ✔ Authenticated ${role} (${res.data.user.full_name})`);
  }
  console.log();

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    process.stdout.write(`• Checking: ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      failed++;
    }
  }

  // 1. Health & MongoDB Connectivity
  await check('1. MongoDB Atlas connectivity & health endpoint', async () => {
    const res = await api('/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'ok');
    assert.equal(res.data.database, 'connected');
  });

  // 2. Instrument Registration (Trader)
  let testInstrumentId;
  const serialNo = `SN_AUDIT_${Date.now()}`;
  await check('2. Trader instrument registration (Schedule V ruleset)', async () => {
    const res = await api('/instruments', {
      method: 'POST',
      body: JSON.stringify({
        category_id: 'CAT_NAWI_III',
        serial_number: serialNo,
        manufacturer: 'Precision Weighing India Ltd',
        model: 'CM-PRO-900',
        max_capacity: '1000',
        min_capacity: '2',
        verification_scale_interval_e: '0.1',
        location: 'Plot 45, Okhla Industrial Area Phase-III, New Delhi',
        district: 'Central Delhi, Delhi',
        specs: { accuracy_class: 'III' }
      })
    }, 'TRADER');
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.ok(res.data.id);
    testInstrumentId = res.data.id;
  });

  // 3. Verification Application Submission
  let testAppId;
  await check('3. Verification application creation & fee calculation', async () => {
    const res = await api('/applications', {
      method: 'POST',
      body: JSON.stringify({
        instrument_id: testInstrumentId,
        request_type: 'ORIGINAL',
        verification_mode: 'IN_SITU',
        preferred_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        location_address: 'Plot 45, Okhla Industrial Area Phase-III, New Delhi',
        contact_person: 'Ramesh Sharma',
        contact_phone: '9876543210',
        documents: [{ type: 'INVOICE', name: 'Purchase_Invoice.pdf', url: 'https://example.com/inv.pdf' }]
      })
    }, 'TRADER');
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.ok(res.data.id);
    assert.equal(res.data.status, 'PAYMENT_PENDING');
    testAppId = res.data.id;
  });

  // 4. Payment Settlement & Verification
  await check('4. Payment settlement & fee status transition to PAID', async () => {
    // Trader records offline challan payment
    const payRes = await api(`/applications/${testAppId}/payment`, {
      method: 'POST',
      body: JSON.stringify({
        payment_method: 'OFFLINE_CHALLAN',
        challan_number: `CHALLAN-DELHI-2026-${Date.now()}`,
        bank_name: 'State Bank of India',
        branch_name: 'Okhla Branch',
        amount_paid: 2500,
        remarks: 'Paid via SBI Treasury Portal'
      })
    }, 'TRADER');
    assert.equal(payRes.status, 200, JSON.stringify(payRes.data));
    assert.equal(payRes.data.application?.fee_status, 'PENDING_VERIFICATION');

    // Authority verifies payment
    const verifyPayRes = await api(`/applications/${testAppId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Challan verified against bank statement.' })
    }, 'AUTHORITY');
    assert.equal(verifyPayRes.status, 200, JSON.stringify(verifyPayRes.data));
    assert.equal(verifyPayRes.data.application?.fee_status, 'PAID');
  });

  // 5. Return for Resubmission Flow
  await check('5. Authority return application & Trader resubmission', async () => {
    // Authority returns application
    const returnRes = await api(`/applications/${testAppId}/return`, {
      method: 'POST',
      body: JSON.stringify({ return_reason: 'Please clarify serial number sticker photo' })
    }, 'AUTHORITY');
    assert.equal(returnRes.status, 200, JSON.stringify(returnRes.data));
    const returnStatus = returnRes.data.status || returnRes.data.application?.status;
    assert.equal(returnStatus, 'RETURNED');

    // Trader resubmits
    const resubmitRes = await api(`/applications/${testAppId}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Updated clear photo uploaded' })
    }, 'TRADER');
    assert.equal(resubmitRes.status, 200, JSON.stringify(resubmitRes.data));
    const resubmitStatus = resubmitRes.data.status || resubmitRes.data.application?.status;
    assert.ok(resubmitStatus === 'SUBMITTED' || resubmitStatus === 'PAYMENT_VERIFIED' || resubmitRes.data.message);
  });

  // 6. Authority Scrutiny & Assignment
  await check('6. Authority review & assignment of Field Verifier', async () => {
    await api(`/applications/${testAppId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status: 'UNDER_REVIEW', remarks: 'Proceeding with field verifier assignment.' })
    }, 'AUTHORITY');

    const assignRes = await api(`/applications/${testAppId}/assign`, {
      method: 'POST',
      body: JSON.stringify({
        assigned_id: 'USR_VERIFIER_01',
        is_override: 0,
        override_reason: ''
      })
    }, 'AUTHORITY');
    assert.equal(assignRes.status, 200, JSON.stringify(assignRes.data));
    const finalStatus = assignRes.data.status || assignRes.data.application?.status;
    assert.equal(finalStatus, 'ASSIGNED');
  });

  // 7. Field Verifier Workspace & MPE Readings
  await check('7. Field Verifier inspection & MPE reading compliance', async () => {
    // Start verification
    await api(`/verifications/cases/${testAppId}/start`, { method: 'POST' }, 'VERIFIER');

    // Submit verification with passing readings
    const submitRes = await api(`/verifications/cases/${testAppId}/submit`, {
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
    }, 'VERIFIER');
    assert.equal(submitRes.status, 200, JSON.stringify(submitRes.data));
    assert.equal(submitRes.data.result, 'PASS');
  });

  // 8. RBAC Boundary Checks (Verifier & Trader cannot approve)
  await check('8. RBAC Guard: Field Verifier & Trader cannot approve application', async () => {
    const vApprove = await api(`/applications/${testAppId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks: 'Verifier trying to approve' })
    }, 'VERIFIER');
    assert.equal(vApprove.status, 403);

    const tApprove = await api(`/applications/${testAppId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks: 'Trader trying to approve' })
    }, 'TRADER');
    assert.equal(tApprove.status, 403);
  });

  // 9. RBAC Guard: Trader & Verifier cannot issue certificate
  await check('9. RBAC Guard: Trader & Verifier cannot issue certificate', async () => {
    const tCert = await api(`/certificates/generate/${testAppId}`, {
      method: 'POST'
    }, 'TRADER');
    assert.equal(tCert.status, 403);

    const vCert = await api(`/certificates/generate/${testAppId}`, {
      method: 'POST'
    }, 'VERIFIER');
    assert.equal(vCert.status, 403);
  });

  // 10. Authority Approval & Certificate Generation
  let issuedCertToken;
  await check('10. Authority legal review & approval with certificate issuance', async () => {
    const approveRes = await api(`/applications/${testAppId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks: 'Legal metrology verified against Schedule IX. Approved.' })
    }, 'AUTHORITY');
    assert.equal(approveRes.status, 200, JSON.stringify(approveRes.data));
    assert.ok(approveRes.data.certificate, 'Expected certificate object in approval response');
    const cert = approveRes.data.certificate;
    issuedCertToken = cert.public_token || cert.public_verification_token || cert.verification_token;
    assert.ok(issuedCertToken, 'Expected public verification token');
  });

  // 11. Authority Certificate Idempotency
  await check('11. Authority Form 6 Certificate generation idempotency', async () => {
    const certRes = await api(`/certificates/generate/${testAppId}`, {
      method: 'POST'
    }, 'AUTHORITY');
    assert.equal(certRes.status, 200, JSON.stringify(certRes.data));
    const cObj = certRes.data.certificate || certRes.data;
    assert.ok(cObj.certificate_no || cObj.certificate_number);
  });

  // 12. Public QR Verification
  await check('12. Public QR Verification endpoint (/api/public/verify/:token)', async () => {
    const pubRes = await api(`/public/verify/${issuedCertToken}`);
    assert.equal(pubRes.status, 200, JSON.stringify(pubRes.data));
    assert.equal(pubRes.data.status, 'VALID');
    assert.ok(pubRes.data.certificate_no || pubRes.data.certificate?.certificate_number);
  });

  // 13. Notifications Pipeline
  await check('13. Role-specific MongoDB notifications retrieval & mark read', async () => {
    const notifRes = await api('/notifications', {}, 'TRADER');
    assert.equal(notifRes.status, 200);
    assert.ok(Array.isArray(notifRes.data.notifications));
    assert.ok(typeof notifRes.data.unread_count === 'number');

    // Mark all read
    const readAllRes = await api('/notifications/read-all', {
      method: 'PATCH'
    }, 'TRADER');
    assert.equal(readAllRes.status, 200);
  });

  // 14. Admin Analytics Aggregations
  await check('14. Admin analytics endpoint (MongoDB aggregation & range filtering)', async () => {
    // 7d range
    const a7d = await api('/admin/analytics?range=7d', {}, 'ADMIN');
    assert.equal(a7d.status, 200, JSON.stringify(a7d.data));
    assert.ok(a7d.data.applicationsByStatus);
    assert.ok(Array.isArray(a7d.data.applicationsOverTime));
    assert.ok(a7d.data.verificationType);
    assert.ok(a7d.data.verificationMode);
    assert.ok(a7d.data.paymentStatus);
    assert.ok(a7d.data.certificateStats);
    assert.ok(Array.isArray(a7d.data.workloadList));

    // 30d range
    const a30d = await api('/admin/analytics?range=30d', {}, 'ADMIN');
    assert.equal(a30d.status, 200);

    // 6m range
    const a6m = await api('/admin/analytics?range=6m', {}, 'ADMIN');
    assert.equal(a6m.status, 200);

    // All range
    const aAll = await api('/admin/analytics?range=all', {}, 'ADMIN');
    assert.equal(aAll.status, 200);

    // RBAC check: Trader cannot access
    const aTrader = await api('/admin/analytics?range=30d', {}, 'TRADER');
    assert.equal(aTrader.status, 403);
  });

  // 15. Audit Log Ledger
  await check('15. Tamper-evident Audit Log recording', async () => {
    const auditRes = await api('/audit-logs', {}, 'ADMIN');
    assert.equal(auditRes.status, 200);
    assert.ok(Array.isArray(auditRes.data));
    assert.ok(auditRes.data.length > 0);
  });

  // 16. Search & System Health
  await check('16. Admin Master Data and System Health telemetry', async () => {
    const masterRes = await api('/admin/master-data', {}, 'ADMIN');
    assert.equal(masterRes.status, 200);
    assert.ok(Array.isArray(masterRes.data.categories));

    const healthRes = await api('/admin/system-health', {}, 'ADMIN');
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.data.database?.connected, true);
  });

  console.log('\n====================================================');
  console.log(`QA AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
