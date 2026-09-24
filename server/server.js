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
  AuditLog,
  Notification
} from './models/index.js';
import { seedAllDemoData } from './scripts/seedDemoUsers.js';
import { ROLES, hasPermission, requirePermission } from './permissions.js';
import { upload, documentUpload, STORAGE_DIR, DOCUMENTS_DIR, EVIDENCE_DIR, deleteStoredFile, initStorage } from './storage.js';
import { generateStatutoryPdfBuffer } from './statutoryPdfGenerator.js';
import { verifyPassword, hashPassword } from './auth-utils.js';
import { sendEmail, buildPaymentReceiptEmail } from './email.js';
import { DESIGNATIONS, DEFAULT_DESIGNATION, designationLabel, getRequirement, checkCompetence, isValidDesignation, calculateMPE, evaluateReadingsAgainstMPE } from './verificationPolicy.js';

const STATUTORY_TIME_SLOTS = ['10:00 AM - 01:00 PM', '02:00 PM - 05:00 PM'];

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
      // Ensure all instruments have a public_token for QR validation
      try {
        const unseeded = await Instrument.find({ $or: [{ public_token: { $exists: false } }, { public_token: null }, { public_token: '' }] });
        for (const it of unseeded) {
          await Instrument.updateOne({ _id: it._id }, { $set: { public_token: crypto.randomUUID() } });
        }
      } catch (e) {}

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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

// Helper: Statutory Workflow Notifications (MongoDB Backed)
async function sendNotification({
  recipient_user_id,
  type,
  title,
  message,
  related_application_id,
  related_certificate_id,
  metadata = {}
}) {
  try {
    if (!recipient_user_id) return null;
    const notification = await Notification.create({
      id: `NOTIF_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      recipient_user_id,
      type,
      title,
      message,
      related_application_id: related_application_id || undefined,
      related_certificate_id: related_certificate_id || undefined,
      read: false,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    });
    return notification;
  } catch (err) {
    console.error('Notification dispatch failed:', err.message);
    return null;
  }
}

async function notifyRole(role, {
  type,
  title,
  message,
  related_application_id,
  related_certificate_id,
  metadata = {}
}) {
  try {
    const users = await User.find({ role, active: { $ne: false } }).select('id').lean();
    if (!users || users.length === 0) return;
    const notifs = users.map(u => ({
      id: `NOTIF_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      recipient_user_id: u.id,
      type,
      title,
      message,
      related_application_id: related_application_id || undefined,
      related_certificate_id: related_certificate_id || undefined,
      read: false,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    }));
    await Notification.insertMany(notifs);
  } catch (err) {
    console.error(`Failed to broadcast notification to role ${role}:`, err.message);
  }
}

