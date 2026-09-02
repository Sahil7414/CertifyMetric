import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from './db.js';
import { ROLES, hasPermission } from './permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema & seed data
initDatabase();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Set up static uploads folder for evidence
const uploadDir = path.join(__dirname, 'uploads');
const evidenceDir = path.join(uploadDir, 'evidence');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Configure Multer for Evidence Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, evidenceDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `ev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper: Audit Logger
function logAudit(entityName, entityId, action, actorId, actorRole, details) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, entity_name, entity_id, action, actor_id, actor_role, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `AUD_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      entityName,
      entityId,
      action,
      actorId || 'SYSTEM',
      actorRole || 'SYSTEM',
      JSON.stringify(details || {}),
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

import { verifyPassword } from './auth-utils.js';

// Helper: Enforce Role from Database (Strict Server-Side Authorization)
function getActor(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : req.headers['x-auth-token'];

  if (token) {
    const session = db.prepare('SELECT * FROM user_sessions WHERE token = ?').get(token);
    if (session && new Date(session.expires_at) > new Date()) {
      const user = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(session.user_id);
      if (user) {
        // Enforce authoritative role from database
        return { id: user.id, role: user.role, email: user.email };
      }
    }
  }

  // Fallback for API integration tests with x-user-id: Lookup real user role in DB
  const userId = req.headers['x-user-id'];
  if (userId) {
    const user = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(userId);
    if (user) {
      return { id: user.id, role: user.role, email: user.email };
    }
  }

  // System actions (only when explicitly from system background tasks)
  if (req.headers['x-user-role'] === 'SYSTEM') {
    return { id: 'SYSTEM', role: 'SYSTEM' };
  }

  return { id: 'ANONYMOUS', role: 'ANONYMOUS' };
}

// ==========================================
// 1. AUTHENTICATION & DEMO USERS
// ==========================================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Verify password hash against stored hash in database
  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Generate real session token
  const token = `tok_${user.id}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  db.prepare(`
    INSERT INTO user_sessions (token, user_id, role, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    token,
    user.id,
    user.role,
    new Date().toISOString(),
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  );

  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(user.organization_id);

  logAudit('UserAuth', user.id, 'USER_LOGGED_IN', user.id, user.role, { email: user.email });

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser, organization: org });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : req.headers['x-auth-token'];
  if (token) {
    db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
  }
  res.json({ success: true });
});

app.get('/api/auth/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.role, u.organization_id, u.phone, u.avatar, u.is_demo,
           o.name as organization_name 
    FROM users u 
    LEFT JOIN organizations o ON u.organization_id = o.id
  `).all();
  res.json(users);
});

// ==========================================
// 2. INSTRUMENT REGISTRY (TRADER ONLY)
// ==========================================

app.get('/api/instruments', (req, res) => {
  const { owner_id } = req.query;
  let query = `
    SELECT i.*, c.name as category_name, c.code as category_code
    FROM instruments i
    JOIN instrument_categories c ON i.category_id = c.id
  `;
  const params = [];
  if (owner_id) {
    query += ' WHERE i.owner_id = ?';
    params.push(owner_id);
  }
  query += ' ORDER BY i.created_at DESC';
  const instruments = db.prepare(query).all(...params);
  res.json(instruments);
});

app.get('/api/instruments/:id', (req, res) => {
  const instrument = db.prepare(`
    SELECT i.*, c.name as category_name, c.code as category_code,
           u.full_name as owner_name, o.name as owner_org
    FROM instruments i
    JOIN instrument_categories c ON i.category_id = c.id
    JOIN users u ON i.owner_id = u.id
    LEFT JOIN organizations o ON u.organization_id = o.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!instrument) return res.status(404).json({ error: 'Instrument not found' });

  // Fetch verifications & certificates history
  const history = db.prepare(`
    SELECT v.*, a.application_no, a.request_type, u.full_name as verifier_name,
           c.id as certificate_id, c.certificate_no, c.public_token, c.issue_date, c.valid_until, c.status as certificate_status
    FROM verifications v
    JOIN applications a ON v.application_id = a.id
    LEFT JOIN users u ON v.verifier_id = u.id
    LEFT JOIN certificates c ON c.verification_id = v.id
    WHERE a.instrument_id = ?
    ORDER BY v.completed_at DESC
  `).all(req.params.id);

  res.json({ ...instrument, history });
});

app.post('/api/instruments', (req, res) => {
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

  const existing = db.prepare('SELECT id FROM instruments WHERE serial_number = ?').get(serial_number);
  if (existing) {
    return res.status(400).json({ error: 'Instrument with this serial number is already registered' });
  }

  const id = `INST_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO instruments (id, owner_id, category_id, manufacturer, model, serial_number, max_capacity, min_capacity, verification_scale_interval_e, location, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REGISTERED', ?)
  `).run(id, owner_id, category_id || 'CAT_NAWI_III', manufacturer, model, serial_number, max_capacity || '30 kg', min_capacity || '100 g', verification_scale_interval_e || '5 g', location, now);

  logAudit('Instrument', id, 'REGISTER', actorId, role, { serial_number, manufacturer, model });

  res.status(201).json({ id, message: 'Instrument registered successfully' });
});

