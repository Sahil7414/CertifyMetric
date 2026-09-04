import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { connectMongo, getMongoStatus, disconnectMongo } from './db/mongodb.js';
import {
  User,
  UserSession,
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
  AuditLog
} from './models/index.js';
import { seedAllDemoData } from './scripts/seedDemoUsers.js';
import { ROLES, hasPermission } from './permissions.js';
import { upload, STORAGE_DIR, deleteStoredFile, initStorage } from './storage.js';
import { verifyPassword } from './auth-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load .env.local or .env if present
const rootDir = path.resolve(__dirname, '..');
for (const envFile of ['.env.local', '.env', 'server/.env.local', 'server/.env']) {
  const fullPath = path.resolve(rootDir, envFile);
  try {
    if (fs.existsSync(fullPath) && typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(fullPath);
    }
  } catch (e) {}
}

// -----------------------------------------------------------------------------
// Initialize MongoDB Connection & Startup Seeding
// -----------------------------------------------------------------------------
if (process.env.MONGODB_URI) {
  connectMongo()
    .then(async () => {
      if (process.env.SEED_DEMO_USERS !== 'false') {
        try {
          await seedAllDemoData();
        } catch (seedErr) {
          console.error('Initial demo seeding warning:', seedErr.message);
        }
      }
    })
    .catch((err) => {
      console.error('Initial MongoDB connection warning:', err.message);
    });
} else {
  console.warn('⚠️ MONGODB_URI not set. Set MONGODB_URI in your environment to connect to MongoDB Atlas.');
}

// Initialize persistent storage directory
initStorage();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Configure Production CORS
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];
const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : [];
const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests, same-origin, or whitelisted frontend origins
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} not permitted.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-user-id', 'x-user-role']
}));

app.use(express.json());

// Serve static evidence files from persistent storage
app.use('/uploads', express.static(STORAGE_DIR));

// -----------------------------------------------------------------------------
// System Health Check Endpoint
// -----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const mongoStatus = getMongoStatus();
  res.status(200).json({
    status: mongoStatus.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: mongoStatus.status,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database connectivity guard for all other API endpoints
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  const mongoStatus = getMongoStatus();
  if (!mongoStatus.connected) {
    return res.status(503).json({
      error: 'Database unavailable: MongoDB is not connected. Please configure MONGODB_URI in backend environment.'
    });
  }
  next();
});

// Helper: Audit Logger
async function logAudit(entityName, entityId, action, actorId, actorRole, details) {
  try {
    await AuditLog.create({
      id: `AUD_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      entity_name: entityName,
      entity_id: entityId,
      action,
      actor_id: actorId || 'SYSTEM',
      actor_role: actorRole || 'SYSTEM',
      details: details || {},
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// Helper: Resolve Actor for Request (Strict Server-Side Authorization)
async function resolveActor(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : req.headers['x-auth-token'];

  if (token) {
    const session = await UserSession.findOne({ token }).lean();
    if (session && new Date(session.expires_at) > new Date()) {
      const user = await User.findOne({ id: session.user_id }).lean();
      if (user) {
        return { id: user.id, role: user.role, email: user.email };
      }
    }
  }

  // Development-only bypass: strictly prohibited in production
  if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
    const userId = req.headers['x-user-id'];
    if (userId) {
      const user = await User.findOne({ id: userId }).lean();
      if (user) {
        return { id: user.id, role: user.role, email: user.email };
      }
    }
  }

  if (req.headers['x-user-role'] === 'SYSTEM') {
    return { id: 'SYSTEM', role: 'SYSTEM' };
  }

  return { id: 'ANONYMOUS', role: 'ANONYMOUS' };
}

// Actor resolution middleware
app.use(async (req, res, next) => {
  try {
    req.actor = await resolveActor(req);
    next();
  } catch (err) {
    next(err);
  }
});

function getActor(req) {
  return req.actor || { id: 'ANONYMOUS', role: 'ANONYMOUS' };
}

// ==========================================
// 1. AUTHENTICATION & DEMO USERS
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).lean();
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Verify password hash against stored hash in database
  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Generate real session token
  const token = `tok_${user.id}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  await UserSession.create({
    token,
    user_id: user.id,
    role: user.role,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  const org = user.organization_id ? await Organization.findOne({ id: user.organization_id }).lean() : null;

  logAudit('UserAuth', user.id, 'USER_LOGGED_IN', user.id, user.role, { email: user.email });

  const { password_hash, _id, ...safeUser } = user;
  res.json({ token, user: safeUser, organization: org });
});

app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : req.headers['x-auth-token'];
  if (token) {
    await UserSession.deleteOne({ token });
  }
  res.json({ success: true });
});

app.get('/api/auth/users', async (req, res) => {
  const users = await User.find().lean();
  const orgIds = [...new Set(users.map(u => u.organization_id).filter(Boolean))];
  const orgs = await Organization.find({ id: { $in: orgIds } }).lean();
  const orgMap = new Map(orgs.map(o => [o.id, o.name]));

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    organization_id: u.organization_id,
    phone: u.phone,
    avatar: u.avatar,
    is_demo: u.is_demo,
    organization_name: orgMap.get(u.organization_id) || null
  }));
  res.json(result);
});

// ==========================================
// 2. INSTRUMENT REGISTRY (TRADER ONLY)
// ==========================================

app.get('/api/instruments', async (req, res) => {
  const { owner_id } = req.query;
  const filter = {};
  if (owner_id) filter.owner_id = owner_id;

  const instruments = await Instrument.find(filter).sort({ created_at: -1 }).lean();
  const catIds = [...new Set(instruments.map(i => i.category_id).filter(Boolean))];
  const categories = await InstrumentCategory.find({ id: { $in: catIds } }).lean();
  const catMap = new Map(categories.map(c => [c.id, c]));

  const result = instruments.map(i => {
    const cat = catMap.get(i.category_id) || {};
    return {
      ...i,
      category_name: cat.name || null,
      category_code: cat.code || null
    };
  });
  res.json(result);
});

