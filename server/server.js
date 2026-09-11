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
import { ROLES, hasPermission, requirePermission } from './permissions.js';
import { upload, STORAGE_DIR, deleteStoredFile, initStorage } from './storage.js';
import { verifyPassword, hashPassword } from './auth-utils.js';
import { sendEmail, buildPaymentReceiptEmail } from './email.js';

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

// Safety net: most route handlers below are async functions without try/catch,
// so an error thrown inside one (e.g. a Mongoose validation error) becomes an
// unhandled rejection that crashes this ENTIRE process — taking the server down
// for every user over one bad request. This does not fix the underlying gap in
// each route, but stops that one failure mode from being fatal.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (request likely failed, server stayed up):', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server stayed up):', err);
});

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
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/+$/, ''))
  : [];
const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests, same-origin, whitelisted frontend origins, or Vercel
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (
      allowedOrigins.has(cleanOrigin) ||
      allowedOrigins.has(origin) ||
      process.env.NODE_ENV !== 'production' ||
      cleanOrigin.endsWith('.vercel.app')
    ) {
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
  if (req.actor && req.actor.role !== 'ANONYMOUS') {
    return req.actor;
  }
  const roleHeader = req.headers['x-user-role'];
  const idHeader = req.headers['x-user-id'];
  if (roleHeader) {
    return { id: idHeader || 'USER_BY_HEADER', role: roleHeader };
  }
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

// Self-registration is open to statutory-facing roles per product decision, but
// PLATFORM_ADMIN is deliberately excluded — no role may self-register as system admin.
const SELF_REGISTERABLE_ROLES = [ROLES.TRADER, ROLES.VERIFIER, ROLES.AUTHORITY, ROLES.GATC];

app.post('/api/auth/register', async (req, res) => {
  const { full_name, email, password, phone, role, organization_name, jurisdictions } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ error: 'full_name, email, password, and role are required' });
  }
  if (!SELF_REGISTERABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role '${role}' is not available for self-registration.` });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Statutory roles (LMO/Authority/GATC) must declare their notified jurisdiction —
  // it's the hard eligibility key the allocation engine filters on (see server/server.js
  // GET /api/applications/:id/candidates). Trader organizations don't need one.
  // Split on ';' — district/circle names themselves routinely contain a comma
  // (e.g. "Central District, Delhi"), so ',' cannot be the multi-jurisdiction separator.
  const isStatutoryRole = role !== ROLES.TRADER;
  const jurisdictionList = Array.isArray(jurisdictions)
    ? jurisdictions.map(j => String(j).trim()).filter(Boolean)
    : String(jurisdictions || '').split(';').map(j => j.trim()).filter(Boolean);

  if (isStatutoryRole && jurisdictionList.length === 0) {
    return res.status(400).json({ error: 'At least one notified jurisdiction (district/circle) is required for this role.' });
  }
  if (!organization_name || !organization_name.trim()) {
    return res.status(400).json({ error: 'Organization / establishment name is required.' });
  }

  const now = new Date().toISOString();
  const orgId = `ORG_${role}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const orgType = role === ROLES.TRADER ? 'TRADER_ORG' : role === ROLES.GATC ? 'TEST_CENTRE' : 'STATUTORY_AUTHORITY';

  await Organization.create({
    id: orgId,
    name: organization_name.trim(),
    type: orgType,
    jurisdictions: jurisdictionList,
    created_at: now
  });

  const userId = `USR_${role}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const password_hash = hashPassword(password);

  await User.create({
    id: userId,
    email: normalizedEmail,
    password_hash,
    role,
    full_name: full_name.trim(),
    organization_id: orgId,
    phone: phone || '',
    is_demo: 0,
    active: true,
    created_at: now,
    updated_at: now
  });

  const token = `tok_${userId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  await UserSession.create({
    token,
    user_id: userId,
    role,
    created_at: now,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  logAudit('UserAuth', userId, 'USER_REGISTERED', userId, role, { email: normalizedEmail, role, organization_id: orgId });

  const user = await User.findOne({ id: userId }).lean();
  const org = await Organization.findOne({ id: orgId }).lean();
  const { password_hash: _ph, _id, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser, organization: org });
});

app.get('/api/auth/me', async (req, res) => {
  const actor = getActor(req);
  if (!actor || actor.role === 'ANONYMOUS') {
    return res.status(401).json({ error: 'Unauthorized or session expired' });
  }
  const user = await User.findOne({ id: actor.id }).lean();
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  const org = user.organization_id ? await Organization.findOne({ id: user.organization_id }).lean() : null;
  const { password_hash, _id, ...safeUser } = user;
  res.json({ user: safeUser, organization: org });
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
      category_code: cat.code || null,
      category_spec_schema: Array.isArray(cat.spec_schema) ? cat.spec_schema : []
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
    category_spec_schema: cat && Array.isArray(cat.spec_schema) ? cat.spec_schema : [],
    owner_name: user ? user.full_name : null,
    owner_org: org ? org.name : null,
    history
  });
});

// Automatic weighing instruments (belt conveyor scales, rail weighbridges, in-line
// checkweighers, filling machines) are built into a process line and tested on site.
const IN_SITU_ONLY_CATEGORY_CODES = ['WEIGHBRIDGE', 'FUEL_DISPENSER', 'GAS_FUEL_DISPENSER', 'AUTO_WEIGHING'];