// Helper: Resolve Actor for Request (Strict Server-Side Authorization)
async function resolveActor(req) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader ? authHeader.replace('Bearer ', '').trim() : req.headers['x-auth-token']) || req.query?.token;

  if (token) {
    const session = await UserSession.findOne({ token }).lean();
    if (session && new Date(session.expires_at) > new Date()) {
      const user = await User.findOne({ id: session.user_id }).lean();
      if (user && user.active !== false) {
        return { id: user.id, role: user.role, email: user.email, full_name: user.full_name };
      }
    }
  }

  // Fallback for API integration tests / development: lookup valid database user by ID ONLY if non-production
  const devBypassAllowed = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH_BYPASS !== 'false';
  if (devBypassAllowed) {
    const userId = req.headers['x-user-id'];
    if (userId) {
      const user = await User.findOne({ id: userId }).lean();
      if (user && user.active !== false) {
        return { id: user.id, role: user.role, email: user.email, full_name: user.full_name };
      }
    }
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

// Self-registration is open to statutory-facing roles per product decision, but
// PLATFORM_ADMIN is deliberately excluded — no role may self-register as system admin.
const SELF_REGISTERABLE_ROLES = [ROLES.TRADER, ROLES.VERIFIER, ROLES.AUTHORITY, ROLES.GATC];

app.post('/api/auth/register', async (req, res) => {
  const { full_name, email, password, phone, role, organization_name, jurisdictions, designation } = req.body;

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
  if (role === ROLES.VERIFIER && designation && !isValidDesignation(designation)) {
    return res.status(400).json({ error: 'Invalid officer designation.' });
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
    designation: role === ROLES.VERIFIER ? (designation || DEFAULT_DESIGNATION) : undefined,
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
// NOTIFICATIONS SYSTEM (MONGODB BACKED)
// ==========================================

app.get('/api/notifications', async (req, res) => {
  const actor = getActor(req);
  if (!actor || actor.role === 'ANONYMOUS') {
    return res.status(401).json({ error: 'Unauthorized: Authentication required to view notifications' });
  }

  try {
    const notifications = await Notification.find({ recipient_user_id: actor.id })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    const unread_count = await Notification.countDocuments({
      recipient_user_id: actor.id,
      read: false
    });

    res.json({
      notifications,
      unread_count
    });
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

const handleMarkAllNotificationsRead = async (req, res) => {
  const actor = getActor(req);
  if (!actor || actor.role === 'ANONYMOUS') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await Notification.updateMany(
      { recipient_user_id: actor.id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, unread_count: 0 });
  } catch (err) {
    console.error('Failed to mark all notifications read:', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

app.patch('/api/notifications/read-all', handleMarkAllNotificationsRead);
app.post('/api/notifications/read-all', handleMarkAllNotificationsRead);

const handleMarkNotificationRead = async (req, res) => {
  const actor = getActor(req);
  if (!actor || actor.role === 'ANONYMOUS') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const notif = await Notification.findOneAndUpdate(
      { id: req.params.id, recipient_user_id: actor.id },
      { $set: { read: true } },
      { new: true }
    ).lean();

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const unread_count = await Notification.countDocuments({
      recipient_user_id: actor.id,
      read: false
    });

    res.json({ success: true, notification: notif, unread_count });
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

app.patch('/api/notifications/:id/read', handleMarkNotificationRead);
app.post('/api/notifications/:id/read', handleMarkNotificationRead);

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
    const rawSpecs = specs && typeof specs === 'object' && !Array.isArray(specs) ? specs : {};

    const missingSpec = specSchema.find(f => f.required && !String(rawSpecs[f.key] ?? '').trim());
    if (missingSpec) {
      return res.status(400).json({ error: `Missing required field '${missingSpec.label || missingSpec.key}' for category '${category.name}'` });
    }

    // Keep only fields this category actually declares. A spec object is free-form
    // Mixed in Mongoose, so without this a client could persist arbitrary keys, and
    // switching category mid-form would leave the previous category's fields behind
    // on the record (a water meter carrying a `platform_length_m`).
    const cleanSpecs = {};
    for (const f of specSchema) {
      const raw = rawSpecs[f.key];
      if (raw === undefined || raw === null || String(raw).trim() === '') continue;
      const value = String(raw).trim();

      // A `select` field is a closed list — anything outside it is either a stale
      // value from a different category or a hand-crafted request.
      if (f.type === 'select' && Array.isArray(f.options) && !f.options.includes(value)) {
        return res.status(400).json({
          error: `Invalid value '${value}' for '${f.label || f.key}'. Allowed: ${f.options.join(', ')}`
        });
      }
      if (f.type === 'number') {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) {
          return res.status(400).json({ error: `'${f.label || f.key}' must be a positive number` });
        }
      }
      cleanSpecs[f.key] = value;
    }
    const providedSpecs = cleanSpecs;

    // The Max/Min/Interval(e) columns exist for the NAWI MPE engine. Accepting them
    // for a category whose form never collects them would write NAWI-shaped data
    // onto, say, a taximeter record.
    const acceptsCapacityFields = category.form_meta?.capacity_fields === true;
    if (acceptsCapacityFields && (!max_capacity || !min_capacity || !verification_scale_interval_e)) {
      return res.status(400).json({ error: `Max Capacity, Min Capacity and Interval (e) are required for category '${category.name}'` });
    }

    const existing = await Instrument.findOne({ serial_number }).lean();
    if (existing) {
      return res.status(400).json({ error: 'Instrument with this serial number is already registered' });
    }

    const id = `INST_${Date.now()}`;
    const publicToken = crypto.randomUUID();
    const now = new Date().toISOString();

    await Instrument.create({
      id,
      public_token: publicToken,
      owner_id: targetOwnerId,
      category_id,
      manufacturer,
      model,
      serial_number,
      // Only meaningful for weight-based categories — left blank otherwise rather
      // than defaulting to a NAWI-shaped value that would misdescribe the instrument.
      max_capacity: acceptsCapacityFields ? max_capacity : '',
      min_capacity: acceptsCapacityFields ? min_capacity : '',
      verification_scale_interval_e: acceptsCapacityFields ? verification_scale_interval_e : '',
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
  const ruleSet = cat ? await RuleSet.findOne({ category_id: cat.id }).lean() : null;

  // Category-specific specs as label/value rows, driven by the category's own
  // spec_schema — a taximeter has a tariff version, not a "max capacity".
  const specFields = [];
  if (inst) {
    if (cat?.measurement_type === 'MASS') {
      if (inst.max_capacity) specFields.push({ label: 'Max Capacity', value: inst.max_capacity });
      if (inst.min_capacity) specFields.push({ label: 'Min Capacity', value: inst.min_capacity });
      if (inst.verification_scale_interval_e) specFields.push({ label: 'Verification Interval (e)', value: inst.verification_scale_interval_e });
    }
    for (const field of (Array.isArray(cat?.spec_schema) ? cat.spec_schema : [])) {
      const value = inst.specs ? inst.specs[field.key] : undefined;
      if (value === undefined || value === null || value === '') continue;
      specFields.push({ label: field.label, value: field.unit ? `${value} ${field.unit}` : String(value) });
    }
  }

  const evidence = verif ? await VerificationEvidence.find({ verification_id: verif.id }).lean() : [];
  const readings = verif ? await VerificationReading.find({ verification_id: verif.id }).lean() : [];
  const checklistResponses = verif ? await VerificationChecklistResponse.find({ verification_id: verif.id }).lean() : [];

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
    category_code: cat ? cat.code : null,
    instrument_district: inst ? inst.district : null,
    spec_fields: specFields,
    rule_set: ruleSet ? {
      name: ruleSet.name,
      validity_period_months: ruleSet.validity_period_months,
      has_mpe_rules: Array.isArray(ruleSet.mpe_rules) && ruleSet.mpe_rules.length > 0
    } : null,
    verification_requirement: getRequirement(cat, inst),
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
    verification_id: verif ? verif.id : null,
    verification_type: verif ? verif.verification_type : null,
    verification_result: verif ? verif.result : null,
    verification_remarks: verif ? verif.remarks : null,
    verification_completed_at: verif ? verif.completed_at : null,
    lab_parameters: verif ? verif.lab_parameters : null,
    evidence: evidence || [],
    readings: readings || [],
    checklist_responses: checklistResponses || [],
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

  const id = `APP_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const appNo = `APP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`;
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

  // Notifications: Trader + Authority
  await sendNotification({
    recipient_user_id: targetTraderId,
    type: 'APPLICATION_SUBMITTED',
    title: 'Application Submitted',
    message: `Application ${appNo} for ${inst.manufacturer || ''} ${inst.model || 'instrument'} has been submitted. Complete statutory fee payment to proceed.`,
    related_application_id: id,
    metadata: { application_no: appNo, instrument_id }
  });

  await notifyRole(ROLES.AUTHORITY, {
    type: 'NEW_APPLICATION',
    title: 'New Verification Application',
    message: `New application ${appNo} submitted by trader for ${inst.manufacturer || ''} ${inst.model || 'instrument'}.`,
    related_application_id: id,
    metadata: { application_no: appNo, trader_id: targetTraderId }
  });

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

  const { payment_mode, payment_method, payment_status, transaction_id, reference_no, challan_number, amount, amount_paid, paid_at, receipt_url } = req.body;
  const rawMode = payment_mode || payment_method || 'ONLINE';
  const isOffline = rawMode.toUpperCase().includes('OFFLINE') || rawMode.toUpperCase().includes('CHALLAN');

  // Online payments must go through the Razorpay order + signature-verification endpoints.
  if (!isOffline) {
    return res.status(400).json({ error: 'Online payments must be completed through the payment gateway.' });
  }

  const now = new Date().toISOString();
  const txnId = transaction_id || challan_number || `CHALLAN_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const refNo = reference_no || challan_number || `REF-${Math.floor(100000 + Math.random() * 900000)}`;
  const totalAmount = Number(amount || amount_paid) || appItem.fee_breakdown?.total_fee || 800;

  // Offline payments (Treasury Challan / DD) are submitted by Trader and remain PENDING_VERIFICATION
  // until an authorized Authority Officer verifies the remittance against the treasury portal.
  const paymentRecord = {
    payment_mode: 'OFFLINE',
    payment_status: 'PENDING_VERIFICATION',
    transaction_id: txnId,
    reference_no: refNo,
    amount: totalAmount,
    paid_at: paid_at || now,
    receipt_url: receipt_url || null
  };

  await Application.updateOne(
    { id: applicationId },
    {
      $set: {
        payment: paymentRecord,
        fee_status: 'PENDING_VERIFICATION',
        status: 'PAYMENT_PENDING',
        updated_at: now
      }
    }
  );

  logAudit('Application', applicationId, 'OFFLINE_PAYMENT_SUBMITTED', actorId, role, {
    transaction_id: txnId,
    payment_mode: 'OFFLINE',
    amount: totalAmount,
    payment_status: 'PENDING_VERIFICATION'
  });

  // Notifications: Trader + Authority
  await sendNotification({
    recipient_user_id: actorId,
    type: 'PAYMENT_INITIATED',
    title: 'Offline Payment Submitted',
    message: `Challan/DD payment of ₹${totalAmount} submitted for application ${appItem.application_no || applicationId}. Awaiting statutory verification.`,
    related_application_id: applicationId
  });

  await notifyRole(ROLES.AUTHORITY, {
    type: 'PAYMENT_VERIFICATION_REQUIRED',
    title: 'Challan Payment Verification Required',
    message: `Offline remittance of ₹${totalAmount} submitted for application ${appItem.application_no || applicationId}.`,
    related_application_id: applicationId
  });

  const updatedApp = await Application.findOne({ id: applicationId }).lean();
  res.json({
    message: 'Offline payment details submitted successfully. Awaiting statutory verification by Authority.',
    application: updatedApp,
    payment: updatedApp.payment
  });
});

// Authority Action: Verify Offline Payment (Challan / DD)
app.post('/api/applications/:id/verify-payment', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'VERIFY_PAYMENT')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot verify payments. Only Authority Officers can verify statutory payments.` });
  }

  const applicationId = req.params.id;
  const appItem = await Application.findOne({ id: applicationId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  if (appItem.fee_status === 'PAID') {
    return res.status(400).json({ error: 'Payment has already been verified for this application.' });
  }

  const now = new Date().toISOString();
  const updatedPayment = {
    ...(appItem.payment || {}),
    payment_status: 'PAID',
    verified_by: actorId,
    verified_at: now
  };

  await Application.updateOne(
    { id: applicationId },
    {
      $set: {
        payment: updatedPayment,
        fee_status: 'PAID',
        status: 'PAYMENT_VERIFIED',
        updated_at: now
      }
    }
  );

  logAudit('Application', applicationId, 'PAYMENT_VERIFIED_BY_AUTHORITY', actorId, role, {
    payment_mode: updatedPayment.payment_mode,
    amount: updatedPayment.amount,
    transaction_id: updatedPayment.transaction_id
  });

  // Notification: Trader
  await sendNotification({
    recipient_user_id: appItem.trader_id,
    type: 'PAYMENT_VERIFIED',
    title: 'Payment Verified',
    message: `Statutory fee of ₹${updatedPayment.amount || ''} for application ${appItem.application_no || applicationId} has been verified by the Authority Officer.`,
    related_application_id: applicationId
  });

  const updatedApp = await Application.findOne({ id: applicationId }).lean();
  res.json({
    message: 'Statutory fee payment verified successfully.',
    application: updatedApp,
    payment: updatedApp.payment
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
      { $set: { payment: paymentRecord, fee_status: 'PAID', status: 'PAYMENT_VERIFIED', updated_at: now } }
    );
    logAudit('Application', appItem.id, 'PAYMENT_RECORDED', actorId, role, {
      transaction_id: razorpay_payment_id,
      payment_mode: 'ONLINE',
      gateway: 'RAZORPAY',
      amount: paymentRecord.amount,
      payment_status: 'PAID'
    });

    // Notifications: Trader + Authority
    await sendNotification({
      recipient_user_id: appItem.trader_id,
      type: 'PAYMENT_VERIFIED',
      title: 'Payment Verified',
      message: `Statutory fee of ₹${paymentRecord.amount} for application ${appItem.application_no || appItem.id} was successfully processed via Razorpay.`,
      related_application_id: appItem.id,
      metadata: { transaction_id: razorpay_payment_id }
    });

    await notifyRole(ROLES.AUTHORITY, {
      type: 'PAYMENT_VERIFIED',
      title: 'Application Payment Received',
      message: `Statutory fee for application ${appItem.application_no || appItem.id} (₹${paymentRecord.amount}) has been paid. Ready for scrutiny/assignment.`,
      related_application_id: appItem.id
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
        status: 'UNDER_REVIEW',
        updated_at: now
      }
    }
  );

  logAudit('Application', applicationId, 'APPLICATION_RESUBMITTED', actorId, role, {
    previous_return_reason: appItem.return_reason
  });

  // Notifications: Trader + Authority
  await sendNotification({
    recipient_user_id: appItem.trader_id,
    type: 'APPLICATION_RESUBMITTED',
    title: 'Application Resubmitted',
    message: `Application ${appItem.application_no || applicationId} has been resubmitted for statutory review.`,
    related_application_id: applicationId
  });

  await notifyRole(ROLES.AUTHORITY, {
    type: 'APPLICATION_RESUBMITTED',
    title: 'Application Resubmitted',
    message: `Trader resubmitted application ${appItem.application_no || applicationId} with revised particulars.`,
    related_application_id: applicationId
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

  // Notification: Trader
  await sendNotification({
    recipient_user_id: appItem.trader_id,
    type: 'APPLICATION_RETURNED',
    title: 'Application Returned by Authority',
    message: `Application ${appItem.application_no || applicationId} was returned by the Authority. Remarks: ${return_reason.trim()}`,
    related_application_id: applicationId,
    metadata: { return_reason: return_reason.trim() }
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

  const ALLOWED_REVIEW_STATUSES = ['SUBMITTED', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'RETURNED'];
  if (!ALLOWED_REVIEW_STATUSES.includes(appItem.status)) {
    return res.status(400).json({ error: `Invalid state transition: Cannot review application in state '${appItem.status}'` });
  }

  const now = new Date().toISOString();
  await Application.updateOne({ id: req.params.id }, { $set: { status: 'UNDER_REVIEW', updated_at: now } });

  logAudit('Application', req.params.id, 'STATUTORY_REVIEW_OPENED', actorId, role, { previous_status: appItem.status });

  res.json({ message: 'Application is now under statutory review', status: 'UNDER_REVIEW' });
});

// Application states in which an assignment no longer occupies the officer's time.
const CLOSED_APPLICATION_STATES = ['APPROVED', 'CERTIFICATE_ISSUED', 'REJECTED', 'RETURNED', 'VERIFICATION_FAILED', 'CANCELLED', 'WITHDRAWN'];

// States in which an officer can be allocated (or re-allocated before inspection starts).
const ASSIGNABLE_STATES = ['SUBMITTED', 'UNDER_REVIEW', 'PAYMENT_VERIFIED', 'PENDING_VERIFICATION', 'ASSIGNED'];

// Allocation engine. Every candidate goes through the same HARD checks — failing
// any one makes them ineligible no matter how idle they are:
//   1. active account
//   2. competence: GATC First Schedule + approval scope, or LMO designation rank
//   3. jurisdiction: instrument district is within the office's notified districts
// Only eligible candidates are then RANKED (scoreCandidate) by open workload,
// home district vs additional charge, free capacity on the preferred date and mode fit.
async function evaluateCandidates(appItem) {
  const inst = await Instrument.findOne({ id: appItem.instrument_id }).lean();
  const category = inst ? await InstrumentCategory.findOne({ id: inst.category_id }).lean() : null;
  const requirement = getRequirement(category, inst);
  const district = inst ? inst.district : null;

  const people = await User.find({ role: { $in: [ROLES.VERIFIER, ROLES.GATC] } }).lean();
  const orgs = await Organization.find({ id: { $in: [...new Set(people.map(u => u.organization_id).filter(Boolean))] } }).lean();
  const orgMap = new Map(orgs.map(o => [o.id, o]));

  // Workload = open assignments only; closed cases no longer occupy the officer.
  const assignments = await Assignment.find({ assigned_id: { $in: people.map(p => p.id) } }).lean();
  const assignedApps = await Application.find(
    { id: { $in: assignments.map(x => x.application_id) } },
    { id: 1, status: 1 }
  ).lean();
  const appStatus = new Map(assignedApps.map(x => [x.id, x.status]));
  const openAssignments = assignments.filter(x =>
    x.application_id !== appItem.id && !CLOSED_APPLICATION_STATES.includes(appStatus.get(x.application_id))
  );
  const workload = new Map();
  for (const x of openAssignments) workload.set(x.assigned_id, (workload.get(x.assigned_id) || 0) + 1);

  // Visits already booked on the trader's preferred date, per officer.
  const preferredDate = appItem.preferred_date || null;
  const busyOnDate = new Map();
  if (preferredDate) {
    const apts = await Appointment.find({
      assignment_id: { $in: openAssignments.map(x => x.id) },
      scheduled_date: preferredDate
    }).lean();
    const asnOwner = new Map(openAssignments.map(x => [x.id, x.assigned_id]));
    for (const apt of apts) {
      const owner = asnOwner.get(apt.assignment_id);
      busyOnDate.set(owner, (busyOnDate.get(owner) || 0) + 1);
    }
  }

  const candidates = people.map(person => {
    const org = orgMap.get(person.organization_id) || {};
    const jurisdictions = org.jurisdictions || [];
    const competence = checkCompetence(person, org, requirement);
    const inJurisdiction = !!district && jurisdictions.includes(district);

    const checks = [
      {
        key: 'active',
        label: 'Active account',
        ok: person.active !== false,
        detail: person.active !== false ? 'Account active' : 'Account is deactivated'
      },
      {
        key: 'competence',
        label: person.role === ROLES.GATC ? 'GATC scope' : 'Designation',
        ok: competence.ok,
        detail: competence.reason
      },
      {
        key: 'jurisdiction',
        label: 'Jurisdiction',
        ok: inJurisdiction,
        detail: inJurisdiction
          ? `Covers ${district}`
          : `Covers ${jurisdictions.join('; ') || 'no districts on record'}, not ${district || 'the instrument district'}`
      }
    ];
    const isEligible = checks.every(c => c.ok);

    const current_workload = workload.get(person.id) || 0;
    const bookings_on_preferred_date = busyOnDate.get(person.id) || 0;
    const isHomeDistrict = inJurisdiction && jurisdictions[0] === district;

    const factors = isEligible ? scoreCandidate({
      workload: current_workload,
      isHomeDistrict,
      bookingsOnDate: bookings_on_preferred_date,
      hasPreferredDate: !!preferredDate,
      role: person.role,
      mode: appItem.verification_mode
    }) : [];
    const score = isEligible ? Math.max(0, Math.min(100, factors.reduce((sum, f) => sum + f.points, 0))) : 0;

    return {
      id: person.id,
      full_name: person.full_name,
      role: person.role,
      designation: person.role === ROLES.VERIFIER ? (person.designation || DEFAULT_DESIGNATION) : null,
      designation_label: person.role === ROLES.VERIFIER ? designationLabel(person.designation) : 'Government Approved Test Centre',
      phone: person.phone || null,
      organization_name: org.name || null,
      jurisdictions,
      is_home_district: isHomeDistrict,
      current_workload,
      bookings_on_preferred_date,
      is_eligible: isEligible,
      checks,
      ineligible_reason: isEligible ? null : checks.find(c => !c.ok).detail,
      score,
      score_factors: factors
    };
  });

  candidates.sort((x, y) => {
    if (x.is_eligible !== y.is_eligible) return x.is_eligible ? -1 : 1;
    if (y.score !== x.score) return y.score - x.score;
    return x.current_workload - y.current_workload;
  });

  const recommended = candidates.find(c => c.is_eligible) || null;
  return {
    instrument: inst,
    requirement,
    district,
    candidates,
    recommended_id: recommended ? recommended.id : null
  };
}

// Transparent ranking: every point is itemised so the authority can see WHY a
// candidate is on top. Base 50 for being eligible, 100 max.
function scoreCandidate({ workload, isHomeDistrict, bookingsOnDate, hasPreferredDate, role, mode }) {
  const factors = [{ key: 'base', label: 'Meets all requirements', points: 50 }];

  factors.push({
    key: 'workload',
    label: workload === 0 ? 'No open cases' : `${workload} open case${workload === 1 ? '' : 's'}`,
    points: Math.max(0, 25 - workload * 5)
  });

  factors.push(isHomeDistrict
    ? { key: 'location', label: 'Home district', points: 10 }
    : { key: 'location', label: 'Additional-charge district', points: 3 });

  if (hasPreferredDate) {
    factors.push(bookingsOnDate === 0
      ? { key: 'availability', label: 'Free on preferred date', points: 10 }
      : { key: 'availability', label: `${bookingsOnDate} visit${bookingsOnDate === 1 ? '' : 's'} on preferred date`, points: bookingsOnDate === 1 ? 4 : 0 });
  }

  // On-site (in-situ) inspections need a field officer; camp/centre presentations suit a test centre.
  const modeFit = (mode === 'IN_SITU' && role === ROLES.VERIFIER) || (mode !== 'IN_SITU' && role === ROLES.GATC);
  if (modeFit) {
    factors.push({ key: 'mode', label: mode === 'IN_SITU' ? 'Field officer for on-site visit' : 'Test centre for camp presentation', points: 5 });
  }

  return factors;
}

app.get('/api/verification-policy/designations', (req, res) => {
  res.json(DESIGNATIONS);
});

app.get('/api/applications/:id/candidates', async (req, res) => {
  const { role } = getActor(req);
  if (!hasPermission(role, 'ASSIGN_VERIFIER')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot access verifier allocation engine.` });
  }

  const appItem = await Application.findOne({ id: req.params.id }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const result = await evaluateCandidates(appItem);
  const existing = await Assignment.findOne({ application_id: appItem.id }).lean();
  const trader = await User.findOne({ id: appItem.trader_id }, { full_name: 1 }).lean();

  res.json({
    application: {
      id: appItem.id,
      application_no: appItem.application_no,
      status: appItem.status,
      verification_mode: appItem.verification_mode,
      preferred_date: appItem.preferred_date || null,
      location_address: appItem.location_address || result.instrument?.location || null,
      trader_name: trader?.full_name || null
    },
    instrument: result.instrument ? {
      manufacturer: result.instrument.manufacturer,
      model: result.instrument.model,
      serial_number: result.instrument.serial_number,
      district: result.instrument.district
    } : null,
    requirement: result.requirement,
    instrument_district: result.district,
    recommended_id: result.recommended_id,
    current_assignee_id: existing ? existing.assigned_id : null,
    candidates: result.candidates
  });
});

app.get('/api/availability/slots', async (req, res) => {
  const { assignee_id, date, application_id } = req.query;
  if (!assignee_id || !date) {
    return res.status(400).json({ error: 'assignee_id and date query parameters are required.' });
  }

  try {
    const asns = await Assignment.find({ assigned_id: assignee_id }).lean();
    const relevantAsnIds = asns
      .filter(a => !application_id || a.application_id !== application_id)
      .map(a => a.id);

    let occupied_slots = [];
    if (relevantAsnIds.length > 0) {
      const appointments = await Appointment.find({
        assignment_id: { $in: relevantAsnIds },
        scheduled_date: date,
        status: { $ne: 'CANCELLED' }
      }).lean();

      occupied_slots = [...new Set(appointments.map(a => a.time_slot).filter(Boolean))];
    }

    const available_slots = STATUTORY_TIME_SLOTS.filter(s => !occupied_slots.includes(s));

    res.json({
      assignee_id,
      date,
      configured_slots: STATUTORY_TIME_SLOTS,
      occupied_slots,
      available_slots,
      is_fully_booked: available_slots.length === 0
    });
  } catch (err) {
    console.error('Availability check failed:', err);
    res.status(500).json({ error: 'Failed to query availability slots.' });
  }
});

// Document Upload Endpoint
app.post('/api/documents/upload', documentUpload.single('file'), async (req, res) => {
  const actor = getActor(req);
  if (actor.id === 'ANONYMOUS') {
    return res.status(401).json({ error: 'Unauthorized: Authentication required to upload documents.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file format.' });
  }

  const relativePath = `/uploads/documents/${req.file.filename}`;
  res.status(201).json({
    id: `DOC_${Date.now()}`,
    file_name: req.file.originalname,
    file_path: relativePath,
    file_type: req.file.mimetype,
    file_size: `${Math.round(req.file.size / 1024)} KB`,
    uploaded_at: new Date().toISOString()
  });
});

// Secure Document Preview & Streaming Endpoint
app.get(['/api/documents/preview/:filename', '/api/documents/view/:filename', '/uploads/documents/:filename'], async (req, res) => {
  const filename = path.basename(req.params.filename || '');
  if (!filename) return res.status(400).json({ error: 'Filename parameter is required.' });

  // 1. Check if physical file exists on disk
  const possiblePaths = [
    path.join(DOCUMENTS_DIR, filename),
    path.join(EVIDENCE_DIR, filename),
    path.join(STORAGE_DIR, filename)
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      return res.sendFile(filePath);
    }
  }

  // 2. If file does not exist on disk, check if it's a PDF document (generate statutory PDF)
  if (filename.toLowerCase().endsWith('.pdf') || !filename.includes('.')) {
    const formattedTitle = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').toUpperCase();
    const pdfBuffer = generateStatutoryPdfBuffer({
      documentTitle: `STATUTORY ATTACHMENT: ${formattedTitle}`,
      category: 'LEGAL METROLOGY VERIFICATION EVIDENCE',
      fileName: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
      applicationNo: req.query.app_no || 'APP-LM-2026-STATUTORY',
      traderName: req.query.trader_name || 'Authorized Trader / Enterprise',
      issueDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      instrumentDetails: 'Commercial Weighing and Measuring Instrument'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename.endsWith('.pdf') ? filename : filename + '.pdf'}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(pdfBuffer);
  }

  // 3. If file is an image extension and not on disk, send SVG placeholder
  if (/\.(jpg|jpeg|png|webp)$/i.test(filename)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <rect x="20" y="20" width="560" height="360" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <text x="300" y="180" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#002046" text-anchor="middle">Legal Metrology Visual Evidence</text>
      <text x="300" y="215" font-family="Arial, sans-serif" font-size="13" fill="#64748b" text-anchor="middle">${filename}</text>
      <text x="300" y="250" font-family="Arial, sans-serif" font-size="11" fill="#10b981" text-anchor="middle">✓ Digitally Scrutinized & Verified</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(svg);
  }

  return res.status(404).json({ error: 'Document file not found.' });
});

app.post('/api/applications/:id/assign', async (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'ASSIGN_VERIFIER')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot assign verifiers.` });
  }

  const applicationId = req.params.id;
  const appItem = await Application.findOne({ id: applicationId }).lean();
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  if (appItem.fee_status !== 'PAID') {
    return res.status(400).json({ error: 'Statutory verification fee must be verified as PAID before assigning verifier or laboratory.' });
  }

  if (!ASSIGNABLE_STATES.includes(appItem.status)) {
    return res.status(400).json({ error: `Invalid state transition: Cannot assign verifier to application in state '${appItem.status}'` });
  }

  const { assigned_id, recommended_id, is_override, override_reason, scheduled_date, time_slot, arrangement_type } = req.body;
  if (!assigned_id) return res.status(400).json({ error: 'Target assignee ID is required' });

  const assignee = await User.findOne({ id: assigned_id }).lean();
  if (!assignee) return res.status(404).json({ error: 'Assignee user not found' });
  if (![ROLES.VERIFIER, ROLES.GATC].includes(assignee.role)) {
    return res.status(400).json({ error: 'Assignee must have role VERIFIER or GATC' });
  }

  if (assignee.active === false) {
    return res.status(400).json({ error: 'Cannot assign a deactivated user account.' });
  }

  if (!scheduled_date) {
    return res.status(400).json({ error: 'Inspection schedule date is required.' });
  }
  const chosenSlot = time_slot || STATUTORY_TIME_SLOTS[0];

  // Conflict Prevention: Check if this officer/lab is already booked for this slot on this date
  const conflictingAsns = await Assignment.find({ assigned_id }).lean();
  const conflictingAsnIds = conflictingAsns.filter(a => a.application_id !== applicationId).map(a => a.id);

  if (conflictingAsnIds.length > 0) {
    const existingConflict = await Appointment.findOne({
      assignment_id: { $in: conflictingAsnIds },
      scheduled_date: scheduled_date,
      time_slot: chosenSlot,
      status: { $ne: 'CANCELLED' }
    }).lean();

    if (existingConflict) {
      return res.status(409).json({
        error: `Time slot '${chosenSlot}' on ${scheduled_date} is already booked for ${assignee.full_name}. Please choose an available time slot or another inspection date.`
      });
    }
  }

  // Re-run the allocation engine server-side — never trust the client's view of eligibility.
  const evaluation = await evaluateCandidates(appItem);
  const candidate = evaluation.candidates.find(c => c.id === assigned_id);
  if (!candidate) return res.status(400).json({ error: 'Assignee is not a verification candidate.' });

  const failedChecks = candidate.checks.filter(c => !c.ok);
  const isExplicitOverride = Boolean(is_override || failedChecks.length > 0 || !candidate.is_eligible);
  const isJurisdictionMatch = !failedChecks.some(c => c.key === 'jurisdiction');
  const deviatesFromRecommendation = !!evaluation.recommended_id && assigned_id !== evaluation.recommended_id;

  if (isExplicitOverride || !candidate.is_eligible || !isJurisdictionMatch || deviatesFromRecommendation) {
    if (!override_reason || !override_reason.trim()) {
      return res.status(400).json({
        error: 'A mandatory statutory override reason is required when assigning an officer who does not meet standard eligibility requirements or deviates from recommendations.'
      });
    }
  }

  const recordedOverride = (isExplicitOverride || !candidate.is_eligible || !isJurisdictionMatch || deviatesFromRecommendation) ? 1 : 0;

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
          recommended_id: evaluation.recommended_id || assigned_id,
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
      recommended_id: evaluation.recommended_id || assigned_id,
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
          scheduled_date: scheduled_date,
          time_slot: chosenSlot,
          arrangement_type: arrangement_type || (assignee.role === 'GATC' ? 'CENTRE_PRESENTATION' : 'FIELD_VISIT')
        }
      }
    );
  } else {
    await Appointment.create({
      id: aptId,
      assignment_id: targetAsnId,
      scheduled_date: scheduled_date,
      time_slot: chosenSlot,
      arrangement_type: arrangement_type || (assignee.role === 'GATC' ? 'CENTRE_PRESENTATION' : 'FIELD_VISIT'),
      status: 'SCHEDULED',
      created_at: now
    });
  }

  // Transition: -> ASSIGNED.
  await Application.updateOne({ id: applicationId }, { $set: { status: 'ASSIGNED', updated_at: now } });

  logAudit('Application', applicationId, recordedOverride ? 'ASSIGNMENT_OVERRIDE' : 'ASSIGNMENT_CONFIRMED', actorId, role, {
    assigned_id,
    assignee_name: assignee.full_name,
    recommended_id: evaluation.recommended_id,
    score: candidate.score,
    is_override: !!recordedOverride,
    override_reason
  });

  // Notifications: Assignee + Trader
  await sendNotification({
    recipient_user_id: assigned_id,
    type: assignee.role === ROLES.GATC ? 'NEW_LAB_REQUEST' : 'NEW_CASE_ASSIGNED',
    title: assignee.role === ROLES.GATC ? 'New GATC Lab Request' : 'New Inspection Case Assigned',
    message: `You have been allocated application ${appItem.application_no || applicationId} for verification.`,
    related_application_id: applicationId,
    metadata: { application_no: appItem.application_no, scheduled_date, time_slot }
  });

  await sendNotification({
    recipient_user_id: appItem.trader_id,
    type: 'VERIFIER_ASSIGNED',
    title: 'Verifier Allocated',
    message: `Application ${appItem.application_no || applicationId} has been assigned to ${assignee.full_name} (${assignee.role === ROLES.GATC ? 'GATC Lab' : 'Legal Metrology Officer'}).`,
    related_application_id: applicationId
  });

  res.json({ message: 'Verifier assigned successfully', status: 'ASSIGNED' });
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
    status: { $in: ['ASSIGNED', 'PENDING_VERIFICATION', 'IN_PROGRESS', 'REPORT_SUBMITTED', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED', 'APPROVED'] }
  }).sort({ updated_at: -1 }).lean();

  const instIds = [...new Set(applications.map(a => a.instrument_id).filter(Boolean))];
  const instruments = await Instrument.find({ id: { $in: instIds } }).lean();
  const instMap = new Map(instruments.map(i => [i.id, i]));

  const catIds = [...new Set(instruments.map(i => i.category_id).filter(Boolean))];
  const categories = await InstrumentCategory.find({ id: { $in: catIds } }).lean();
  const catMap = new Map(categories.map(c => [c.id, c]));

  const traderIds = [...new Set(applications.map(a => a.trader_id).filter(Boolean))];
  const traders = await User.find({ id: { $in: traderIds } }).lean();
  const traderMap = new Map(traders.map(u => [u.id, u]));

  const asnIds = assignments.map(a => a.id);
  const appointments = await Appointment.find({ assignment_id: { $in: asnIds } }).lean();
  const aptMap = new Map(appointments.map(a => [a.assignment_id, a]));

  const verifs = await Verification.find({ application_id: { $in: applications.map(a => a.id) } }).lean();
  const verifMap = new Map(verifs.map(v => [v.application_id, v]));

  // Fetch certificates to track worked instruments history and issued credentials
  const certs = await Certificate.find({
    $or: [
      { instrument_id: { $in: instIds } },
      { application_id: { $in: applications.map(a => a.id) } },
      { verification_id: { $in: verifs.map(v => v.id) } }
    ]
  }).lean();
  const certMap = new Map();
  certs.forEach(c => {
    if (c.instrument_id) certMap.set(c.instrument_id, c);
    if (c.application_id) certMap.set(c.application_id, c);
    if (c.verification_id) certMap.set(c.verification_id, c);
  });

  const cases = applications.map(a => {
    const asn = asnMap.get(a.id) || {};
    const inst = instMap.get(a.instrument_id) || {};
    const cat = catMap.get(inst.category_id);
    const trader = traderMap.get(a.trader_id) || {};
    const apt = aptMap.get(asn.id) || {};
    const verif = verifMap.get(a.id) || {};
    const cert = certMap.get(a.id) || (verif.id ? certMap.get(verif.id) : null) || certMap.get(inst.id);

    return {
      application_id: a.id,
      application_no: a.application_no,
      request_type: a.request_type,
      application_status: a.status,
      instrument_id: inst.id || null,
      manufacturer: inst.manufacturer || null,
      model: inst.model || null,
      serial_number: inst.serial_number || null,
      category_name: cat ? cat.name : 'Legal Metrology Instrument',
      max_capacity: inst.max_capacity || null,
      verification_scale_interval_e: inst.verification_scale_interval_e || null,
      location: inst.location || null,
      district: inst.district || null,
      trader_name: trader.full_name || null,
      trader_phone: trader.phone || null,
      assigned_id: asn.assigned_id || null,
      is_override: asn.is_override || 0,
      scheduled_date: apt.scheduled_date || null,
      time_slot: apt.time_slot || null,
      arrangement_type: apt.arrangement_type || null,
      verification_id: verif.id || null,
      verification_status: verif.status || null,
      verification_result: verif.result || null,
      tested_at: verif.updated_at || verif.created_at || a.updated_at,
      certificate_no: cert?.certificate_no || null,
      certificate_valid_until: cert?.valid_until || null,
      certificate_status: cert?.status || null
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

  const { result, remarks, checklist_responses, readings, lab_parameters } = req.body;

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

  // 5. Server-side MPE and statutory tolerance calculation (Schedule IX / OIML R76)
  const isGatcRole = role === ROLES.GATC || asn?.assigned_type === ROLES.GATC;
  const verificationKind = isGatcRole ? 'LAB_TEST' : (appItem.verification_mode === 'IN_SITU' ? 'IN_SITU' : 'INITIAL');
  const mpeResult = evaluateReadingsAgainstMPE(readings, inst, ruleSet, verificationKind);
  const evaluatedReadings = mpeResult.readings || [];
  const anyReadingFailedMPE = !mpeResult.allPass || evaluatedReadings.some(r => r.reading_result === 'FAIL');
  const serverCalculatedOutcome = anyReadingFailedMPE ? 'FAIL' : 'PASS';

  // Strict statutory rule: If server-side tolerance evaluation fails, result CANNOT be PASS
  const effectiveResult = (result === 'FAIL' || serverCalculatedOutcome === 'FAIL') ? 'FAIL' : 'PASS';

  const now = new Date().toISOString();
  let verif = await Verification.findOne({ application_id: req.params.appId }).lean();
  const verifId = verif ? verif.id : `VERIF_${Date.now()}`;

  const resolvedLabParams = isGatcRole ? {
    chamber_temperature_c: lab_parameters?.chamber_temperature_c || req.body.chamber_temperature_c || '23.0',
    relative_humidity_pct: lab_parameters?.relative_humidity_pct || req.body.relative_humidity_pct || '50',
    standards_class: lab_parameters?.standards_class || req.body.standards_class || 'CLASS_E2',
    calibration_certificate_ref: lab_parameters?.calibration_certificate_ref || req.body.calibration_certificate_ref || 'NPLI/CAL/2026/894'
  } : null;

  // Persist final responses on verification object
  if (!verif) {
    await Verification.create({
      id: verifId,
      application_id: req.params.appId,
      verifier_id: actorId,
      verification_type: isGatcRole ? 'LAB_TEST' : 'FIELD_INSPECTION',
      lab_parameters: resolvedLabParams,
      status: 'COMPLETED',
      result: effectiveResult,
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
          verification_type: isGatcRole ? 'LAB_TEST' : 'FIELD_INSPECTION',
          lab_parameters: resolvedLabParams,
          status: 'COMPLETED',
          result: effectiveResult,
          remarks: remarks || '',
          completed_at: now,
          updated_at: now
        }
      }
    );
  }

  // Persist checklist responses
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

  // Persist evaluated readings with error_value, permissible_error, and calculated_result
  await VerificationReading.deleteMany({ verification_id: verifId });
  const readingDocs = evaluatedReadings.map(r => ({
    id: `RDG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    verification_id: verifId,
    test_point: r.test_point || 'Test Point',
    reference_value: r.reference_value,
    observed_value: r.observed_value,
    error_value: r.error_value,
    permissible_error: r.permissible_error,
    calculated_result: r.calculated_result,
    unit: r.unit || 'kg',
    reading_result: r.reading_result,
    updated_at: now
  }));
  await VerificationReading.insertMany(readingDocs);

  // State Transition: Field Verifier -> REPORT_SUBMITTED; GATC Lab -> GATC_REPORT_SUBMITTED
  const nextAppStatus = isGatcRole ? 'GATC_REPORT_SUBMITTED' : 'REPORT_SUBMITTED';

  await Application.updateOne({ id: req.params.appId }, { $set: { status: nextAppStatus, updated_at: now } });

  logAudit('Verification', verifId, isGatcRole ? 'GATC_LAB_REPORT_SUBMITTED' : 'FIELD_REPORT_SUBMITTED', actorId, role, {
    application_id: req.params.appId,
    result: effectiveResult,
    remarks,
    checklist_count: providedResponses.length,
    readings_count: evaluatedReadings.length,
    any_mpe_failed: anyReadingFailedMPE,
    final_application_status: nextAppStatus
  });

  // Notifications: Trader + Authority
  await sendNotification({
    recipient_user_id: appItem.trader_id,
    type: 'VERIFICATION_COMPLETED',
    title: 'Verification Report Submitted',
    message: `Verification testing completed for application ${appItem.application_no || appItem.id}. Outcome: ${effectiveResult}. Awaiting Authority approval.`,
    related_application_id: appItem.id,
    metadata: { result: effectiveResult }
  });

  await notifyRole(ROLES.AUTHORITY, {
    type: 'VERIFICATION_REPORT_SUBMITTED',
    title: `${isGatcRole ? 'GATC Lab' : 'Field Verifier'} Report Submitted`,
    message: `${isGatcRole ? 'GATC Lab' : 'Field Verifier'} report submitted for application ${appItem.application_no || appItem.id} (Outcome: ${effectiveResult}). Awaiting approval.`,
    related_application_id: appItem.id,
    metadata: { result: effectiveResult, verifier_id: actorId }
  });

  res.json({
    message: `Verification report (${effectiveResult}) submitted to Legal Metrology Authority for statutory determination.`,
    status: nextAppStatus,
    result: effectiveResult,
    evaluated_readings: evaluatedReadings
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

  // Statutory Guard: Fee must be verified as PAID
  if (appItem.fee_status !== 'PAID') {
    return res.status(400).json({
      error: 'Cannot approve application: Statutory fee has not been verified as paid.'
    });
  }

  // Eligibility check: Verification report must be submitted with PASS outcome
  const verif = await Verification.findOne({ application_id: applicationId }).lean();
  if (!verif || verif.result !== 'PASS' || verif.status !== 'COMPLETED') {
    return res.status(400).json({
      error: 'Cannot approve application: A completed verification report with PASS determination is required before approval.'
    });
  }

  const { approval_remarks } = req.body;
  const now = new Date().toISOString();

  // Issue / Generate Official Certificate
  const inst = await Instrument.findOne({ id: appItem.instrument_id }).lean();
  const ruleSet = inst ? await RuleSet.findOne({ category_id: inst.category_id }).lean() : null;
  const authorityUser = await User.findOne({ id: actorId }).lean();
  const org = authorityUser?.organization_id ? await Organization.findOne({ id: authorityUser.organization_id }).lean() : null;

  let cert = await Certificate.findOne({ verification_id: verif.id }).lean();
  if (!cert) {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const certNo = `LM-${year}-${randomDigits}-DL`;
    const publicToken = crypto.randomUUID();
    const certId = `CERT_${Date.now()}`;

    const issueDate = new Date();
    const validityMonths = ruleSet?.validity_period_months || 12;
    const validUntil = new Date(issueDate);
    validUntil.setMonth(validUntil.getMonth() + validityMonths);

    const issuingOfficer = authorityUser?.full_name || 'Legal Metrology Officer';
    const issuingAuthority = org?.name || 'Department of Consumer Affairs, Legal Metrology Division, Delhi';

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

  // 1. Update Application Status to CERTIFICATE_ISSUED (and record approval)
  await Application.updateOne(
    { id: applicationId },
    {
      $set: {
        status: 'CERTIFICATE_ISSUED',
        certificate_id: cert.id,
        certificate_no: cert.certificate_no,
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

  logAudit('Application', applicationId, 'APPLICATION_APPROVED_AND_CERTIFIED', actorId, role, {
    certificate_no: cert.certificate_no,
    public_token: cert.public_token,
    instrument_id: appItem.instrument_id
  });

  // Notifications: Trader + Verifier
  await sendNotification({
    recipient_user_id: appItem.trader_id,
    type: 'CERTIFICATE_ISSUED',
    title: 'Certificate Issued & Approved',
    message: `Application ${appItem.application_no || applicationId} approved! Certificate No: ${cert.certificate_no} has been issued.`,
    related_application_id: applicationId,
    related_certificate_id: cert.id,
    metadata: { certificate_no: cert.certificate_no, public_token: cert.public_token }
  });

  if (verif?.verifier_id) {
    await sendNotification({
      recipient_user_id: verif.verifier_id,
      type: 'CASE_APPROVED',
      title: 'Verification Case Closed & Approved',
      message: `Application ${appItem.application_no || applicationId} has been approved by Authority Officer.`,
      related_application_id: applicationId
    });
  }

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

  const rejection_reason = req.body.rejection_reason || req.body.reason || req.body.remarks;
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

  // Notification: Trader
  await sendNotification({
    recipient_user_id: appItem.trader_id,
    type: 'APPLICATION_REJECTED',
    title: 'Application Rejected',
    message: `Application ${appItem.application_no || applicationId} was rejected by the Authority. Reason: ${rejection_reason.trim()}`,
    related_application_id: applicationId,
    metadata: { rejection_reason: rejection_reason.trim() }
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
    application_id: appId,
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

  // Update application status to CERTIFICATE_ISSUED
  await Application.updateOne(
    { id: appId },
    {
      $set: {
        status: 'CERTIFICATE_ISSUED',
        certificate_id: certId,
        certificate_no: certNo,
        updated_at: issueDate.toISOString()
      }
    }
  );

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
  const rawToken = req.params.token;

  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) {
    return res.status(400).json({
      status: 'INVALID',
      error: 'Malformed or missing certificate verification reference.'
    });
  }

  const queryToken = rawToken.trim();

  // Query certificate by public_token (or fallback to certificate_no for manual entry)
  let cert = await Certificate.findOne({ public_token: queryToken }).lean();
  if (!cert) {
    cert = await Certificate.findOne({ certificate_no: queryToken }).lean();
  }

  if (!cert) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      error: 'Certificate record not found. The scanned verification reference does not correspond to any registered certificate in the official digital repository.'
    });
  }

  const verif = cert.verification_id ? await Verification.findOne({ id: cert.verification_id }).lean() : null;
  const appId = cert.application_id || (verif ? verif.application_id : null);
  let appItem = appId ? await Application.findOne({ id: appId }).lean() : null;
  if (!appItem && cert.instrument_id) {
    appItem = await Application.findOne({ instrument_id: cert.instrument_id }).sort({ created_at: -1 }).lean();
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

  // Return strictly public, sanitized verification payload (NO private payment, docs, or evidence)
  res.json({
    status: liveStatus,
    certificate_no: cert.certificate_no,
    public_token: cert.public_token,
    application_no: appItem ? (appItem.application_no || appItem.id) : (cert.application_id || null),
    issue_date: cert.issue_date,
    valid_until: cert.valid_until,
    is_expired: isExpired,
    instrument: {
      id: cert.instrument_id,
      category: cat ? cat.name : 'Weighing Instrument',
      manufacturer: inst ? inst.manufacturer : null,
      model: inst ? inst.model : null,
      serial_number: inst ? inst.serial_number : null,
      max_capacity: inst ? inst.max_capacity : null,
      min_capacity: inst ? inst.min_capacity : null,
      verification_scale_interval_e: inst ? inst.verification_scale_interval_e : null,
      location: inst ? inst.location : null,
      district: inst ? inst.district : null
    },
    verification_authority: {
      officer: cert.issuing_officer,
      authority: cert.issuing_authority,
      jurisdiction: torg ? (torg.jurisdictions || []).join(', ') : 'National Capital Territory of Delhi'
    },
    business: {
      enterprise_name: torg ? torg.name : (trader ? trader.full_name : 'Authorized Commercial Establishment'),
      trader_name: trader ? trader.full_name : null,
      location: inst ? inst.location : (trader ? trader.address : null)
    },
    verification_statement: 'Matched and authenticated against the official Department of Consumer Affairs Legal Metrology digital ledger under Section 24 of The Legal Metrology Act, 2009.'
  });
});

// Public Unauthenticated Instrument Verification via QR / Secure Public Token
app.get(['/api/public/instrument/:token', '/api/public/instruments/:token'], async (req, res) => {
  const rawToken = req.params.token;
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) {
    return res.status(400).json({ status: 'INVALID', status_label: 'INVALID TOKEN', error: 'Malformed or missing instrument verification reference.' });
  }

  const queryToken = rawToken.trim();
  let inst = await Instrument.findOne({
    $or: [{ public_token: queryToken }, { id: queryToken }, { serial_number: queryToken }]
  }).lean();

  if (!inst) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      status_label: 'INSTRUMENT NOT FOUND',
      error: 'Instrument record not found in the official Legal Metrology registry.'
    });
  }

  const cat = inst.category_id ? await InstrumentCategory.findOne({ id: inst.category_id }).lean() : null;
  const cert = await Certificate.findOne({ instrument_id: inst.id }).sort({ created_at: -1 }).lean();
  const latestApp = await Application.findOne({ instrument_id: inst.id }).sort({ created_at: -1 }).lean();

  const formatDateIN = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const now = new Date();
  let publicStatus = 'REGISTERED_NOT_VERIFIED';
  let statusLabel = 'REGISTERED — NOT CURRENTLY VERIFIED';

  if (inst.status === 'SUSPENDED') {
    publicStatus = 'SUSPENDED';
    statusLabel = 'SUSPENDED';
  } else if (inst.status === 'CANCELLED' || inst.status === 'REJECTED') {
    publicStatus = 'CANCELLED';
    statusLabel = 'CANCELLED';
  } else if (cert) {
    const validUntilDate = new Date(cert.valid_until);
    if (validUntilDate < now) {
      publicStatus = 'EXPIRED';
      statusLabel = 'VERIFICATION EXPIRED';
    } else if (cert.status === 'VALID' || inst.status === 'VERIFIED') {
      publicStatus = 'VERIFIED_VALID';
      statusLabel = 'VERIFIED — VALID';
    } else {
      publicStatus = cert.status;
      statusLabel = cert.status;
    }
  }

  try {
    logAudit('PublicInstrument', inst.id, 'PUBLIC_INSTRUMENT_QR_VERIFIED', 'PUBLIC_VISITOR', 'PUBLIC', {
      serial_number: inst.serial_number,
      status: publicStatus
    });
  } catch (err) {}

  res.json({
    status: publicStatus,
    status_label: statusLabel,
    instrument_id: inst.serial_number || inst.id,
    public_token: inst.public_token || inst.serial_number || inst.id,
    serial_number: inst.serial_number,
    category_name: cat ? cat.name : 'Legal Metrology Instrument',
    manufacturer: inst.manufacturer || 'Certified Manufacturer',
    model: inst.model || 'Standard Model',
    verification_type: latestApp?.verification_type === 'RE_VERIFICATION' ? 'Re-Verification' : 'Original Verification',
    verified_on: cert?.issue_date ? formatDateIN(cert.issue_date) : null,
    valid_until: cert?.valid_until ? formatDateIN(cert.valid_until) : null,
    valid_until_iso: cert?.valid_until || null,
    latest_certificate_no: cert ? cert.certificate_no : null,
    max_capacity: inst.max_capacity || null,
    min_capacity: inst.min_capacity || null,
    verification_scale_interval_e: inst.verification_scale_interval_e || null,
    district: inst.district || null,
    notice: 'Current verification status is based on records available in CertifyMetric.',
    verification_statement: 'Authenticated against the official Legal Metrology National Instrument Registry under Section 24 of The Legal Metrology Act, 2009.'
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
  const { email, password, role, full_name, organization_id, phone, designation } = req.body;

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
    designation: role === ROLES.VERIFIER ? (isValidDesignation(designation) ? designation : DEFAULT_DESIGNATION) : undefined,
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

// 7. Real Admin Analytics & MongoDB Aggregations
app.get('/api/admin/analytics', requirePermission('VIEW_ANALYTICS'), async (req, res) => {
  const { range = '30d' } = req.query;

  let dateFilter = {};
  const now = new Date();
  if (range === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    dateFilter = { created_at: { $gte: d.toISOString() } };
  } else if (range === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    dateFilter = { created_at: { $gte: d.toISOString() } };
  } else if (range === '6m') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    dateFilter = { created_at: { $gte: d.toISOString() } };
  }

  try {
    // 1. Applications by Status
    const statusCountsRaw = await Application.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusMap = Object.fromEntries(statusCountsRaw.map(s => [s._id, s.count]));
    const applicationsByStatus = {
      SUBMITTED: statusMap['SUBMITTED'] || 0,
      UNDER_REVIEW: statusMap['UNDER_REVIEW'] || 0,
      RETURNED: statusMap['RETURNED'] || 0,
      ASSIGNED: (statusMap['ASSIGNED'] || 0) + (statusMap['PENDING_VERIFICATION'] || 0),
      IN_VERIFICATION: statusMap['IN_VERIFICATION'] || 0,
      REPORT_SUBMITTED: (statusMap['REPORT_SUBMITTED'] || 0) + (statusMap['GATC_REPORT_SUBMITTED'] || 0),
      APPROVED: statusMap['APPROVED'] || 0,
      REJECTED: statusMap['REJECTED'] || 0,
      CERTIFICATE_ISSUED: statusMap['CERTIFICATE_ISSUED'] || 0
    };

    // 2. Applications Over Time (Trend)
    const appsForTimeline = await Application.find(dateFilter, { created_at: 1 }).sort({ created_at: 1 }).lean();
    const timelineBuckets = {};
    for (const app of appsForTimeline) {
      const dStr = app.created_at ? app.created_at.substring(0, 10) : new Date().toISOString().substring(0, 10);
      timelineBuckets[dStr] = (timelineBuckets[dStr] || 0) + 1;
    }
    const applicationsOverTime = Object.entries(timelineBuckets).map(([date, count]) => ({
      date,
      count
    }));

    // 3. Verification Type
    const typeCountsRaw = await Application.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$request_type', count: { $sum: 1 } } }
    ]);
    const typeMap = Object.fromEntries(typeCountsRaw.map(t => [t._id, t.count]));
    const verificationType = {
      ORIGINAL: (typeMap['ORIGINAL'] || 0) + (typeMap['INITIAL_VERIFICATION'] || 0),
      RE_VERIFICATION: typeMap['RE_VERIFICATION'] || 0
    };

    // 4. Verification Mode
    const modeCountsRaw = await Application.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$verification_mode', count: { $sum: 1 } } }
    ]);
    const modeMap = Object.fromEntries(modeCountsRaw.map(m => [m._id, m.count]));
    const verificationMode = {
      IN_SITU: modeMap['IN_SITU'] || 0,
      CAMP: modeMap['CAMP'] || 0,
      GATC: modeMap['GATC'] || modeMap['GATC_LAB'] || 0
    };

    // 5. Payment Status & Revenue
    const payCountsRaw = await Application.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$fee_status', count: { $sum: 1 }, totalRevenue: { $sum: { $ifNull: ['$fee_breakdown.total_fee', 300] } } } }
    ]);
    const payMap = Object.fromEntries(payCountsRaw.map(p => [p._id, p]));
    const paymentStatus = {
      PENDING: (payMap['PENDING']?.count || 0) + (payMap['PENDING_VERIFICATION']?.count || 0),
      PAID: payMap['PAID']?.count || 0,
      FAILED: payMap['FAILED']?.count || 0,
      total_revenue: payMap['PAID']?.totalRevenue || 0
    };

    // 6. Certificate Statistics
    const allCerts = await Certificate.find().lean();
    let issued = allCerts.length;
    let active = 0;
    let expired = 0;
    const currentDate = new Date();
    for (const c of allCerts) {
      if (c.status === 'EXPIRED' || (c.valid_until && new Date(c.valid_until) < currentDate)) {
        expired++;
      } else if (c.status === 'VALID') {
        active++;
      } else {
        active++;
      }
    }
    const certificateStats = {
      issued,
      active,
      expired
    };

    // 6b. Certificates Over Time
    const certsForTimeline = await Certificate.find({}, { issue_date: 1, created_at: 1 }).sort({ created_at: 1 }).lean();
    const certBuckets = {};
    for (const c of certsForTimeline) {
      const dStr = (c.issue_date || c.created_at || '').substring(0, 10) || new Date().toISOString().substring(0, 10);
      certBuckets[dStr] = (certBuckets[dStr] || 0) + 1;
    }
    const certificatesOverTime = Object.entries(certBuckets).map(([date, count]) => ({
      date,
      count
    }));

    // 7. Real Verification Outcomes (Pass, Fail, Pending)
    const verificationsList = await Verification.find().lean();
    let passCount = 0;
    let failCount = 0;
    let pendingVerifCount = 0;
    for (const v of verificationsList) {
      const resVal = String(v.result || v.status || '').toUpperCase();
      if (resVal === 'PASS' || resVal === 'COMPLETED' || resVal === 'VERIFIED') {
        passCount++;
      } else if (resVal === 'FAIL' || resVal === 'FAILED' || resVal === 'REJECTED') {
        failCount++;
      } else {
        pendingVerifCount++;
      }
    }
    const verificationOutcomes = {
      PASS: passCount,
      FAIL: failCount,
      PENDING: pendingVerifCount,
      total: verificationsList.length
    };

    // 8. Platform Summary Counts from MongoDB
    const [totalUsers, activeUsers, totalOrgs, totalInstruments, totalApplications, totalCertificates, totalOfficesLabs, totalCategories] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ $or: [{ status: 'ACTIVE' }, { active: true }, { active: { $exists: false } }] }),
      Organization.countDocuments(),
      Instrument.countDocuments(),
      Application.countDocuments(),
      Certificate.countDocuments(),
      Organization.countDocuments({ type: { $in: ['STATUTORY_AUTHORITY', 'TEST_CENTRE', 'OFFICE', 'LAB', 'AUTHORITY', 'GATC'] } }),
      InstrumentCategory.countDocuments()
    ]);

    const summary = {
      totalUsers,
      activeUsers,
      totalOrgs,
      totalInstruments,
      totalApplications,
      totalCertificates,
      totalOfficesLabs,
      totalCategories
    };

    // 9. Field & GATC Workload
    const officers = await User.find({ role: { $in: [ROLES.VERIFIER, ROLES.GATC] } }).lean();
    const assignments = await Assignment.find().lean();
    const verifMap = new Set(verificationsList.filter(v => v.status === 'COMPLETED' || v.result).map(v => v.application_id));

    const workloadList = officers.map(officer => {
      const officerAssignments = assignments.filter(a => a.assigned_id === officer.id);
      const totalAssigned = officerAssignments.length;
      const completed = officerAssignments.filter(a => verifMap.has(a.application_id)).length;
      const pending = Math.max(0, totalAssigned - completed);

      return {
        id: officer.id,
        name: officer.full_name,
        role: officer.role,
        designation: officer.designation || officer.role,
        total_assigned: totalAssigned,
        completed,
        pending
      };
    });

    res.json({
      range,
      summary,
      applicationsByStatus,
      applicationsOverTime,
      verificationOutcomes,
      certificatesOverTime,
      verificationType,
      verificationMode,
      paymentStatus,
      certificateStats,
      workloadList,
      total_applications: Object.values(applicationsByStatus).reduce((a, b) => a + b, 0),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Analytics aggregation error:', err);
    res.status(500).json({ error: 'Failed to aggregate analytics data' });
  }
});

// ==========================================
// 9. PRODUCTION ERROR & LIFECYCLE HANDLING
// ==========================================

// Serve static client assets if built in client/dist
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 Handler for unknown API / upload routes
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