app.get('/api/instruments/:id', async (req, res) => {
  const instrument = await Instrument.findOne({ id: req.params.id }).lean();
  if (!instrument) return res.status(404).json({ error: 'Instrument not found' });

  const cat = await InstrumentCategory.findOne({ id: instrument.category_id }).lean();
  const user = await User.findOne({ id: instrument.owner_id }).lean();
  const org = user && user.organization_id ? await Organization.findOne({ id: user.organization_id }).lean() : null;

  // Fetch verifications & certificates history
  const apps = await Application.find({ instrument_id: req.params.id }).lean();
  const appIds = apps.map(a => a.id);
  const appMap = new Map(apps.map(a => [a.id, a]));

  const verifs = await Verification.find({ application_id: { $in: appIds } }).sort({ completed_at: -1 }).lean();
  const verifIds = verifs.map(v => v.id);
  const verifierIds = [...new Set(verifs.map(v => v.verifier_id).filter(Boolean))];
  const verifiers = await User.find({ id: { $in: verifierIds } }).lean();
  const verifierMap = new Map(verifiers.map(u => [u.id, u.full_name]));

  const certs = await Certificate.find({ verification_id: { $in: verifIds } }).lean();
  const certMap = new Map(certs.map(c => [c.verification_id, c]));

  const history = verifs.map(v => {
    const appItem = appMap.get(v.application_id) || {};
    const cert = certMap.get(v.id) || {};
    return {
      ...v,
      application_no: appItem.application_no || null,
      request_type: appItem.request_type || null,
      verifier_name: verifierMap.get(v.verifier_id) || null,
      certificate_id: cert.id || null,
      certificate_no: cert.certificate_no || null,
      public_token: cert.public_token || null,
      issue_date: cert.issue_date || null,
      valid_until: cert.valid_until || null,
      certificate_status: cert.status || null
    };
  });

  res.json({
    ...instrument,
    category_name: cat ? cat.name : null,
    category_code: cat ? cat.code : null,
    owner_name: user ? user.full_name : null,
    owner_org: org ? org.name : null,
    history
  });
});

app.post('/api/instruments', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'CREATE_INSTRUMENT')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' is not authorized to register instruments.` });
  }

  const {
    owner_id,
    category_id,
    manufacturer,
    model,
    serial_number,
    max_capacity,
    min_capacity,
    verification_scale_interval_e,
    location
  } = req.body;

  if (!owner_id || !serial_number || !manufacturer || !model) {
    return res.status(400).json({ error: 'Missing mandatory instrument details' });
  }

  const existing = await Instrument.findOne({ serial_number }).lean();
  if (existing) {
    return res.status(400).json({ error: 'Instrument with this serial number is already registered' });
  }

  const id = `INST_${Date.now()}`;
  const now = new Date().toISOString();

  await Instrument.create({
    id,
    owner_id,
    category_id: category_id || 'CAT_NAWI_III',
    manufacturer,
    model,
    serial_number,
    max_capacity: max_capacity || '30 kg',
    min_capacity: min_capacity || '100 g',
    verification_scale_interval_e: verification_scale_interval_e || '5 g',
    location,
    status: 'REGISTERED',
    created_at: now
  });

  logAudit('Instrument', id, 'REGISTER', actorId, role, { serial_number, manufacturer, model });

  res.status(201).json({ id, message: 'Instrument registered successfully' });
});

// ==========================================
// 3. VERIFICATION APPLICATIONS (TRADER SUBMITS)
// ==========================================

app.get('/api/applications', async (req, res) => {
  const { trader_id, status } = req.query;
  const filter = {};
  if (trader_id) filter.trader_id = trader_id;
  if (status) filter.status = status;

  const applications = await Application.find(filter).sort({ created_at: -1 }).lean();
  if (applications.length === 0) return res.json([]);

  const instIds = [...new Set(applications.map(a => a.instrument_id).filter(Boolean))];
  const traderIds = [...new Set(applications.map(a => a.trader_id).filter(Boolean))];
  const appIds = applications.map(a => a.id);

  const instruments = await Instrument.find({ id: { $in: instIds } }).lean();
  const instMap = new Map(instruments.map(i => [i.id, i]));

  const catIds = [...new Set(instruments.map(i => i.category_id).filter(Boolean))];
  const categories = await InstrumentCategory.find({ id: { $in: catIds } }).lean();
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  const users = await User.find({ id: { $in: traderIds } }).lean();
  const userMap = new Map(users.map(u => [u.id, u]));

  const orgIds = [...new Set(users.map(u => u.organization_id).filter(Boolean))];
  const orgs = await Organization.find({ id: { $in: orgIds } }).lean();
  const orgMap = new Map(orgs.map(o => [o.id, o.name]));

  const assignments = await Assignment.find({ application_id: { $in: appIds } }).lean();
  const asnMap = new Map(assignments.map(a => [a.application_id, a]));

  const assigneeIds = [...new Set(assignments.map(a => a.assigned_id).filter(Boolean))];
  const assignees = await User.find({ id: { $in: assigneeIds } }).lean();
  const assigneeMap = new Map(assignees.map(u => [u.id, u.full_name]));

  const result = applications.map(a => {
    const inst = instMap.get(a.instrument_id) || {};
    const trader = userMap.get(a.trader_id) || {};
    const traderOrg = trader.organization_id ? orgMap.get(trader.organization_id) : null;
    const asn = asnMap.get(a.id) || {};

    return {
      ...a,
      manufacturer: inst.manufacturer || null,
      model: inst.model || null,
      serial_number: inst.serial_number || null,
      location: inst.location || null,
      category_name: catMap.get(inst.category_id) || null,
      trader_name: trader.full_name || null,
      trader_org: traderOrg || null,
      assigned_id: asn.assigned_id || null,
      assigned_type: asn.assigned_type || null,
      is_override: asn.is_override || 0,
      assigned_to_name: asn.assigned_id ? assigneeMap.get(asn.assigned_id) : null
    };
  });

  res.json(result);
});

app.get('/api/applications/:id', async (req, res) => {
  const application = await Application.findOne({ id: req.params.id }).lean();
  if (!application) return res.status(404).json({ error: 'Application not found' });

  const inst = await Instrument.findOne({ id: application.instrument_id }).lean();
  const cat = inst ? await InstrumentCategory.findOne({ id: inst.category_id }).lean() : null;
  const trader = await User.findOne({ id: application.trader_id }).lean();
  const traderOrg = trader && trader.organization_id ? await Organization.findOne({ id: trader.organization_id }).lean() : null;

  const asn = await Assignment.findOne({ application_id: application.id }).lean();
  const assignee = asn ? await User.findOne({ id: asn.assigned_id }).lean() : null;
  const apt = asn ? await Appointment.findOne({ assignment_id: asn.id }).lean() : null;

  const verif = await Verification.findOne({ application_id: application.id }).lean();
  const cert = verif ? await Certificate.findOne({ verification_id: verif.id }).lean() : null;

  res.json({
    ...application,
    manufacturer: inst ? inst.manufacturer : null,
    model: inst ? inst.model : null,
    serial_number: inst ? inst.serial_number : null,
    max_capacity: inst ? inst.max_capacity : null,
    min_capacity: inst ? inst.min_capacity : null,
    verification_scale_interval_e: inst ? inst.verification_scale_interval_e : null,
    location: inst ? inst.location : null,
    category_name: cat ? cat.name : null,
    trader_name: trader ? trader.full_name : null,
    trader_phone: trader ? trader.phone : null,
    trader_email: trader ? trader.email : null,
    trader_org: traderOrg ? traderOrg.name : null,
    trader_jurisdiction: traderOrg ? traderOrg.jurisdiction : null,
    assignment_id: asn ? asn.id : null,
    assigned_type: asn ? asn.assigned_type : null,
    assigned_id: asn ? asn.assigned_id : null,
    recommended_id: asn ? asn.recommended_id : null,
    is_override: asn ? asn.is_override : 0,
    override_reason: asn ? asn.override_reason : null,
    assigned_to_name: assignee ? assignee.full_name : null,
    scheduled_date: apt ? apt.scheduled_date : null,
    time_slot: apt ? apt.time_slot : null,
    arrangement_type: apt ? apt.arrangement_type : null,
    verification_result: verif ? verif.result : null,
    verification_remarks: verif ? verif.remarks : null,
    verification_completed_at: verif ? verif.completed_at : null,
    certificate_id: cert ? cert.id : null,
    certificate_no: cert ? cert.certificate_no : null,
    certificate_status: cert ? cert.status : null,
    certificate_issue_date: cert ? cert.issue_date : null,
    certificate_valid_until: cert ? cert.valid_until : null
  });
});