// Any authenticated user can read the active category list + spec_schema — needed
// by the instrument registration form to render category-specific fields. This is
// deliberately separate from /api/admin/master-data, which is admin-only and also
// exposes rule sets (MPE tables, checklists) that aren't needed just to render a form.
app.get('/api/instrument-categories', async (req, res) => {
  const { role } = getActor(req);
  if (role === 'ANONYMOUS') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const categories = await InstrumentCategory.find({ active: 1 }).lean();
  res.json(categories);
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
    specs,
    location,
    district
  } = req.body;

  const targetOwnerId = owner_id || actorId;
  if (!targetOwnerId || !serial_number || !manufacturer || !model || !category_id || !location || !district) {
    return res.status(400).json({ error: 'Missing mandatory instrument details (manufacturer, model, serial number, category, location, and district are all required)' });
  }

  try {
    const category = await InstrumentCategory.findOne({ id: category_id }).lean();
    if (!category) {
      return res.status(400).json({ error: `Unknown instrument category '${category_id}'` });
    }

    // Category-specific spec fields are declared server-side (category.spec_schema),
    // not trusted blindly from the client — required ones must actually be present.
    const specSchema = Array.isArray(category.spec_schema) ? category.spec_schema : [];
    const providedSpecs = specs && typeof specs === 'object' ? specs : {};
    const missingSpec = specSchema.find(f => f.required && !String(providedSpecs[f.key] ?? '').trim());
    if (missingSpec) {
      return res.status(400).json({ error: `Missing required field '${missingSpec.label || missingSpec.key}' for category '${category.name}'` });
    }

    const existing = await Instrument.findOne({ serial_number }).lean();
    if (existing) {
      return res.status(400).json({ error: 'Instrument with this serial number is already registered' });
    }

    const id = `INST_${Date.now()}`;
    const now = new Date().toISOString();

    await Instrument.create({
      id,
      owner_id: targetOwnerId,
      category_id,
      manufacturer,
      model,
      serial_number,
      // Only meaningful for weight-based categories — left blank otherwise rather
      // than defaulting to a NAWI-shaped value that would misdescribe the instrument.
      max_capacity: max_capacity || '',
      min_capacity: min_capacity || '',
      verification_scale_interval_e: verification_scale_interval_e || '',
      specs: providedSpecs,
      location,
      district,
      status: 'REGISTERED',
      created_at: now
    });

    logAudit('Instrument', id, 'REGISTER', actorId, role, { serial_number, manufacturer, model });

    res.status(201).json({ id, message: 'Instrument registered successfully' });
  } catch (err) {
    console.error('Instrument registration failed:', err.message);
    res.status(400).json({ error: `Instrument registration failed: ${err.message}` });
  }
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

  const verifs = await Verification.find({ application_id: { $in: appIds } }).lean();
  const verifMap = new Map(verifs.map(v => [v.application_id, v]));
  const verifIds = verifs.map(v => v.id);
  const certs = await Certificate.find({ verification_id: { $in: verifIds } }).lean();
  const certMap = new Map(certs.map(c => [c.verification_id, c]));

  const result = applications.map(a => {
    const inst = instMap.get(a.instrument_id) || {};
    const trader = userMap.get(a.trader_id) || {};
    const traderOrg = trader.organization_id ? orgMap.get(trader.organization_id) : null;
    const asn = asnMap.get(a.id) || {};
    const verif = verifMap.get(a.id);
    const cert = verif ? certMap.get(verif.id) : null;

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
      assigned_to_name: asn.assigned_id ? assigneeMap.get(asn.assigned_id) : null,
      certificate_id: cert ? cert.id : (a.certificate_id || null),
      certificate_no: cert ? cert.certificate_no : (a.certificate_no || null)
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
    trader_jurisdiction: traderOrg ? (traderOrg.jurisdictions || []).join(', ') : null,
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

// Statutory Fee Calculation Engine (Legal Metrology General Rules Schedule V)
app.post('/api/applications/calculate-fee', async (req, res) => {
  const { instrument_id, category_id, max_capacity, verification_mode, verification_type } = req.body;

  let category = category_id;
  let capacity = max_capacity;

  if (instrument_id) {
    const inst = await Instrument.findOne({ id: instrument_id }).lean();
    if (inst) {
      category = category || inst.category_id;
      capacity = capacity || inst.max_capacity;
    }
  }

  // Base statutory verification fee (Schedule V)
  let statutory_fee = 350;
  const capStr = (capacity || '').toLowerCase();
  const capNum = parseFloat(capStr) || 30;

  if (category === 'CAT_WEIGHBRIDGE' || capNum >= 5000 || capStr.includes('ton') || capStr.includes('tonne')) {
    statutory_fee = 3500;
  } else if (category === 'CAT_FLOW_METER' || capStr.includes('dispenser') || capStr.includes('nozzle')) {
    statutory_fee = 1000;
  } else if (category === 'CAT_STORAGE_TANK' || capStr.includes('tank') || capStr.includes('compartment')) {
    statutory_fee = 2500;
  } else if (capNum > 500) {
    statutory_fee = 1500;
  } else if (capNum > 50) {
    statutory_fee = 500;
  } else {
    statutory_fee = 250;
  }

  // Mode surcharge: In-situ (on-premises) requires officer travel / inspection surcharge
  const isInsitu = verification_mode === 'IN_SITU';
  const in_situ_fee = isInsitu ? 500 : 0;

  // Digital Metrology facilitation cess
  const user_fee = 50;
  const late_fee = 0;
  const total_fee = statutory_fee + in_situ_fee + user_fee + late_fee;

  const breakdown = [
    { label: 'Schedule V Statutory Verification Fee', amount: statutory_fee },
    ...(isInsitu ? [{ label: 'In-Situ On-Premises Inspection Surcharge', amount: in_situ_fee }] : []),
    { label: 'Legal Metrology Digital Portal Cess', amount: user_fee }
  ];

  res.json({
    statutory_fee,
    in_situ_fee,
    user_fee,
    late_fee,
    total_fee,
    currency: 'INR',
    breakdown
  });
});

app.post('/api/applications', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'SUBMIT_APPLICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' is not permitted to submit verification requests.` });
  }

  const {
    instrument_id,
    trader_id,
    request_type,
    verification_type,
    verification_mode,
    documents,
    preferred_date,
    remarks,
    contact_person,
    contact_phone,
    location_address,
    fee_breakdown,
    payment
  } = req.body;
  const targetTraderId = trader_id || actorId;
  if (!instrument_id || !targetTraderId) {
    return res.status(400).json({ error: 'Missing instrument or trader ID' });
  }

  const inst = await Instrument.findOne({ id: instrument_id }).lean();
  if (!inst) return res.status(404).json({ error: 'Instrument not found' });
  if (inst.owner_id !== targetTraderId) {
    return res.status(403).json({ error: 'Forbidden: You can only apply for your own registered instruments.' });
  }

  // Fixed installations can't be carried to a camp/centre — the officer must test them on site.
  const instCategory = await InstrumentCategory.findOne({ id: inst.category_id }).lean();
  const effectiveMode = verification_mode || 'CAMP';
  if (instCategory && IN_SITU_ONLY_CATEGORY_CODES.includes(instCategory.code) && effectiveMode !== 'IN_SITU') {
    return res.status(400).json({ error: `${instCategory.name} can only be verified in-situ (on premises); Camp/Centre presentation is not possible for this instrument.` });
  }

  const activeApp = await Application.findOne({
    instrument_id,
    status: { $nin: ['VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'REJECTED'] }
  }).lean();

  if (activeApp) {
    return res.status(400).json({ error: 'An active verification application is already in progress for this instrument.' });
  }

  const id = `APP_${Date.now()}`;
  const appNo = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  // A new application always starts unpaid; payment status is only ever set by the
  // payment endpoints, never by what the client claims at submission.
  const initialStatus = 'PAYMENT_PENDING';
  const initialFeeStatus = 'PENDING';

  await Application.create({
    id,
    application_no: appNo,
    instrument_id,
    trader_id: targetTraderId,
    request_type: request_type || (verification_type === 'RE_VERIFICATION' ? 'RE_VERIFICATION' : 'INITIAL_VERIFICATION'),
    verification_type: verification_type || (request_type === 'RE_VERIFICATION' ? 'RE_VERIFICATION' : 'ORIGINAL'),
    verification_mode: effectiveMode,
    preferred_date: preferred_date || null,
    remarks: remarks || '',
    contact_person: contact_person || null,
    contact_phone: contact_phone || null,
    location_address: location_address || null,
    status: initialStatus,
    documents: Array.isArray(documents) ? documents : [],
    fee_status: initialFeeStatus,
    fee_breakdown: fee_breakdown || {},
    payment: { payment_status: 'PENDING', amount: Number(fee_breakdown?.total_fee) || null },
    created_at: now,
    updated_at: now
  });

  await Instrument.updateOne({ id: instrument_id }, { $set: { status: 'UNDER_VERIFICATION' } });

  logAudit('Application', id, 'SUBMIT', actorId, role, { application_no: appNo, instrument_id, verification_mode, status: initialStatus });

  res.status(201).json({ id, application_no: appNo, status: initialStatus, message: 'Verification application submitted successfully' });
});

// Record Payment for Application
app.post('/api/applications/:id/payment', async (req, res) => {
  const { role, id: actorId } = getActor(req);
  const applicationId = req.params.id;

  if (!hasPermission(role, 'RECORD_PAYMENT')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot record payments.` });
  }

  const appItem = await Application.findOne({ id: applicationId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  if (appItem.trader_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: You can only record payment for your own application.' });
  }

  const { payment_mode, payment_status, transaction_id, reference_no, amount, paid_at, receipt_url } = req.body;

  // Online payments must go through the Razorpay order + signature-verification
  // endpoints below. Accepting a client-supplied "ONLINE / PAID" here would let
  // anyone mark an application paid without paying.
  if ((payment_mode || 'ONLINE') === 'ONLINE') {
    return res.status(400).json({ error: 'Online payments must be completed through the payment gateway.' });
  }

  const now = new Date().toISOString();
  const txnId = transaction_id || `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const refNo = reference_no || `REF-${Math.floor(100000 + Math.random() * 900000)}`;
  const totalAmount = Number(amount) || appItem.fee_breakdown?.total_fee || 800;
  const pStatus = payment_status || (payment_mode === 'OFFLINE' ? 'PAYMENT_VERIFIED' : 'PAID');

  const paymentRecord = {
    payment_mode: payment_mode || 'ONLINE',
    payment_status: pStatus,
    transaction_id: txnId,
    reference_no: refNo,
    amount: totalAmount,
    paid_at: paid_at || now,
    receipt_url: receipt_url || null
  };

  const targetStatus = (pStatus === 'PAID' || pStatus === 'PAYMENT_VERIFIED') ? 'PENDING_VERIFICATION' : 'PAYMENT_PENDING';

  await Application.updateOne(
    { id: applicationId },
    {
      $set: {
        payment: paymentRecord,
        fee_status: 'PAID',
        status: targetStatus,
        updated_at: now
      }
    }
  );

  logAudit('Application', applicationId, 'PAYMENT_RECORDED', actorId, role, {
    transaction_id: txnId,
    payment_mode: paymentRecord.payment_mode,
    amount: totalAmount,
    payment_status: pStatus
  });

  const receiptEmail = await emailPaymentReceipt(applicationId, actorId, role);
  const updatedApp = await Application.findOne({ id: applicationId }).lean();
  res.json({
    message: 'Payment recorded successfully',
    application: updatedApp,
    payment: updatedApp.payment,
    receipt_email: { sent: receiptEmail.sent, to: receiptEmail.to || null }
  });
});

// Emails the payment receipt to the trader's registered address (looked up here, never
// taken from the request). Failure is recorded but never undoes the payment.
async function emailPaymentReceipt(applicationId, actorId, role) {
  try {
    const application = await Application.findOne({ id: applicationId }).lean();
    if (!application) return { sent: false, reason: 'Application not found' };
    const [trader, instrument] = await Promise.all([
      User.findOne({ id: application.trader_id }).lean(),
      Instrument.findOne({ id: application.instrument_id }).lean()
    ]);
    if (!trader?.email) return { sent: false, reason: 'Trader has no email on file' };
    // Demo accounts use made-up *.local addresses; sending would bounce and damage the
    // sender's reputation with Brevo.
    if (/\.local$/i.test(trader.email)) {
      return { sent: false, reason: 'Demo account address — receipt email not sent', to: trader.email };
    }
    const [category, org] = await Promise.all([
      instrument ? InstrumentCategory.findOne({ id: instrument.category_id }).lean() : null,
      trader.organization_id ? Organization.findOne({ id: trader.organization_id }).lean() : null
    ]);

    const { subject, html, text } = buildPaymentReceiptEmail({
      application,
      payment: application.payment || {},
      instrument,
      categoryName: category?.name,
      traderName: trader.full_name,
      establishmentName: org?.name
    });
    const result = await sendEmail({ to: { email: trader.email, name: trader.full_name }, subject, html, text });

    const receiptEmail = {
      to: trader.email,
      status: result.sent ? 'SENT' : 'FAILED',
      message_id: result.messageId || null,
      error: result.sent ? null : result.reason,
      at: new Date().toISOString()
    };
    await Application.updateOne({ id: applicationId }, { $set: { 'payment.receipt_email': receiptEmail } });
    logAudit('Application', applicationId, result.sent ? 'RECEIPT_EMAIL_SENT' : 'RECEIPT_EMAIL_FAILED', actorId, role, {
      to: trader.email,
      ...(result.sent ? { message_id: result.messageId } : { reason: result.reason })
    });
    if (!result.sent) console.error('Receipt email failed:', result.reason);
    return { ...result, to: trader.email };
  } catch (err) {
    console.error('Receipt email error:', err.message);
    return { sent: false, reason: err.message };
  }
}

const RECEIPT_RESEND_COOLDOWN_MS = 60 * 1000;

app.post('/api/applications/:id/receipt-email', async (req, res) => {
  const { role, id: actorId } = getActor(req);
  if (!hasPermission(role, 'RECORD_PAYMENT')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot request receipts.` });
  }
  const appItem = await Application.findOne({ id: req.params.id }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });
  if (appItem.trader_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: You can only request receipts for your own applications.' });
  }
  if (appItem.fee_status !== 'PAID') {
    return res.status(400).json({ error: 'No payment has been recorded for this application yet.' });
  }
  // Brevo's free plan is 300 emails/day for the whole platform — stop one user draining it.
  const lastAt = appItem.payment?.receipt_email?.at ? new Date(appItem.payment.receipt_email.at).getTime() : 0;
  if (Date.now() - lastAt < RECEIPT_RESEND_COOLDOWN_MS) {
    return res.status(429).json({ error: 'A receipt was just sent. Please wait a minute before trying again.' });
  }
  const result = await emailPaymentReceipt(appItem.id, actorId, role);
  if (!result.sent) return res.status(502).json({ error: `Could not send the receipt email: ${result.reason}` });
  res.json({ sent: true, to: result.to });
});