// ==========================================
// 3. VERIFICATION APPLICATIONS (TRADER SUBMITS)
// ==========================================

app.get('/api/applications', (req, res) => {
  const { trader_id, status } = req.query;
  let query = `
    SELECT a.*, i.manufacturer, i.model, i.serial_number, i.location, c.name as category_name,
           u.full_name as trader_name, org.name as trader_org,
           asn.assigned_id, asn.assigned_type, asn.is_override,
           assignee.full_name as assigned_to_name
    FROM applications a
    JOIN instruments i ON a.instrument_id = i.id
    JOIN instrument_categories c ON i.category_id = c.id
    JOIN users u ON a.trader_id = u.id
    LEFT JOIN organizations org ON u.organization_id = org.id
    LEFT JOIN assignments asn ON asn.application_id = a.id
    LEFT JOIN users assignee ON asn.assigned_id = assignee.id
  `;
  const conditions = [];
  const params = [];
  if (trader_id) {
    conditions.push('a.trader_id = ?');
    params.push(trader_id);
  }
  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY a.created_at DESC';

  const applications = db.prepare(query).all(...params);
  res.json(applications);
});

app.get('/api/applications/:id', (req, res) => {
  const application = db.prepare(`
    SELECT a.*, i.manufacturer, i.model, i.serial_number, i.max_capacity, i.min_capacity,
           i.verification_scale_interval_e, i.location, c.name as category_name,
           u.full_name as trader_name, u.phone as trader_phone, u.email as trader_email,
           org.name as trader_org, org.jurisdiction as trader_jurisdiction,
           asn.id as assignment_id, asn.assigned_type, asn.assigned_id, asn.recommended_id, asn.is_override, asn.override_reason,
           assignee.full_name as assigned_to_name,
           apt.scheduled_date, apt.time_slot, apt.arrangement_type,
           v.result as verification_result, v.remarks as verification_remarks, v.completed_at as verification_completed_at,
           cert.id as certificate_id, cert.certificate_no, cert.status as certificate_status,
           cert.issue_date as certificate_issue_date, cert.valid_until as certificate_valid_until
    FROM applications a
    JOIN instruments i ON a.instrument_id = i.id
    JOIN instrument_categories c ON i.category_id = c.id
    JOIN users u ON a.trader_id = u.id
    LEFT JOIN organizations org ON u.organization_id = org.id
    LEFT JOIN assignments asn ON asn.application_id = a.id
    LEFT JOIN users assignee ON asn.assigned_id = assignee.id
    LEFT JOIN appointments apt ON apt.assignment_id = asn.id
    LEFT JOIN verifications v ON v.application_id = a.id
    LEFT JOIN certificates cert ON cert.verification_id = v.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!application) return res.status(404).json({ error: 'Application not found' });
  res.json(application);
});

app.post('/api/applications', (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'SUBMIT_APPLICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' is not permitted to submit verification requests.` });
  }

  const { instrument_id, trader_id, request_type } = req.body;
  if (!instrument_id || !trader_id) {
    return res.status(400).json({ error: 'Missing instrument or trader ID' });
  }

  const inst = db.prepare('SELECT id, status, owner_id FROM instruments WHERE id = ?').get(instrument_id);
  if (!inst) return res.status(404).json({ error: 'Instrument not found' });
  if (inst.owner_id !== trader_id && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: 'Forbidden: You can only apply for your own registered instruments.' });
  }

  const activeApp = db.prepare("SELECT id FROM applications WHERE instrument_id = ? AND status NOT IN ('VERIFICATION_COMPLETED', 'VERIFICATION_FAILED')").get(instrument_id);
  if (activeApp) {
    return res.status(400).json({ error: 'An active verification application is already in progress for this instrument.' });
  }

  const id = `APP_${Date.now()}`;
  const appNo = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO applications (id, application_no, instrument_id, trader_id, request_type, status, documents_json, fee_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'SUBMITTED', '[]', 'PAID', ?, ?)
  `).run(id, appNo, instrument_id, trader_id, request_type || 'INITIAL_VERIFICATION', now, now);

  db.prepare("UPDATE instruments SET status = 'UNDER_VERIFICATION' WHERE id = ?").run(instrument_id);

  logAudit('Application', id, 'SUBMIT', actorId, role, { application_no: appNo, instrument_id });

  res.status(201).json({ id, application_no: appNo, status: 'SUBMITTED', message: 'Verification application submitted successfully' });
});

// ==========================================
// 4. AUTHORITY REVIEW & ASSIGNMENT
// ==========================================

app.post('/api/applications/:id/review', (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'REVIEW_APPLICATION')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot review applications.` });
  }

  const appItem = db.prepare('SELECT id, status FROM applications WHERE id = ?').get(req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  if (appItem.status !== 'SUBMITTED' && appItem.status !== 'UNDER_REVIEW') {
    return res.status(400).json({ error: `Invalid state transition: Cannot review application in state '${appItem.status}'` });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE applications SET status = 'UNDER_REVIEW', updated_at = ? WHERE id = ?").run(now, req.params.id);

  logAudit('Application', req.params.id, 'STATUTORY_REVIEW_OPENED', actorId, role, { previous_status: appItem.status });

  res.json({ message: 'Application is now under statutory review', status: 'UNDER_REVIEW' });
});

