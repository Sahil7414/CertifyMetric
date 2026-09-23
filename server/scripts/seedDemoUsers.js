// =============================================================================
// CertifyMetric — MongoDB Atlas Idempotent Demo Seeding Script
// =============================================================================
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { hashPassword } from '../auth-utils.js';
import { connectMongo } from '../db/mongodb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
for (const envFile of ['.env.local', '.env', 'server/.env.local', 'server/.env']) {
  const fullPath = path.resolve(rootDir, envFile);
  try {
    if (fs.existsSync(fullPath) && typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(fullPath);
    }
  } catch (e) {}
}
import {
  User,
  Organization,
  InstrumentCategory,
  RuleSet,
  Instrument,
  Application,
  Assignment,
  Appointment,
  Verification,
  VerificationChecklistResponse,
  VerificationReading,
  Certificate,
  AuditLog
} from '../models/index.js';

export const DEMO_ACCOUNTS = [
  {
    id: 'USR_TRADER_01',
    email: 'demo.trader@certifymetric.local',
    password: 'DemoTrader@2026',
    role: 'TRADER',
    full_name: 'Demo Trader (Ramesh Sharma)',
    organization_id: 'ORG_TRADER_01',
    phone: '+91 98110 23456',
    avatar: null,
    description: 'Commercial trader who registers instruments, requests verifications, and receives digital Form 6 certificates.'
  },
  {
    id: 'USR_AUTHORITY_01',
    email: 'demo.authority@certifymetric.local',
    password: 'DemoAuthority@2026',
    role: 'AUTHORITY',
    full_name: 'Demo Authority Officer (Dr. S. K. Verma)',
    organization_id: 'ORG_GOV_DOCA',
    phone: '+91 94120 78901',
    avatar: null,
    description: 'Statutory metrology officer who evaluates verification requests, reviews workloads, and assigns verifiers/GATCs.'
  },
  {
    id: 'USR_VERIFIER_01',
    email: 'demo.verifier@certifymetric.local',
    password: 'DemoVerifier@2026',
    role: 'VERIFIER',
    full_name: 'Demo Field Verifier (Vikram Singh LMO)',
    organization_id: 'ORG_GOV_DOCA',
    phone: '+91 98230 45678',
    avatar: null,
    description: 'Field inspection officer who conducts physical testing in the workspace, takes error readings, records evidence, and issues certificates.'
  },
  {
    id: 'USR_GATC_01',
    email: 'demo.gatc@certifymetric.local',
    password: 'DemoGatc@2026',
    role: 'GATC',
    full_name: 'Demo GATC Testing Lab (MetroLab)',
    organization_id: 'ORG_GATC_01',
    phone: '+91 99340 11223',
    avatar: null,
    description: 'Government Approved Test Centre that performs laboratory verification for complex instruments.'
  },
  {
    id: 'USR_VERIFIER_02',
    email: 'demo.verifier.outofjurisdiction@certifymetric.local',
    password: 'DemoVerifier2@2026',
    role: 'VERIFIER',
    full_name: 'Demo Field Verifier (Anjali Deshmukh LMO)',
    organization_id: 'ORG_GOV_MUMBAI',
    phone: '+91 98220 11009',
    avatar: null,
    description: 'Seed-only illustration account: an LMO notified for Mumbai Suburban District only, used to demonstrate that the allocation engine correctly excludes out-of-jurisdiction officers from Delhi-based applications, even when idle.'
  },
  {
    id: 'USR_ADMIN_01',
    email: 'demo.admin@certifymetric.local',
    password: 'DemoAdmin@2026',
    role: 'PLATFORM_ADMIN',
    full_name: 'Demo Platform Admin (Rajesh Nair)',
    organization_id: 'ORG_GOV_DOCA',
    phone: '+91 98990 00112',
    avatar: null,
    description: 'System administrator with oversight across audit trails, category definitions, and platform health.'
  }
];

export async function seedDemoUsers() {
  const now = new Date().toISOString();

  // 1. Seed Organizations
  const orgs = [
    {
      id: 'ORG_TRADER_01',
      name: 'Apex Retail Traders Pvt Ltd',
      type: 'TRADER_ORG',
      jurisdictions: ['Central Delhi, Delhi'],
      created_at: now
    },
    {
      id: 'ORG_GOV_DOCA',
      name: 'Department of Consumer Affairs - Legal Metrology Division',
      type: 'STATUTORY_AUTHORITY',
      // This office's LMOs hold notified charge across these Delhi districts —
      // listed at the same granularity as Instrument.district so the hard
      // jurisdiction filter can actually match on them.
      jurisdictions: [
        'Central Delhi, Delhi',
        'South East Delhi, Delhi',
        'South West Delhi, Delhi',
        'South Delhi, Delhi',
        'North West Delhi, Delhi'
      ],
      created_at: now
    },
    {
      id: 'ORG_GATC_01',
      name: 'National Metrology Testing Centre (GATC Lab 04)',
      type: 'TEST_CENTRE',
      jurisdictions: [
        'Central Delhi, Delhi',
        'South East Delhi, Delhi',
        'South West Delhi, Delhi',
        'South Delhi, Delhi',
        'North West Delhi, Delhi'
      ],
      created_at: now
    },
    {
      id: 'ORG_GOV_MUMBAI',
      name: 'Department of Consumer Affairs - Legal Metrology Division (Mumbai Suburban)',
      type: 'STATUTORY_AUTHORITY',
      // Seed-only illustration org: deliberately a DIFFERENT jurisdiction from every
      // Delhi-based instrument in this demo, so the allocation engine's hard
      // jurisdiction filter has something real to exclude.
      jurisdictions: ['Mumbai Suburban, Maharashtra'],
      created_at: now
    }
  ];

  for (const org of orgs) {
    await Organization.findOneAndUpdate(
      { id: org.id },
      { $set: org },
      { upsert: true, new: true }
    );
  }

  // 2. Seed Users
  for (const acc of DEMO_ACCOUNTS) {
    const password_hash = hashPassword(acc.password);
    await User.findOneAndUpdate(
      { email: acc.email.toLowerCase() },
      {
        $set: {
          id: acc.id,
          email: acc.email.toLowerCase(),
          password_hash,
          role: acc.role,
          full_name: acc.full_name,
          organization_id: acc.organization_id,
          phone: acc.phone,
          avatar: acc.avatar,
          is_demo: 1,
          active: true,
          updated_at: now
        },
        $setOnInsert: { created_at: now }
      },
      { upsert: true, new: true }
    );
  }

  console.log('✔ Successfully seeded demo accounts with scrypt hashed passwords in MongoDB.');
}