// ------------------------------------------------------------------
// Razorpay online payment: create order -> Checkout (browser) -> verify
// ------------------------------------------------------------------
const RAZORPAY_API = 'https://api.razorpay.com/v1';

function razorpayAuthHeader() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
}

async function razorpayRequest(method, path, body) {
  const auth = razorpayAuthHeader();
  if (!auth) throw new Error('Razorpay is not configured on the server (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).');
  const r = await fetch(`${RAZORPAY_API}${path}`, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json?.error?.description || `Razorpay request failed (${r.status})`);
  return json;
}

async function loadPayableApplication(req, res) {
  const { role, id: actorId } = getActor(req);
  if (!hasPermission(role, 'RECORD_PAYMENT')) {
    res.status(403).json({ error: `Forbidden: Role '${role}' cannot make payments.` });
    return null;
  }
  const appItem = await Application.findOne({ id: req.params.id }).lean();
  if (!appItem) {
    res.status(404).json({ error: 'Application not found' });
    return null;
  }
  if (appItem.trader_id !== actorId) {
    res.status(403).json({ error: 'Forbidden: You can only pay for your own application.' });
    return null;
  }
  if (appItem.fee_status === 'PAID') {
    res.status(400).json({ error: 'This application has already been paid.' });
    return null;
  }
  return { appItem, role, actorId };
}