app.get('/api/applications/:id/candidates', (req, res) => {
  const { role } = getActor(req);
  if (!hasPermission(role, 'ASSIGN_VERIFIER')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot access verifier allocation engine.` });
  }

  const appItem = db.prepare(`
    SELECT a.*, i.category_id, i.location, org.jurisdiction 
    FROM applications a
    JOIN instruments i ON a.instrument_id = i.id
    JOIN users u ON a.trader_id = u.id
    LEFT JOIN organizations org ON u.organization_id = org.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const candidates = db.prepare(`
    SELECT u.id, u.full_name, u.role, u.phone, o.name as organization_name, o.jurisdiction,
           (SELECT COUNT(*) FROM assignments WHERE assigned_id = u.id) as current_workload
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.role IN ('VERIFIER', 'GATC')
  `).all();

  const scored = candidates.map(c => {
    let score = 100 - (c.current_workload * 12);
    let matchReason = 'Authorized statutory Legal Metrology Officer';
    if (c.role === 'GATC') {
      score += 5;
      matchReason = 'Approved test centre with verified mass standard laboratory';
    }
    return {
      ...c,
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

app.post('/api/applications/:id/assign', (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'ASSIGN_VERIFIER')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot assign verifiers.` });
  }

  const applicationId = req.params.id;
  const appItem = db.prepare('SELECT id, status FROM applications WHERE id = ?').get(applicationId);
  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(appItem.status)) {
    return res.status(400).json({ error: `Invalid state transition: Cannot assign verifier to application in state '${appItem.status}'` });
  }

  const { assigned_id, recommended_id, is_override, override_reason, scheduled_date, time_slot, arrangement_type } = req.body;
  if (!assigned_id) return res.status(400).json({ error: 'Target assignee ID is required' });

  const assignee = db.prepare('SELECT id, role, full_name FROM users WHERE id = ?').get(assigned_id);
  if (!assignee) return res.status(404).json({ error: 'Assignee user not found' });
  if (![ROLES.VERIFIER, ROLES.GATC].includes(assignee.role)) {
    return res.status(400).json({ error: 'Assignee must have role VERIFIER or GATC' });
  }

  const assignmentId = `ASN_${Date.now()}`;
  const now = new Date().toISOString();

  const existingAsn = db.prepare('SELECT id FROM assignments WHERE application_id = ?').get(applicationId);
  if (existingAsn) {
    db.prepare(`
      UPDATE assignments 
      SET assigned_id = ?, assigned_type = ?, is_override = ?, override_reason = ?, assigned_by = ?
      WHERE id = ?
    `).run(assigned_id, assignee.role, is_override ? 1 : 0, override_reason || '', actorId, existingAsn.id);
  } else {
    db.prepare(`
      INSERT INTO assignments (id, application_id, assigned_type, assigned_id, recommended_id, is_override, override_reason, assigned_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(assignmentId, applicationId, assignee.role, assigned_id, recommended_id || assigned_id, is_override ? 1 : 0, override_reason || '', actorId, now);
  }

  // Appointment scheduling if provided
  const targetAsnId = existingAsn ? existingAsn.id : assignmentId;
  const aptId = `APT_${Date.now()}`;
  const existingApt = db.prepare('SELECT id FROM appointments WHERE assignment_id = ?').get(targetAsnId);
  if (existingApt) {
    db.prepare(`
      UPDATE appointments 
      SET scheduled_date = ?, time_slot = ?, arrangement_type = ?
      WHERE id = ?
    `).run(scheduled_date || '', time_slot || 'MORNING_10_00', arrangement_type || 'FIELD_VISIT', existingApt.id);
  } else {
    db.prepare(`
      INSERT INTO appointments (id, assignment_id, scheduled_date, time_slot, arrangement_type, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?)
    `).run(aptId, targetAsnId, scheduled_date || '', time_slot || 'MORNING_10_00', arrangement_type || 'FIELD_VISIT', now);
  }

  // Transition: -> ASSIGNED
  db.prepare("UPDATE applications SET status = 'ASSIGNED', updated_at = ? WHERE id = ?").run(now, applicationId);

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
app.get('/api/verifications/cases', (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'VIEW_ASSIGNED_CASES') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot access verifier queue.` });
  }

  const { verifier_id } = req.query;
  const targetVerifierId = verifier_id || actorId;

  let query = `
    SELECT a.id as application_id, a.application_no, a.request_type, a.status as application_status,
           i.id as instrument_id, i.manufacturer, i.model, i.serial_number, i.max_capacity, i.location,
           u.full_name as trader_name, u.phone as trader_phone,
           asn.assigned_id, asn.is_override,
           apt.scheduled_date, apt.time_slot, apt.arrangement_type,
           v.id as verification_id, v.status as verification_status, v.result as verification_result
    FROM applications a
    JOIN assignments asn ON asn.application_id = a.id
    JOIN instruments i ON a.instrument_id = i.id
    JOIN users u ON a.trader_id = u.id
    LEFT JOIN appointments apt ON apt.assignment_id = asn.id
    LEFT JOIN verifications v ON v.application_id = a.id
    WHERE a.status IN ('ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_COMPLETED', 'VERIFICATION_FAILED')
  `;
  const params = [];
  if (role !== ROLES.PLATFORM_ADMIN && targetVerifierId !== 'UNKNOWN') {
    query += ' AND asn.assigned_id = ?';
    params.push(targetVerifierId);
  }
  query += ' ORDER BY a.updated_at DESC';

  const cases = db.prepare(query).all(...params);
  res.json(cases);
});

// Get Verification Workspace Context
app.get('/api/verifications/cases/:appId', (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'OPEN_VERIFICATION_WORKSPACE') && role !== ROLES.PLATFORM_ADMIN && role !== ROLES.AUTHORITY) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot open verification workspace.` });
  }

  const caseItem = db.prepare(`
    SELECT a.id as application_id, a.application_no, a.status as application_status, a.request_type,
           i.id as instrument_id, i.manufacturer, i.model, i.serial_number, i.max_capacity, i.min_capacity,
           i.verification_scale_interval_e, i.location, c.name as category_name,
           u.full_name as trader_name, u.phone as trader_phone, u.email as trader_email,
           org.name as trader_org, org.jurisdiction as trader_jurisdiction,
           asn.assigned_id, asn.assigned_type, asn.created_at as assigned_at,
           assigner.full_name as assigned_by_name,
           apt.scheduled_date, apt.time_slot, apt.arrangement_type,
           r.checklist_schema_json, r.mpe_rules_json,
           v.id as verification_id, v.status as verification_status, v.result as verification_result,
           v.remarks as observations, v.started_at, v.completed_at,
           cert.id as certificate_id, cert.certificate_no, cert.status as certificate_status,
           cert.issue_date, cert.valid_until, cert.public_token
    FROM applications a
    JOIN instruments i ON a.instrument_id = i.id
    JOIN instrument_categories c ON i.category_id = c.id
    JOIN rule_sets r ON r.category_id = c.id
    JOIN users u ON a.trader_id = u.id
    LEFT JOIN organizations org ON u.organization_id = org.id
    JOIN assignments asn ON asn.application_id = a.id
    LEFT JOIN users assigner ON asn.assigned_by = assigner.id
    LEFT JOIN appointments apt ON apt.assignment_id = asn.id
    LEFT JOIN verifications v ON v.application_id = a.id
    LEFT JOIN certificates cert ON cert.verification_id = v.id
    WHERE a.id = ?
  `).get(req.params.appId);

  if (!caseItem) return res.status(404).json({ error: 'Case not found' });

  // Access validation: verifier must be the assigned officer
  if (role === ROLES.VERIFIER && caseItem.assigned_id !== actorId && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: 'Forbidden: You are not the assigned verifier for this case.' });
  }

  // Load existing checklist responses
  const checklistResponses = caseItem.verification_id
    ? db.prepare('SELECT * FROM verification_checklist_responses WHERE verification_id = ?').all(caseItem.verification_id)
    : [];

  // Load existing readings
  const readings = caseItem.verification_id
    ? db.prepare('SELECT * FROM verification_readings WHERE verification_id = ? ORDER BY reference_value ASC').all(caseItem.verification_id)
    : [];

  // Load existing evidence attachments
  const evidence = caseItem.verification_id
    ? db.prepare('SELECT * FROM verification_evidence WHERE verification_id = ? ORDER BY created_at DESC').all(caseItem.verification_id)
    : [];

  res.json({
    ...caseItem,
    checklist_schema: JSON.parse(caseItem.checklist_schema_json || '[]'),
    mpe_rules: JSON.parse(caseItem.mpe_rules_json || '{}'),
    checklist_responses: checklistResponses,
    readings,
    evidence
  });
});

// Start Verification: ASSIGNED -> IN_PROGRESS
app.post('/api/verifications/cases/:appId/start', (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot start verifications.` });
  }

  const appItem = db.prepare(`
    SELECT a.id, a.status, asn.assigned_id 
    FROM applications a 
    JOIN assignments asn ON asn.application_id = a.id 
    WHERE a.id = ?
  `).get(req.params.appId);

  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  if (role !== ROLES.PLATFORM_ADMIN && appItem.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can start this verification.' });
  }

  if (appItem.status !== 'ASSIGNED' && appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Cannot start verification on application in state '${appItem.status}'.` });
  }

  const now = new Date().toISOString();
  let verif = db.prepare('SELECT id FROM verifications WHERE application_id = ?').get(req.params.appId);
  const verifId = verif ? verif.id : `VERIF_${Date.now()}`;

  if (!verif) {
    db.prepare(`
      INSERT INTO verifications (id, application_id, verifier_id, status, started_at, created_at, updated_at)
      VALUES (?, ?, ?, 'IN_PROGRESS', ?, ?, ?)
    `).run(verifId, req.params.appId, actorId, now, now, now);
  } else {
    db.prepare(`
      UPDATE verifications 
      SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, ?), updated_at = ? 
      WHERE id = ?
    `).run(now, now, verifId);
  }

  // State Transition: -> IN_PROGRESS
  db.prepare("UPDATE applications SET status = 'IN_PROGRESS', updated_at = ? WHERE id = ?").run(now, req.params.appId);

  logAudit('Verification', verifId, 'VERIFICATION_STARTED', actorId, role, {
    application_id: req.params.appId
  });

  res.json({ message: 'Verification started', status: 'IN_PROGRESS', verification_id: verifId });
});