export async function seedCategoriesAndRules() {
  const now = new Date().toISOString();

  // 1. Categories
  // NOTE ON DATA PROVENANCE: NAWI's accuracy classes, weighbridge/dispenser/water-meter/
  // gas-meter sub-types and size ranges below are sourced from real OIML/ISO/BIS
  // documentation (see Memory.md for citations). The mpe_rules/checklist_schema for
  // every category OTHER than NAWI are simplified placeholders, NOT transcribed from a
  // verified primary statutory table — treat them as structurally correct but not yet
  // domain-validated (flagged as an OPEN item in Memory.md).
  const categories = [
    {
      id: 'CAT_NAWI_III',
      code: 'NAWI',
      name: 'Non-Automatic Weighing Instrument (NAWI)',
      description: 'Ordinary shop/platform scales where a human loads and reads the weight — counter scales, platform scales, retail computing scales.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['I', 'II', 'III', 'IIII'], required: true, help: 'III = standard retail/shop scale; I = lab precision; II = jewellery/pharmacy; IIII = coarse industrial.' }
      ],
      active: 1
    },
    {
      id: 'CAT_AUTO_WEIGH',
      code: 'AUTO_WEIGHING',
      name: 'Automatic Weighing Instrument',
      description: 'Weighs without a human loading each reading — checkweighers, belt conveyor scales, automatic rail-weighbridges, gravimetric filling instruments.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'sub_type', label: 'Sub-Type', type: 'select', options: ['Checkweigher / Catchweigher', 'Belt Conveyor Scale', 'Automatic Rail-Weighbridge', 'Automatic Gravimetric Filling Instrument'], required: true },
        { key: 'max_capacity_kg', label: 'Max Capacity', type: 'text', unit: 'kg', required: true },
        { key: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['0.2', '0.5', '1', '2'], required: false, help: 'OIML R61 operational class X(x) — approximate.' }
      ],
      active: 1
    },
    {
      id: 'CAT_WEIGHBRIDGE',
      code: 'WEIGHBRIDGE',
      name: 'Weighbridge',
      description: 'Large-capacity vehicle/truck scale used for freight billing, mandi transactions, and toll/excise weighing.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'installation_type', label: 'Installation Type', type: 'select', options: ['Pit Type', 'Pitless / Surface-Mounted'], required: true },
        { key: 'platform_length_m', label: 'Platform Length', type: 'text', unit: 'm', required: true },
        { key: 'platform_width_m', label: 'Platform Width', type: 'text', unit: 'm', required: false },
        { key: 'max_capacity_ton', label: 'Max Capacity', type: 'text', unit: 'ton', required: true },
        { key: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['III', 'IIII'], required: true }
      ],
      active: 1
    },
    {
      id: 'CAT_FUEL_DISPENSER',
      code: 'FUEL_DISPENSER',
      name: 'Fuel Dispensing Pump (Petrol/Diesel)',
      description: 'Retail motor fuel dispenser at a petrol pump — the classic "is my litre really a litre" consumer protection case.',
      measurement_type: 'VOLUME',
      spec_schema: [
        { key: 'product_type', label: 'Product Type', type: 'select', options: ['Petrol', 'Diesel', 'Multi-Product (Petrol + Diesel)'], required: true },
        { key: 'number_of_nozzles', label: 'Number of Nozzles', type: 'number', required: true },
        { key: 'flow_rate_lpm', label: 'Flow Rate', type: 'text', unit: 'L/min', required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_GAS_FUEL_DISPENSER',
      code: 'GAS_FUEL_DISPENSER',
      name: 'CNG / LPG / LNG / Hydrogen Dispenser',
      description: 'Clean-fuel dispenser now within the expanded GATC verification scope alongside conventional petrol/diesel pumps.',
      measurement_type: 'VOLUME',
      spec_schema: [
        { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['CNG', 'LPG', 'LNG', 'Hydrogen'], required: true },
        { key: 'number_of_dispensing_points', label: 'Number of Dispensing Points', type: 'number', required: true }
      ],
      active: 1
    },
    {
      id: 'CAT_WATER_METER',
      code: 'WATER_METER',
      name: 'Water Meter',
      description: 'Domestic or commercial water utility billing meter — governed by IS 779 / ISO 4064.',
      measurement_type: 'VOLUME',
      spec_schema: [
        { key: 'meter_type', label: 'Meter Type', type: 'select', options: ['Mechanical — Single Jet', 'Mechanical — Multi Jet', 'Electromagnetic', 'Ultrasonic'], required: true },
        { key: 'nominal_diameter_mm', label: 'Nominal Diameter (DN)', type: 'select', options: ['15', '20', '25', '32', '40', '50', '65', '80', '100', '150', '200'], unit: 'mm', required: true },
        { key: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['Class A (legacy)', 'Class B (legacy)', 'Class 1 (ISO 4064:2014)', 'Class 2 (ISO 4064:2014)'], required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_ENERGY_METER',
      code: 'ENERGY_METER',
      name: 'Energy Meter (Electricity)',
      description: 'Household or commercial electricity billing meter — over-billing from a miscalibrated meter is a Legal Metrology consumer protection issue.',
      measurement_type: 'ENERGY',
      spec_schema: [
        { key: 'phase', label: 'Phase', type: 'select', options: ['Single Phase', 'Three Phase'], required: true },
        { key: 'meter_type', label: 'Meter Type', type: 'select', options: ['Electromechanical (Induction)', 'Static (Electronic)'], required: true },
        { key: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['0.2S', '0.5S', '1', '2'], required: false, help: 'Industry-standard IEC 62053 classes — not yet checked against a specific Indian statutory schedule.' }
      ],
      active: 1
    },
    {
      id: 'CAT_GAS_METER',
      code: 'GAS_METER',
      name: 'Gas Meter',
      description: 'Domestic or commercial piped-gas meter. India has been actively drafting new Legal Metrology rules for this category as recently as 2025.',
      measurement_type: 'VOLUME',
      spec_schema: [
        { key: 'meter_type', label: 'Meter Type', type: 'select', options: ['Diaphragm', 'Rotary', 'Turbine'], required: true },
        { key: 'size', label: 'Size', type: 'select', options: ['G1.6', 'G2.5', 'G4', 'G6', 'G10', 'G16', 'G25'], required: true }
      ],
      active: 1
    },
    {
      id: 'CAT_LENGTH_MEASURE',
      code: 'LENGTH_MEASURE',
      name: 'Length Measure',
      description: 'Measuring tapes, rigid rules, and chains used commercially — cloth merchants, construction material sellers.',
      measurement_type: 'LENGTH',
      spec_schema: [
        { key: 'measure_type', label: 'Type', type: 'select', options: ['Steel Tape', 'Fiberglass Tape', 'Cloth Tape', 'Rigid Rule', 'Chain'], required: true },
        { key: 'nominal_length_m', label: 'Nominal Length', type: 'select', options: ['1', '2', '3', '5', '10', '15', '20', '25', '30', '50', '100'], unit: 'm', required: true }
      ],
      active: 1
    },
    {
      id: 'CAT_VOLUME_MEASURE',
      code: 'VOLUME_MEASURE',
      name: 'Volumetric / Capacity Measure',
      description: 'Liquid measures used outside metered dispensers — milk cans, oil measuring vessels — in traditional trade settings with no pump/meter.',
      measurement_type: 'VOLUME',
      spec_schema: [
        { key: 'measure_type', label: 'Type', type: 'select', options: ['Liquid Measure (Metal)', 'Liquid Measure (Plastic)', 'Dry Measure'], required: true },
        { key: 'nominal_capacity', label: 'Nominal Capacity', type: 'select', options: ['5 ml', '10 ml', '20 ml', '50 ml', '100 ml', '200 ml', '500 ml', '1 L', '2 L', '5 L', '10 L', '20 L'], required: true }
      ],
      active: 1
    },
    // ---------------------------------------------------------------------
    // Second tranche: the remaining instrument families that appear in the
    // Legal Metrology (Approval of Models) Rules, 2011 schedule and in state
    // verification/stamping fee schedules but were missing from the original
    // ten. Sub-types, denominations and size ranges below follow the relevant
    // OIML/IS documents (OIML R111 weights, R60 load cells, R21 taximeters,
    // R117 bulk flow meters, R71/R80 tanks, IS 3784 clinical thermometers,
    // IS 3390 sphygmomanometers). Their mpe_rules/checklist_schema are the
    // same simplified placeholders as the non-NAWI tranche above — structurally
    // correct, NOT domain-validated against a primary statutory table.
    // ---------------------------------------------------------------------
    {
      id: 'CAT_WEIGHTS_COMMERCIAL',
      code: 'WEIGHTS_COMMERCIAL',
      name: 'Commercial Weights',
      description: 'Loose cast-iron / brass / stainless trade weights used on beam scales and counter machines. By sheer count this is the single largest item on any Legal Metrology office register.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'material', label: 'Material', type: 'select', options: ['Cast Iron', 'Brass', 'Stainless Steel', 'Gun Metal'], required: true },
        { key: 'denomination', label: 'Denomination', type: 'select', options: ['1 g', '2 g', '5 g', '10 g', '20 g', '50 g', '100 g', '200 g', '500 g', '1 kg', '2 kg', '5 kg', '10 kg', '20 kg', '50 kg'], required: true },
        { key: 'quantity_in_set', label: 'Number of Pieces Presented', type: 'number', required: true, help: 'Weights are presented and stamped in batches, not one at a time.' },
        { key: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['M1', 'M2', 'M3'], required: false, help: 'OIML R111 class — M1/M2 typical for commercial trade weights.' }
      ],
      active: 1
    },
    {
      id: 'CAT_WEIGHTS_PRECISION',
      code: 'WEIGHTS_PRECISION',
      name: 'Precision / Carat (Bullion) Weights',
      description: 'High-class weights used with jewellery, bullion and laboratory balances — carat weights for gemstones, milligram sets for pharmacy and assay work.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'weight_type', label: 'Weight Type', type: 'select', options: ['Carat Weight', 'Milligram / Fractional Set', 'Analytical Set'], required: true },
        { key: 'denomination', label: 'Denomination', type: 'text', required: true, help: 'e.g. 1 ct, 10 ct, 1 mg, 500 mg.' },
        { key: 'quantity_in_set', label: 'Number of Pieces Presented', type: 'number', required: true },
        { key: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['E1', 'E2', 'F1', 'F2'], required: true, help: 'OIML R111 class — E/F classes for precision and bullion use.' }
      ],
      active: 1
    },
    {
      id: 'CAT_BEAM_SCALE',
      code: 'BEAM_SCALE',
      name: 'Beam Scale / Counter Machine',
      description: 'Traditional two-pan beam balance or counter machine used with loose weights — still dominant in mandis, kirana shops and grain markets.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'scale_type', label: 'Type', type: 'select', options: ['Two-Pan Beam Scale', 'Counter Machine', 'Platform Beam Scale'], required: true },
        { key: 'max_capacity_kg', label: 'Max Capacity', type: 'text', unit: 'kg', required: true },
        { key: 'beam_length_mm', label: 'Beam Length', type: 'text', unit: 'mm', required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_SPRING_BALANCE',
      code: 'SPRING_BALANCE',
      name: 'Spring Balance',
      description: 'Hand-held or wall-mounted spring-actuated weighing device used for small-lot trade — vegetables, fish, gas cylinders.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'mounting', label: 'Mounting', type: 'select', options: ['Hand-Held / Hanging', 'Wall / Bracket Mounted', 'Dial Face'], required: true },
        { key: 'max_capacity_kg', label: 'Max Capacity', type: 'text', unit: 'kg', required: true },
        { key: 'scale_division_g', label: 'Scale Division', type: 'text', unit: 'g', required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_CRANE_SCALE',
      code: 'CRANE_SCALE',
      name: 'Crane / Hanging Scale',
      description: 'Load-suspended electronic weigher hung from a crane or hoist, used in scrap yards, cold stores, steel and timber trade.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'max_capacity_kg', label: 'Max Capacity', type: 'text', unit: 'kg', required: true },
        { key: 'readout', label: 'Readout', type: 'select', options: ['Integral Display', 'Wireless Remote Display', 'Both'], required: false },
        { key: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['III', 'IIII'], required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_LOAD_CELL',
      code: 'LOAD_CELL',
      name: 'Load Cell (Component)',
      description: 'Weighing transducer submitted for model approval in its own right — approved separately from the instrument it is later fitted into.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'cell_type', label: 'Cell Type', type: 'select', options: ['Single Point', 'Shear Beam', 'Compression / Canister', 'S-Type / Tension', 'Double-Ended Shear Beam'], required: true },
        { key: 'rated_capacity', label: 'Rated Capacity (Emax)', type: 'text', required: true, help: 'e.g. 500 kg, 30 t.' },
        { key: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['A', 'B', 'C', 'D'], required: true, help: 'OIML R60 class, usually quoted with the interval count e.g. C3.' },
        { key: 'max_intervals', label: 'Maximum Number of Intervals (nmax)', type: 'number', required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_WEIGHING_INDICATOR',
      code: 'WEIGHING_INDICATOR',
      name: 'Weighing Indicator / Digital Readout (Component)',
      description: 'Electronic indicator or terminal paired with a load cell. Like load cells, indicators carry their own model approval and must be verified as a matched pair with the cell.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'display_type', label: 'Display Type', type: 'select', options: ['LED', 'LCD', 'Touchscreen / HMI'], required: true },
        { key: 'max_intervals', label: 'Maximum Number of Intervals (nmax)', type: 'number', required: false },
        { key: 'interfaces', label: 'Interfaces', type: 'select', options: ['None', 'RS-232 / RS-485', 'Ethernet / TCP-IP', 'Printer + Serial', 'Wireless'], required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_LPG_CYLINDER_FILLING',
      code: 'LPG_CYLINDER_FILLING',
      name: 'LPG Cylinder Filling Machine',
      description: 'Carousel or single-head gravimetric filling machine at an LPG bottling plant — short-filled domestic cylinders are a recurring enforcement issue.',
      measurement_type: 'MASS',
      spec_schema: [
        { key: 'machine_type', label: 'Machine Type', type: 'select', options: ['Electronic Carousel', 'Single-Head Electronic', 'Check Scale (post-fill)'], required: true },
        { key: 'cylinder_sizes_kg', label: 'Cylinder Sizes Handled', type: 'select', options: ['5 kg', '14.2 kg', '19 kg', '47.5 kg', 'Multiple'], required: true },
        { key: 'number_of_heads', label: 'Number of Filling Heads', type: 'number', required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_TAXIMETER',
      code: 'TAXIMETER',
      name: 'Taximeter / Auto-Rickshaw Fare Meter',
      description: 'Fare-computing meter on a taxi or auto-rickshaw. A distinct Legal Metrology category: verification checks the fare table and the distance/waiting-time calculation, not a mass or volume.',
      measurement_type: 'FARE',
      spec_schema: [
        { key: 'vehicle_type', label: 'Vehicle Type', type: 'select', options: ['Taxi (4-Wheeler)', 'Auto-Rickshaw (3-Wheeler)', 'Maxi Cab'], required: true },
        { key: 'meter_type', label: 'Meter Type', type: 'select', options: ['Electronic with Printer', 'Electronic without Printer', 'Mechanical (legacy)'], required: true },
        { key: 'tariff_version', label: 'Notified Tariff Version', type: 'text', required: true, help: 'The State/RTO fare notification the meter is programmed to.' },
        { key: 'vehicle_registration_no', label: 'Vehicle Registration Number', type: 'text', required: true }
      ],
      active: 1
    },
    {
      id: 'CAT_BULK_FLOW_METER',
      code: 'BULK_FLOW_METER',
      name: 'Bulk Liquid Flow Meter',
      description: 'Tanker loading/unloading meter at an oil terminal, dairy or chemical depot — measures bulk consignments where a single error is worth lakhs.',
      measurement_type: 'VOLUME',
      spec_schema: [
        { key: 'meter_technology', label: 'Meter Technology', type: 'select', options: ['Positive Displacement', 'Turbine', 'Coriolis (Mass)', 'Electromagnetic', 'Ultrasonic'], required: true },
        { key: 'product', label: 'Product Measured', type: 'select', options: ['Petroleum — Motor Spirit', 'Petroleum — Diesel / Furnace Oil', 'Edible Oil', 'Milk', 'Chemical / Solvent', 'Other'], required: true },
        { key: 'nominal_diameter_mm', label: 'Nominal Diameter (DN)', type: 'select', options: ['25', '40', '50', '80', '100', '150', '200', '250'], unit: 'mm', required: true },
        { key: 'max_flow_rate_lpm', label: 'Max Flow Rate', type: 'text', unit: 'L/min', required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_ROAD_TANKER',
      code: 'ROAD_TANKER',
      name: 'Road Tanker / Tank Truck Capacity Measure',
      description: 'Calibrated compartments of a petroleum or milk tanker. The tanker itself is the measure — each compartment is dip-calibrated and stamped.',
      measurement_type: 'VOLUME',
      spec_schema: [
        { key: 'number_of_compartments', label: 'Number of Compartments', type: 'number', required: true },
        { key: 'total_capacity_l', label: 'Total Capacity', type: 'text', unit: 'L', required: true },
        { key: 'product', label: 'Product Carried', type: 'select', options: ['Petroleum — Motor Spirit', 'Petroleum — Diesel', 'Edible Oil', 'Milk', 'Chemical / Solvent', 'Other'], required: true },
        { key: 'vehicle_registration_no', label: 'Vehicle Registration Number', type: 'text', required: true }
      ],
      active: 1
    },
    {
      id: 'CAT_STORAGE_TANK',
      code: 'STORAGE_TANK',
      name: 'Static Storage Tank',
      description: 'Fixed vertical or horizontal bulk storage tank whose calibration chart (capacity table) is verified — depots, terminals, dairies, distilleries.',
      measurement_type: 'VOLUME',
      spec_schema: [
        { key: 'tank_orientation', label: 'Orientation', type: 'select', options: ['Vertical Cylindrical', 'Horizontal Cylindrical', 'Underground (UG)', 'Spherical / Bullet'], required: true },
        { key: 'nominal_capacity_kl', label: 'Nominal Capacity', type: 'text', unit: 'kL', required: true },
        { key: 'gauging_method', label: 'Gauging Method', type: 'select', options: ['Manual Dip (dip rod/tape)', 'Automatic Tank Gauge (ATG)', 'Both'], required: false },
        { key: 'product', label: 'Product Stored', type: 'select', options: ['Petroleum — Motor Spirit', 'Petroleum — Diesel / Furnace Oil', 'Edible Oil', 'Milk', 'Chemical / Solvent', 'Other'], required: true }
      ],
      active: 1
    },
    {
      id: 'CAT_DIP_ROD',
      code: 'DIP_ROD',
      name: 'Dip Rod / Ullage Measuring Device',
      description: 'Graduated rod or dip tape used to read the liquid level in a storage tank or tanker compartment. Verified as a length measure, but always against the tank calibration chart it serves.',
      measurement_type: 'LENGTH',
      spec_schema: [
        { key: 'device_type', label: 'Device Type', type: 'select', options: ['Rigid Dip Rod', 'Dip Tape with Bob', 'Ullage Tape'], required: true },
        { key: 'nominal_length_m', label: 'Nominal Length', type: 'select', options: ['1', '1.5', '2', '3', '5', '10', '15', '20', '30'], unit: 'm', required: true },
        { key: 'graduation_mm', label: 'Graduation Interval', type: 'text', unit: 'mm', required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_TEXTILE_LENGTH_MACHINE',
      code: 'TEXTILE_LENGTH_MACHINE',
      name: 'Textile / Cloth Length Measuring Machine',
      description: 'Powered roller machine that measures and records fabric length in a mill or wholesale cloth market — distinct from a hand-held tape.',
      measurement_type: 'LENGTH',
      spec_schema: [
        { key: 'machine_type', label: 'Machine Type', type: 'select', options: ['Roller / Wheel Encoder', 'Folding Machine with Counter', 'Inspection Machine with Counter'], required: true },
        { key: 'max_width_mm', label: 'Max Fabric Width', type: 'text', unit: 'mm', required: false },
        { key: 'counter_resolution', label: 'Counter Resolution', type: 'select', options: ['1 m', '0.1 m', '0.01 m'], required: false }
      ],
      active: 1
    },
    {
      id: 'CAT_CLINICAL_THERMOMETER',
      code: 'CLINICAL_THERMOMETER',
      name: 'Clinical Thermometer',
      description: 'Medical thermometer sold or used commercially — a regulated measuring device under Legal Metrology (IS 3784 for the mercury-in-glass type), verified in batches.',
      measurement_type: 'TEMPERATURE',
      spec_schema: [
        { key: 'thermometer_type', label: 'Type', type: 'select', options: ['Mercury-in-Glass', 'Digital Contact', 'Infrared / Non-Contact'], required: true },
        { key: 'range_c', label: 'Measuring Range', type: 'select', options: ['35-42 °C', '32-42 °C', '32-43 °C', 'Other'], required: true },
        { key: 'quantity_in_batch', label: 'Number of Pieces Presented', type: 'number', required: true, help: 'Presented and stamped as a batch, like weights.' }
      ],
      active: 1
    },
    {
      id: 'CAT_SPHYGMOMANOMETER',
      code: 'SPHYGMOMANOMETER',
      name: 'Sphygmomanometer (Blood Pressure Meter)',
      description: 'Non-invasive blood pressure measuring instrument — a notified Legal Metrology category (IS 3390), so a clinic’s BP apparatus is legally a verifiable measuring instrument.',
      measurement_type: 'PRESSURE',
      spec_schema: [
        { key: 'device_type', label: 'Device Type', type: 'select', options: ['Mercury Column', 'Aneroid (Dial)', 'Digital / Automated Oscillometric'], required: true },
        { key: 'range_mmhg', label: 'Measuring Range', type: 'select', options: ['0-300 mmHg', '0-280 mmHg', 'Other'], required: true },
        { key: 'cuff_sizes', label: 'Cuff Sizes Supplied', type: 'select', options: ['Adult', 'Adult + Paediatric', 'Adult + Large Adult', 'Full Set'], required: false }
      ],
      active: 1
    }
  ];

  // Per-category presentation metadata for the registration form. Kept out of
  // the category objects above so the statutory data stays readable, and kept in
  // principle in project architecture documentation.
  //   icon               Material Symbols glyph shown in the drawer header.
  //   spec_section       Heading for the category-specific field group.
  //   capacity_fields    Show Max/Min/Interval(e) — the three dedicated top-level
  //                      Instrument columns the NAWI MPE engine reads. Only NAWI
  //                      sets this; every other category carries its capacity
  //                      inside `specs` via its own spec_schema.
  //   serial_label/hint  A batch of weights has a set number, not a serial; a
  //                      storage tank has a painted tank number. Saying 'Device
  //                      Serial Number' for those is simply wrong.
  //   notice             Amber strip for categories whose registration is unusual
  //                      (stamped as a batch, approved as a component, vehicle-tied).
  const FORM_META = {
    CAT_NAWI_III: {
      icon: 'scale',
      spec_section: 'Weighing Range & Verification Interval',
      capacity_fields: true,
      serial_label: 'Device Serial Number',
      serial_hint: 'Must strictly match the permanent stamping on the official metal plate.',
      manufacturer_placeholder: 'e.g. Avery Weigh-Tronix',
      model_placeholder: 'e.g. ZK830 Digital',
      location_label: 'Operational Location / Establishment',
      location_placeholder: 'e.g. Counter 3, Ration Shop, MG Road'
    },
    CAT_AUTO_WEIGH: {
      icon: 'precision_manufacturing',
      spec_section: 'Automatic Weigher Specifications',
      capacity_fields: false,
      serial_label: 'Device Serial Number',
      serial_hint: 'Serial stamped on the weigher nameplate — not the conveyor or host machine serial.',
      manufacturer_placeholder: 'e.g. Mettler-Toledo',
      model_placeholder: 'e.g. C31 StandardLine',
      location_label: 'Installation Location / Production Line',
      location_placeholder: 'e.g. Packing Line 2, Unit-I, MIDC Estate'
    },
    CAT_WEIGHBRIDGE: {
      icon: 'local_shipping',
      spec_section: 'Weighbridge Platform & Capacity',
      capacity_fields: false,
      serial_label: 'Device Serial Number',
      serial_hint: 'Serial on the weighbridge nameplate at the indicator cabin.',
      manufacturer_placeholder: 'e.g. Essae-Teraoka',
      model_placeholder: 'e.g. WB-60T Pitless',
      location_label: 'Weighbridge Site Address',
      location_placeholder: 'e.g. Gate No. 2, Cement Terminal, NH-48'
    },
    CAT_FUEL_DISPENSER: {
      icon: 'local_gas_station',
      spec_section: 'Dispenser Configuration',
      capacity_fields: false,
      serial_label: 'Dispensing Unit Serial Number',
      serial_hint: 'Each dispensing unit is registered separately — use the unit serial, not the outlet code.',
      manufacturer_placeholder: 'e.g. Gilbarco Veeder-Root',
      model_placeholder: 'e.g. SK700-II',
      location_label: 'Retail Outlet & Dispensing Bay',
      location_placeholder: 'e.g. Bay 2, IOCL Retail Outlet, NH-44'
    },
    CAT_GAS_FUEL_DISPENSER: {
      icon: 'propane_tank',
      spec_section: 'Dispenser Configuration',
      capacity_fields: false,
      serial_label: 'Dispensing Unit Serial Number',
      serial_hint: 'Each dispensing unit is registered separately — use the unit serial, not the station code.',
      manufacturer_placeholder: 'e.g. Kirloskar / Aspro',
      model_placeholder: 'e.g. CNG-2N Twin',
      location_label: 'Station & Dispensing Bay',
      location_placeholder: 'e.g. Bay 1, MGL CNG Station, Andheri East'
    },
    CAT_WATER_METER: {
      icon: 'water_drop',
      spec_section: 'Meter Specifications',
      capacity_fields: false,
      serial_label: 'Meter Serial Number',
      serial_hint: 'Serial engraved on the meter body or under the dial cover.',
      manufacturer_placeholder: 'e.g. Kranti Industries',
      model_placeholder: 'e.g. KM-15 Multi Jet',
      location_label: 'Service Connection / Premises',
      location_placeholder: 'e.g. Consumer No. 4471, Flat B-302, Sector 21'
    },
    CAT_ENERGY_METER: {
      icon: 'bolt',
      spec_section: 'Meter Specifications',
      capacity_fields: false,
      serial_label: 'Meter Serial Number',
      serial_hint: 'Serial printed on the meter faceplate, matching the utility consumer record.',
      manufacturer_placeholder: 'e.g. Secure Meters',
      model_placeholder: 'e.g. Sprint 350',
      location_label: 'Service Connection / Premises',
      location_placeholder: 'e.g. Consumer No. 88213, Meter Board, Shop 7'
    },
    CAT_GAS_METER: {
      icon: 'gas_meter',
      spec_section: 'Meter Specifications',
      capacity_fields: false,
      serial_label: 'Meter Serial Number',
      serial_hint: 'Serial on the meter index plate.',
      manufacturer_placeholder: 'e.g. Itron',
      model_placeholder: 'e.g. Gallus G4',
      location_label: 'Service Connection / Premises',
      location_placeholder: 'e.g. PNG Consumer No. 2290, Kitchen Riser, Flat 14C'
    },
    CAT_LENGTH_MEASURE: {
      icon: 'straighten',
      spec_section: 'Measure Specifications',
      capacity_fields: false,
      serial_label: 'Set / Batch Number',
      serial_hint: 'Tapes are stamped in batches — enter the batch number stamped on the end-hook or case.',
      manufacturer_placeholder: 'e.g. Freemans',
      model_placeholder: 'e.g. Steel Tape 30 m',
      location_label: 'Premises Where Used',
      location_placeholder: 'e.g. Cloth Counter, Ranganathan Street Store',
      notice: 'Batch registration: one record covers the full set or lot presented for stamping.'
    },
    CAT_VOLUME_MEASURE: {
      icon: 'science',
      spec_section: 'Measure Specifications',
      capacity_fields: false,
      serial_label: 'Set / Batch Number',
      serial_hint: 'Capacity measures are stamped in sets — enter the set or batch number punched on the rim.',
      manufacturer_placeholder: 'e.g. Jain Metal Works',
      model_placeholder: 'e.g. 1 L Conical Measure',
      location_label: 'Premises Where Used',
      location_placeholder: 'e.g. Milk Booth 12, Dairy Co-operative, Anand',
      notice: 'Batch registration: one record covers the full set or lot presented for stamping.'
    },
    CAT_WEIGHTS_COMMERCIAL: {
      icon: 'monitor_weight',
      spec_section: 'Weight Set Details',
      capacity_fields: false,
      serial_label: 'Set / Batch Number',
      serial_hint: 'Weights are presented and stamped as a batch — enter the set number, not a per-piece serial.',
      manufacturer_placeholder: 'e.g. Shakti Weights',
      model_placeholder: 'e.g. Cast Iron Trade Set',
      location_label: 'Premises Where Used',
      location_placeholder: 'e.g. Grain Counter, APMC Mandi Yard, Stall 14',
      notice: 'Batch registration: one record covers the full set or lot presented for stamping.'
    },
    CAT_WEIGHTS_PRECISION: {
      icon: 'diamond',
      spec_section: 'Weight Set Details',
      capacity_fields: false,
      serial_label: 'Set / Batch Number',
      serial_hint: 'Precision sets are stamped as a batch — enter the set number engraved on the case.',
      manufacturer_placeholder: 'e.g. Adam Equipment',
      model_placeholder: 'e.g. E2 Calibration Set',
      location_label: 'Premises Where Used',
      location_placeholder: 'e.g. Assay Counter, Jewellery Showroom, Zaveri Bazaar',
      notice: 'Batch registration: one record covers the full set or lot presented for stamping.'
    },
    CAT_BEAM_SCALE: {
      icon: 'balance',
      spec_section: 'Beam Scale Specifications',
      capacity_fields: false,
      serial_label: 'Device Serial Number',
      serial_hint: 'Number punched on the beam or the counter machine base.',
      manufacturer_placeholder: 'e.g. Bharat Scales',
      model_placeholder: 'e.g. Counter Machine 10 kg',
      location_label: 'Premises Where Used',
      location_placeholder: 'e.g. Grain Counter, APMC Mandi Yard, Stall 14'
    },
    CAT_SPRING_BALANCE: {
      icon: 'scale',
      spec_section: 'Balance Specifications',
      capacity_fields: false,
      serial_label: 'Device Serial Number',
      serial_hint: 'Number stamped on the dial face or the spring housing.',
      manufacturer_placeholder: 'e.g. Salter',
      model_placeholder: 'e.g. 235-6S',
      location_label: 'Premises Where Used',
      location_placeholder: 'e.g. Fish Stall 8, Municipal Market, Alappuzha'
    },
    CAT_CRANE_SCALE: {
      icon: 'warehouse',
      spec_section: 'Crane Scale Specifications',
      capacity_fields: false,
      serial_label: 'Device Serial Number',
      serial_hint: 'Serial on the load housing nameplate.',
      manufacturer_placeholder: 'e.g. Ishida',
      model_placeholder: 'e.g. CS-5T Wireless',
      location_label: 'Installation Site',
      location_placeholder: 'e.g. Scrap Bay, Hoist 2, Industrial Area Phase-II'
    },
    CAT_LOAD_CELL: {
      icon: 'memory',
      spec_section: 'Load Cell Ratings',
      capacity_fields: false,
      serial_label: 'Load Cell Serial Number',
      serial_hint: 'Serial etched on the cell body, under the cable gland.',
      manufacturer_placeholder: 'e.g. HBM',
      model_placeholder: 'e.g. PW15AH',
      location_label: 'Host Instrument / Installation Site',
      location_placeholder: 'e.g. Fitted to Weighbridge WB-60T, Gate No. 2',
      notice: 'Component approval: a load cell is approved in its own right and verified as a matched pair with its indicator.'
    },
    CAT_WEIGHING_INDICATOR: {
      icon: 'display_settings',
      spec_section: 'Indicator Ratings',
      capacity_fields: false,
      serial_label: 'Indicator Serial Number',
      serial_hint: 'Serial on the rear panel label of the indicator.',
      manufacturer_placeholder: 'e.g. Rice Lake',
      model_placeholder: 'e.g. 880 Performance',
      location_label: 'Host Instrument / Installation Site',
      location_placeholder: 'e.g. Indicator cabin, Weighbridge WB-60T, Gate No. 2',
      notice: 'Component approval: an indicator is approved in its own right and verified as a matched pair with its load cell.'
    },
    CAT_LPG_CYLINDER_FILLING: {
      icon: 'propane_tank',
      spec_section: 'Filling Machine Configuration',
      capacity_fields: false,
      serial_label: 'Machine Serial Number',
      serial_hint: 'Serial on the carousel or filling head nameplate.',
      manufacturer_placeholder: 'e.g. Kosan Crisplant',
      model_placeholder: 'e.g. CC-24 Carousel',
      location_label: 'Bottling Plant & Line',
      location_placeholder: 'e.g. Carousel 1, HPCL Bottling Plant, Vashi'
    },
    CAT_TAXIMETER: {
      icon: 'local_taxi',
      spec_section: 'Fare Meter Configuration',
      capacity_fields: false,
      serial_label: 'Meter Serial Number',
      serial_hint: 'Serial on the meter body. The vehicle registration number is captured separately below.',
      manufacturer_placeholder: 'e.g. Pricol',
      model_placeholder: 'e.g. ETM-500',
      location_label: 'Operating Base / Permit Region',
      location_placeholder: 'e.g. Andheri Taxi Stand, MMRTA Permit Zone',
      notice: 'Vehicle-mounted: the registration is tied to the vehicle, so the RTO registration number is mandatory.'
    },
    CAT_BULK_FLOW_METER: {
      icon: 'speed',
      spec_section: 'Flow Meter Specifications',
      capacity_fields: false,
      serial_label: 'Meter Serial Number',
      serial_hint: 'Serial on the transmitter nameplate, matching the gantry asset register.',
      manufacturer_placeholder: 'e.g. Emerson Micro Motion',
      model_placeholder: 'e.g. CMF300',
      location_label: 'Terminal / Loading Gantry',
      location_placeholder: 'e.g. Gantry 3, Arm 2, BPCL Terminal, Manmad'
    },
    CAT_ROAD_TANKER: {
      icon: 'local_shipping',
      spec_section: 'Tanker Compartment Details',
      capacity_fields: false,
      serial_label: 'Tank / Chassis Number',
      serial_hint: 'Tank barrel or chassis number. The vehicle registration number is captured separately below.',
      manufacturer_placeholder: 'e.g. BharatBenz (body: Jain Tanks)',
      model_placeholder: 'e.g. 20 KL 4-Compartment',
      location_label: 'Operating Base / Depot',
      location_placeholder: 'e.g. IOCL Depot, Vijayawada',
      notice: 'Vehicle-mounted: the registration is tied to the vehicle, so the RTO registration number is mandatory.'
    },
    CAT_STORAGE_TANK: {
      icon: 'oil_barrel',
      spec_section: 'Tank Calibration Details',
      capacity_fields: false,
      serial_label: 'Tank Number / Identification',
      serial_hint: 'The depot tank number painted on the shell, e.g. TK-07.',
      manufacturer_placeholder: 'e.g. Punj Lloyd',
      model_placeholder: 'e.g. VCT-5000 KL',
      location_label: 'Terminal / Depot & Tank Farm',
      location_placeholder: 'e.g. Tank Farm A, TK-07, HPCL Terminal, Irugur'
    },
    CAT_DIP_ROD: {
      icon: 'straighten',
      spec_section: 'Dip Device Specifications',
      capacity_fields: false,
      serial_label: 'Rod / Tape Number',
      serial_hint: 'Number stamped on the rod or tape reel. Verified against the tank calibration chart it serves.',
      manufacturer_placeholder: 'e.g. Freemans',
      model_placeholder: 'e.g. Dip Tape 15 m',
      location_label: 'Tank / Depot Served',
      location_placeholder: 'e.g. Serves TK-07, HPCL Terminal, Irugur'
    },
    CAT_TEXTILE_LENGTH_MACHINE: {
      icon: 'checkroom',
      spec_section: 'Measuring Machine Specifications',
      capacity_fields: false,
      serial_label: 'Machine Serial Number',
      serial_hint: 'Serial on the machine frame plate, beside the counter head.',
      manufacturer_placeholder: 'e.g. Bhagwati Textile Machinery',
      model_placeholder: 'e.g. BTM-Fold 200',
      location_label: 'Mill / Warehouse & Machine Position',
      location_placeholder: 'e.g. Folding Section, Machine 4, Bhiwandi Unit'
    },
    CAT_CLINICAL_THERMOMETER: {
      icon: 'thermostat',
      spec_section: 'Thermometer Batch Details',
      capacity_fields: false,
      serial_label: 'Batch / Lot Number',
      serial_hint: 'Thermometers are presented and stamped as a batch — enter the lot number, not a per-piece serial.',
      manufacturer_placeholder: 'e.g. Hicks',
      model_placeholder: 'e.g. MT-101',
      location_label: 'Premises Where Stocked / Used',
      location_placeholder: 'e.g. Dispensary Counter, Civil Hospital, Nashik',
      notice: 'Batch registration: one record covers the full set or lot presented for stamping.'
    },
    CAT_SPHYGMOMANOMETER: {
      icon: 'monitor_heart',
      spec_section: 'BP Apparatus Specifications',
      capacity_fields: false,
      serial_label: 'Device Serial Number',
      serial_hint: 'Serial on the manometer body, or the rear label of a digital unit.',
      manufacturer_placeholder: 'e.g. Diamond / Omron',
      model_placeholder: 'e.g. Deluxe BP Mercurial',
      location_label: 'Clinic / Premises Where Used',
      location_placeholder: 'e.g. OPD Room 3, Primary Health Centre, Wardha'
    }
  };

  for (const cat of categories) {
    const form_meta = FORM_META[cat.id] || {
      icon: 'category',
      spec_section: 'Technical Specifications',
      capacity_fields: false,
      serial_label: 'Device Serial Number',
      serial_hint: 'Must match the permanent stamping on the official plate.',
      manufacturer_placeholder: 'Manufacturer name',
      model_placeholder: 'Model name or number',
      location_label: 'Operational Location / Establishment',
      location_placeholder: 'Premises where the instrument is used'
    };
    await InstrumentCategory.findOneAndUpdate(
      { id: cat.id },
      { $set: { ...cat, form_meta } },
      { upsert: true }
    );
  }

  // 2. Rule Sets
  const ruleSets = [
    {
      id: 'RULE_NAWI_III_2011',
      category_id: 'CAT_NAWI_III',
      name: 'Legal Metrology General Rules 2011 Schedule IX',
      validity_period_months: 12,
      mpe_rules: [
        { max_e: 500, initial_mpe_e: 0.5, subsequent_mpe_e: 1.0 },
        { max_e: 2000, initial_mpe_e: 1.0, subsequent_mpe_e: 2.0 },
        { max_e: 10000, initial_mpe_e: 1.5, subsequent_mpe_e: 3.0 }
      ],
      checklist_schema: [
        { id: 'CHK_01', text: 'Platter, frame, and housing are free from cracks or intentional tampering.', mandatory: true },
        { id: 'CHK_02', text: 'Model approval number and Class III mark are clearly legible on stamping plate.', mandatory: true },
        { id: 'CHK_03', text: 'Level indicator bubble is precisely centered in inner reference circle.', mandatory: true },
        { id: 'CHK_04', text: 'Lead/wire calibration seal is intact with valid previous stamp.', mandatory: true },
        { id: 'CHK_05', text: 'Operating environment is stable, draft-free, and within statutory temperature range.', mandatory: true }
      ]
    },
    // The rule sets below are simplified placeholders (12-month default validity,
    // generic seal/nameplate checklist) — NOT transcribed from a verified primary
    // statutory MPE table for that category. Domain validation is an open item.
    ...[
      ['RULE_AUTO_WEIGH', 'CAT_AUTO_WEIGH', 'Automatic Weighing Instrument — Placeholder Rules'],
      ['RULE_WEIGHBRIDGE', 'CAT_WEIGHBRIDGE', 'Weighbridge — Placeholder Rules'],
      ['RULE_FUEL_DISPENSER', 'CAT_FUEL_DISPENSER', 'Fuel Dispensing Pump — Placeholder Rules'],
      ['RULE_GAS_FUEL_DISPENSER', 'CAT_GAS_FUEL_DISPENSER', 'CNG/LPG/LNG/Hydrogen Dispenser — Placeholder Rules'],
      ['RULE_WATER_METER', 'CAT_WATER_METER', 'Water Meter — Placeholder Rules'],
      ['RULE_ENERGY_METER', 'CAT_ENERGY_METER', 'Energy Meter — Placeholder Rules'],
      ['RULE_GAS_METER', 'CAT_GAS_METER', 'Gas Meter — Placeholder Rules'],
      ['RULE_LENGTH_MEASURE', 'CAT_LENGTH_MEASURE', 'Length Measure — Placeholder Rules'],
      ['RULE_VOLUME_MEASURE', 'CAT_VOLUME_MEASURE', 'Volumetric/Capacity Measure — Placeholder Rules'],
      ['RULE_WEIGHTS_COMMERCIAL', 'CAT_WEIGHTS_COMMERCIAL', 'Commercial Weights — Placeholder Rules'],
      ['RULE_WEIGHTS_PRECISION', 'CAT_WEIGHTS_PRECISION', 'Precision / Carat Weights — Placeholder Rules'],
      ['RULE_BEAM_SCALE', 'CAT_BEAM_SCALE', 'Beam Scale / Counter Machine — Placeholder Rules'],
      ['RULE_SPRING_BALANCE', 'CAT_SPRING_BALANCE', 'Spring Balance — Placeholder Rules'],
      ['RULE_CRANE_SCALE', 'CAT_CRANE_SCALE', 'Crane / Hanging Scale — Placeholder Rules'],
      ['RULE_LOAD_CELL', 'CAT_LOAD_CELL', 'Load Cell — Placeholder Rules'],
      ['RULE_WEIGHING_INDICATOR', 'CAT_WEIGHING_INDICATOR', 'Weighing Indicator — Placeholder Rules'],
      ['RULE_LPG_CYLINDER_FILLING', 'CAT_LPG_CYLINDER_FILLING', 'LPG Cylinder Filling Machine — Placeholder Rules'],
      ['RULE_TAXIMETER', 'CAT_TAXIMETER', 'Taximeter / Fare Meter — Placeholder Rules'],
      ['RULE_BULK_FLOW_METER', 'CAT_BULK_FLOW_METER', 'Bulk Liquid Flow Meter — Placeholder Rules'],
      ['RULE_ROAD_TANKER', 'CAT_ROAD_TANKER', 'Road Tanker Capacity Measure — Placeholder Rules'],
      ['RULE_STORAGE_TANK', 'CAT_STORAGE_TANK', 'Static Storage Tank — Placeholder Rules'],
      ['RULE_DIP_ROD', 'CAT_DIP_ROD', 'Dip Rod / Ullage Device — Placeholder Rules'],
      ['RULE_TEXTILE_LENGTH_MACHINE', 'CAT_TEXTILE_LENGTH_MACHINE', 'Textile Length Measuring Machine — Placeholder Rules'],
      ['RULE_CLINICAL_THERMOMETER', 'CAT_CLINICAL_THERMOMETER', 'Clinical Thermometer — Placeholder Rules'],
      ['RULE_SPHYGMOMANOMETER', 'CAT_SPHYGMOMANOMETER', 'Sphygmomanometer — Placeholder Rules']
    ].map(([id, category_id, name]) => ({
      id,
      category_id,
      name,
      validity_period_months: 12,
      mpe_rules: [],
      checklist_schema: [
        { id: 'CHK_SEAL', text: 'Statutory seal/stamp and nameplate details are intact and legible.', mandatory: true },
        { id: 'CHK_TAMPER', text: 'No evidence of tampering, damage, or unauthorized modification.', mandatory: true }
      ]
    }))
  ];
  for (const rs of ruleSets) {
    await RuleSet.findOneAndUpdate({ id: rs.id }, { $set: rs }, { upsert: true });
  }

  console.log('✔ Successfully seeded master categories and rulesets in MongoDB.');
}

export async function seedDemoBusinessData() {
  const now = new Date().toISOString();
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  // 3. Instruments
  const instruments = [
    {
      id: 'INST_001',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Precision Weigher India',
      model: 'PW-3000 Eco',
      serial_number: 'SN-2026-9941',
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      specs: { accuracy_class: 'III' },
      location: 'Counter 1, Main Grocery Section, Connaught Place, New Delhi',
      district: 'Central Delhi, Delhi',
      status: 'UNDER_VERIFICATION',
      created_at: now
    },
    {
      id: 'INST_002',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Avery Weigh-Tronix',
      model: 'ZK830 High Precision',
      serial_number: 'SN-CERT-PASS-8801',
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      specs: { accuracy_class: 'III' },
      location: 'Depot 4, Okhla Phase III, New Delhi',
      district: 'South East Delhi, Delhi',
      status: 'VERIFIED',
      created_at: now
    },
    {
      id: 'INST_003',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Mettler Toledo',
      model: 'b-Plus Dual Range',
      serial_number: 'SN-S4-QR-9902',
      max_capacity: '15 kg',
      min_capacity: '40 g',
      verification_scale_interval_e: '2 g',
      specs: { accuracy_class: 'III' },
      location: 'Store 18, Terminal 3, IGI Airport, New Delhi',
      district: 'South West Delhi, Delhi',
      status: 'VERIFIED',
      created_at: now
    },
    {
      id: 'INST_004',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Essae Teraoka',
      model: 'DS-215 Bench Scale',
      serial_number: 'SN-EXP-2026-4410',
      max_capacity: '20 kg',
      min_capacity: '50 g',
      verification_scale_interval_e: '2 g',
      specs: { accuracy_class: 'III' },
      location: 'Billing Counter 3, South Extension Part II, New Delhi',
      district: 'South Delhi, Delhi',
      status: 'EXPIRING',
      created_at: now
    },
    {
      id: 'INST_005',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'CAS Corporation',
      model: 'SW-1 Plus Digital',
      serial_number: 'SN-CAS-2026-1024',
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      specs: { accuracy_class: 'III' },
      location: 'Fruit Market Stall 12, Azadpur Mandi, Delhi',
      district: 'North West Delhi, Delhi',
      status: 'REGISTERED',
      created_at: now
    }
  ];

  for (const inst of instruments) {
    await Instrument.findOneAndUpdate({ id: inst.id }, { $set: inst }, { upsert: true });
  }

  // 4. Applications
  const applications = [
    {
      id: 'APP_DEMO_01',
      application_no: 'APP-2026-2641',
      instrument_id: 'INST_001',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      status: 'IN_PROGRESS',
      documents: [],
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_02',
      application_no: 'APP-2026-8506',
      instrument_id: 'INST_002',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      status: 'VERIFICATION_COMPLETED',
      documents: [],
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_03',
      application_no: 'APP-2026-1311',
      instrument_id: 'INST_003',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      status: 'VERIFICATION_COMPLETED',
      documents: [],
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_04',
      application_no: 'APP-2026-9022',
      instrument_id: 'INST_004',
      trader_id: 'USR_TRADER_01',
      request_type: 'RE_VERIFICATION',
      status: 'SUBMITTED',
      documents: [],
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_05',
      application_no: 'APP-2026-3398',
      instrument_id: 'INST_005',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      verification_type: 'ORIGINAL',
      verification_mode: 'CAMP',
      status: 'ASSIGNED',
      documents: [],
      fee_status: 'PAID',
      fee_breakdown: { statutory_fee: 250, in_situ_fee: 0, user_fee: 50, total_fee: 300 },
      payment: { payment_mode: 'ONLINE', payment_status: 'PAID', transaction_id: 'TXN_2026_ASN_05', amount: 300, paid_at: now },
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_06',
      application_no: 'APP-2026-4412',
      instrument_id: 'INST_001',
      trader_id: 'USR_TRADER_01',
      request_type: 'RE_VERIFICATION',
      verification_type: 'RE_VERIFICATION',
      verification_mode: 'IN_SITU',
      status: 'RETURNED',
      return_reason: 'Previous calibration certificate illegible and commercial invoice is incomplete. Please re-upload verified documents.',
      documents: [
        { id: 'DOC_1', category: 'INVOICE', file_name: 'invoice_2025.pdf', file_size: '240 KB', uploaded_at: now }
      ],
      fee_status: 'PAID',
      fee_breakdown: { statutory_fee: 250, in_situ_fee: 500, user_fee: 50, total_fee: 800 },
      payment: { payment_mode: 'ONLINE', payment_status: 'PAID', transaction_id: 'TXN_2026_RET_06', amount: 800, paid_at: now },
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_DEMO_07',
      application_no: 'APP-2026-7789',
      instrument_id: 'INST_002',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      verification_type: 'ORIGINAL',
      verification_mode: 'CAMP',
      status: 'PAYMENT_PENDING',
      documents: [
        { id: 'DOC_2', category: 'INVOICE', file_name: 'purchase_invoice.pdf', file_size: '310 KB', uploaded_at: now }
      ],
      fee_status: 'PENDING',
      fee_breakdown: { statutory_fee: 250, in_situ_fee: 0, user_fee: 50, total_fee: 300 },
      payment: { payment_mode: 'ONLINE', payment_status: 'PENDING', amount: 300 },
      created_at: now,
      updated_at: now
    }
  ];

  for (const app of applications) {
    await Application.findOneAndUpdate({ id: app.id }, { $set: app }, { upsert: true });
  }

  // 5. Assignments & Appointments
  const assignments = [
    {
      id: 'ASN_DEMO_01',
      application_id: 'APP_DEMO_01',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_01',
      recommended_id: 'USR_VERIFIER_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    {
      id: 'ASN_DEMO_02',
      application_id: 'APP_DEMO_02',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_01',
      recommended_id: 'USR_VERIFIER_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    {
      id: 'ASN_DEMO_03',
      application_id: 'APP_DEMO_03',
      assigned_type: 'GATC',
      assigned_id: 'USR_GATC_01',
      recommended_id: 'USR_GATC_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    {
      id: 'ASN_DEMO_05',
      application_id: 'APP_DEMO_05',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_01',
      recommended_id: 'USR_VERIFIER_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    }
  ];

  for (const asn of assignments) {
    await Assignment.findOneAndUpdate({ id: asn.id }, { $set: asn }, { upsert: true });
  }

  const appointments = [
    {
      id: 'APT_DEMO_01',
      assignment_id: 'ASN_DEMO_01',
      scheduled_date: '2026-09-05',
      time_slot: '10:00 AM - 01:00 PM',
      arrangement_type: 'FIELD_VISIT',
      status: 'SCHEDULED',
      created_at: now
    },
    {
      id: 'APT_DEMO_02',
      assignment_id: 'ASN_DEMO_02',
      scheduled_date: '2026-09-02',
      time_slot: '02:00 PM - 05:00 PM',
      arrangement_type: 'FIELD_VISIT',
      status: 'COMPLETED',
      created_at: now
    },
    {
      id: 'APT_DEMO_03',
      assignment_id: 'ASN_DEMO_03',
      scheduled_date: '2026-09-03',
      time_slot: '11:00 AM - 02:00 PM',
      arrangement_type: 'LAB_DISPATCH',
      status: 'COMPLETED',
      created_at: now
    },
    {
      id: 'APT_DEMO_05',
      assignment_id: 'ASN_DEMO_05',
      scheduled_date: '2026-09-10',
      time_slot: '09:00 AM - 12:00 PM',
      arrangement_type: 'FIELD_VISIT',
      status: 'SCHEDULED',
      created_at: now
    }
  ];

  for (const apt of appointments) {
    await Appointment.findOneAndUpdate({ id: apt.id }, { $set: apt }, { upsert: true });
  }

  // 6. Verifications
  const verifications = [
    {
      id: 'VERIF_DEMO_01',
      application_id: 'APP_DEMO_01',
      appointment_id: 'APT_DEMO_01',
      verifier_id: 'USR_VERIFIER_01',
      status: 'IN_PROGRESS',
      result: null,
      remarks: 'Physical inspection initiated. Scale level checked and verified.',
      started_at: now,
      created_at: now,
      updated_at: now
    },
    {
      id: 'VERIF_DEMO_02',
      application_id: 'APP_DEMO_02',
      appointment_id: 'APT_DEMO_02',
      verifier_id: 'USR_VERIFIER_01',
      status: 'COMPLETED',
      result: 'PASS',
      remarks: 'Full verification completed. Errors well within MPE limits prescribed in Schedule IX.',
      started_at: now,
      completed_at: now,
      created_at: now,
      updated_at: now
    },
    {
      id: 'VERIF_DEMO_03',
      application_id: 'APP_DEMO_03',
      appointment_id: 'APT_DEMO_03',
      verifier_id: 'USR_GATC_01',
      status: 'COMPLETED',
      result: 'PASS',
      remarks: 'High-precision dual range calibration verified under controlled laboratory test conditions.',
      started_at: now,
      completed_at: now,
      created_at: now,
      updated_at: now
    }
  ];

  for (const v of verifications) {
    await Verification.findOneAndUpdate({ id: v.id }, { $set: v }, { upsert: true });
  }

  // 7. Checklist responses
  const checklistResponses = [
    { id: 'CHK_RES_01_1', verification_id: 'VERIF_DEMO_01', item_id: 'CHK_01', status: 'PASS', note: 'Visual inspection clear.' },
    { id: 'CHK_RES_01_2', verification_id: 'VERIF_DEMO_01', item_id: 'CHK_02', status: 'PASS', note: 'Markings verified.' },
    { id: 'CHK_RES_02_1', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_01', status: 'PASS', note: 'Compliant.' },
    { id: 'CHK_RES_02_2', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_02', status: 'PASS', note: 'Stamp plate verified.' },
    { id: 'CHK_RES_02_3', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_03', status: 'PASS', note: 'Level bubble centered.' },
    { id: 'CHK_RES_02_4', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_04', status: 'PASS', note: 'Seal intact.' },
    { id: 'CHK_RES_02_5', verification_id: 'VERIF_DEMO_02', item_id: 'CHK_05', status: 'PASS', note: 'Temperature 23C.' },
    { id: 'CHK_RES_03_1', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_01', status: 'PASS', note: 'Laboratory housing verified.' },
    { id: 'CHK_RES_03_2', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_02', status: 'PASS', note: 'Model plate authenticated.' },
    { id: 'CHK_RES_03_3', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_03', status: 'PASS', note: 'Precision bubble aligned.' },
    { id: 'CHK_RES_03_4', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_04', status: 'PASS', note: 'Laboratory audit wire sealed.' },
    { id: 'CHK_RES_03_5', verification_id: 'VERIF_DEMO_03', item_id: 'CHK_05', status: 'PASS', note: 'Lab conditions controlled.' }
  ];

  for (const c of checklistResponses) {
    await VerificationChecklistResponse.findOneAndUpdate(
      { verification_id: c.verification_id, item_id: c.item_id },
      { $set: { ...c, updated_at: now } },
      { upsert: true }
    );
  }

  // 8. Verification Readings
  const readings = [
    { id: 'RDG_DEMO_01_1', verification_id: 'VERIF_DEMO_01', test_point: 'Initial Test Load', reference_value: 5.0, observed_value: 5.0, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_02_1', verification_id: 'VERIF_DEMO_02', test_point: 'Minimum Load (100g)', reference_value: 0.1, observed_value: 0.1, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_02_2', verification_id: 'VERIF_DEMO_02', test_point: 'Half Capacity (15kg)', reference_value: 15.0, observed_value: 15.001, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_02_3', verification_id: 'VERIF_DEMO_02', test_point: 'Maximum Capacity (30kg)', reference_value: 30.0, observed_value: 30.002, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_03_1', verification_id: 'VERIF_DEMO_03', test_point: 'Minimum Load (40g)', reference_value: 0.04, observed_value: 0.04, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_03_2', verification_id: 'VERIF_DEMO_03', test_point: 'Half Capacity (7.5kg)', reference_value: 7.5, observed_value: 7.5, unit: 'kg', reading_result: 'PASS' },
    { id: 'RDG_DEMO_03_3', verification_id: 'VERIF_DEMO_03', test_point: 'Maximum Capacity (15kg)', reference_value: 15.0, observed_value: 15.001, unit: 'kg', reading_result: 'PASS' }
  ];

  for (const r of readings) {
    await VerificationReading.findOneAndUpdate(
      { id: r.id },
      { $set: { ...r, updated_at: now } },
      { upsert: true }
    );
  }

  // 9. Certificates (Form 6)
  const certificates = [
    {
      id: 'CERT_DEMO_01',
      certificate_no: 'LM-2026-54715-DL',
      verification_id: 'VERIF_DEMO_02',
      instrument_id: 'INST_002',
      public_token: '8a94dd11-9af0-41d5-a986-cbf70bffdecf',
      issue_date: now,
      valid_until: validUntil,
      status: 'VALID',
      issuing_officer: 'Vikram Singh (LMO)',
      issuing_authority: 'Department of Consumer Affairs - Legal Metrology Division',
      created_at: now
    },
    {
      id: 'CERT_DEMO_02',
      certificate_no: 'LM-2026-74750-DL',
      verification_id: 'VERIF_DEMO_03',
      instrument_id: 'INST_003',
      public_token: '15fcaf47-2be8-463a-bb34-97781d333771',
      issue_date: now,
      valid_until: validUntil,
      status: 'VALID',
      issuing_officer: 'Vikram Singh (LMO)',
      issuing_authority: 'Department of Consumer Affairs - Legal Metrology Division',
      created_at: now
    }
  ];

  for (const cert of certificates) {
    await Certificate.findOneAndUpdate({ id: cert.id }, { $set: cert }, { upsert: true });
  }

  // 10. Audit Logs
  const logs = [
    {
      id: 'LOG_DEMO_01',
      entity_name: 'Certificate',
      entity_id: 'CERT_DEMO_01',
      action: 'CERTIFICATE_GENERATED',
      actor_id: 'USR_VERIFIER_01',
      actor_role: 'VERIFIER',
      details: { certificate_no: 'LM-2026-54715-DL', instrument_id: 'INST_002' },
      created_at: now
    },
    {
      id: 'LOG_DEMO_02',
      entity_name: 'Certificate',
      entity_id: 'CERT_DEMO_02',
      action: 'CERTIFICATE_GENERATED',
      actor_id: 'USR_GATC_01',
      actor_role: 'GATC',
      details: { certificate_no: 'LM-2026-74750-DL', instrument_id: 'INST_003' },
      created_at: now
    },
    {
      id: 'LOG_DEMO_03',
      entity_name: 'Application',
      entity_id: 'APP_DEMO_01',
      action: 'ASSIGNMENT_CREATED',
      actor_id: 'USR_AUTHORITY_01',
      actor_role: 'AUTHORITY',
      details: { application_id: 'APP_DEMO_01', assigned_to: 'USR_VERIFIER_01' },
      created_at: now
    },
    {
      id: 'LOG_DEMO_04',
      entity_name: 'Instrument',
      entity_id: 'INST_001',
      action: 'REGISTER',
      actor_id: 'USR_TRADER_01',
      actor_role: 'TRADER',
      details: { serial_number: 'SN-2026-9941', model: 'PW-3000 Eco' },
      created_at: now
    }
  ];

  for (const log of logs) {
    await AuditLog.findOneAndUpdate({ id: log.id }, { $set: log }, { upsert: true });
  }

  console.log('✔ Successfully seeded demo business data (instruments, applications, verifications, certificates) in MongoDB.');
}

export async function seedDemoData() {
  await seedCategoriesAndRules();
  if (process.env.SEED_DEMO_BUSINESS_DATA === 'true') {
    await seedDemoBusinessData();
  }
}

export async function seedAllDemoData() {
  await seedDemoUsers();
  await seedDemoData();
}

// Standalone execution: node server/scripts/seedDemoUsers.js
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('seedDemoUsers.js'))) {
  connectMongo()
    .then(() => seedAllDemoData())
    .then(() => {
      console.log('✔ Seeding complete.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Seeding failed:', err.message);
      process.exit(1);
    });
}
