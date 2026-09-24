import React, { useState } from 'react';

const GUIDANCE_CONFIG = {
  SCRUTINY: {
    title: 'Statutory Scrutiny Guidance (Authority)',
    badge: 'Legal Metrology Rules, 2011',
    icon: 'rule',
    color: 'border-blue-200 bg-blue-50/70 text-blue-900',
    tips: [
      {
        title: 'Document & Ownership Verification',
        detail: 'Verify purchase invoice, manufacturer model approval number, and previous verification certificate if applying for Re-Verification.'
      },
      {
        title: 'Statutory Fee Confirmation',
        detail: 'Ensure fee status is verified against online gateway reference or bank treasury challan before advancing case.'
      },
      {
        title: 'Instrument Technical Match',
        detail: 'Cross-check declared max capacity, verification interval (e), and accuracy class (Class I, II, III, or IV) with instrument category specs.'
      },
      {
        title: 'Inspection Mode Appropriateness',
        detail: 'Confirm In-Situ is selected for non-transportable instruments (e.g. Weighbridges, Fuel Dispensers) or CAMP/Office for portable instruments.'
      }
    ]
  },
  ASSIGNMENT: {
    title: 'Assignment & Allocation Guidance (Authority)',
    badge: 'Delegation of Powers Act',
    icon: 'assignment_ind',
    color: 'border-indigo-200 bg-indigo-50/70 text-indigo-900',
    tips: [
      {
        title: 'Competence & Designation Match',
        detail: 'Ensure assigned officer has statutory competence for the instrument category (e.g. Weighbridges & Fuel Dispensers require Senior Legal Metrology Officer).'
      },
      {
        title: 'District Jurisdiction Compliance',
        detail: 'Verify that the assigned Inspector operates within the target district where the instrument is installed. Any deviation requires statutory override justification.'
      },
      {
        title: 'GATC Testing Laboratory Routing',
        detail: 'Direct instruments requiring environmental chamber testing or high-precision class I verification to authorized GATC laboratories.'
      },
      {
        title: 'Workload & SLA Balance',
        detail: 'Review officer caseload to ensure physical verification is completed within the statutory 15-day timeline.'
      }
    ]
  },
  REPORT_REVIEW: {
    title: 'Verification Report Review Guidance (Authority)',
    badge: 'Schedule IX Tolerances',
    icon: 'fact_check',
    color: 'border-amber-200 bg-amber-50/70 text-amber-900',
    tips: [
      {
        title: 'Checklist Completeness',
        detail: 'Confirm that all 5 statutory checklist items (Visual inspection, model plate, level bubble, lead seal, ambient conditions) are evaluated.'
      },
      {
        title: 'MPE Reading Tolerances',
        detail: 'Audit recorded test points against Maximum Permissible Error (MPE) limits for the accuracy class under Schedule IX.'
      },
      {
        title: 'Photographic & Document Evidence',
        detail: 'Inspect physical stamping photos, lead seal close-ups, and calibration certificate attachments before endorsing technical report.'
      },
      {
        title: 'Deficiency & Discrepancy Handling',
        detail: 'If technical readings or evidence fail statutory standards, return application for rectification or issue statutory rejection with specific grounds.'
      }
    ]
  },
  FINAL_APPROVAL: {
    title: 'Final Certificate Issuance Guidance (Authority)',
    badge: 'Section 24 Statutory Approval',
    icon: 'verified',
    color: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    tips: [
      {
        title: 'End-to-End Workflow Validation',
        detail: 'Confirm all stages (Fee Paid -> Scrutiny Passed -> Inspector Report Passed -> Evidence Audited) are successfully completed.'
      },
      {
        title: 'Statutory Fee Confirmation',
        detail: 'Confirm that fee_status is strictly PAID in the official treasury ledger.'
      },
      {
        title: 'Statutory Validity Term',
        detail: 'Certificate validity is 12 months for Commercial Weighing Instruments, 24 months for Standard Weights & Measures.'
      },
      {
        title: 'Digital Cryptographic Security Stamp',
        detail: 'Upon approval, the system generates an official digitally sealed certificate with a unique public QR verification token.'
      }
    ]
  },
  FIELD_VERIFICATION: {
    title: 'Field Verification Instructions (Inspector)',
    badge: 'Field Protocol',
    icon: 'engineering',
    color: 'border-teal-200 bg-teal-50/70 text-teal-900',
    tips: [
      {
        title: 'Physical Setup & Leveling',
        detail: 'Ensure instrument is on a rigid, vibration-free foundation with the spirit level bubble centered.'
      },
      {
        title: 'Test Point Sequence',
        detail: 'Execute Zero Load, Min Capacity, Quarter Load, Half Load, and Max Capacity test point measurements.'
      },
      {
        title: 'Photographic Capture',
        detail: 'Upload clear photographs of the manufacturer nameplate, verification stamping location, and device setup.'
      }
    ]
  }
};

export default function StatutoryGuidanceTips({
  stage = 'SCRUTINY',
  className = '',
  defaultExpanded = true
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [dismissed, setDismissed] = useState(false);

  const config = GUIDANCE_CONFIG[stage] || GUIDANCE_CONFIG.SCRUTINY;

  if (dismissed) {
    return (
      <div className={`flex items-center justify-end ${className}`}>
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-container font-semibold py-1 px-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
          title="Show statutory guidance tips"
        >
          <span className="material-symbols-outlined text-[16px]">info</span>
          Show Statutory Guidance
        </button>
      </div>
    );
  }

  return (
    <div className={`border rounded-2xl p-4 transition-all ${config.color} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/80 shadow-xs flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">{config.icon}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-extrabold tracking-wide uppercase">{config.title}</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 shadow-2xs">
                {config.badge}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg hover:bg-white/60 text-slate-700 transition-colors cursor-pointer"
            title={expanded ? 'Collapse tips' : 'Expand tips'}
          >
            <span className="material-symbols-outlined text-lg">
              {expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-white/60 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Dismiss guidance banner"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-current/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {config.tips.map((tip, idx) => (
            <div key={idx} className="bg-white/85 rounded-xl p-2.5 border border-current/10 shadow-2xs space-y-1">
              <div className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary shrink-0 mt-0.5">check_circle</span>
                <strong className="text-[11px] font-bold leading-tight text-slate-900">{tip.title}</strong>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-600 pl-5">
                {tip.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