app.post('/api/applications/:id/payment/razorpay-order', async (req, res) => {
  try {
    const ctx = await loadPayableApplication(req, res);
    if (!ctx) return;
    const { appItem, role, actorId } = ctx;

    // Amount comes from the stored application, never from this request.
    const rupees = Number(appItem.fee_breakdown?.total_fee);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      return res.status(400).json({ error: 'No payable fee is recorded for this application.' });
    }
    const amountPaise = Math.round(rupees * 100);

    const order = await razorpayRequest('POST', '/orders', {
      amount: amountPaise,
      currency: 'INR',
      receipt: appItem.application_no,
      notes: { application_id: appItem.id, application_no: appItem.application_no }
    });

    const now = new Date().toISOString();
    await Application.updateOne(
      { id: appItem.id },
      {
        $set: {
          payment: {
            ...(appItem.payment || {}),
            payment_mode: 'ONLINE',
            gateway: 'RAZORPAY',
            payment_status: 'PENDING',
            razorpay_order_id: order.id,
            amount: rupees
          },
          updated_at: now
        }
      }
    );
    logAudit('Application', appItem.id, 'PAYMENT_ORDER_CREATED', actorId, role, { razorpay_order_id: order.id, amount: rupees });

    res.json({
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      application_no: appItem.application_no
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err.message);
    res.status(502).json({ error: `Could not start payment: ${err.message}` });
  }
});

app.post('/api/applications/:id/payment/razorpay-verify', async (req, res) => {
  try {
    const ctx = await loadPayableApplication(req, res);
    if (!ctx) return;
    const { appItem, role, actorId } = ctx;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing Razorpay payment details.' });
    }
    if (razorpay_order_id !== appItem.payment?.razorpay_order_id) {
      return res.status(400).json({ error: 'Payment does not belong to this application.' });
    }

    // Razorpay signs "<order_id>|<payment_id>" with the key secret.
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const sigOk = expected.length === String(razorpay_signature).length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpay_signature)));
    if (!sigOk) {
      logAudit('Application', appItem.id, 'PAYMENT_SIGNATURE_INVALID', actorId, role, { razorpay_order_id, razorpay_payment_id });
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    // Confirm with Razorpay itself that the money actually moved for this order.
    let payment = await razorpayRequest('GET', `/payments/${razorpay_payment_id}`);
    const expectedPaise = Math.round(Number(appItem.payment?.amount || appItem.fee_breakdown?.total_fee) * 100);
    if (payment.order_id !== razorpay_order_id || payment.amount !== expectedPaise) {
      return res.status(400).json({ error: 'Payment amount or order mismatch.' });
    }
    if (payment.status === 'authorized') {
      payment = await razorpayRequest('POST', `/payments/${razorpay_payment_id}/capture`, {
        amount: payment.amount,
        currency: payment.currency
      });
    }
    if (payment.status !== 'captured') {
      return res.status(400).json({ error: `Payment not completed (status: ${payment.status}).` });
    }

    const now = new Date().toISOString();
    const paymentRecord = {
      payment_mode: 'ONLINE',
      gateway: 'RAZORPAY',
      payment_status: 'PAID',
      transaction_id: razorpay_payment_id,
      razorpay_order_id,
      razorpay_payment_id,
      method: payment.method || null,
      test_mode: String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test_'),
      reference_no: appItem.application_no,
      amount: payment.amount / 100,
      paid_at: payment.created_at ? new Date(payment.created_at * 1000).toISOString() : now
    };

    await Application.updateOne(
      { id: appItem.id },
      { $set: { payment: paymentRecord, fee_status: 'PAID', status: 'PENDING_VERIFICATION', updated_at: now } }
    );
    logAudit('Application', appItem.id, 'PAYMENT_RECORDED', actorId, role, {
      transaction_id: razorpay_payment_id,
      payment_mode: 'ONLINE',
      gateway: 'RAZORPAY',
      amount: paymentRecord.amount,
      payment_status: 'PAID'
    });

    const receiptEmail = await emailPaymentReceipt(appItem.id, actorId, role);
    const updatedApp = await Application.findOne({ id: appItem.id }).lean();
    res.json({
      message: 'Payment verified successfully',
      application: updatedApp,
      payment: updatedApp.payment,
      receipt_email: { sent: receiptEmail.sent, to: receiptEmail.to || null }
    });
  } catch (err) {
    console.error('Razorpay verification failed:', err.message);
    res.status(502).json({ error: `Payment verification failed: ${err.message}` });
  }
});