app.post('/api/applications', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'SUBMIT_APPLICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' is not permitted to submit verification requests.` });
  }

  const { instrument_id, trader_id, request_type } = req.body;
  if (!instrument_id || !trader_id) {
    return res.status(400).json({ error: 'Missing instrument or trader ID' });
  }

  const inst = await Instrument.findOne({ id: instrument_id }).lean();
  if (!inst) return res.status(404).json({ error: 'Instrument not found' });
  if (inst.owner_id !== trader_id && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: 'Forbidden: You can only apply for your own registered instruments.' });
  }

  const activeApp = await Application.findOne({
    instrument_id,
    status: { $nin: ['VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'] }
  }).lean();

  if (activeApp) {
    return res.status(400).json({ error: 'An active verification application is already in progress for this instrument.' });
  }

  const id = `APP_${Date.now()}`;
  const appNo = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  await Application.create({
    id,
    application_no: appNo,
    instrument_id,
    trader_id,
    request_type: request_type || 'INITIAL_VERIFICATION',
    status: 'SUBMITTED',
    documents: [],
    fee_status: 'PAID',
    created_at: now,
    updated_at: now
  });

  await Instrument.updateOne({ id: instrument_id }, { $set: { status: 'UNDER_VERIFICATION' } });

  logAudit('Application', id, 'SUBMIT', actorId, role, { application_no: appNo, instrument_id });

  res.status(201).json({ id, application_no: appNo, status: 'SUBMITTED', message: 'Verification application submitted successfully' });
});

// ==========================================
// 4. AUTHORITY REVIEW & ASSIGNMENT
// ==========================================

app.post('/api/applications/:id/review', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'REVIEW_APPLICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot review applications.` });
  }

  const appItem = await Application.findOne({ id: req.params.id }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  if (appItem.status !== 'SUBMITTED' && appItem.status !== 'UNDER_REVIEW') {
    return res.status(400).json({ error: `Invalid state transition: Cannot review application in state '${appItem.status}'` });
  }

  const now = new Date().toISOString();
  await Application.updateOne({ id: req.params.id }, { $set: { status: 'UNDER_REVIEW', updated_at: now } });

  logAudit('Application', req.params.id, 'STATUTORY_REVIEW_OPENED', actorId, role, { previous_status: appItem.status });

  res.json({ message: 'Application is now under statutory review', status: 'UNDER_REVIEW' });
});

app.get('/api/applications/:id/candidates', async (req, res) => {
  const { role } = getActor(req);
  if (!hasPermission(role, 'ASSIGN_VERIFIER')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot access verifier allocation engine.` });
  }

  const appItem = await Application.findOne({ id: req.params.id }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const verifiers = await User.find({ role: { $in: ['VERIFIER', 'GATC'] } }).lean();
  const orgIds = [...new Set(verifiers.map(u => u.organization_id).filter(Boolean))];
  const orgs = await Organization.find({ id: { $in: orgIds } }).lean();
  const orgMap = new Map(orgs.map(o => [o.id, o]));

  const assignments = await Assignment.find().lean();
  const workloadMap = new Map();
  for (const a of assignments) {
    workloadMap.set(a.assigned_id, (workloadMap.get(a.assigned_id) || 0) + 1);
  }

  const scored = verifiers.map(c => {
    const org = orgMap.get(c.organization_id) || {};
    const current_workload = workloadMap.get(c.id) || 0;
    let score = 100 - (current_workload * 12);
    let matchReason = 'Authorized statutory Legal Metrology Officer';
    if (c.role === 'GATC') {
      score += 5;
      matchReason = 'Approved test centre with verified mass standard laboratory';
    }
    return {
      id: c.id,
      full_name: c.full_name,
      role: c.role,
      phone: c.phone,
      organization_name: org.name || null,
      jurisdiction: org.jurisdiction || null,
      current_workload,
      suitability_score: Math.max(score, 40),
      match_reason: matchReason,
      is_eligible: true
    };
  }).sort((a, b) => b.suitability_score - a.suitability_score);

  const recommendedId = scored.length > 0 ? scored[0].id : null;

  res.json({
    application_id: req.params.id,
    recommended_id: recommendedId,
    candidates: scored
  });
});

app.post('/api/applications/:id/assign', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'ASSIGN_VERIFIER')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot assign verifiers.` });
  }

  const applicationId = req.params.id;
  const appItem = await Application.findOne({ id: applicationId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(appItem.status)) {
    return res.status(400).json({ error: `Invalid state transition: Cannot assign verifier to application in state '${appItem.status}'` });
  }

  const { assigned_id, recommended_id, is_override, override_reason, scheduled_date, time_slot, arrangement_type } = req.body;
  if (!assigned_id) return res.status(400).json({ error: 'Target assignee ID is required' });

  const assignee = await User.findOne({ id: assigned_id }).lean();
  if (!assignee) return res.status(404).json({ error: 'Assignee user not found' });
  if (![ROLES.VERIFIER, ROLES.GATC].includes(assignee.role)) {
    return res.status(400).json({ error: 'Assignee must have role VERIFIER or GATC' });
  }

  const assignmentId = `ASN_${Date.now()}`;
  const now = new Date().toISOString();

  const existingAsn = await Assignment.findOne({ application_id: applicationId }).lean();
  if (existingAsn) {
    await Assignment.updateOne(
      { id: existingAsn.id },
      {
        $set: {
          assigned_id,
          assigned_type: assignee.role,
          is_override: is_override ? 1 : 0,
          override_reason: override_reason || '',
          assigned_by: actorId
        }
      }
    );
  } else {
    await Assignment.create({
      id: assignmentId,
      application_id: applicationId,
      assigned_type: assignee.role,
      assigned_id,
      recommended_id: recommended_id || assigned_id,
      is_override: is_override ? 1 : 0,
      override_reason: override_reason || '',
      assigned_by: actorId,
      created_at: now
    });
  }

  // Appointment scheduling
  const targetAsnId = existingAsn ? existingAsn.id : assignmentId;
  const aptId = `APT_${Date.now()}`;
  const existingApt = await Appointment.findOne({ assignment_id: targetAsnId }).lean();
  if (existingApt) {
    await Appointment.updateOne(
      { id: existingApt.id },
      {
        $set: {
          scheduled_date: scheduled_date || '',
          time_slot: time_slot || 'MORNING_10_00',
          arrangement_type: arrangement_type || 'FIELD_VISIT'
        }
      }
    );
  } else {
    await Appointment.create({
      id: aptId,
      assignment_id: targetAsnId,
      scheduled_date: scheduled_date || '',
      time_slot: time_slot || 'MORNING_10_00',
      arrangement_type: arrangement_type || 'FIELD_VISIT',
      status: 'SCHEDULED',
      created_at: now
    });
  }

  // Transition: -> ASSIGNED
  await Application.updateOne({ id: applicationId }, { $set: { status: 'ASSIGNED', updated_at: now } });

  logAudit('Application', applicationId, is_override ? 'ASSIGNMENT_OVERRIDE' : 'ASSIGNMENT_CONFIRMED', actorId, role, {
    assigned_id,
    assignee_name: assignee.full_name,
    recommended_id,
    is_override: !!is_override,
    override_reason
  });

  res.json({ message: 'Verifier assigned successfully', status: 'ASSIGNED' });
});

