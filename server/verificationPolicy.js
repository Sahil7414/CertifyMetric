// =============================================================================
// Verification competence policy — who is legally allowed to verify what.
//
// Two independent statutory questions decide whether a candidate may verify an
// instrument (jurisdiction is checked separately by the allocation engine):
//
// 1. Agency competence
//    - A Legal Metrology Officer (LMO) may verify every category of weight/measure.
//    - A Government Approved Test Centre (GATC) may verify ONLY the weights and
//      measures in the First Schedule of the Legal Metrology (Government Approved
//      Test Centre) Rules, 2013 — 18 categories, plus 5 fuel/gas dispensers added
//      by the later amendment (23 in total). Since the 2025 amendment
//      (G.S.R. 779(E)), First Schedule items may be verified by EITHER a GATC or an LMO.
//    - A GATC is further limited to the categories on its own approval certificate
//      (organization.approved_categories). An empty list means the approval was
//      recorded without a scope, so it's treated as the full First Schedule.
//
// 2. Officer designation
//    Heavy / bulk-trade instruments are routed to a senior officer. This is a
//    departmental delegation policy (the Controller assigns duties under the
//    Legal Metrology Act, 2009), NOT a single national rule — so it lives here as
//    data and should be aligned with the state's own delegation order.
// =============================================================================

export const DESIGNATIONS = [
  { code: 'INSPECTOR', label: 'Inspector of Legal Metrology', rank: 1 },
  { code: 'ASSISTANT_CONTROLLER', label: 'Assistant Controller', rank: 2 },
  { code: 'DEPUTY_CONTROLLER', label: 'Deputy Controller', rank: 3 },
  { code: 'JOINT_CONTROLLER', label: 'Joint Controller', rank: 4 },
  { code: 'CONTROLLER', label: 'Controller of Legal Metrology', rank: 5 }
];

const DESIGNATION_BY_CODE = new Map(DESIGNATIONS.map(d => [d.code, d]));

// Existing LMO accounts created before designations were recorded are Inspectors —
// the base rank every LMO holds.
export const DEFAULT_DESIGNATION = 'INSPECTOR';

export function designationLabel(code) {
  return DESIGNATION_BY_CODE.get(code)?.label || DESIGNATION_BY_CODE.get(DEFAULT_DESIGNATION).label;
}

// gatc: true  -> on the GATC First Schedule
//       false -> LMO only
//       'NAWI_150' -> on the Schedule only as NAWI class IIII, or class III up to 150 kg
// minDesignation: lowest LMO rank allowed to verify the category.
const CATEGORY_POLICY = {
  NAWI: { gatc: 'NAWI_150', minDesignation: 'INSPECTOR' },
  CRANE_SCALE: { gatc: 'NAWI_150', minDesignation: 'INSPECTOR' },
  AUTO_WEIGHING: { gatc: false, minDesignation: 'ASSISTANT_CONTROLLER' },
  WEIGHBRIDGE: { gatc: false, minDesignation: 'ASSISTANT_CONTROLLER' },
  FUEL_DISPENSER: { gatc: true, minDesignation: 'INSPECTOR' },
  GAS_FUEL_DISPENSER: { gatc: true, minDesignation: 'INSPECTOR' },
  WATER_METER: { gatc: true, minDesignation: 'INSPECTOR' },
  ENERGY_METER: { gatc: true, minDesignation: 'INSPECTOR' },
  GAS_METER: { gatc: true, minDesignation: 'INSPECTOR' },
  LENGTH_MEASURE: { gatc: true, minDesignation: 'INSPECTOR' },
  VOLUME_MEASURE: { gatc: false, minDesignation: 'INSPECTOR' },
  WEIGHTS_COMMERCIAL: { gatc: true, minDesignation: 'INSPECTOR' },
  WEIGHTS_PRECISION: { gatc: true, minDesignation: 'INSPECTOR' },
  BEAM_SCALE: { gatc: true, minDesignation: 'INSPECTOR' },
  SPRING_BALANCE: { gatc: false, minDesignation: 'INSPECTOR' },
  LOAD_CELL: { gatc: true, minDesignation: 'INSPECTOR' },
  WEIGHING_INDICATOR: { gatc: false, minDesignation: 'INSPECTOR' },
  LPG_CYLINDER_FILLING: { gatc: false, minDesignation: 'ASSISTANT_CONTROLLER' },
  TAXIMETER: { gatc: false, minDesignation: 'INSPECTOR' },
  BULK_FLOW_METER: { gatc: true, minDesignation: 'ASSISTANT_CONTROLLER' },
  ROAD_TANKER: { gatc: false, minDesignation: 'ASSISTANT_CONTROLLER' },
  STORAGE_TANK: { gatc: false, minDesignation: 'ASSISTANT_CONTROLLER' },
  DIP_ROD: { gatc: false, minDesignation: 'INSPECTOR' },
  TEXTILE_LENGTH_MACHINE: { gatc: false, minDesignation: 'INSPECTOR' },
  CLINICAL_THERMOMETER: { gatc: true, minDesignation: 'INSPECTOR' },
  SPHYGMOMANOMETER: { gatc: true, minDesignation: 'INSPECTOR' }
};