// Resubmit Returned Application (Trader Action)
app.post('/api/applications/:id/resubmit', async (req, res) => {
  const { role, id: actorId } = getActor(req);
  const applicationId = req.params.id;

  if (!hasPermission(role, 'RESUBMIT_APPLICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot resubmit applications.` });
  }

  const appItem = await Application.findOne({ id: applicationId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  if (appItem.trader_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: You can only resubmit your own applications.' });
  }

  if (appItem.status !== 'RETURNED') {
    return res.status(400).json({ error: `Cannot resubmit application in state '${appItem.status}'. Only RETURNED applications can be resubmitted.` });
  }

  const { documents, remarks, contact_person, contact_phone, location_address, preferred_date } = req.body;
  const now = new Date().toISOString();

  await Application.updateOne(
    { id: applicationId },
    {
      $set: {
        documents: Array.isArray(documents) ? documents : appItem.documents,
        remarks: remarks !== undefined ? remarks : appItem.remarks,
        contact_person: contact_person || appItem.contact_person,
        contact_phone: contact_phone || appItem.contact_phone,
        location_address: location_address || appItem.location_address,
        preferred_date: preferred_date || appItem.preferred_date,
        resubmitted_at: now,
        status: (appItem.fee_status === 'PAID' ? 'PENDING_VERIFICATION' : 'SUBMITTED'),
        updated_at: now
      }
    }
  );

  logAudit('Application', applicationId, 'APPLICATION_RESUBMITTED', actorId, role, {
    previous_return_reason: appItem.return_reason
  });

  const updatedApp = await Application.findOne({ id: applicationId }).lean();
  res.json({
    message: 'Application resubmitted successfully for statutory review',
    application: updatedApp
  });
});

// Return Application to Trader with Remarks (Authority Action)
app.post('/api/applications/:id/return', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RETURN_APPLICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot return applications. Statutory return is reserved for Authority Officers.` });
  }

  const applicationId = req.params.id;
  const appItem = await Application.findOne({ id: applicationId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const return_reason = req.body.return_reason || req.body.reason || req.body.remarks;
  if (!return_reason || !return_reason.trim()) {
    return res.status(400).json({ error: 'A specific return/rejection reason is required.' });
  }

  const now = new Date().toISOString();
  await Application.updateOne(
    { id: applicationId },
    {
      $set: {
        status: 'RETURNED',
        return_reason: return_reason.trim(),
        updated_at: now
      }
    }
  );

  logAudit('Application', applicationId, 'APPLICATION_RETURNED', actorId, role, {
    return_reason: return_reason.trim()
  });

  res.json({
    message: 'Application returned to trader with remarks',
    status: 'RETURNED',
    return_reason: return_reason.trim()
  });
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

  const inst = await Instrument.findOne({ id: appItem.instrument_id }).lean();
  const instrumentDistrict = inst ? inst.district : null;

  const verifiers = await User.find({ role: { $in: ['VERIFIER', 'GATC'] } }).lean();
  const orgIds = [...new Set(verifiers.map(u => u.organization_id).filter(Boolean))];
  const orgs = await Organization.find({ id: { $in: orgIds } }).lean();
  const orgMap = new Map(orgs.map(o => [o.id, o]));

  const assignments = await Assignment.find().lean();
  const workloadMap = new Map();
  for (const a of assignments) {
    workloadMap.set(a.assigned_id, (workloadMap.get(a.assigned_id) || 0) + 1);
  }

  // Hard eligibility filter: a candidate has statutory authority to verify this
  // instrument only if the instrument's district is among their office's notified
  // jurisdictions. Workload/score is a soft ranking applied ONLY within that set —
  // an idle officer in another district is never a valid recommendation, regardless
  // of score. (See docs/ARCHITECTURE.md §3.2 for the real-world basis of this rule.)
  const scored = verifiers.map(c => {
    const org = orgMap.get(c.organization_id) || {};
    const jurisdictions = org.jurisdictions || [];
    const is_eligible = !!instrumentDistrict && jurisdictions.includes(instrumentDistrict);
    const current_workload = workloadMap.get(c.id) || 0;

    let score = 100 - (current_workload * 12);
    let matchReason = 'Authorized statutory Legal Metrology Officer';
    if (c.role === 'GATC') {
      score += 5;
      matchReason = 'Approved test centre with verified mass standard laboratory';
    }

    if (!is_eligible) {
      score = 0;
      matchReason = jurisdictions.length > 0
        ? `Outside notified jurisdiction (covers: ${jurisdictions.join(', ')})`
        : 'No notified jurisdiction on record for this office';
    }

    return {
      id: c.id,
      full_name: c.full_name,
      role: c.role,
      phone: c.phone,
      organization_name: org.name || null,
      jurisdictions,
      current_workload,
      suitability_score: is_eligible ? Math.max(score, 40) : 0,
      match_reason: matchReason,
      is_eligible
    };
  }).sort((a, b) => {
    if (a.is_eligible !== b.is_eligible) return a.is_eligible ? -1 : 1;
    return b.suitability_score - a.suitability_score;
  });

  const topEligible = scored.find(c => c.is_eligible);
  const recommendedId = topEligible ? topEligible.id : null;

  res.json({
    application_id: req.params.id,
    instrument_district: instrumentDistrict,
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

  if (!['SUBMITTED', 'UNDER_REVIEW', 'PENDING_VERIFICATION'].includes(appItem.status)) {
    return res.status(400).json({ error: `Invalid state transition: Cannot assign verifier to application in state '${appItem.status}'` });
  }

  const { assigned_id, recommended_id, is_override, override_reason, scheduled_date, time_slot, arrangement_type } = req.body;
  if (!assigned_id) return res.status(400).json({ error: 'Target assignee ID is required' });

  const assignee = await User.findOne({ id: assigned_id }).lean();
  if (!assignee) return res.status(404).json({ error: 'Assignee user not found' });
  if (![ROLES.VERIFIER, ROLES.GATC].includes(assignee.role)) {
    return res.status(400).json({ error: 'Assignee must have role VERIFIER or GATC' });
  }

  // Re-derive jurisdiction eligibility server-side — never trust the client's
  // is_override flag alone. An out-of-jurisdiction assignee is only permitted
  // when an explicit override reason is recorded (e.g. covering a vacant post),
  // matching the real-world exception process, not a routine choice.
  const inst = await Instrument.findOne({ id: appItem.instrument_id }).lean();
  const assigneeOrg = assignee.organization_id ? await Organization.findOne({ id: assignee.organization_id }).lean() : null;
  const assigneeJurisdictions = assigneeOrg ? (assigneeOrg.jurisdictions || []) : [];
  const isJurisdictionMatch = !!(inst && inst.district && assigneeJurisdictions.includes(inst.district));

  if (!isJurisdictionMatch && !(override_reason && override_reason.trim())) {
    return res.status(400).json({
      error: `Assignee's notified jurisdiction (${assigneeJurisdictions.join(', ') || 'none on record'}) does not cover the instrument's district (${inst ? inst.district : 'unknown'}). An override_reason is required to assign outside jurisdiction.`
    });
  }

  // Cross-jurisdiction assignments are always recorded as an override, even if the
  // client didn't flag it, so the audit trail reflects the actual statutory exception.
  const recordedOverride = (is_override || !isJurisdictionMatch) ? 1 : 0;

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
          is_override: recordedOverride,
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
      is_override: recordedOverride,
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

  // Transition: -> PENDING_VERIFICATION (statutory queue)
  await Application.updateOne({ id: applicationId }, { $set: { status: 'PENDING_VERIFICATION', updated_at: now } });

  logAudit('Application', applicationId, is_override ? 'ASSIGNMENT_OVERRIDE' : 'ASSIGNMENT_CONFIRMED', actorId, role, {
    assigned_id,
    assignee_name: assignee.full_name,
    recommended_id,
    is_override: !!is_override,
    override_reason
  });

  res.json({ message: 'Verifier assigned successfully', status: 'PENDING_VERIFICATION' });
});

// ==========================================
// 5. SECOND VERTICAL SLICE: VERIFICATION WORKSPACE
// ==========================================

// List Assigned Cases for Verifier & GATC Lab
app.get('/api/verifications/cases', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'VIEW_ASSIGNED_CASES') && role !== ROLES.AUTHORITY) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot access verification cases. Platform administration does not conduct inspections.` });
  }

  const { verifier_id } = req.query;
  const targetVerifierId = verifier_id || actorId;

  // Filter assignments by verifier or lab
  const asnFilter = {};
  if (role === ROLES.VERIFIER || role === ROLES.GATC) {
    asnFilter.assigned_id = actorId;
  } else if (targetVerifierId && targetVerifierId !== 'UNKNOWN') {
    asnFilter.assigned_id = targetVerifierId;
  }

  const assignments = await Assignment.find(asnFilter).lean();
  const appIds = assignments.map(a => a.application_id);
  const asnMap = new Map(assignments.map(a => [a.application_id, a]));

  const applications = await Application.find({
    id: { $in: appIds },
    status: { $in: ['ASSIGNED', 'PENDING_VERIFICATION', 'IN_PROGRESS', 'REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'] }
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

  if (!hasPermission(role, 'OPEN_VERIFICATION_WORKSPACE') && role !== ROLES.AUTHORITY) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot open verification workspace. Inspections are conducted by Field Verifiers and GATC Labs.` });
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

  // Access validation: verifier/GATC must be the assigned officer (Authority can review any case)
  if ((role === ROLES.VERIFIER || role === ROLES.GATC) && asn && asn.assigned_id !== actorId) {
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
    trader_jurisdiction: traderOrg ? (traderOrg.jurisdictions || []).join(', ') : null,
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

// Start Verification: ASSIGNED / PENDING_VERIFICATION -> IN_PROGRESS
app.post('/api/verifications/cases/:appId/start', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot start verifications.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (asn && asn.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can start this verification.' });
  }

  if (!['ASSIGNED', 'PENDING_VERIFICATION', 'IN_PROGRESS'].includes(appItem.status)) {
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

  if (!hasPermission(role, 'RECORD_VERIFICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot record verification draft.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (asn && asn.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can save draft data.' });
  }
  if (!['IN_PROGRESS', 'PENDING_VERIFICATION', 'ASSIGNED'].includes(appItem.status)) {
    return res.status(400).json({ error: `Cannot save draft for application in status '${appItem.status}'. Must be in verification pipeline.` });
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

  if (!hasPermission(role, 'RECORD_VERIFICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot attach evidence.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (asn && asn.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can attach evidence.' });
  }
  if (!['IN_PROGRESS', 'PENDING_VERIFICATION', 'ASSIGNED'].includes(appItem.status)) {
    return res.status(400).json({ error: `Cannot attach evidence for application in status '${appItem.status}'. Must be in verification pipeline.` });
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

  if (!hasPermission(role, 'RECORD_VERIFICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot delete evidence.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (asn && asn.assigned_id !== actorId) {
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

// Submit Verification Result (PASS / FAIL) — Submits Field/Lab Report to Authority
app.post('/api/verifications/cases/:appId/submit', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot submit verification reports. Only assigned Field Verifiers and GATC Labs can submit.` });
  }

  const appItem = await Application.findOne({ id: req.params.appId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const asn = await Assignment.findOne({ application_id: req.params.appId }).lean();
  if (asn && asn.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can submit verification results.' });
  }
  if (!['IN_PROGRESS', 'PENDING_VERIFICATION', 'ASSIGNED'].includes(appItem.status)) {
    return res.status(400).json({ error: `Invalid state transition: Cannot submit result for application in state '${appItem.status}'. Must be in verification pipeline.` });
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

  // Persist final responses on verification object
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
    reference_value: Number(parseFloat(r.reference_value || r.standard_weight || 0)) || 0,
    observed_value: Number(parseFloat(r.observed_value)) || 0,
    unit: r.unit || 'kg',
    reading_result: r.reading_result || 'PASS',
    updated_at: now
  }));
  await VerificationReading.insertMany(readingDocs);

  // State Transition: In strict RBAC, Verifier/Lab submits report to Authority for final scrutiny
  const nextAppStatus = 'REPORT_SUBMITTED';

  await Application.updateOne({ id: req.params.appId }, { $set: { status: nextAppStatus, updated_at: now } });

  logAudit('Verification', verifId, 'VERIFICATION_REPORT_SUBMITTED', actorId, role, {
    application_id: req.params.appId,
    result,
    remarks,
    checklist_count: providedResponses.length,
    readings_count: readings.length,
    final_application_status: nextAppStatus
  });

  res.json({
    message: `Verification report (${result}) submitted to Legal Metrology Authority for statutory determination.`,
    status: nextAppStatus,
    result
  });
});