// ==========================================
// 5. SECOND VERTICAL SLICE: VERIFICATION WORKSPACE
// ==========================================

// List Assigned Cases for Verifier
app.get('/api/verifications/cases', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'VIEW_ASSIGNED_CASES') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot access verifier queue.` });
  }

  const { verifier_id } = req.query;
  const targetVerifierId = verifier_id || actorId;

  // Filter assignments by verifier if not admin
  const asnFilter = {};
  if (role !== ROLES.PLATFORM_ADMIN && targetVerifierId !== 'UNKNOWN') {
    asnFilter.assigned_id = targetVerifierId;
  }

  const assignments = await Assignment.find(asnFilter).lean();
  const appIds = assignments.map(a => a.application_id);
  const asnMap = new Map(assignments.map(a => [a.application_id, a]));

  const applications = await Application.find({
    id: { $in: appIds },
    status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'] }
  }).sort({ updated_at: -1 }).lean();

  const instIds = [...new Set(applications.map(a => a.instrument_id).filter(Boolean))];
  const instruments = await Instrument.find({ id: { $in: instIds } }).lean();
  const instMap = new Map(instruments.map(i => [i.id, i]));

  const traderIds = [...new Set(applications.map(a => a.trader_id).filter(Boolean))];
  const traders = await User.find({ id: { $in: traderIds } }).lean();
  const traderMap = new Map(traders.map(u => [u.id, u]));

  const asnIds = assignments.map(a => a.id);
  const appointments = await Appointment.find({ assignment_id: { $in: asnIds } }).lean();
  const aptMap = new Map(appointments.map(a => [a.assignment_id, a]));

  const verifs = await Verification.find({ application_id: { $in: applications.map(a => a.id) } }).lean();
  const verifMap = new Map(verifs.map(v => [v.application_id, v]));

  const cases = applications.map(a => {
    const asn = asnMap.get(a.id) || {};
    const inst = instMap.get(a.instrument_id) || {};
    const trader = traderMap.get(a.trader_id) || {};
    const apt = aptMap.get(asn.id) || {};
    const verif = verifMap.get(a.id) || {};

    return {
      application_id: a.id,
      application_no: a.application_no,
      request_type: a.request_type,
      application_status: a.status,
      instrument_id: inst.id || null,
      manufacturer: inst.manufacturer || null,
      model: inst.model || null,
      serial_number: inst.serial_number || null,
      max_capacity: inst.max_capacity || null,
      location: inst.location || null,
      trader_name: trader.full_name || null,
      trader_phone: trader.phone || null,
      assigned_id: asn.assigned_id || null,
      is_override: asn.is_override || 0,
      scheduled_date: apt.scheduled_date || null,
      time_slot: apt.time_slot || null,
      arrangement_type: apt.arrangement_type || null,
      verification_id: verif.id || null,
      verification_status: verif.status || null,
      verification_result: verif.result || null
    };
  });

  res.json(cases);
});

// Get Verification Workspace Context
app.get('/api/verifications/cases/:appId', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'OPEN_VERIFICATION_WORKSPACE') && role !== ROLES.PLATFORM_ADMIN && role !== ROLES.AUTHORITY) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot open verification workspace.` });
  }

  const a = await Application.findOne({ id: req.params.appId }).lean();
  if (!a) return res.status(404).json({ error: 'Case not found' });

  const inst = await Instrument.findOne({ id: a.instrument_id }).lean();
  const cat = inst ? await InstrumentCategory.findOne({ id: inst.category_id }).lean() : null;
  const ruleSet = cat ? await RuleSet.findOne({ category_id: cat.id }).lean() : null;
  const trader = await User.findOne({ id: a.trader_id }).lean();
  const traderOrg = trader && trader.organization_id ? await Organization.findOne({ id: trader.organization_id }).lean() : null;

  const asn = await Assignment.findOne({ application_id: a.id }).lean();
  const assigner = asn && asn.assigned_by ? await User.findOne({ id: asn.assigned_by }).lean() : null;
  const apt = asn ? await Appointment.findOne({ assignment_id: asn.id }).lean() : null;

  const verif = await Verification.findOne({ application_id: a.id }).lean();
  const cert = verif ? await Certificate.findOne({ verification_id: verif.id }).lean() : null;

  // Access validation: verifier must be the assigned officer
  if (role === ROLES.VERIFIER && asn && asn.assigned_id !== actorId && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: 'Forbidden: You are not the assigned verifier for this case.' });
  }

  // Load existing checklist responses, readings, evidence
  const checklistResponses = verif ? await VerificationChecklistResponse.find({ verification_id: verif.id }).lean() : [];
  const readings = verif ? await VerificationReading.find({ verification_id: verif.id }).sort({ reference_value: 1 }).lean() : [];
  const evidence = verif ? await VerificationEvidence.find({ verification_id: verif.id }).sort({ created_at: -1 }).lean() : [];

  res.json({
    application_id: a.id,
    application_no: a.application_no,
    status: a.status,
    application_status: a.status,
    request_type: a.request_type,
    instrument_id: inst ? inst.id : null,
    manufacturer: inst ? inst.manufacturer : null,
    model: inst ? inst.model : null,
    serial_number: inst ? inst.serial_number : null,
    max_capacity: inst ? inst.max_capacity : null,
    min_capacity: inst ? inst.min_capacity : null,
    verification_scale_interval_e: inst ? inst.verification_scale_interval_e : null,
    location: inst ? inst.location : null,
    category_name: cat ? cat.name : null,
    trader_name: trader ? trader.full_name : null,
    trader_phone: trader ? trader.phone : null,
    trader_email: trader ? trader.email : null,
    trader_org: traderOrg ? traderOrg.name : null,
    trader_jurisdiction: traderOrg ? traderOrg.jurisdiction : null,
    assigned_id: asn ? asn.assigned_id : null,
    assigned_type: asn ? asn.assigned_type : null,
    assigned_at: asn ? asn.created_at : null,
    assigned_by_name: assigner ? assigner.full_name : null,
    scheduled_date: apt ? apt.scheduled_date : null,
    time_slot: apt ? apt.time_slot : null,
    arrangement_type: apt ? apt.arrangement_type : null,
    checklist_schema: ruleSet ? ruleSet.checklist_schema : [],
    mpe_rules: ruleSet ? ruleSet.mpe_rules : {},
    verification_id: verif ? verif.id : null,
    verification_status: verif ? verif.status : null,
    verification_result: verif ? verif.result : null,
    observations: verif ? verif.remarks : null,
    started_at: verif ? verif.started_at : null,
    completed_at: verif ? verif.completed_at : null,
    certificate_id: cert ? cert.id : null,
    certificate_no: cert ? cert.certificate_no : null,
    certificate_status: cert ? cert.status : null,
    issue_date: cert ? cert.issue_date : null,
    valid_until: cert ? cert.valid_until : null,
    public_token: cert ? cert.public_token : null,
    checklist_responses: checklistResponses,
    readings,
    evidence
  });
});

