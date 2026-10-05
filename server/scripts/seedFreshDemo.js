// =============================================================================
// CertifyMetric — Clean Fresh Demo Seeding Script for SIH Presentation
// Seeds:
// 1. 5 Distinct Traders across the Mumbai / Thane Corridor
// 2. 5 Applications (1 VERIFIED with Form 6 certificate, 4 APPLIED/UNVERIFIED)
// 3. Geofencing demonstration: 1 Near Me application (<20m) & 4 distant applications (6km - 16km)
// 4. 6 LMO Officers across Mumbai Suburban, Thane, Mumbai City, Navi Mumbai
// =============================================================================
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { hashPassword } from '../auth-utils.js';
import { connectMongo } from '../db/mongodb.js';
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
  VerificationEvidence,
  Certificate,
  AuditLog,
  GeoVisit,
  Notification
} from '../models/index.js';

import { seedCategoriesAndRules } from './seedDemoUsers.js';

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

export async function seedFreshDemo() {
  await connectMongo();
  await seedCategoriesAndRules();
  const now = new Date().toISOString();
  const oneYearLater = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  const todayStr = now.split('T')[0];

  console.log('--- Cleaning previous demo applications & verification records ---');
  await Application.deleteMany({});
  await Assignment.deleteMany({});
  await Appointment.deleteMany({});
  await Verification.deleteMany({});
  await VerificationChecklistResponse.deleteMany({});
  await VerificationReading.deleteMany({});
  await VerificationEvidence.deleteMany({});
  await Certificate.deleteMany({});
  await GeoVisit.deleteMany({});
  await Notification.deleteMany({});

  // 1. Organizations
  const organizations = [
    {
      id: 'ORG_GOV_MUMBAI_SUBURBAN',
      name: 'Department of Consumer Affairs - Legal Metrology (Mumbai Suburban)',
      type: 'STATUTORY_AUTHORITY',
      jurisdictions: ['Mumbai Suburban, Maharashtra', 'Thane, Maharashtra'],
      created_at: now
    },
    {
      id: 'ORG_GOV_THANE',
      name: 'Department of Consumer Affairs - Legal Metrology (Thane District)',
      type: 'STATUTORY_AUTHORITY',
      jurisdictions: ['Thane, Maharashtra', 'Mumbai Suburban, Maharashtra'],
      created_at: now
    },
    {
      id: 'ORG_GOV_MUMBAI_CITY',
      name: 'Department of Consumer Affairs - Legal Metrology (Mumbai City)',
      type: 'STATUTORY_AUTHORITY',
      jurisdictions: ['Mumbai City, Maharashtra'],
      created_at: now
    },
    {
      id: 'ORG_GOV_NAVI_MUMBAI',
      name: 'Department of Consumer Affairs - Legal Metrology (Navi Mumbai)',
      type: 'STATUTORY_AUTHORITY',
      jurisdictions: ['Navi Mumbai, Maharashtra', 'Mumbai Suburban, Maharashtra'],
      created_at: now
    },
    {
      id: 'ORG_GATC_MUMBAI',
      name: 'Mumbai Regional Metrology Testing Centre (GATC Lab)',
      type: 'TEST_CENTRE',
      jurisdictions: ['Mumbai Suburban, Maharashtra', 'Thane, Maharashtra', 'Mumbai City, Maharashtra'],
      approved_categories: ['NAWI', 'FUEL_DISPENSER', 'WATER_METER', 'WEIGHTS_COMMERCIAL'],
      created_at: now
    },
    {
      id: 'ORG_TRADER_01',
      name: 'Sharma General Stores & Provisions (Thane)',
      type: 'TRADER_ORG',
      jurisdictions: ['Thane, Maharashtra'],
      created_at: now
    },
    {
      id: 'ORG_TRADER_02',
      name: 'Mulund Grain & Wholesale Traders',
      type: 'TRADER_ORG',
      jurisdictions: ['Mumbai Suburban, Maharashtra'],
      created_at: now
    },
    {
      id: 'ORG_TRADER_03',
      name: 'Vikhroli Departmental & Provision Mart',
      type: 'TRADER_ORG',
      jurisdictions: ['Mumbai Suburban, Maharashtra'],
      created_at: now
    },
    {
      id: 'ORG_TRADER_04',
      name: 'Patil Wholesale Spices & Oils (Bhandup)',
      type: 'TRADER_ORG',
      jurisdictions: ['Mumbai Suburban, Maharashtra'],
      created_at: now
    },
    {
      id: 'ORG_TRADER_05',
      name: 'Aakash Quick-Mart & Electronics (Near Me)',
      type: 'TRADER_ORG',
      jurisdictions: ['Mumbai Suburban, Maharashtra'],
      created_at: now
    },
    {
      id: 'ORG_GOV_DOCA',
      name: 'Department of Consumer Affairs - Central Division',
      type: 'STATUTORY_AUTHORITY',
      jurisdictions: ['Central Delhi, Delhi', 'Mumbai Suburban, Maharashtra', 'Thane, Maharashtra'],
      created_at: now
    }
  ];

  for (const org of organizations) {
    await Organization.findOneAndUpdate({ id: org.id }, { $set: org }, { upsert: true, new: true });
  }

  // Also ensure Sahil's org has Mumbai Suburban & Thane
  await Organization.updateOne(
    { id: 'ORG_VERIFIER_1789023245334_0606b2' },
    { $set: { jurisdictions: ['Mumbai Suburban, Maharashtra', 'Thane, Maharashtra'] } }
  );

  // 2. Users (LMO Officers, Authority, Admin, Traders)
  const users = [
    // Authority
    {
      id: 'USR_AUTHORITY_01',
      email: 'demo.authority@certifymetric.local',
      password: 'DemoAuthority@2026',
      role: 'AUTHORITY',
      full_name: 'Dr. S. K. Verma (Controller of Legal Metrology)',
      organization_id: 'ORG_GOV_MUMBAI_SUBURBAN',
      phone: '+91 94120 78901',
      description: 'Statutory metrology authority evaluating verification requests and allocating inspection officers.'
    },
    // Verifier 1: Vikram Singh (Mumbai Suburban Home)
    {
      id: 'USR_VERIFIER_01',
      email: 'demo.verifier@certifymetric.local',
      password: 'DemoVerifier@2026',
      role: 'VERIFIER',
      full_name: 'Vikram Singh (LMO - Mumbai Suburban)',
      designation: 'INSPECTOR',
      organization_id: 'ORG_GOV_MUMBAI_SUBURBAN',
      phone: '+91 98230 45678',
      description: 'Field inspection officer covering Mumbai Suburban (Kurla, Vikhroli, Bhandup) & Thane additional charge.'
    },
    // Verifier 2: Anjali Deshmukh (Thane Home - Idle / Top recommended for Thane)
    {
      id: 'USR_VERIFIER_02',
      email: 'demo.verifier.anjali@certifymetric.local',
      password: 'DemoVerifier2@2026',
      role: 'VERIFIER',
      full_name: 'Anjali Deshmukh (LMO - Thane)',
      designation: 'INSPECTOR',
      organization_id: 'ORG_GOV_THANE',
      phone: '+91 98220 11009',
      description: 'Field inspection officer with primary jurisdiction in Thane district and Mulund corridor.'
    },
    // Verifier 3: Pradeep Sawant (Mumbai City Only - Ineligible for Thane/Suburban)
    {
      id: 'USR_VERIFIER_03',
      email: 'demo.verifier.pradeep@certifymetric.local',
      password: 'DemoVerifier3@2026',
      role: 'VERIFIER',
      full_name: 'Pradeep Sawant (LMO - Mumbai City)',
      designation: 'INSPECTOR',
      organization_id: 'ORG_GOV_MUMBAI_CITY',
      phone: '+91 98210 22334',
      description: 'Field inspection officer dedicated to Mumbai City (South/Central Mumbai). Demonstrates out-of-jurisdiction filter.'
    },
    // Verifier 4: Meera Kulkarni (Thane - Senior Assistant Controller, Busy with 2 cases)
    {
      id: 'USR_VERIFIER_04',
      email: 'demo.verifier.meera@certifymetric.local',
      password: 'DemoVerifier4@2026',
      role: 'VERIFIER',
      full_name: 'Meera Kulkarni (Assistant Controller)',
      designation: 'ASSISTANT_CONTROLLER',
      organization_id: 'ORG_GOV_THANE',
      phone: '+91 98200 33445',
      description: 'Senior Assistant Controller at Thane Legal Metrology Division.'
    },
    // Verifier 5: Suresh Patil (Navi Mumbai Home)
    {
      id: 'USR_VERIFIER_05',
      email: 'demo.verifier.suresh@certifymetric.local',
      password: 'DemoVerifier5@2026',
      role: 'VERIFIER',
      full_name: 'Suresh Patil (LMO - Navi Mumbai)',
      designation: 'INSPECTOR',
      organization_id: 'ORG_GOV_NAVI_MUMBAI',
      phone: '+91 98190 44556',
      description: 'Field inspection officer for Navi Mumbai & Eastern Mumbai suburbs.'
    },
    // GATC
    {
      id: 'USR_GATC_01',
      email: 'demo.gatc@certifymetric.local',
      password: 'DemoGatc@2026',
      role: 'GATC',
      full_name: 'Mumbai Regional GATC Testing Lab',
      organization_id: 'ORG_GATC_MUMBAI',
      phone: '+91 99340 11223',
      description: 'Government Approved Test Centre for standard laboratory verification.'
    },
    // Admin
    {
      id: 'USR_ADMIN_01',
      email: 'demo.admin@certifymetric.local',
      password: 'DemoAdmin@2026',
      role: 'PLATFORM_ADMIN',
      full_name: 'Rajesh Nair (Platform Administrator)',
      organization_id: 'ORG_GOV_DOCA',
      phone: '+91 98990 00112',
      description: 'System administrator with platform oversight.'
    },
    // Trader 1: Rajesh Sharma (Thane - Verified application)
    {
      id: 'USR_TRADER_01',
      email: 'demo.trader@certifymetric.local',
      password: 'DemoTrader@2026',
      role: 'TRADER',
      full_name: 'Rajesh Sharma (Sharma Stores, Thane)',
      organization_id: 'ORG_TRADER_01',
      phone: '+91 98110 23456',
      description: 'Commercial retailer in Naupada, Thane with Form 6 verified scale.'
    },
    // Trader 2: Manoj Mehta (Mulund)
    {
      id: 'USR_TRADER_02',
      email: 'trader.mulund@certifymetric.local',
      password: 'DemoTrader2@2026',
      role: 'TRADER',
      full_name: 'Manoj Mehta (Mulund Grain Depot)',
      organization_id: 'ORG_TRADER_02',
      phone: '+91 98221 44556',
      description: 'Wholesale grain trader at APMC Market Yard, Mulund West.'
    },
    // Trader 3: Sunil Varma (Vikhroli)
    {
      id: 'USR_TRADER_03',
      email: 'trader.vikhroli@certifymetric.local',
      password: 'DemoTrader3@2026',
      role: 'TRADER',
      full_name: 'Sunil Varma (Vikhroli Supermarket)',
      organization_id: 'ORG_TRADER_03',
      phone: '+91 98332 55667',
      description: 'Supermarket merchant on LBS Marg, Vikhroli West.'
    },
    // Trader 4: Deepak Patil (Bhandup)
    {
      id: 'USR_TRADER_04',
      email: 'trader.bhandup@certifymetric.local',
      password: 'DemoTrader4@2026',
      role: 'TRADER',
      full_name: 'Deepak Patil (Patil Spices, Bhandup)',
      organization_id: 'ORG_TRADER_04',
      phone: '+91 98443 66778',
      description: 'Spice & oil distributor on Station Road, Bhandup West.'
    },
    // Trader 5: Aakash Gupta (Near Me / Mumbai Kurla)
    {
      id: 'USR_TRADER_05',
      email: 'trader.nearme@certifymetric.local',
      password: 'DemoTrader5@2026',
      role: 'TRADER',
      full_name: 'Aakash Gupta (Quick-Mart, Near Me)',
      organization_id: 'ORG_TRADER_05',
      phone: '+91 98554 77889',
      description: 'Retail provision store in Kurla West (user vicinity) for live geofencing check-in.'
    }
  ];

  for (const u of users) {
    const password_hash = hashPassword(u.password);
    await User.findOneAndUpdate(
      { id: u.id },
      {
        $set: {
          id: u.id,
          email: u.email.toLowerCase(),
          password_hash,
          role: u.role,
          full_name: u.full_name,
          designation: u.designation || (u.role === 'VERIFIER' ? 'INSPECTOR' : undefined),
          organization_id: u.organization_id,
          phone: u.phone,
          is_demo: 1,
          active: true,
          updated_at: now
        },
        $setOnInsert: { created_at: now }
      },
      { upsert: true, new: true }
    );
  }

  // 3. Instruments for the 5 Traders
  const instruments = [
    // Instrument 1: Thane (Verified)
    {
      id: 'INST_THANE_01',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Essae Teraoka',
      model: 'DS-215 Electronic Counter Scale',
      serial_number: 'SN-MH-2026-00412',
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      specs: { accuracy_class: 'III' },
      location: 'Shop 4, Gokhale Road, Naupada, Thane West, Maharashtra',
      district: 'Thane, Maharashtra',
      latitude: 19.1982,
      longitude: 72.9636,
      status: 'VERIFIED',
      public_token: crypto.randomUUID(),
      created_at: now
    },
    // Instrument 2: Mulund (Applied / Submitted - ~13.2 km)
    {
      id: 'INST_MULUND_02',
      owner_id: 'USR_TRADER_02',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Avery Weigh-Tronix',
      model: 'ZK830 High Precision Platform Scale',
      serial_number: 'SN-MH-2026-00785',
      max_capacity: '150 kg',
      min_capacity: '500 g',
      verification_scale_interval_e: '20 g',
      specs: { accuracy_class: 'III' },
      location: 'Gala 12, APMC Market Yard, J.N. Road, Mulund West, Mumbai, Maharashtra',
      district: 'Mumbai Suburban, Maharashtra',
      latitude: 19.1726,
      longitude: 72.9565,
      status: 'REGISTERED',
      public_token: crypto.randomUUID(),
      created_at: now
    },
    // Instrument 3: Vikhroli (Applied / Submitted - ~5.9 km)
    {
      id: 'INST_VIKHROLI_03',
      owner_id: 'USR_TRADER_03',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Mettler Toledo',
      model: 'b-Plus Dual Range Computing Scale',
      serial_number: 'SN-MH-2026-00914',
      max_capacity: '15 kg',
      min_capacity: '40 g',
      verification_scale_interval_e: '2 g',
      specs: { accuracy_class: 'III' },
      location: 'Shop 8, Lal Bahadur Shastri (LBS) Marg, Vikhroli West, Mumbai, Maharashtra',
      district: 'Mumbai Suburban, Maharashtra',
      latitude: 19.1110,
      longitude: 72.9280,
      status: 'REGISTERED',
      public_token: crypto.randomUUID(),
      created_at: now
    },
    // Instrument 4: Bhandup (Applied / Assigned - ~9.4 km)
    {
      id: 'INST_BHANDUP_04',
      owner_id: 'USR_TRADER_04',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'CAS Corporation',
      model: 'SW-1 Plus Digital Trade Scale',
      serial_number: 'SN-MH-2026-01120',
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      specs: { accuracy_class: 'III' },
      location: '22, Station Road, Bhandup West, Mumbai, Maharashtra',
      district: 'Mumbai Suburban, Maharashtra',
      latitude: 19.1438,
      longitude: 72.9378,
      status: 'REGISTERED',
      public_token: crypto.randomUUID(),
      created_at: now
    },
    // Instrument 5: Near Me / Kurla (Applied / Assigned - ~15m from officer base)
    {
      id: 'INST_NEARME_05',
      owner_id: 'USR_TRADER_05',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Precision Digital Weighers',
      model: 'Electronic Weighing Machine EWM-30',
      serial_number: 'SN-MH-2026-00055',
      max_capacity: '30 kg',
      min_capacity: '100 g',
      verification_scale_interval_e: '5 g',
      specs: { accuracy_class: 'III' },
      location: 'CST Road, Near LBS Marg, Kurla West, Mumbai, Maharashtra 400017',
      district: 'Mumbai Suburban, Maharashtra',
      latitude: 19.0748,
      longitude: 72.8856,
      status: 'REGISTERED',
      public_token: crypto.randomUUID(),
      created_at: now
    },
    // Two extra instruments to give Meera Kulkarni 2 open workload assignments
    {
      id: 'INST_MEERA_WORKLOAD_01',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Essae Teraoka',
      model: 'Platform Scale 300kg',
      serial_number: 'SN-MH-WL-01',
      max_capacity: '300 kg',
      min_capacity: '1 kg',
      verification_scale_interval_e: '50 g',
      specs: { accuracy_class: 'III' },
      location: 'Kalyan Road, Thane, Maharashtra',
      district: 'Thane, Maharashtra',
      latitude: 19.2100,
      longitude: 72.9800,
      status: 'REGISTERED',
      public_token: crypto.randomUUID(),
      created_at: now
    },
    {
      id: 'INST_MEERA_WORKLOAD_02',
      owner_id: 'USR_TRADER_01',
      category_id: 'CAT_NAWI_III',
      manufacturer: 'Avery Weigh-Tronix',
      model: 'Floor Scale 500kg',
      serial_number: 'SN-MH-WL-02',
      max_capacity: '500 kg',
      min_capacity: '2 kg',
      verification_scale_interval_e: '100 g',
      specs: { accuracy_class: 'III' },
      location: 'Wagle Estate, Thane, Maharashtra',
      district: 'Thane, Maharashtra',
      latitude: 19.1900,
      longitude: 72.9500,
      status: 'REGISTERED',
      public_token: crypto.randomUUID(),
      created_at: now
    }
  ];

  for (const inst of instruments) {
    await Instrument.findOneAndUpdate({ id: inst.id }, { $set: inst }, { upsert: true, new: true });
  }

  // Also link Abhishek's account to an instrument so he can test trader view
  const abhishek = await User.findOne({ email: 'abhishekjadhav0078@gmail.com' });
  if (abhishek) {
    await Instrument.findOneAndUpdate(
      { id: 'INST_NEARME_05' },
      { $set: { owner_id: abhishek.id } }
    );
  }

  // 4. The 5 Main Applications
  const applications = [
    // App 1: Thane (VERIFIED with Form 6 Certificate Issued)
    {
      id: 'APP_2026_THANE_01',
      application_no: 'LM-2026-00101',
      instrument_id: 'INST_THANE_01',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      verification_type: 'ORIGINAL',
      verification_mode: 'IN_SITU',
      preferred_date: todayStr,
      status: 'APPROVED',
      contact_person: 'Rajesh Sharma',
      contact_phone: '+91 98110 23456',
      location_address: 'Shop 4, Gokhale Road, Naupada, Thane West, Maharashtra',
      registered_latitude: 19.1982,
      registered_longitude: 72.9636,
      geofence_radius: 200,
      fee_status: 'PAID',
      fee_breakdown: { statutory_fee: 250, in_situ_fee: 200, user_fee: 50, total_fee: 500 },
      payment: { payment_mode: 'ONLINE', payment_status: 'PAID', transaction_id: 'TXN_MH_2026_THN_01', amount: 500, paid_at: now },
      documents: [
        { id: 'DOC_101', category: 'INVOICE', file_name: 'scale_purchase_invoice.pdf', file_size: '280 KB', uploaded_at: now }
      ],
      approval_remarks: 'All statutory test readings within permissible limits under Legal Metrology Rules, 2011. Form 6 Certificate approved.',
      approved_at: now,
      approved_by: 'USR_AUTHORITY_01',
      created_at: now,
      updated_at: now
    },
    // App 2: Mulund (SUBMITTED / APPLIED - ~13.2 km away)
    {
      id: 'APP_2026_MULUND_02',
      application_no: 'LM-2026-00102',
      instrument_id: 'INST_MULUND_02',
      trader_id: 'USR_TRADER_02',
      request_type: 'INITIAL_VERIFICATION',
      verification_type: 'ORIGINAL',
      verification_mode: 'IN_SITU',
      preferred_date: todayStr,
      status: 'SUBMITTED',
      contact_person: 'Manoj Mehta',
      contact_phone: '+91 98221 44556',
      location_address: 'Gala 12, APMC Market Yard, J.N. Road, Mulund West, Mumbai, Maharashtra',
      registered_latitude: 19.1726,
      registered_longitude: 72.9565,
      geofence_radius: 200,
      fee_status: 'PAID',
      fee_breakdown: { statutory_fee: 300, in_situ_fee: 200, user_fee: 50, total_fee: 550 },
      payment: { payment_mode: 'ONLINE', payment_status: 'PAID', transaction_id: 'TXN_MH_2026_MLD_02', amount: 550, paid_at: now },
      documents: [],
      created_at: now,
      updated_at: now
    },
    // App 3: Vikhroli (SUBMITTED / APPLIED - ~5.9 km away)
    {
      id: 'APP_2026_VIKHROLI_03',
      application_no: 'LM-2026-00103',
      instrument_id: 'INST_VIKHROLI_03',
      trader_id: 'USR_TRADER_03',
      request_type: 'INITIAL_VERIFICATION',
      verification_type: 'ORIGINAL',
      verification_mode: 'IN_SITU',
      preferred_date: todayStr,
      status: 'SUBMITTED',
      contact_person: 'Sunil Varma',
      contact_phone: '+91 98332 55667',
      location_address: 'Shop 8, Lal Bahadur Shastri (LBS) Marg, Vikhroli West, Mumbai, Maharashtra',
      registered_latitude: 19.1110,
      registered_longitude: 72.9280,
      geofence_radius: 200,
      fee_status: 'PAID',
      fee_breakdown: { statutory_fee: 200, in_situ_fee: 200, user_fee: 50, total_fee: 450 },
      payment: { payment_mode: 'ONLINE', payment_status: 'PAID', transaction_id: 'TXN_MH_2026_VKR_03', amount: 450, paid_at: now },
      documents: [],
      created_at: now,
      updated_at: now
    },
    // App 4: Bhandup (ASSIGNED - ~9.4 km away - Far Geofence Rejection Demo)
    {
      id: 'APP_2026_BHANDUP_04',
      application_no: 'LM-2026-00104',
      instrument_id: 'INST_BHANDUP_04',
      trader_id: 'USR_TRADER_04',
      request_type: 'INITIAL_VERIFICATION',
      verification_type: 'ORIGINAL',
      verification_mode: 'IN_SITU',
      preferred_date: todayStr,
      status: 'ASSIGNED',
      contact_person: 'Deepak Patil',
      contact_phone: '+91 98443 66778',
      location_address: '22, Station Road, Bhandup West, Mumbai, Maharashtra',
      registered_latitude: 19.1438,
      registered_longitude: 72.9378,
      geofence_radius: 200,
      fee_status: 'PAID',
      fee_breakdown: { statutory_fee: 250, in_situ_fee: 200, user_fee: 50, total_fee: 500 },
      payment: { payment_mode: 'ONLINE', payment_status: 'PAID', transaction_id: 'TXN_MH_2026_BHD_04', amount: 500, paid_at: now },
      documents: [],
      created_at: now,
      updated_at: now
    },
    // App 5: Near Me / Kurla (ASSIGNED - ~15m away - Live Geofence Check-in Success Demo!)
    {
      id: 'APP_2026_NEARME_05',
      application_no: 'LM-2026-00105',
      instrument_id: 'INST_NEARME_05',
      trader_id: abhishek ? abhishek.id : 'USR_TRADER_05',
      request_type: 'INITIAL_VERIFICATION',
      verification_type: 'ORIGINAL',
      verification_mode: 'IN_SITU',
      preferred_date: todayStr,
      status: 'ASSIGNED',
      contact_person: abhishek ? abhishek.full_name : 'Aakash Gupta',
      contact_phone: '+91 93731 05785',
      location_address: 'CST Road, Near LBS Marg, Kurla West, Mumbai, Maharashtra 400017',
      registered_latitude: 19.0748,
      registered_longitude: 72.8856,
      geofence_radius: 200,
      fee_status: 'PAID',
      fee_breakdown: { statutory_fee: 250, in_situ_fee: 200, user_fee: 50, total_fee: 500 },
      payment: { payment_mode: 'ONLINE', payment_status: 'PAID', transaction_id: 'TXN_MH_2026_NRM_05', amount: 500, paid_at: now },
      documents: [],
      created_at: now,
      updated_at: now
    },
    // Workload apps for Meera Kulkarni (to simulate busy status = 2 open cases)
    {
      id: 'APP_MEERA_WL_01',
      application_no: 'LM-2026-00088',
      instrument_id: 'INST_MEERA_WORKLOAD_01',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      verification_type: 'ORIGINAL',
      verification_mode: 'IN_SITU',
      status: 'ASSIGNED',
      location_address: 'Kalyan Road, Thane, Maharashtra',
      registered_latitude: 19.2100,
      registered_longitude: 72.9800,
      geofence_radius: 200,
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    },
    {
      id: 'APP_MEERA_WL_02',
      application_no: 'LM-2026-00089',
      instrument_id: 'INST_MEERA_WORKLOAD_02',
      trader_id: 'USR_TRADER_01',
      request_type: 'INITIAL_VERIFICATION',
      verification_type: 'ORIGINAL',
      verification_mode: 'IN_SITU',
      status: 'ASSIGNED',
      location_address: 'Wagle Estate, Thane, Maharashtra',
      registered_latitude: 19.1900,
      registered_longitude: 72.9500,
      geofence_radius: 200,
      fee_status: 'PAID',
      created_at: now,
      updated_at: now
    }
  ];

  for (const app of applications) {
    await Application.findOneAndUpdate({ id: app.id }, { $set: app }, { upsert: true, new: true });
  }

  // 5. Assignments & Appointments
  const assignments = [
    // Thane (Completed verification by Anjali Deshmukh)
    {
      id: 'ASN_2026_THANE_01',
      application_id: 'APP_2026_THANE_01',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_02',
      recommended_id: 'USR_VERIFIER_02',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    // Bhandup (Assigned to Vikram Singh)
    {
      id: 'ASN_2026_BHANDUP_04',
      application_id: 'APP_2026_BHANDUP_04',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_01',
      recommended_id: 'USR_VERIFIER_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    // Near Me (Assigned to Vikram Singh & also accessible for testing)
    {
      id: 'ASN_2026_NEARME_05',
      application_id: 'APP_2026_NEARME_05',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_01',
      recommended_id: 'USR_VERIFIER_01',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    // Two assignments on Meera Kulkarni
    {
      id: 'ASN_MEERA_WL_01',
      application_id: 'APP_MEERA_WL_01',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_04',
      recommended_id: 'USR_VERIFIER_04',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    },
    {
      id: 'ASN_MEERA_WL_02',
      application_id: 'APP_MEERA_WL_02',
      assigned_type: 'VERIFIER',
      assigned_id: 'USR_VERIFIER_04',
      recommended_id: 'USR_VERIFIER_04',
      is_override: 0,
      assigned_by: 'USR_AUTHORITY_01',
      created_at: now
    }
  ];

  for (const asn of assignments) {
    await Assignment.findOneAndUpdate({ id: asn.id }, { $set: asn }, { upsert: true, new: true });
  }

  // Appointments
  const appointments = [
    {
      id: 'APT_2026_THANE_01',
      assignment_id: 'ASN_2026_THANE_01',
      scheduled_date: todayStr,
      time_slot: '10:00 AM - 01:00 PM',
      arrangement_type: 'FIELD_VISIT',
      status: 'COMPLETED',
      created_at: now
    },
    {
      id: 'APT_2026_BHANDUP_04',
      assignment_id: 'ASN_2026_BHANDUP_04',
      scheduled_date: todayStr,
      time_slot: '02:00 PM - 05:00 PM',
      arrangement_type: 'FIELD_VISIT',
      status: 'SCHEDULED',
      created_at: now
    },
    {
      id: 'APT_2026_NEARME_05',
      assignment_id: 'ASN_2026_NEARME_05',
      scheduled_date: todayStr,
      time_slot: '10:00 AM - 01:00 PM',
      arrangement_type: 'FIELD_VISIT',
      status: 'SCHEDULED',
      created_at: now
    }
  ];

  for (const apt of appointments) {
    await Appointment.findOneAndUpdate({ id: apt.id }, { $set: apt }, { upsert: true, new: true });
  }

  // 6. Verification Record, Readings, Checklist & Certificate for Application 1 (VERIFIED)
  const verifId = 'VERIF_2026_THANE_01';
  await Verification.findOneAndUpdate(
    { id: verifId },
    {
      $set: {
        id: verifId,
        application_id: 'APP_2026_THANE_01',
        appointment_id: 'APT_2026_THANE_01',
        verifier_id: 'USR_VERIFIER_02',
        verification_type: 'FIELD',
        status: 'COMPLETED',
        result: 'PASS',
        remarks: 'Physical verification and accuracy test completed at registered premises. All observations conform to Seventh Schedule, Part I of Legal Metrology (General) Rules, 2011.',
        started_at: now,
        completed_at: now,
        created_at: now,
        updated_at: now
      }
    },
    { upsert: true, new: true }
  );

  // Checklist responses
  const checklistItems = [
    { item_id: 'chk_visual', status: 'PASSED', note: 'Instrument casing, level indicator, and display intact' },
    { item_id: 'chk_level', status: 'PASSED', note: 'Bubble indicator centered on level platform' },
    { item_id: 'chk_stamping_plate', status: 'PASSED', note: 'Statutory verification stamping plate present and legible' },
    { item_id: 'chk_seal', status: 'PASSED', note: 'Lead-and-wire calibration seal intact and untampered' },
    { item_id: 'chk_zero', status: 'PASSED', note: 'Zero-setting and zero-tracking operate within 0.25e tolerance' }
  ];

  for (const chk of checklistItems) {
    await VerificationChecklistResponse.findOneAndUpdate(
      { verification_id: verifId, item_id: chk.item_id },
      {
        $set: {
          id: `CHK_${chk.item_id}`,
          verification_id: verifId,
          item_id: chk.item_id,
          status: chk.status,
          note: chk.note,
          updated_at: now
        }
      },
      { upsert: true, new: true }
    );
  }

  // Readings (5 standard test loads: 5kg, 10kg, 15kg, 20kg, 30kg)
  const testReadings = [
    { test_point: 'Min Load (5 kg)', reference_value: 5, observed_value: 5.000, error_value: 0, permissible_error: 5, unit: 'kg', reading_result: 'PASS', calculated_result: 'PASS' },
    { test_point: 'One-Third Max (10 kg)', reference_value: 10, observed_value: 10.000, error_value: 0, permissible_error: 5, unit: 'kg', reading_result: 'PASS', calculated_result: 'PASS' },
    { test_point: 'Half Capacity (15 kg)', reference_value: 15, observed_value: 15.000, error_value: 0, permissible_error: 5, unit: 'kg', reading_result: 'PASS', calculated_result: 'PASS' },
    { test_point: 'Two-Thirds (20 kg)', reference_value: 20, observed_value: 20.002, error_value: 0.002, permissible_error: 5, unit: 'kg', reading_result: 'PASS', calculated_result: 'PASS' },
    { test_point: 'Max Capacity (30 kg)', reference_value: 30, observed_value: 30.001, error_value: 0.001, permissible_error: 7.5, unit: 'kg', reading_result: 'PASS', calculated_result: 'PASS' }
  ];

  for (let i = 0; i < testReadings.length; i++) {
    const r = testReadings[i];
    await VerificationReading.findOneAndUpdate(
      { id: `RDG_THANE_${i + 1}` },
      {
        $set: {
          id: `RDG_THANE_${i + 1}`,
          verification_id: verifId,
          ...r,
          updated_at: now
        }
      },
      { upsert: true, new: true }
    );
  }

  // Form 6 Certificate for Application 1
  await Certificate.findOneAndUpdate(
    { id: 'CERT_2026_THANE_01' },
    {
      $set: {
        id: 'CERT_2026_THANE_01',
        certificate_no: 'MH-THN-2026-F6-00892',
        application_id: 'APP_2026_THANE_01',
        verification_id: verifId,
        instrument_id: 'INST_THANE_01',
        trader_id: 'USR_TRADER_01',
        issuer_id: 'USR_VERIFIER_02',
        status: 'ACTIVE',
        issue_date: todayStr,
        valid_until: oneYearLater.split('T')[0],
        public_token: crypto.randomUUID(),
        seal_number: 'LM-SEAL-MH-2026-4412',
        statutory_act: 'Legal Metrology Act, 2009',
        fee_paid: 500,
        pdf_path: null,
        created_at: now
      }
    },
    { upsert: true, new: true }
  );

  // 7. GeoVisit Records
  const geoVisits = [
    // Thane (Completed Visit)
    {
      id: 'GEO_DEMO_THANE',
      application_id: 'APP_2026_THANE_01',
      officer_id: 'USR_VERIFIER_02',
      registered_address: 'Shop 4, Gokhale Road, Naupada, Thane West, Maharashtra',
      registered_latitude: 19.1982,
      registered_longitude: 72.9636,
      geofence_radius: 200,
      check_in_latitude: 19.1983,
      check_in_longitude: 72.9637,
      check_in_accuracy: 6,
      check_in_timestamp: now,
      check_in_distance: 14,
      check_out_latitude: 19.1983,
      check_out_longitude: 72.9637,
      check_out_accuracy: 6,
      check_out_timestamp: now,
      check_out_distance: 14,
      status: 'VISIT_COMPLETED',
      is_override: false,
      exit_events: [],
      sync_status: 'SYNCED',
      created_at: now,
      updated_at: now
    },
    // Mulund (Not Started - ~13.2 km)
    {
      id: 'GEO_DEMO_MULUND',
      application_id: 'APP_2026_MULUND_02',
      officer_id: 'UNASSIGNED',
      registered_address: 'Gala 12, APMC Market Yard, J.N. Road, Mulund West, Mumbai, Maharashtra',
      registered_latitude: 19.1726,
      registered_longitude: 72.9565,
      geofence_radius: 200,
      status: 'NOT_STARTED',
      is_override: false,
      exit_events: [],
      sync_status: 'SYNCED',
      created_at: now,
      updated_at: now
    },
    // Vikhroli (Not Started - ~5.9 km)
    {
      id: 'GEO_DEMO_VIKHROLI',
      application_id: 'APP_2026_VIKHROLI_03',
      officer_id: 'UNASSIGNED',
      registered_address: 'Shop 8, Lal Bahadur Shastri (LBS) Marg, Vikhroli West, Mumbai, Maharashtra',
      registered_latitude: 19.1110,
      registered_longitude: 72.9280,
      geofence_radius: 200,
      status: 'NOT_STARTED',
      is_override: false,
      exit_events: [],
      sync_status: 'SYNCED',
      created_at: now,
      updated_at: now
    },
    // Bhandup (Not Started - Assigned to Vikram Singh - ~9.4 km away -> Fails Geofence!)
    {
      id: 'GEO_DEMO_BHANDUP',
      application_id: 'APP_2026_BHANDUP_04',
      officer_id: 'USR_VERIFIER_01',
      registered_address: '22, Station Road, Bhandup West, Mumbai, Maharashtra',
      registered_latitude: 19.1438,
      registered_longitude: 72.9378,
      geofence_radius: 200,
      status: 'NOT_STARTED',
      is_override: false,
      exit_events: [],
      sync_status: 'SYNCED',
      created_at: now,
      updated_at: now
    },
    // Near Me / Kurla (Not Started - Assigned to Vikram Singh - ~15m away -> Passes Geofence!)
    {
      id: 'GEO_DEMO_NEARME',
      application_id: 'APP_2026_NEARME_05',
      officer_id: 'USR_VERIFIER_01',
      registered_address: 'CST Road, Near LBS Marg, Kurla West, Mumbai, Maharashtra 400017',
      registered_latitude: 19.0748,
      registered_longitude: 72.8856,
      geofence_radius: 200,
      status: 'NOT_STARTED',
      is_override: false,
      exit_events: [],
      sync_status: 'SYNCED',
      created_at: now,
      updated_at: now
    }
  ];

  for (const gv of geoVisits) {
    await GeoVisit.findOneAndUpdate({ id: gv.id }, { $set: gv }, { upsert: true, new: true });
  }

  console.log('=============================================================================');
  console.log('✔ FRESH DEMO DATA SUCCESSFULLY SEEDED FOR SIH EVALUATION');
  console.log('  5 Traders & 5 Applications:');
  console.log('  1. APP_2026_THANE_01    | Thane Naupada  | VERIFIED (Certificate Issued)');
  console.log('  2. APP_2026_MULUND_02   | Mulund West    | APPLIED / SUBMITTED (~13.2 km away)');
  console.log('  3. APP_2026_VIKHROLI_03 | Vikhroli West  | APPLIED / SUBMITTED (~5.9 km away)');
  console.log('  4. APP_2026_BHANDUP_04  | Bhandup West   | APPLIED / ASSIGNED  (~9.4 km away - Geofence Blocks)');
  console.log('  5. APP_2026_NEARME_05   | Kurla West     | APPLIED / ASSIGNED  (~15m away - Geofence Passes!)');
  console.log('  6 LMO Officers across Mumbai MMR for Candidate Recommendation Scoring:');
  console.log('  - Vikram Singh (Mumbai Suburban, 1 open case)');
  console.log('  - Anjali Deshmukh (Thane, 0 open cases - Top recommendation for Thane!)');
  console.log('  - Pradeep Sawant (Mumbai City only - Ineligible for Thane/Suburban)');
  console.log('  - Meera Kulkarni (Thane, Assistant Controller, 2 open cases)');
  console.log('  - Suresh Patil (Navi Mumbai)');
  console.log('  - Sahil Desai (Mumbai Suburban & Thane)');
  console.log('=============================================================================');
}

// Standalone execution: node server/scripts/seedFreshDemo.js
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('seedFreshDemo.js'))) {
  seedFreshDemo()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
