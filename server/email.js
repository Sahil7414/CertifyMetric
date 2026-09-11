// Transactional email via Brevo's HTTPS API (not SMTP — many hosts block SMTP ports).
const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
const SEND_TIMEOUT_MS = 8000;

export function isEmailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM_ADDRESS);
}

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) return { sent: false, reason: 'Email is not configured on the server.' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const r = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM_ADDRESS, name: process.env.EMAIL_FROM_NAME || 'CertifyMetric' },
        to: [to],
        subject,
        htmlContent: html,
        textContent: text
      }),
      signal: controller.signal
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) return { sent: false, reason: json.message || `Brevo returned HTTP ${r.status}` };
    return { sent: true, messageId: json.messageId || null };
  } catch (err) {
    return { sent: false, reason: err.name === 'AbortError' ? 'Email provider timed out.' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

const MODE_LABELS = { IN_SITU: 'In-situ (On-Premises)', CAMP: 'Camp / Department Centre' };
const TYPE_LABELS = { ORIGINAL: 'Original Verification', RE_VERIFICATION: 'Re-verification' };
const inr = (n) => `₹${Number(n || 0).toFixed(2)}`;
const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
      }) + ' IST'
    : '—';

export function buildPaymentReceiptEmail({ application, payment, instrument, categoryName, traderName, establishmentName }) {
  const isOnline = payment.payment_mode === 'ONLINE';
  const fee = application.fee_breakdown || {};
  const statusLabel = isOnline ? 'Paid' : 'Challan submitted';

  const details = [
    ['Application No.', application.application_no],
    ['Payment date', formatDateTime(payment.paid_at)],
    ['Status', statusLabel],
    ['Establishment', establishmentName],
    ['Instrument', instrument ? `${instrument.manufacturer} ${instrument.model}` : ''],
    ['Serial No.', instrument?.serial_number],
    ['Category', categoryName],
    ['Service', TYPE_LABELS[application.verification_type] || application.verification_type],
    ['Mode', MODE_LABELS[application.verification_mode] || application.verification_mode]
  ];
  const feeRows = [
    ['Base verification fee', fee.base_verification_fee],
    ['In-situ inspection / conveyance charge', fee.in_situ_inspection_charge],
    ['Portal service fee', fee.portal_service_fee]
  ].filter(([, v]) => Number(v) > 0);
  const paymentRows = isOnline
    ? [
        ['Paid via', `Razorpay${payment.method ? ` (${String(payment.method).toUpperCase()})` : ''}`],
        ['Payment ID', payment.razorpay_payment_id || payment.transaction_id],
        ['Order ID', payment.razorpay_order_id]
      ]
    : [['Paid via', 'Treasury Challan / Demand Draft'], ['Challan / DD No.', payment.transaction_id]];

  const row = ([label, value]) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>` +
    `<td style="padding:4px 0;color:#0f172a;font-weight:600">${escapeHtml(value || '—')}</td></tr>`;

  const testBanner = payment.test_mode
    ? `<div style="margin:0 0 16px;padding:10px;border:2px dashed #e11d48;color:#be123c;text-align:center;font-weight:800;letter-spacing:1px">TEST MODE — NO REAL MONEY WAS CHARGED</div>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a">
<div style="max-width:600px;margin:0 auto;padding:24px 12px">
  <div style="background:#002046;color:#ffffff;padding:18px 22px;border-radius:10px 10px 0 0">
    <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#fbbf24;font-weight:700">Department of Consumer Affairs · Legal Metrology</div>
    <div style="font-size:20px;font-weight:800;margin-top:4px">Payment Receipt</div>
    <div style="font-size:12px;color:#cbd5e1">Application ${escapeHtml(application.application_no)}</div>
  </div>
  <div style="background:#ffffff;padding:22px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:none">
    ${testBanner}
    <p style="margin:0 0 14px">Dear ${escapeHtml(traderName || 'Applicant')},</p>
    <p style="margin:0 0 18px">${isOnline
      ? 'We have received your payment for the verification application below.'
      : 'We have recorded your challan / demand draft for the verification application below. An officer will confirm it against the treasury record.'}</p>
    <table style="border-collapse:collapse;margin-bottom:18px">${details.map(row).join('')}</table>
    <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;margin-bottom:18px">
      <tr style="background:#f1f5f9"><th style="text-align:left;padding:8px;border-bottom:1px solid #cbd5e1">Description</th><th style="text-align:right;padding:8px;border-bottom:1px solid #cbd5e1">Amount</th></tr>
      ${feeRows.map(([l, v]) => `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(l)}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace">${inr(v)}</td></tr>`).join('')}
      <tr><td style="padding:8px;font-weight:800">${isOnline ? 'Total Paid' : 'Total Amount'}</td><td style="padding:8px;text-align:right;font-weight:800;font-family:monospace;font-size:16px">${inr(payment.amount ?? fee.total_fee)}</td></tr>
    </table>
    <table style="border-collapse:collapse;margin-bottom:18px">${paymentRows.map(row).join('')}</table>
    <p style="margin:0 0 8px;color:#475569;font-size:13px"><strong>Next steps:</strong> the Assistant Controller for your district will review the application and assign a Legal Metrology Officer or GATC lab. You can track it under “My Applications”.</p>
    <p style="margin:0;color:#94a3b8;font-size:12px">This is a computer-generated receipt and does not require a signature. Please do not reply to this email.</p>
  </div>
</div></body></html>`;

  const text = [
    payment.test_mode ? 'TEST MODE — NO REAL MONEY WAS CHARGED\n' : '',
    `Payment Receipt — Application ${application.application_no}`,
    '',
    ...details.map(([l, v]) => `${l}: ${v || '—'}`),
    '',
    ...feeRows.map(([l, v]) => `${l}: ${inr(v)}`),
    `${isOnline ? 'Total Paid' : 'Total Amount'}: ${inr(payment.amount ?? fee.total_fee)}`,
    '',
    ...paymentRows.map(([l, v]) => `${l}: ${v || '—'}`),
    '',
    'This is a computer-generated receipt and does not require a signature.'
  ].join('\n');

  const subject = `${payment.test_mode ? '[TEST] ' : ''}Payment receipt — ${application.application_no}`;
  return { subject, html, text };
}