// Start Verification: ASSIGNED -> IN_PROGRESS
app.post('/api/verifications/cases/:appId/start', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot start verifications.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (role !== ROLES.PLATFORM_ADMIN && asn && asn.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can start this verification.' });
  }

  if (appItem.status !== 'ASSIGNED' && appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Cannot start verification on application in state '${appItem.status}'.` });
  }

  const now = new Date().toISOString();
  let verif = await Verification.findOne({ application_id: req.params.appId }).lean();
  const verifId = verif ? verif.id : `VERIF_${Date.now()}`;

  if (!verif) {
    await Verification.create({
      id: verifId,
      application_id: req.params.appId,
      verifier_id: actorId,
      status: 'IN_PROGRESS',
      started_at: now,
      created_at: now,
      updated_at: now
    });
  } else {
    await Verification.updateOne(
      { id: verifId },
      {
        $set: {
          status: 'IN_PROGRESS',
          started_at: verif.started_at || now,
          updated_at: now
        }
      }
    );
  }

  // State Transition: -> IN_PROGRESS
  await Application.updateOne({ id: req.params.appId }, { $set: { status: 'IN_PROGRESS', updated_at: now } });

  logAudit('Verification', verifId, 'VERIFICATION_STARTED', actorId, role, {
    application_id: req.params.appId
  });

  res.json({ message: 'Verification started', status: 'IN_PROGRESS', verification_id: verifId });
});

// Save Draft (Checklist, Readings, Observations)
app.post('/api/verifications/cases/:appId/draft', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot record verification draft.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (role !== ROLES.PLATFORM_ADMIN && asn && asn.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can save draft data.' });
  }
  if (appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Cannot save draft for application in status '${appItem.status}'. Must be 'IN_PROGRESS'.` });
  }

  const { checklist_responses, readings, observations } = req.body;
  const now = new Date().toISOString();

  let verif = await Verification.findOne({ application_id: req.params.appId }).lean();
  let verifId = verif ? verif.id : `VERIF_${Date.now()}`;

  if (!verif) {
    await Verification.create({
      id: verifId,
      application_id: req.params.appId,
      verifier_id: actorId,
      status: 'IN_PROGRESS',
      remarks: observations || '',
      started_at: now,
      created_at: now,
      updated_at: now
    });
  } else {
    await Verification.updateOne(
      { id: verif.id },
      { $set: { remarks: observations || '', updated_at: now } }
    );
  }

  // Save checklist responses
  if (Array.isArray(checklist_responses)) {
    for (const chk of checklist_responses) {
      if (chk.item_id) {
        await VerificationChecklistResponse.findOneAndUpdate(
          { verification_id: verifId, item_id: chk.item_id },
          {
            $set: {
              status: chk.status || 'PASS',
              note: chk.note || '',
              updated_at: now
            },
            $setOnInsert: {
              id: `CHK_RES_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              verification_id: verifId,
              item_id: chk.item_id
            }
          },
          { upsert: true }
        );
      }
    }
  }

  // Save measurement readings
  if (Array.isArray(readings)) {
    await VerificationReading.deleteMany({ verification_id: verifId });
    const docs = readings.map(r => ({
      id: `RDG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      verification_id: verifId,
      test_point: r.test_point || 'Test Point',
      reference_value: Number(r.reference_value) || 0,
      observed_value: r.observed_value !== undefined && r.observed_value !== '' ? Number(r.observed_value) : null,
      unit: r.unit || 'kg',
      reading_result: r.reading_result || 'PASS',
      updated_at: now
    }));
    if (docs.length > 0) {
      await VerificationReading.insertMany(docs);
    }
  }

  logAudit('Verification', verifId, 'VERIFICATION_DRAFT_SAVED', actorId, role, {
    application_id: req.params.appId,
    checklist_count: checklist_responses?.length || 0,
    readings_count: readings?.length || 0
  });

  res.json({ message: 'Verification draft saved successfully' });
});