// Unknown/new categories fail safe: LMO only, base rank.
const DEFAULT_POLICY = { gatc: false, minDesignation: 'INSPECTOR' };

function parseKg(value) {
  if (value === undefined || value === null || value === '') return null;
  const match = String(value).replace(/,/g, '').match(/([\d.]+)\s*(t|tonne|ton|kg|g)?/i);
  if (!match) return null;
  const n = parseFloat(match[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (match[2] || 'kg').toLowerCase();
  if (unit === 'g') return n / 1000;
  if (unit.startsWith('t')) return n * 1000;
  return n;
}

// Resolves what an instrument requires. Returned shape is sent to the UI as-is.
export function getRequirement(category, instrument) {
  const code = category?.code;
  const policy = CATEGORY_POLICY[code] || DEFAULT_POLICY;

  let gatcAllowed = policy.gatc === true;
  let gatcNote = gatcAllowed
    ? 'On the GATC First Schedule'
    : 'Not on the GATC First Schedule — LMO only';

  if (policy.gatc === 'NAWI_150') {
    const accuracyClass = String(instrument?.specs?.accuracy_class || '').toUpperCase();
    const maxKg = parseKg(instrument?.max_capacity ?? instrument?.specs?.max_capacity);
    if (accuracyClass === 'IIII') {
      gatcAllowed = true;
      gatcNote = 'Class IIII — on the GATC First Schedule';
    } else if (accuracyClass === 'III' && maxKg !== null && maxKg <= 150) {
      gatcAllowed = true;
      gatcNote = `Class III, ${maxKg} kg — within the GATC 150 kg limit`;
    } else if (accuracyClass === 'III') {
      gatcNote = maxKg === null
        ? 'Class III with unknown capacity — GATC limit (150 kg) cannot be confirmed, LMO only'
        : `Class III, ${maxKg} kg — above the GATC 150 kg limit, LMO only`;
    } else {
      gatcNote = `Class ${accuracyClass || 'unspecified'} — GATC covers only class III (≤150 kg) and IIII, LMO only`;
    }
  }

  return {
    category_code: code || null,
    category_name: category?.name || 'Unknown category',
    gatc_allowed: gatcAllowed,
    gatc_note: gatcNote,
    min_designation: policy.minDesignation,
    min_designation_label: designationLabel(policy.minDesignation)
  };
}

// Returns { ok, reason } for the competence check of one candidate.
export function checkCompetence(candidate, org, requirement) {
  if (candidate.role === 'GATC') {
    if (!requirement.gatc_allowed) {
      return { ok: false, reason: requirement.gatc_note };
    }
    const approved = Array.isArray(org?.approved_categories) ? org.approved_categories : [];
    if (approved.length > 0 && !approved.includes(requirement.category_code)) {
      return { ok: false, reason: `GATC approval does not cover ${requirement.category_name}` };
    }
    return { ok: true, reason: approved.length > 0 ? 'Category is on this GATC\'s approval' : 'Approved test centre (full First Schedule)' };
  }

  const designation = candidate.designation || DEFAULT_DESIGNATION;
  const have = DESIGNATION_BY_CODE.get(designation)?.rank || 1;
  const need = DESIGNATION_BY_CODE.get(requirement.min_designation)?.rank || 1;
  if (have < need) {
    return { ok: false, reason: `${designationLabel(designation)} — requires ${requirement.min_designation_label} or above` };
  }
  return { ok: true, reason: `${designationLabel(designation)} — meets ${requirement.min_designation_label}` };
}

export function isValidDesignation(code) {
  return DESIGNATION_BY_CODE.has(code);
}

/**
 * Calculates Maximum Permissible Error (MPE) for a test point reading.
 * Implements Schedule IX of Legal Metrology (General) Rules, 2011 & OIML R76.
 */
export function calculateMPE(referenceLoad, scaleIntervalE, accuracyClass = 'III', verificationType = 'ORIGINAL', customMpeRules = []) {
  let eInUnit = 0.005; // default 5g = 0.005kg
  if (typeof scaleIntervalE === 'number') {
    eInUnit = scaleIntervalE;
  } else if (typeof scaleIntervalE === 'string') {
    const match = scaleIntervalE.match(/([\d.]+)\s*(kg|g|mg|t)?/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = (match[2] || 'kg').toLowerCase();
      if (unit === 'g') eInUnit = val / 1000;
      else if (unit === 'mg') eInUnit = val / 1000000;
      else if (unit === 't') eInUnit = val * 1000;
      else eInUnit = val;
    }
  }

  const loadInUnit = Number(referenceLoad) || 0;
  if (eInUnit <= 0) eInUnit = 0.005;

  const n = Math.abs(loadInUnit) / eInUnit;
  const isInitial = verificationType === 'ORIGINAL' || verificationType === 'INITIAL_VERIFICATION';

  // Use configured RuleSet MPE rules if defined
  if (Array.isArray(customMpeRules) && customMpeRules.length > 0) {
    const sorted = [...customMpeRules].sort((a, b) => a.max_e - b.max_e);
    for (const rule of sorted) {
      if (n <= rule.max_e) {
        const mpeFactor = isInitial ? (rule.initial_mpe_e || 0.5) : (rule.subsequent_mpe_e || 1.0);
        return {
          permissibleError: Number((mpeFactor * eInUnit).toFixed(6)),
          mpeFactor,
          eInUnit
        };
      }
    }
    const lastRule = sorted[sorted.length - 1];
    const mpeFactor = isInitial ? (lastRule.initial_mpe_e || 1.5) : (lastRule.subsequent_mpe_e || 3.0);
    return {
      permissibleError: Number((mpeFactor * eInUnit).toFixed(6)),
      mpeFactor,
      eInUnit
    };
  }

  // Statutory Schedule IX Class III defaults
  let mpeFactor = 0.5;
  if (n <= 500) {
    mpeFactor = isInitial ? 0.5 : 1.0;
  } else if (n <= 2000) {
    mpeFactor = isInitial ? 1.0 : 2.0;
  } else {
    mpeFactor = isInitial ? 1.5 : 3.0;
  }

  const permissibleError = Number((mpeFactor * eInUnit).toFixed(6));
  return {
    permissibleError,
    mpeFactor,
    eInUnit
  };
}

/**
 * Validates and calculates errors for verification readings server-side.
 */
export function evaluateReadingsAgainstMPE(readings, instrument, ruleSet, verificationType = 'ORIGINAL') {
  const eStr = instrument?.verification_scale_interval_e || instrument?.specs?.verification_scale_interval_e || '5 g';
  const accuracyClass = instrument?.specs?.accuracy_class || 'III';
  const customRules = ruleSet?.mpe_rules || [];

  let allPass = true;

  const evaluatedReadings = (readings || []).map((r) => {
    const refVal = Number(parseFloat(r.reference_value !== undefined ? r.reference_value : (r.standard_weight || 0))) || 0;
    const obsVal = Number(parseFloat(r.observed_value !== undefined && r.observed_value !== null ? r.observed_value : refVal)) || 0;
    const errorVal = Number((obsVal - refVal).toFixed(6));

    const { permissibleError } = calculateMPE(refVal, eStr, accuracyClass, verificationType, customRules);
    const isPass = Math.abs(errorVal) <= (permissibleError + 0.000001);

    if (!isPass) {
      allPass = false;
    }

    return {
      test_point: r.test_point || 'Test Point',
      reference_value: refVal,
      observed_value: obsVal,
      unit: r.unit || 'kg',
      error_value: errorVal,
      permissible_error: permissibleError,
      calculated_result: isPass ? 'PASS' : 'FAIL',
      reading_result: isPass ? 'PASS' : 'FAIL'
    };
  });

  return {
    readings: evaluatedReadings,
    allPass,
    calculatedOutcome: allPass ? 'PASS' : 'FAIL'
  };
}
