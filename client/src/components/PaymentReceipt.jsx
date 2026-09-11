import React from 'react';
import { createPortal } from 'react-dom';

const MODE_LABELS = { IN_SITU: 'In-situ (On-Premises)', CAMP: 'Camp / Department Centre' };
const TYPE_LABELS = { ORIGINAL: 'Original Verification', RE_VERIFICATION: 'Re-verification' };
// A challan is only the trader's own record until an officer checks it — don't call it "verified".
const STATUS_LABELS = { PAID: 'Paid', PAYMENT_VERIFIED: 'Challan submitted', PENDING: 'Pending' };

const inr = (n) => `₹${Number(n || 0).toFixed(2)}`;

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function Row({ label, value, mono }) {
  return (
    <tr>
      <td className="py-1 pr-4 text-slate-500 align-top whitespace-nowrap">{label}</td>
      <td className={`py-1 text-slate-900 font-semibold ${mono ? 'font-mono' : ''}`}>{value || '—'}</td>
    </tr>
  );
}

// Rendered into document.body (outside #root) so print CSS can hide the whole app
// and print only this A4 receipt. Invisible on screen.
export default function PaymentReceipt({ application, payment, instrument, establishmentName, email, contactPerson, contactPhone }) {
  if (!application) return null;

  const fee = application.fee_breakdown || {};
  const pay = payment || application.payment || {};
  const isOnline = pay.payment_mode === 'ONLINE';
  const total = pay.amount ?? fee.total_fee;
  const feeRows = [
    ['Base verification fee', fee.base_verification_fee],
    ['In-situ inspection / conveyance charge', fee.in_situ_inspection_charge],
    ['Portal service fee', fee.portal_service_fee]
  ].filter(([, v]) => Number(v) > 0);

  return createPortal(
    <div id="receipt-print-root" className="text-[11px] leading-relaxed text-slate-800 bg-white">
      {pay.test_mode && (
        <div className="mb-3 p-2 border-2 border-dashed border-rose-500 text-rose-700 text-center font-extrabold uppercase tracking-widest">
          Test mode — no real money was charged
        </div>
      )}

      <div className="flex items-start justify-between border-b-2 border-[#002046] pb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Department of Consumer Affairs</div>
          <div className="text-base font-extrabold text-[#002046]">Legal Metrology — Online Verification (CertifyMetric)</div>
          <div className="text-[10px] text-slate-500">Verification under Section 24 of the Legal Metrology Act, 2009</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-[#002046] uppercase">Payment Receipt</div>
          <div className="text-[10px] text-slate-500">& Application Acknowledgement</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 py-3 border-b border-slate-300">
        <div>
          <div className="text-[9px] uppercase font-bold text-slate-500">Application No.</div>
          <div className="text-sm font-extrabold font-mono text-[#002046]">{application.application_no}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-bold text-slate-500">Payment Date</div>
          <div className="text-sm font-bold">{formatDateTime(pay.paid_at)}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase font-bold text-slate-500">Payment Status</div>
          <div className="text-sm font-extrabold text-emerald-700 uppercase">{STATUS_LABELS[pay.payment_status] || pay.payment_status || '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 py-3 border-b border-slate-300">
        <div>
          <div className="text-[10px] font-extrabold uppercase text-[#002046] mb-1">Received From</div>
          <table><tbody>
            <Row label="Establishment" value={establishmentName} />
            <Row label="Contact person" value={application.contact_person || contactPerson} />
            <Row label="Phone" value={application.contact_phone || contactPhone} />
            <Row label="Email" value={email} />
          </tbody></table>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase text-[#002046] mb-1">Instrument & Service</div>
          <table><tbody>
            <Row label="Instrument" value={instrument ? `${instrument.manufacturer} ${instrument.model}` : null} />
            <Row label="Serial No." value={instrument?.serial_number} mono />
            <Row label="Category" value={instrument?.category_name} />
            <Row label="Service" value={TYPE_LABELS[application.verification_type] || application.verification_type} />
            <Row label="Mode" value={MODE_LABELS[application.verification_mode] || application.verification_mode} />
          </tbody></table>
        </div>
      </div>

      <div className="py-3 border-b border-slate-300">
        <div className="text-[10px] font-extrabold uppercase text-[#002046] mb-1">Fee Details</div>
        <table className="w-full border border-slate-300">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left p-2 border-b border-slate-300">Description</th>
              <th className="text-right p-2 border-b border-slate-300 w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {feeRows.map(([label, value]) => (
              <tr key={label}>
                <td className="p-2 border-b border-slate-200">{label}</td>
                <td className="p-2 border-b border-slate-200 text-right font-mono">{inr(value)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className="p-2 font-extrabold">{isOnline ? 'Total Paid' : 'Total Amount'}</td>
              <td className="p-2 text-right font-mono font-extrabold text-base">{inr(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="py-3 border-b border-slate-300">
        <div className="text-[10px] font-extrabold uppercase text-[#002046] mb-1">Payment Details</div>
        <table><tbody>
          {isOnline ? (
            <>
              <Row label="Paid via" value={`Razorpay${pay.method ? ` (${pay.method.toUpperCase()})` : ''}`} />
              <Row label="Payment ID" value={pay.razorpay_payment_id || pay.transaction_id} mono />
              <Row label="Order ID" value={pay.razorpay_order_id} mono />
            </>
          ) : (
            <>
              <Row label="Paid via" value="Treasury Challan / Demand Draft" />
              <Row label="Challan / DD No." value={pay.transaction_id} mono />
            </>
          )}
        </tbody></table>
      </div>

      <div className="pt-3 text-[10px] text-slate-600 space-y-1">
        <p><strong>Next steps:</strong> the Assistant Controller for your district will review the application and assign a Legal Metrology Officer or GATC lab. You'll see the schedule under "My Applications".</p>
        <p>This is a computer-generated receipt and does not require a signature. Keep it for your records.</p>
      </div>
    </div>,
    document.body
  );
}