// Upload Evidence Attachment
app.post('/api/verifications/cases/:appId/evidence', upload.single('file'), async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot attach evidence.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (role !== ROLES.PLATFORM_ADMIN && asn && asn.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can attach evidence.' });
  }
  if (appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Cannot attach evidence for application in status '${appItem.status}'. Must be 'IN_PROGRESS'.` });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const now = new Date().toISOString();
  let verif = await Verification.findOne({ application_id: req.params.appId }).lean();
  let verifId = verif ? verif.id : `VERIF_${Date.now()}`;

  if (!verif) {
    await Verification.create({
      id: verifId,
      application_id: req.params.appId,
      verifier_id: actorId,
      status: 'IN_PROGRESS',
      started_at: now,
      created_at: now,
      updated_at: now
    });
  }

  const evidenceId = `EV_${Date.now()}`;
  const relativePath = `/uploads/evidence/${req.file.filename}`;
  const category = req.body.category || 'DEVICE_SETUP';
  const caption = req.body.caption || req.file.originalname;

  await VerificationEvidence.create({
    id: evidenceId,
    verification_id: verifId,
    file_name: req.file.originalname,
    file_path: relativePath,
    file_type: req.file.mimetype,
    category,
    caption,
    created_at: now
  });

  logAudit('Verification', verifId, 'EVIDENCE_ATTACHED', actorId, role, {
    evidence_id: evidenceId,
    file_name: req.file.originalname,
    category
  });

  res.status(201).json({
    id: evidenceId,
    file_name: req.file.originalname,
    file_path: relativePath,
    category,
    caption,
    created_at: now
  });
});

// Remove Evidence Attachment
app.delete('/api/verifications/cases/:appId/evidence/:evidenceId', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot delete evidence.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (role !== ROLES.PLATFORM_ADMIN && asn && asn.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can delete evidence.' });
  }
  if (appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Cannot modify evidence for application in status '${appItem.status}'. Must be 'IN_PROGRESS'.` });
  }

  const ev = await VerificationEvidence.findOne({ id: req.params.evidenceId }).lean();
  if (!ev) return res.status(404).json({ error: 'Evidence record not found' });

  await VerificationEvidence.deleteOne({ id: req.params.evidenceId });

  // Safely remove physical file from persistent storage
  deleteStoredFile(ev.file_path);

  logAudit('Verification', ev.verification_id, 'EVIDENCE_REMOVED', actorId, role, {
    evidence_id: req.params.evidenceId
  });

  res.json({ message: 'Evidence removed successfully' });
});

// Submit Verification Result (PASS / FAIL)
app.post('/api/verifications/cases/:appId/submit', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot submit verification outcomes.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (role !== ROLES.PLATFORM_ADMIN && asn && asn.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can submit verification results.' });
  }
  if (appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Invalid state transition: Cannot submit result for application in state '${appItem.status}'. Must be 'IN_PROGRESS'.` });
  }

  const inst = await Instrument.findOne({ id: appItem.instrument_id }).lean();
  const ruleSet = inst ? await RuleSet.findOne({ category_id: inst.category_id }).lean() : null;

  const { result, remarks, checklist_responses, readings } = req.body;

  // 1. Result validation
  if (!['PASS', 'FAIL'].includes(result)) {
    return res.status(400).json({ error: "Verification outcome must be either 'PASS' or 'FAIL'." });
  }

  // 2. Failure rationale check
  if (result === 'FAIL' && (!remarks || !remarks.trim())) {
    return res.status(400).json({ error: 'Observations and failure rationale are mandatory when recording a FAIL result.' });
  }

  // 3. Checklist completeness check (all required items in schema must have status)
  const checklistSchema = ruleSet ? ruleSet.checklist_schema : [];
  const requiredItemIds = checklistSchema.filter(i => i.mandatory || i.required).map(i => i.id);
  const providedResponses = Array.isArray(checklist_responses) ? checklist_responses : [];

  for (const reqId of requiredItemIds) {
    const answered = providedResponses.find(r => r.item_id === reqId && r.status);
    if (!answered) {
      return res.status(400).json({ error: `Incomplete verification: Required checklist item '${reqId}' has not been evaluated.` });
    }
  }

  // 4. Readings completeness check
  if (!Array.isArray(readings) || readings.length === 0 || readings.some(r => r.observed_value === undefined || r.observed_value === '' || r.observed_value === null)) {
    return res.status(400).json({ error: 'Incomplete verification: Observed measurement readings must be recorded for all test points.' });
  }

  const now = new Date().toISOString();
  let verif = await Verification.findOne({ application_id: req.params.appId }).lean();
  const verifId = verif ? verif.id : `VERIF_${Date.now()}`;

  // Persist final responses
  if (!verif) {
    await Verification.create({
      id: verifId,
      application_id: req.params.appId,
      verifier_id: actorId,
      status: 'COMPLETED',
      result,
      remarks: remarks || '',
      started_at: now,
      completed_at: now,
      created_at: now,
      updated_at: now
    });
  } else {
    await Verification.updateOne(
      { id: verifId },
      {
        $set: {
          status: 'COMPLETED',
          result,
          remarks: remarks || '',
          completed_at: now,
          updated_at: now
        }
      }
    );
  }

  // Persist responses
  for (const chk of providedResponses) {
    if (chk.item_id) {
      await VerificationChecklistResponse.findOneAndUpdate(
        { verification_id: verifId, item_id: chk.item_id },
        {
          $set: {
            status: chk.status,
            note: chk.note || '',
            updated_at: now
          },
          $setOnInsert: {
            id: `CHK_RES_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            verification_id: verifId,
            item_id: chk.item_id
          }
        },
        { upsert: true }
      );
    }
  }

  // Persist readings
  await VerificationReading.deleteMany({ verification_id: verifId });
  const readingDocs = readings.map(r => ({
    id: `RDG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    verification_id: verifId,
    test_point: r.test_point || 'Test Point',
    reference_value: Number(r.reference_value) || 0,
    observed_value: Number(r.observed_value),
    unit: r.unit || 'kg',
    reading_result: r.reading_result || 'PASS',
    updated_at: now
  }));
  await VerificationReading.insertMany(readingDocs);

  // State Transitions for Application & Instrument
  const nextAppStatus = result === 'PASS' ? 'VERIFICATION_COMPLETED' : 'VERIFICATION_FAILED';
  const nextInstStatus = result === 'PASS' ? 'VERIFIED' : 'REJECTED';

  await Application.updateOne({ id: req.params.appId }, { $set: { status: nextAppStatus, updated_at: now } });
  await Instrument.updateOne({ id: appItem.instrument_id }, { $set: { status: nextInstStatus } });

  logAudit('Verification', verifId, 'VERIFICATION_RESULT_SUBMITTED', actorId, role, {
    application_id: req.params.appId,
    result,
    remarks,
    checklist_count: providedResponses.length,
    readings_count: readings.length,
    final_application_status: nextAppStatus
  });

  res.json({
    message: `Verification successfully completed with result: ${result}`,
    status: nextAppStatus,
    result
  });
});

// ==========================================
// 6. CERTIFICATES & STATUTORY QR (SLICE 3)
// ==========================================

// Generate Certificate (Idempotent, requires PASS outcome)
app.post('/api/certificates/generate/:appId', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  // Authority, Verifier, GATC or Admin can trigger certificate generation
  if (![ROLES.VERIFIER, ROLES.GATC, ROLES.AUTHORITY, ROLES.PLATFORM_ADMIN].includes(role)) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot generate statutory certificates.` });
  }

  const appId = req.params.appId;
  const appItem = await Application.findOne({ id: appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const inst = await Instrument.findOne({ id: appItem.instrument_id }).lean();
  const ruleSet = inst ? await RuleSet.findOne({ category_id: inst.category_id }).lean() : null;
  const verif = await Verification.findOne({ application_id: appId }).lean();
  const verifier = verif ? await User.findOne({ id: verif.verifier_id }).lean() : null;
  const org = verifier && verifier.organization_id ? await Organization.findOne({ id: verifier.organization_id }).lean() : null;

  // 1. Verification Eligibility Check: Must be COMPLETED and PASS
  if (!verif || verif.result !== 'PASS') {
    return res.status(400).json({
      error: 'Ineligible: Statutory certificate cannot be generated for an incomplete, missing, or failed verification.'
    });
  }

  // 2. Idempotency Check: If certificate already exists, return it without creating duplicate
  const existingCert = await Certificate.findOne({ verification_id: verif.id }).lean();
  if (existingCert) {
    const cat = inst ? await InstrumentCategory.findOne({ id: inst.category_id }).lean() : null;
    const trader = inst ? await User.findOne({ id: inst.owner_id }).lean() : null;
    const traderOrg = trader && trader.organization_id ? await Organization.findOne({ id: trader.organization_id }).lean() : null;

    return res.json({
      message: 'Certificate already exists for this verification',
      certificate: {
        ...existingCert,
        manufacturer: inst ? inst.manufacturer : null,
        model: inst ? inst.model : null,
        serial_number: inst ? inst.serial_number : null,
        max_capacity: inst ? inst.max_capacity : null,
        min_capacity: inst ? inst.min_capacity : null,
        verification_scale_interval_e: inst ? inst.verification_scale_interval_e : null,
        location: inst ? inst.location : null,
        category_name: cat ? cat.name : null,
        owner_name: trader ? trader.full_name : null,
        owner_org: traderOrg ? traderOrg.name : null
      },
      created: false
    });
  }

  // 3. Generate Unique Certificate Number & Public UUID Token
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  const certNo = `LM-${year}-${randomDigits}-DL`;
  const publicToken = crypto.randomUUID();
  const certId = `CERT_${Date.now()}`;

  const issueDate = new Date();
  const validityMonths = ruleSet?.validity_period_months || 12;
  const validUntil = new Date(issueDate);
  validUntil.setMonth(validUntil.getMonth() + validityMonths);

  const issuingOfficer = verifier?.full_name || 'Vikram Singh (LMO)';
  const issuingAuthority = org?.name || 'Department of Consumer Affairs, Delhi';

  await Certificate.create({
    id: certId,
    certificate_no: certNo,
    verification_id: verif.id,
    instrument_id: inst.id,
    public_token: publicToken,
    issue_date: issueDate.toISOString(),
    valid_until: validUntil.toISOString(),
    status: 'VALID',
    issuing_officer: issuingOfficer,
    issuing_authority: issuingAuthority,
    created_at: issueDate.toISOString()
  });

  // Update instrument status to VERIFIED
  await Instrument.updateOne({ id: inst.id }, { $set: { status: 'VERIFIED' } });

  logAudit('Certificate', certId, 'CERTIFICATE_GENERATED', actorId, role, {
    certificate_no: certNo,
    application_id: appId,
    instrument_id: inst.id,
    public_token: publicToken,
    valid_until: validUntil.toISOString()
  });

  const cat = inst ? await InstrumentCategory.findOne({ id: inst.category_id }).lean() : null;
  const trader = inst ? await User.findOne({ id: inst.owner_id }).lean() : null;
  const traderOrg = trader && trader.organization_id ? await Organization.findOne({ id: trader.organization_id }).lean() : null;

  const createdCert = {
    id: certId,
    certificate_no: certNo,
    verification_id: verif.id,
    instrument_id: inst.id,
    public_token: publicToken,
    issue_date: issueDate.toISOString(),
    valid_until: validUntil.toISOString(),
    status: 'VALID',
    issuing_officer: issuingOfficer,
    issuing_authority: issuingAuthority,
    created_at: issueDate.toISOString(),
    manufacturer: inst ? inst.manufacturer : null,
    model: inst ? inst.model : null,
    serial_number: inst ? inst.serial_number : null,
    max_capacity: inst ? inst.max_capacity : null,
    min_capacity: inst ? inst.min_capacity : null,
    verification_scale_interval_e: inst ? inst.verification_scale_interval_e : null,
    location: inst ? inst.location : null,
    category_name: cat ? cat.name : null,
    owner_name: trader ? trader.full_name : null,
    owner_org: traderOrg ? traderOrg.name : null
  };

  res.status(201).json({
    message: 'Certificate generated successfully',
    certificate: createdCert,
    created: true
  });
});