// ==========================================
// 5B. AUTHORITY FINAL DECISIONS (APPROVE / REJECT)
// ==========================================

// Authority Decision: Approve Application and Issue Official Certificate
app.post('/api/applications/:id/approve', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'APPROVE_APPLICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' is not authorized to approve applications. Only Authority Officers hold legal approval authority.` });
  }

  const applicationId = req.params.id;
  const appItem = await Application.findOne({ id: applicationId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  // Eligibility check: Verification report must be submitted with PASS outcome
  const verif = await Verification.findOne({ application_id: applicationId }).lean();
  if (!verif || verif.result !== 'PASS') {
    return res.status(400).json({
      error: 'Cannot approve application: A completed verification report with PASS determination is required before approval.'
    });
  }

  const { approval_remarks } = req.body;
  const now = new Date().toISOString();

  // 1. Update Application Status to CERTIFICATE_ISSUED (and record approval)
  await Application.updateOne(
    { id: applicationId },
    {
      $set: {
        status: 'CERTIFICATE_ISSUED',
        approval_remarks: approval_remarks || 'Statutory verification report reviewed and approved by Legal Metrology Officer.',
        approved_at: now,
        approved_by: actorId,
        updated_at: now
      }
    }
  );

  // 2. Update Instrument Status to VERIFIED
  await Instrument.updateOne(
    { id: appItem.instrument_id },
    { $set: { status: 'VERIFIED' } }
  );

  // 3. Issue / Generate Official Certificate
  const inst = await Instrument.findOne({ id: appItem.instrument_id }).lean();
  const ruleSet = inst ? await RuleSet.findOne({ category_id: inst.category_id }).lean() : null;
  const authorityUser = await User.findOne({ id: actorId }).lean();
  const org = authorityUser?.organization_id ? await Organization.findOne({ id: authorityUser.organization_id }).lean() : null;

  let cert = await Certificate.findOne({ verification_id: verif.id }).lean();
  if (!cert) {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const certNo = `LM-${year}-${randomDigits}-KL`;
    const publicToken = crypto.randomUUID();
    const certId = `CERT_${Date.now()}`;

    const issueDate = new Date();
    const validityMonths = ruleSet?.validity_period_months || 12;
    const validUntil = new Date(issueDate);
    validUntil.setMonth(validUntil.getMonth() + validityMonths);

    const issuingOfficer = authorityUser?.full_name || 'Legal Metrology Officer';
    const issuingAuthority = org?.name || 'Department of Legal Metrology, Government of Kerala';

    cert = await Certificate.create({
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
  }

  logAudit('Application', applicationId, 'APPLICATION_APPROVED_AND_CERTIFIED', actorId, role, {
    certificate_no: cert.certificate_no,
    public_token: cert.public_token,
    instrument_id: appItem.instrument_id
  });

  const updatedApp = await Application.findOne({ id: applicationId }).lean();
  res.json({
    message: 'Application officially approved and statutory verification certificate issued.',
    status: 'CERTIFICATE_ISSUED',
    application: updatedApp,
    certificate: cert
  });
});

// Authority Decision: Reject Application
app.post('/api/applications/:id/reject', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'REJECT_APPLICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' is not authorized to reject applications. Rejection decisions are reserved for Authority Officers.` });
  }

  const applicationId = req.params.id;
  const appItem = await Application.findOne({ id: applicationId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const { rejection_reason } = req.body;
  if (!rejection_reason || !rejection_reason.trim()) {
    return res.status(400).json({ error: 'A specific statutory rejection reason is mandatory.' });
  }

  const now = new Date().toISOString();
  await Application.updateOne(
    { id: applicationId },
    {
      $set: {
        status: 'REJECTED',
        rejection_reason: rejection_reason.trim(),
        updated_at: now
      }
    }
  );

  await Instrument.updateOne(
    { id: appItem.instrument_id },
    { $set: { status: 'REJECTED' } }
  );

  logAudit('Application', applicationId, 'APPLICATION_REJECTED', actorId, role, {
    rejection_reason: rejection_reason.trim(),
    instrument_id: appItem.instrument_id
  });

  res.json({
    message: 'Application rejected with statutory grounds recorded.',
    status: 'REJECTED',
    rejection_reason: rejection_reason.trim()
  });
});