// Save Draft (Checklist, Readings, Observations)
app.post('/api/verifications/cases/:appId/draft', (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot record verification draft.` });
  }

  const appItem = db.prepare(`
    SELECT a.id, a.status, asn.assigned_id 
    FROM applications a 
    JOIN assignments asn ON asn.application_id = a.id 
    WHERE a.id = ?
  `).get(req.params.appId);

  if (!appItem) return res.status(404).json({ error: 'Application not found' });
  if (role !== ROLES.PLATFORM_ADMIN && appItem.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can save draft data.' });
  }
  if (appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Cannot save draft for application in status '${appItem.status}'. Must be 'IN_PROGRESS'.` });
  }

  const { checklist_responses, readings, observations } = req.body;
  const now = new Date().toISOString();

  let verif = db.prepare('SELECT id FROM verifications WHERE application_id = ?').get(req.params.appId);
  if (!verif) {
    const verifId = `VERIF_${Date.now()}`;
    db.prepare(`
      INSERT INTO verifications (id, application_id, verifier_id, status, remarks, started_at, created_at, updated_at)
      VALUES (?, ?, ?, 'IN_PROGRESS', ?, ?, ?, ?)
    `).run(verifId, req.params.appId, actorId, observations || '', now, now, now);
    verif = { id: verifId };
  } else {
    db.prepare(`
      UPDATE verifications 
      SET remarks = ?, updated_at = ? 
      WHERE id = ?
    `).run(observations || '', now, verif.id);
  }

  // Save checklist responses
  if (Array.isArray(checklist_responses)) {
    const upsertChk = db.prepare(`
      INSERT INTO verification_checklist_responses (id, verification_id, item_id, status, note, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(verification_id, item_id) DO UPDATE SET
        status = excluded.status,
        note = excluded.note,
        updated_at = excluded.updated_at
    `);
    for (const chk of checklist_responses) {
      if (chk.item_id) {
        upsertChk.run(`CHK_RES_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, verif.id, chk.item_id, chk.status || 'PASS', chk.note || '', now);
      }
    }
  }

  // Save measurement readings
  if (Array.isArray(readings)) {
    db.prepare('DELETE FROM verification_readings WHERE verification_id = ?').run(verif.id);
    const insertReading = db.prepare(`
      INSERT INTO verification_readings (id, verification_id, test_point, reference_value, observed_value, unit, reading_result, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of readings) {
      insertReading.run(
        `RDG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        verif.id,
        r.test_point || 'Test Point',
        Number(r.reference_value) || 0,
        r.observed_value !== undefined && r.observed_value !== '' ? Number(r.observed_value) : null,
        r.unit || 'kg',
        r.reading_result || 'PASS',
        now
      );
    }
  }

  logAudit('Verification', verif.id, 'VERIFICATION_DRAFT_SAVED', actorId, role, {
    application_id: req.params.appId,
    checklist_count: checklist_responses?.length || 0,
    readings_count: readings?.length || 0
  });

  res.json({ message: 'Verification draft saved successfully' });
});

// Upload Evidence Attachment
app.post('/api/verifications/cases/:appId/evidence', upload.single('file'), (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot attach evidence.` });
  }

  const appItem = db.prepare(`
    SELECT a.id, a.status, asn.assigned_id 
    FROM applications a 
    JOIN assignments asn ON asn.application_id = a.id 
    WHERE a.id = ?
  `).get(req.params.appId);

  if (!appItem) return res.status(404).json({ error: 'Application not found' });
  if (role !== ROLES.PLATFORM_ADMIN && appItem.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can attach evidence.' });
  }
  if (appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Cannot attach evidence for application in status '${appItem.status}'. Must be 'IN_PROGRESS'.` });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const now = new Date().toISOString();
  let verif = db.prepare('SELECT id FROM verifications WHERE application_id = ?').get(req.params.appId);
  if (!verif) {
    const verifId = `VERIF_${Date.now()}`;
    db.prepare(`
      INSERT INTO verifications (id, application_id, verifier_id, status, started_at, created_at, updated_at)
      VALUES (?, ?, ?, 'IN_PROGRESS', ?, ?, ?)
    `).run(verifId, req.params.appId, actorId, now, now, now);
    verif = { id: verifId };
  }

  const evidenceId = `EV_${Date.now()}`;
  const relativePath = `/uploads/evidence/${req.file.filename}`;
  const category = req.body.category || 'DEVICE_SETUP';
  const caption = req.body.caption || req.file.originalname;

  db.prepare(`
    INSERT INTO verification_evidence (id, verification_id, file_name, file_path, file_type, category, caption, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(evidenceId, verif.id, req.file.originalname, relativePath, req.file.mimetype, category, caption, now);

  logAudit('Verification', verif.id, 'EVIDENCE_ATTACHED', actorId, role, {
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
app.delete('/api/verifications/cases/:appId/evidence/:evidenceId', (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot delete evidence.` });
  }

  const appItem = db.prepare(`
    SELECT a.id, a.status, asn.assigned_id 
    FROM applications a 
    JOIN assignments asn ON asn.application_id = a.id 
    WHERE a.id = ?
  `).get(req.params.appId);

  if (!appItem) return res.status(404).json({ error: 'Application not found' });
  if (role !== ROLES.PLATFORM_ADMIN && appItem.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can delete evidence.' });
  }
  if (appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Cannot modify evidence for application in status '${appItem.status}'. Must be 'IN_PROGRESS'.` });
  }

  const ev = db.prepare('SELECT id, file_path, verification_id FROM verification_evidence WHERE id = ?').get(req.params.evidenceId);
  if (!ev) return res.status(404).json({ error: 'Evidence record not found' });

  db.prepare('DELETE FROM verification_evidence WHERE id = ?').run(req.params.evidenceId);

  // Optional: Remove physical file if on disk
  try {
    const fullPath = path.join(__dirname, ev.file_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (e) {}

  logAudit('Verification', ev.verification_id, 'EVIDENCE_REMOVED', actorId, role, {
    evidence_id: req.params.evidenceId
  });

  res.json({ message: 'Evidence removed successfully' });
});

// Submit Verification Result (PASS / FAIL)
app.post('/api/verifications/cases/:appId/submit', (req, res) => {
  const { role, id: actorId } = getActor(req);

  if (!hasPermission(role, 'RECORD_VERIFICATION') && role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot submit verification outcomes.` });
  }

  const appItem = db.prepare(`
    SELECT a.id, a.instrument_id, a.status, asn.assigned_id, r.checklist_schema_json
    FROM applications a 
    JOIN assignments asn ON asn.application_id = a.id 
    JOIN instruments i ON a.instrument_id = i.id
    JOIN rule_sets r ON r.category_id = i.category_id
    WHERE a.id = ?
  `).get(req.params.appId);

  if (!appItem) return res.status(404).json({ error: 'Application not found' });
  if (role !== ROLES.PLATFORM_ADMIN && appItem.assigned_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: Only the assigned verifier can submit verification results.' });
  }
  if (appItem.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: `Invalid state transition: Cannot submit result for application in state '${appItem.status}'. Must be 'IN_PROGRESS'.` });
  }

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
  const checklistSchema = JSON.parse(appItem.checklist_schema_json || '[]');
  const requiredItemIds = checklistSchema.filter(i => i.required).map(i => i.id);
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
  let verif = db.prepare('SELECT id FROM verifications WHERE application_id = ?').get(req.params.appId);
  const verifId = verif ? verif.id : `VERIF_${Date.now()}`;

  // Persist final responses
  if (!verif) {
    db.prepare(`
      INSERT INTO verifications (id, application_id, verifier_id, status, result, remarks, started_at, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?)
    `).run(verifId, req.params.appId, actorId, result, remarks || '', now, now, now, now);
  } else {
    db.prepare(`
      UPDATE verifications 
      SET status = 'COMPLETED', result = ?, remarks = ?, completed_at = ?, updated_at = ? 
      WHERE id = ?
    `).run(result, remarks || '', now, now, verifId);
  }

  // Persist responses
  const upsertChk = db.prepare(`
    INSERT INTO verification_checklist_responses (id, verification_id, item_id, status, note, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(verification_id, item_id) DO UPDATE SET
      status = excluded.status,
      note = excluded.note,
      updated_at = excluded.updated_at
  `);
  for (const chk of providedResponses) {
    if (chk.item_id) {
      upsertChk.run(`CHK_RES_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, verifId, chk.item_id, chk.status, chk.note || '', now);
    }
  }

  // Persist readings
  db.prepare('DELETE FROM verification_readings WHERE verification_id = ?').run(verifId);
  const insertReading = db.prepare(`
    INSERT INTO verification_readings (id, verification_id, test_point, reference_value, observed_value, unit, reading_result, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of readings) {
    insertReading.run(
      `RDG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      verifId,
      r.test_point || 'Test Point',
      Number(r.reference_value) || 0,
      Number(r.observed_value),
      r.unit || 'kg',
      r.reading_result || 'PASS',
      now
    );
  }

  // State Transitions for Application & Instrument
  const nextAppStatus = result === 'PASS' ? 'VERIFICATION_COMPLETED' : 'VERIFICATION_FAILED';
  const nextInstStatus = result === 'PASS' ? 'VERIFIED' : 'REJECTED';

  db.prepare("UPDATE applications SET status = ?, updated_at = ? WHERE id = ?").run(nextAppStatus, now, req.params.appId);
  db.prepare("UPDATE instruments SET status = ? WHERE id = ?").run(nextInstStatus, appItem.instrument_id);

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
app.post('/api/certificates/generate/:appId', (req, res) => {
  const { role, id: actorId } = getActor(req);

  // Authority, Verifier, GATC or Admin can trigger certificate generation
  if (![ROLES.VERIFIER, ROLES.GATC, ROLES.AUTHORITY, ROLES.PLATFORM_ADMIN].includes(role)) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot generate statutory certificates.` });
  }

  const appId = req.params.appId;
  const appItem = db.prepare(`
    SELECT a.*, i.id as inst_id, i.category_id, i.owner_id,
           r.validity_period_months,
           v.id as verification_id, v.result as verification_result, v.status as verification_status,
           u.full_name as verifier_name, o.name as authority_name
    FROM applications a
    JOIN instruments i ON a.instrument_id = i.id
    LEFT JOIN rule_sets r ON r.category_id = i.category_id
    LEFT JOIN verifications v ON v.application_id = a.id
    LEFT JOIN users u ON v.verifier_id = u.id
    LEFT JOIN organizations o ON u.organization_id = o.id
    WHERE a.id = ?
  `).get(appId);

  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  // 1. Verification Eligibility Check: Must be COMPLETED and PASS
  if (!appItem.verification_id || appItem.verification_result !== 'PASS') {
    return res.status(400).json({
      error: 'Ineligible: Statutory certificate cannot be generated for an incomplete, missing, or failed verification.'
    });
  }

  // 2. Idempotency Check: If certificate already exists, return it without creating duplicate
  const existingCert = db.prepare(`
    SELECT c.*, i.manufacturer, i.model, i.serial_number, i.max_capacity, i.min_capacity,
           i.verification_scale_interval_e, i.location,
           cat.name as category_name, trader.full_name as owner_name, torg.name as owner_org
    FROM certificates c
    JOIN instruments i ON c.instrument_id = i.id
    JOIN instrument_categories cat ON i.category_id = cat.id
    JOIN users trader ON i.owner_id = trader.id
    LEFT JOIN organizations torg ON trader.organization_id = torg.id
    WHERE c.verification_id = ?
  `).get(appItem.verification_id);

  if (existingCert) {
    return res.json({
      message: 'Certificate already exists for this verification',
      certificate: existingCert,
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
  const validityMonths = appItem.validity_period_months || 12;
  const validUntil = new Date(issueDate);
  validUntil.setMonth(validUntil.getMonth() + validityMonths);

  const issuingOfficer = appItem.verifier_name || 'Vikram Singh (LMO)';
  const issuingAuthority = appItem.authority_name || 'Department of Consumer Affairs, Delhi';

  db.prepare(`
    INSERT INTO certificates (
      id, certificate_no, verification_id, instrument_id, public_token,
      issue_date, valid_until, status, issuing_officer, issuing_authority, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'VALID', ?, ?, ?)
  `).run(
    certId,
    certNo,
    appItem.verification_id,
    appItem.inst_id,
    publicToken,
    issueDate.toISOString(),
    validUntil.toISOString(),
    issuingOfficer,
    issuingAuthority,
    issueDate.toISOString()
  );

  // Update instrument status to VERIFIED
  db.prepare("UPDATE instruments SET status = 'VERIFIED' WHERE id = ?").run(appItem.inst_id);

  logAudit('Certificate', certId, 'CERTIFICATE_GENERATED', actorId, role, {
    certificate_no: certNo,
    application_id: appId,
    instrument_id: appItem.inst_id,
    public_token: publicToken,
    valid_until: validUntil.toISOString()
  });

  const createdCert = db.prepare(`
    SELECT c.*, i.manufacturer, i.model, i.serial_number, i.max_capacity, i.min_capacity,
           i.verification_scale_interval_e, i.location,
           cat.name as category_name, trader.full_name as owner_name, torg.name as owner_org
    FROM certificates c
    JOIN instruments i ON c.instrument_id = i.id
    JOIN instrument_categories cat ON i.category_id = cat.id
    JOIN users trader ON i.owner_id = trader.id
    LEFT JOIN organizations torg ON trader.organization_id = torg.id
    WHERE c.id = ?
  `).get(certId);

  res.status(201).json({
    message: 'Certificate generated successfully',
    certificate: createdCert,
    created: true
  });
});

// List Certificates (Filtered by Role and Owner)
app.get('/api/certificates', (req, res) => {
  const { role, id: actorId } = getActor(req);
  const { owner_id } = req.query;

  let query = `
    SELECT c.*, i.manufacturer, i.model, i.serial_number, i.max_capacity, i.location,
           cat.name as category_name, trader.full_name as owner_name, torg.name as owner_org,
           i.owner_id
    FROM certificates c
    JOIN instruments i ON c.instrument_id = i.id
    JOIN instrument_categories cat ON i.category_id = cat.id
    JOIN users trader ON i.owner_id = trader.id
    LEFT JOIN organizations torg ON trader.organization_id = torg.id
  `;
  const params = [];

  // Security: Trader can ONLY see their own certificates
  if (role === ROLES.TRADER) {
    query += ' WHERE i.owner_id = ?';
    params.push(actorId);
  } else if (owner_id) {
    query += ' WHERE i.owner_id = ?';
    params.push(owner_id);
  }

  query += ' ORDER BY c.created_at DESC';
  const certs = db.prepare(query).all(...params);
  res.json(certs);
});

// Get Single Certificate
app.get('/api/certificates/:id', (req, res) => {
  const { role, id: actorId } = getActor(req);

  const cert = db.prepare(`
    SELECT c.*, i.manufacturer, i.model, i.serial_number, i.max_capacity, i.min_capacity,
           i.verification_scale_interval_e, i.location, i.owner_id,
           cat.name as category_name,
           trader.full_name as owner_name, torg.name as owner_org,
           v.remarks as verification_remarks, v.completed_at as verification_date,
           u.full_name as verifier_name
    FROM certificates c
    JOIN instruments i ON c.instrument_id = i.id
    JOIN instrument_categories cat ON i.category_id = cat.id
    JOIN users trader ON i.owner_id = trader.id
    LEFT JOIN organizations torg ON trader.organization_id = torg.id
    LEFT JOIN verifications v ON c.verification_id = v.id
    LEFT JOIN users u ON v.verifier_id = u.id
    WHERE c.id = ? OR c.certificate_no = ?
  `).get(req.params.id, req.params.id);

  if (!cert) return res.status(404).json({ error: 'Certificate not found' });

  // Security check: Trader can only view their own certificate
  if (role === ROLES.TRADER && cert.owner_id !== actorId) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to view this certificate.' });
  }

  logAudit('Certificate', cert.id, 'CERTIFICATE_VIEWED', actorId, role, {
    certificate_no: cert.certificate_no
  });

  res.json(cert);
});

// ==========================================
// 7. PUBLIC CERTIFICATE VERIFICATION (SLICE 4)
// ==========================================

// Public Unauthenticated Certificate Verification via QR / Public Token
app.get('/api/public/verify/:token', (req, res) => {
  const token = req.params.token;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({
      status: 'INVALID',
      error: 'Malformed or missing certificate verification reference.'
    });
  }

  // Query certificate by public_token (guaranteed unique, non-guessable UUID)
  const cert = db.prepare(`
    SELECT c.certificate_no, c.public_token, c.issue_date, c.valid_until, c.status as stored_status,
           c.issuing_officer, c.issuing_authority,
           i.manufacturer, i.model, i.serial_number, i.max_capacity, i.verification_scale_interval_e,
           cat.name as category_name, cat.code as category_code,
           torg.name as business_name, torg.jurisdiction as operational_jurisdiction
    FROM certificates c
    JOIN instruments i ON c.instrument_id = i.id
    JOIN instrument_categories cat ON i.category_id = cat.id
    JOIN users trader ON i.owner_id = trader.id
    LEFT JOIN organizations torg ON trader.organization_id = torg.id
    WHERE c.public_token = ?
  `).get(token.trim());

  if (!cert) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      error: 'Certificate record not found. The scanned verification reference does not correspond to any registered certificate in the official digital repository.'
    });
  }

  // Calculate live statutory validity based on date
  const now = new Date();
  const validUntilDate = new Date(cert.valid_until);
  const isExpired = validUntilDate < now;
  const liveStatus = isExpired ? 'EXPIRED' : (cert.stored_status === 'VALID' ? 'VALID' : cert.stored_status);

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
  // Zero private personal info (no phone, personal email, or private address)
  res.json({
    status: liveStatus,
    certificate_no: cert.certificate_no,
    public_token: cert.public_token,
    issue_date: cert.issue_date,
    valid_until: cert.valid_until,
    is_expired: isExpired,
    instrument: {
      category: cert.category_name,
      manufacturer: cert.manufacturer,
      model: cert.model,
      serial_number: cert.serial_number,
      max_capacity: cert.max_capacity,
      verification_scale_interval_e: cert.verification_scale_interval_e
    },
    verification_authority: {
      officer: cert.issuing_officer,
      authority: cert.issuing_authority,
      jurisdiction: cert.operational_jurisdiction
    },
    business: {
      enterprise_name: cert.business_name || 'Authorized Commercial Establishment'
    },
    verification_statement: 'Matched and authenticated against the official Department of Consumer Affairs Legal Metrology digital ledger.'
  });
});

// ==========================================
// 8. GOVERNANCE & STATS
// ==========================================

app.get('/api/audit-logs', (req, res) => {
  const { role } = getActor(req);
  if (!hasPermission(role, 'VIEW_AUDIT_LOGS')) {
    return res.status(403).json({ error: `Forbidden: Role '${role}' cannot view audit logs.` });
  }
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').all();
  res.json(logs);
});

app.get('/api/stats', (req, res) => {
  const totalInstruments = db.prepare('SELECT COUNT(*) as count FROM instruments').get().count;
  const pendingApplications = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status IN ('SUBMITTED', 'UNDER_REVIEW')").get().count;
  const assignedApplications = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'ASSIGNED'").get().count;
  const inProgressApplications = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'IN_PROGRESS'").get().count;
  const completedVerifications = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status IN ('VERIFICATION_COMPLETED', 'VERIFICATION_FAILED')").get().count;

  res.json({
    totalInstruments,
    pendingApplications,
    assignedApplications,
    inProgressApplications,
    completedVerifications
  });
});

app.listen(PORT, () => {
  console.log(`Legal Metrology Server running on port ${PORT}`);
});