// List Certificates (Filtered by Role and Owner)
app.get('/api/certificates', async (req, res) => {
  const { role, id: actorId } = getActor(req);
  const { owner_id } = req.query;

  const instFilter = {};
  if (role === ROLES.TRADER) {
    instFilter.owner_id = actorId;
  } else if (owner_id) {
    instFilter.owner_id = owner_id;
  }

  const instruments = await Instrument.find(instFilter).lean();
  const instIds = instruments.map(i => i.id);
  const instMap = new Map(instruments.map(i => [i.id, i]));

  const certFilter = instIds.length > 0 ? { instrument_id: { $in: instIds } } : (role === ROLES.TRADER || owner_id ? { id: '__none__' } : {});
  const certificates = await Certificate.find(certFilter).sort({ created_at: -1 }).lean();

  const catIds = [...new Set(instruments.map(i => i.category_id).filter(Boolean))];
  const categories = await InstrumentCategory.find({ id: { $in: catIds } }).lean();
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  const ownerIds = [...new Set(instruments.map(i => i.owner_id).filter(Boolean))];
  const traders = await User.find({ id: { $in: ownerIds } }).lean();
  const traderMap = new Map(traders.map(u => [u.id, u]));

  const orgIds = [...new Set(traders.map(u => u.organization_id).filter(Boolean))];
  const orgs = await Organization.find({ id: { $in: orgIds } }).lean();
  const orgMap = new Map(orgs.map(o => [o.id, o.name]));

  const result = certificates.map(c => {
    const inst = instMap.get(c.instrument_id) || {};
    const trader = traderMap.get(inst.owner_id) || {};
    const org = trader.organization_id ? orgMap.get(trader.organization_id) : null;

    return {
      ...c,
      manufacturer: inst.manufacturer || null,
      model: inst.model || null,
      serial_number: inst.serial_number || null,
      max_capacity: inst.max_capacity || null,
      location: inst.location || null,
      owner_id: inst.owner_id || null,
      category_name: catMap.get(inst.category_id) || null,
      owner_name: trader.full_name || null,
      owner_org: org || null
    };
  });

  res.json(result);
});

