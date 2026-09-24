import fs from 'node:fs';
import path from 'node:path';

async function runComprehensiveTests() {
  console.log('====================================================');
  console.log('CERTIFYMETRIC — COMPREHENSIVE VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${details}`);
      failed++;
    }
  }

  // 1. Health Check
  try {
    const health = await fetch('http://localhost:4000/api/health').then(r => r.json());
    assert(health.status === 'ok' && health.database === 'connected', '1. Backend Server & Atlas Database Connection', JSON.stringify(health));
  } catch (err) {
    assert(false, '1. Backend Server & Atlas Database Connection', err.message);
  }

  // 2. Authentication
  let authorityToken = '';
  try {
    const login = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.authority@certifymetric.local', password: 'DemoAuthority@2026' })
    }).then(r => r.json());
    authorityToken = login.token;
    assert(Boolean(authorityToken) && login.user?.role === 'AUTHORITY', '2. Authority Authentication & Session Token Generation');
  } catch (err) {
    assert(false, '2. Authority Authentication', err.message);
  }

  // 3. Slot Availability Query
  try {
    const slotResFresh = await fetch('http://localhost:4000/api/availability/slots?assignee_id=USR_VERIFIER_01&date=2026-09-12', {
      headers: { 'Authorization': `Bearer ${authorityToken}` }
    }).then(r => r.json());
    const slotResReassign = await fetch('http://localhost:4000/api/availability/slots?assignee_id=USR_VERIFIER_01&date=2026-09-05&application_id=APP_DEMO_05', {
      headers: { 'Authorization': `Bearer ${authorityToken}` }
    }).then(r => r.json());

    assert(
      Array.isArray(slotResFresh.configured_slots) &&
      slotResFresh.available_slots.length === 2 &&
      slotResReassign.available_slots.includes('02:00 PM - 05:00 PM'),
      '3. Date-Aware Time Slot Availability Endpoint (Fresh date & Reassign exclusions)',
      JSON.stringify({ fresh: slotResFresh.available_slots, reassign: slotResReassign.available_slots })
    );
  } catch (err) {
    assert(false, '3. Time Slot Availability Endpoint', err.message);
  }

  // 4. Time Slot Conflict Prevention (409 on occupied slot)
  try {
    const conflictRes = await fetch('http://localhost:4000/api/applications/APP_DEMO_05/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorityToken}` },
      body: JSON.stringify({
        assigned_id: 'USR_VERIFIER_01',
        scheduled_date: '2026-09-05',
        time_slot: '10:00 AM - 01:00 PM',
        override_reason: 'Statutory urgency assignment'
      })
    });
    const conflictData = await conflictRes.json();
    assert(
      conflictRes.status === 409 && conflictData.error?.includes('already booked'),
      '4. Backend Conflict Prevention rejects duplicate booking (HTTP 409)',
      `Status: ${conflictRes.status}, Error: ${conflictData.error}`
    );
  } catch (err) {
    assert(false, '4. Backend Conflict Prevention', err.message);
  }

  // 5. Successful Assignment with Available Slot (HTTP 200)
  try {
    const availRes = await fetch('http://localhost:4000/api/applications/APP_DEMO_05/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorityToken}` },
      body: JSON.stringify({
        assigned_id: 'USR_VERIFIER_01',
        scheduled_date: '2026-09-05',
        time_slot: '02:00 PM - 05:00 PM',
        override_reason: 'Statutory urgency assignment'
      })
    });
    assert(availRes.status === 200, '5. Successful Assignment with Available Slot (HTTP 200)');
  } catch (err) {
    assert(false, '5. Successful Assignment', err.message);
  }

  // 6. Statutory PDF Document Preview & Streaming Endpoint
  try {
    const pdfRes = await fetch('http://localhost:4000/api/documents/preview/invoice_2025.pdf');
    const contentType = pdfRes.headers.get('content-type');
    const contentDisp = pdfRes.headers.get('content-disposition');
    const buf = await pdfRes.arrayBuffer();
    const isPdfHeader = Buffer.from(buf.slice(0, 8)).toString('utf-8').startsWith('%PDF');
    assert(
      pdfRes.status === 200 &&
      contentType === 'application/pdf' &&
      contentDisp?.includes('inline') &&
      isPdfHeader,
      '6. Statutory PDF Preview & Inline Streaming without download requirement',
      `Type: ${contentType}, Disp: ${contentDisp}, Header: ${isPdfHeader}`
    );
  } catch (err) {
    assert(false, '6. Statutory PDF Preview Endpoint', err.message);
  }

  // 7. Check Pagination Component in client/src/components/Pagination.jsx
  try {
    const paginationSrc = fs.readFileSync(path.resolve('client/src/components/Pagination.jsx'), 'utf-8');
    assert(
      paginationSrc.includes('Previous') &&
      paginationSrc.includes('Next') &&
      paginationSrc.includes('totalItems') &&
      paginationSrc.includes('pageSize'),
      '7. Universal Pagination Component with Next/Prev/Count/PageSize'
    );
  } catch (err) {
    assert(false, '7. Pagination Component Check', err.message);
  }

  // 8. Verify Body Horizontal Scroll fix across Layout
  try {
    const layoutSrc = fs.readFileSync(path.resolve('client/src/layouts/AuthenticatedLayout.jsx'), 'utf-8');
    assert(
      layoutSrc.includes('overflow-x-hidden') &&
      layoutSrc.includes('max-w-[1600px]'),
      '8. Full-Width Responsive Layout (overflow-x-hidden, fluid max width)'
    );
  } catch (err) {
    assert(false, '8. Layout Viewport Width Check', err.message);
  }

  // 9. DocumentPreviewModal Embedded PDF View Check
  try {
    const modalSrc = fs.readFileSync(path.resolve('client/src/components/DocumentPreviewModal.jsx'), 'utf-8');
    assert(
      modalSrc.includes('<iframe') &&
      modalSrc.includes('getFileUrl') &&
      modalSrc.includes('Download'),
      '9. Document Preview Modal embeds PDF iframe with fallback and download actions'
    );
  } catch (err) {
    assert(false, '9. DocumentPreviewModal Check', err.message);
  }

  console.log(`\n====================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runComprehensiveTests();