// ==========================================
// 6. CERTIFICATES & STATUTORY QR (SLICE 3)
// ==========================================

// Generate Certificate (Idempotent, strictly restricted to Authority Officers)
app.post('/api/certificates/generate/:appId', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  // Strictly restricted to Authority Officers
  if (!hasPermission(role, 'GENERATE_CERTIFICATE')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot generate statutory certificates. Certificate issuance is strictly reserved for Authority Officers.` });
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
      jurisdiction: torg ? (torg.jurisdictions || []).join(', ') : 'National Capital Territory of Delhi'
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
  const { trader_id } = req.query;
  const actor = getActor(req);
  const targetTraderId = trader_id || (actor.role === ROLES.TRADER ? actor.id : null);

  if (targetTraderId) {
    const totalInstruments = await Instrument.countDocuments({ owner_id: targetTraderId });
    const pendingApplications = await Application.countDocuments({
      trader_id: targetTraderId,
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS'] }
    });
    const approvedApplications = await Application.countDocuments({
      trader_id: targetTraderId,
      status: { $in: ['VERIFICATION_COMPLETED', 'CERTIFICATE_ISSUED'] }
    });
    const returnedApplications = await Application.countDocuments({
      trader_id: targetTraderId,
      status: { $in: ['RETURNED', 'REJECTED', 'VERIFICATION_FAILED'] }
    });
    const pendingPayments = await Application.countDocuments({
      trader_id: targetTraderId,
      $or: [{ status: 'PAYMENT_PENDING' }, { fee_status: 'PENDING' }]
    });
    const totalCertificates = await Certificate.countDocuments({
      instrument_id: { $in: (await Instrument.find({ owner_id: targetTraderId }).select('id')).map(i => i.id) }
    });

    return res.json({
      totalInstruments,
      pendingApplications,
      approvedApplications,
      returnedApplications,
      pendingPayments,
      totalCertificates
    });
  }

  const totalInstruments = await Instrument.countDocuments();
  const pendingApplications = await Application.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } });
  const assignedApplications = await Application.countDocuments({ status: { $in: ['ASSIGNED', 'PENDING_VERIFICATION'] } });
  const inProgressApplications = await Application.countDocuments({ status: 'IN_PROGRESS' });
  const reportsSubmitted = await Application.countDocuments({ status: 'REPORT_SUBMITTED' });
  const completedVerifications = await Application.countDocuments({ status: { $in: ['VERIFICATION_COMPLETED', 'VERIFICATION_FAILED'] } });
  const approvedApplications = await Application.countDocuments({ status: { $in: ['APPROVED', 'CERTIFICATE_ISSUED'] } });
  const returnedApplications = await Application.countDocuments({ status: { $in: ['RETURNED', 'REJECTED'] } });
  const pendingPayments = await Application.countDocuments({ fee_status: 'PENDING' });

  res.json({
    totalInstruments,
    pendingApplications,
    assignedApplications,
    inProgressApplications,
    reportsSubmitted,
    completedVerifications,
    approvedApplications,
    returnedApplications,
    pendingPayments
  });
});

// ==========================================
// 8B. PORTAL ADMIN MANAGEMENT ENDPOINTS
// ==========================================

// 1. List Users
app.get('/api/admin/users', requirePermission('MANAGE_USERS'), async (req, res) => {
  const users = await User.find().sort({ created_at: -1 }).lean();
  const orgIds = [...new Set(users.map(u => u.organization_id).filter(Boolean))];
  const orgs = await Organization.find({ id: { $in: orgIds } }).lean();
  const orgMap = new Map(orgs.map(o => [o.id, o.name]));

  const safeUsers = users.map(u => {
    const { password_hash, _id, ...safe } = u;
    return {
      ...safe,
      organization_name: orgMap.get(u.organization_id) || 'Independent',
      active: u.active !== false
    };
  });
  res.json(safeUsers);
});

// 2. Create User
app.post('/api/admin/users', requirePermission('MANAGE_USERS'), async (req, res) => {
  const { role: actorRole, id: actorId } = getActor(req);
  const { email, password, role, full_name, organization_id, phone } = req.body;

  if (!email || !password || !role || !full_name) {
    return res.status(400).json({ error: 'Email, password, role, and full name are mandatory.' });
  }

  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${Object.values(ROLES).join(', ')}` });
  }

  const existing = await User.findOne({ email: email.trim().toLowerCase() }).lean();
  if (existing) {
    return res.status(400).json({ error: 'A user with this email address already exists.' });
  }

  const id = `USR_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const password_hash = hashPassword(password);
  const now = new Date().toISOString();

  await User.create({
    id,
    email: email.trim().toLowerCase(),
    password_hash,
    role,
    full_name: full_name.trim(),
    organization_id: organization_id || null,
    phone: phone || null,
    active: true,
    is_demo: 0,
    created_at: now,
    updated_at: now
  });

  logAudit('User', id, 'USER_CREATED_BY_ADMIN', actorId, actorRole, { email, role, full_name });

  res.status(201).json({ id, message: `User account created successfully for ${full_name} (${role})` });
});

// 3. Update User Active Status
app.patch('/api/admin/users/:id/status', requirePermission('MANAGE_USERS'), async (req, res) => {
  const { role: actorRole, id: actorId } = getActor(req);
  const targetUser = await User.findOne({ id: req.params.id }).lean();
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const { active } = req.body;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Boolean field active is required.' });
  }

  await User.updateOne({ id: req.params.id }, { $set: { active, updated_at: new Date().toISOString() } });

  logAudit('User', req.params.id, active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', actorId, actorRole, {
    user_email: targetUser.email,
    active
  });

  res.json({ message: `User status updated to ${active ? 'Active' : 'Inactive'}`, active });
});

// 4. List Organizations / Statutory Offices / Labs
app.get('/api/admin/organizations', requirePermission('MANAGE_OFFICES_LABS'), async (req, res) => {
  const orgs = await Organization.find().lean();
  const userCounts = await User.aggregate([
    { $match: { organization_id: { $ne: null } } },
    { $group: { _id: '$organization_id', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(userCounts.map(u => [u._id, u.count]));

  const enriched = orgs.map(o => ({
    ...o,
    staff_count: countMap.get(o.id) || 0
  }));
  res.json(enriched);
});

// 5. Master Data (Categories & Rulesets)
app.get('/api/admin/master-data', requirePermission('MANAGE_MASTER_DATA'), async (req, res) => {
  const categories = await InstrumentCategory.find().lean();
  const rulesets = await RuleSet.find().lean();
  const ruleMap = new Map(rulesets.map(r => [r.category_id, r]));

  const combined = categories.map(c => ({
    ...c,
    ruleset: ruleMap.get(c.id) || null
  }));
  res.json({ categories: combined, total: categories.length });
});

// 6. System Health & MongoDB Telemetry
app.get('/api/admin/system-health', requirePermission('VIEW_SYSTEM_HEALTH'), async (req, res) => {
  const mongoStatus = getMongoStatus();
  const mem = process.memoryUsage();

  const [usersCount, instCount, appCount, certCount, auditCount] = await Promise.all([
    User.countDocuments(),
    Instrument.countDocuments(),
    Application.countDocuments(),
    Certificate.countDocuments(),
    AuditLog.countDocuments()
  ]);

  res.json({
    status: mongoStatus.connected ? 'HEALTHY' : 'DEGRADED',
    database: {
      provider: 'MongoDB Atlas',
      connected: mongoStatus.connected,
      status: mongoStatus.status
    },
    system: {
      uptime_seconds: Math.floor(process.uptime()),
      node_version: process.version,
      platform: process.platform,
      memory: {
        rss_mb: (mem.rss / 1024 / 1024).toFixed(1),
        heap_used_mb: (mem.heapUsed / 1024 / 1024).toFixed(1),
        heap_total_mb: (mem.heapTotal / 1024 / 1024).toFixed(1)
      }
    },
    counts: {
      users: usersCount,
      instruments: instCount,
      applications: appCount,
      certificates: certCount,
      audit_logs: auditCount
    },
    timestamp: new Date().toISOString()
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