// Get Single Certificate
app.get('/api/certificates/:id', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  const cert = await Certificate.findOne({
    $or: [{ id: req.params.id }, { certificate_no: req.params.id }]
  }).lean();

  if (!cert) return res.status(404).json({ error: 'Certificate not found' });

  const inst = await Instrument.findOne({ id: cert.instrument_id }).lean();
  const cat = inst ? await InstrumentCategory.findOne({ id: inst.category_id }).lean() : null;
  const trader = inst ? await User.findOne({ id: inst.owner_id }).lean() : null;
  const org = trader && trader.organization_id ? await Organization.findOne({ id: trader.organization_id }).lean() : null;
  const verif = await Verification.findOne({ id: cert.verification_id }).lean();
  const verifier = verif ? await User.findOne({ id: verif.verifier_id }).lean() : null;

  // Security check: Trader can only view their own certificate
  if (role === ROLES.TRADER && inst && inst.owner_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to view this certificate.' });
  }

  logAudit('Certificate', cert.id, 'CERTIFICATE_VIEWED', actorId, role, {
    certificate_no: cert.certificate_no
  });

  res.json({
    ...cert,
    manufacturer: inst ? inst.manufacturer : null,
    model: inst ? inst.model : null,
    serial_number: inst ? inst.serial_number : null,
    max_capacity: inst ? inst.max_capacity : null,
    min_capacity: inst ? inst.min_capacity : null,
    verification_scale_interval_e: inst ? inst.verification_scale_interval_e : null,
    location: inst ? inst.location : null,
    owner_id: inst ? inst.owner_id : null,
    category_name: cat ? cat.name : null,
    owner_name: trader ? trader.full_name : null,
    owner_org: org ? org.name : null,
    verification_remarks: verif ? verif.remarks : null,
    verification_date: verif ? verif.completed_at : null,
    verifier_name: verifier ? verifier.full_name : null
  });
});

// ==========================================
// 7. PUBLIC CERTIFICATE VERIFICATION (SLICE 4)
// ==========================================

// Public Unauthenticated Certificate Verification via QR / Public Token
app.get('/api/public/verify/:token', async (req, res) => {
  const token = req.params.token;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({
      status: 'INVALID',
      error: 'Malformed or missing certificate verification reference.'
    });
  }

  // Query certificate by public_token (guaranteed unique, non-guessable UUID)
  const cert = await Certificate.findOne({ public_token: token.trim() }).lean();

  if (!cert) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      error: 'Certificate record not found. The scanned verification reference does not correspond to any registered certificate in the official digital repository.'
    });
  }

  const inst = await Instrument.findOne({ id: cert.instrument_id }).lean();
  const cat = inst ? await InstrumentCategory.findOne({ id: inst.category_id }).lean() : null;
  const trader = inst ? await User.findOne({ id: inst.owner_id }).lean() : null;
  const torg = trader && trader.organization_id ? await Organization.findOne({ id: trader.organization_id }).lean() : null;

  // Calculate live statutory validity based on date
  const now = new Date();
  const validUntilDate = new Date(cert.valid_until);
  const isExpired = validUntilDate < now;
  const liveStatus = isExpired ? 'EXPIRED' : (cert.status === 'VALID' ? 'VALID' : cert.status);

  // Log public verification inquiry into audit trail
  try {
    logAudit('PublicVerification', cert.certificate_no, 'PUBLIC_QR_VERIFIED', 'PUBLIC_VISITOR', 'PUBLIC', {
      certificate_no: cert.certificate_no,
      status: liveStatus
    });
  } catch (err) {
    console.error('Audit logging failed for public verification:', err);
  }

  // Return strictly public, sanitized verification payload
  res.json({
    status: liveStatus,
    certificate_no: cert.certificate_no,
    public_token: cert.public_token,
    issue_date: cert.issue_date,
    valid_until: cert.valid_until,
    is_expired: isExpired,
    instrument: {
      category: cat ? cat.name : 'Weighing Instrument',
      manufacturer: inst ? inst.manufacturer : null,
      model: inst ? inst.model : null,
      serial_number: inst ? inst.serial_number : null,
      max_capacity: inst ? inst.max_capacity : null,
      verification_scale_interval_e: inst ? inst.verification_scale_interval_e : null
    },
    verification_authority: {
      officer: cert.issuing_officer,
      authority: cert.issuing_authority,
      jurisdiction: torg ? torg.jurisdiction : 'National Capital Territory of Delhi'
    },
    business: {
      enterprise_name: torg ? torg.name : 'Authorized Commercial Establishment'
    },
    verification_statement: 'Matched and authenticated against the official Department of Consumer Affairs Legal Metrology digital ledger.'
  });
});

// ==========================================
// 8. GOVERNANCE & STATS
// ==========================================

app.get('/api/audit-logs', async (req, res) => {
  const { role } = getActor(req);
  if (!hasPermission(role, 'VIEW_AUDIT_LOGS')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot view audit logs.` });
  }
  const logs = await AuditLog.find().sort({ created_at: -1 }).limit(50).lean();
  res.json(logs);
});

app.get('/api/stats', async (req, res) => {
  const totalInstruments = await Instrument.countDocuments();
  const pendingApplications = await Application.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } });
  const assignedApplications = await Application.countDocuments({ status: 'ASSIGNED' });
  const inProgressApplications = await Application.countDocuments({ status: 'IN_PROGRESS' });
  const completedVerifications = await Application.countDocuments({ status: { $in: ['VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'] } });

  res.json({
    totalInstruments,
    pendingApplications,
    assignedApplications,
    inProgressApplications,
    completedVerifications
  });
});

// ==========================================
// 9. PRODUCTION ERROR & LIFECYCLE HANDLING
// ==========================================

// 404 Handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Centralized production error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || (err.message && err.message.includes('CORS') ? 403 : 500);
  const safeMessage = (process.env.NODE_ENV === 'production' && status === 500)
    ? 'An unexpected internal server error occurred'
    : err.message || 'Internal server error';

  res.status(status).json({ error: safeMessage });
});

// Start Server listening on HOST and PORT
const server = app.listen(PORT, HOST, () => {
  console.log(`Legal Metrology Server listening on http://${HOST}:${PORT} [NODE_ENV=${process.env.NODE_ENV || 'development'}]`);
});

// Graceful Shutdown on SIGTERM / SIGINT
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await disconnectMongo();
      console.log('Database connection closed.');
    } catch (e) {
      console.error('Error closing database:', e.message);
    }
    process.exit(0);
  });

  // Force exit after 10 seconds if connections hang
  setTimeout(() => {
    console.error('Forced shutdown timeout reached.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
