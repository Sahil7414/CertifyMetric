// =============================================================================
// CertifyMetric — Mongoose Models for MongoDB Atlas
// =============================================================================
import mongoose from 'mongoose';

const { Schema } = mongoose;

// 1. User
const userSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password_hash: { type: String, required: true },
  role: { type: String, required: true, index: true },
  full_name: { type: String, required: true },
  organization_id: { type: String, index: true },
  phone: { type: String },
  avatar: { type: String },
  is_demo: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  created_at: { type: String, default: () => new Date().toISOString() },
  updated_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 2. UserSession
const userSessionSchema = new Schema({
  token: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  role: { type: String, required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
  expires_at: { type: String, required: true }
}, { versionKey: false, timestamps: false });

// 3. Organization
const organizationSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  jurisdiction: { type: String },
  created_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 4. InstrumentCategory
const instrumentCategorySchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  active: { type: Number, default: 1 }
}, { versionKey: false, timestamps: false });

// 5. RuleSet
const ruleSetSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  category_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  validity_period_months: { type: Number, default: 12 },
  mpe_rules: { type: Schema.Types.Mixed, default: [] },
  checklist_schema: { type: Schema.Types.Mixed, default: [] }
}, { versionKey: false, timestamps: false });

// 6. Instrument
const instrumentSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  owner_id: { type: String, required: true, index: true },
  category_id: { type: String, required: true, index: true },
  manufacturer: { type: String, required: true },
  model: { type: String, required: true },
  serial_number: { type: String, required: true, unique: true, index: true },
  max_capacity: { type: String, required: true },
  min_capacity: { type: String, required: true },
  verification_scale_interval_e: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, default: 'REGISTERED', index: true },
  created_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 7. Application
const applicationSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  application_no: { type: String, required: true, unique: true, index: true },
  instrument_id: { type: String, required: true, index: true },
  trader_id: { type: String, required: true, index: true },
  request_type: { type: String, default: 'INITIAL_VERIFICATION' },
  status: { type: String, default: 'SUBMITTED', index: true },
  documents: { type: Schema.Types.Mixed, default: [] },
  fee_status: { type: String, default: 'PAID' },
  created_at: { type: String, default: () => new Date().toISOString() },
  updated_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 8. Assignment
const assignmentSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  application_id: { type: String, required: true, unique: true, index: true },
  assigned_type: { type: String, required: true },
  assigned_id: { type: String, required: true, index: true },
  recommended_id: { type: String },
  is_override: { type: Number, default: 0 },
  override_reason: { type: String },
  assigned_by: { type: String },
  created_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 9. Appointment
const appointmentSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  assignment_id: { type: String, required: true, unique: true, index: true },
  scheduled_date: { type: String },
  time_slot: { type: String },
  arrangement_type: { type: String },
  status: { type: String, default: 'SCHEDULED' },
  created_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 10. Verification
const verificationSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  application_id: { type: String, required: true, unique: true, index: true },
  appointment_id: { type: String, index: true },
  verifier_id: { type: String, required: true, index: true },
  status: { type: String, default: 'IN_PROGRESS', index: true },
  result: { type: String },
  remarks: { type: String },
  started_at: { type: String },
  completed_at: { type: String },
  created_at: { type: String, default: () => new Date().toISOString() },
  updated_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 11. VerificationChecklistResponse
const verificationChecklistResponseSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  verification_id: { type: String, required: true, index: true },
  item_id: { type: String, required: true },
  status: { type: String, required: true },
  note: { type: String },
  updated_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });
verificationChecklistResponseSchema.index({ verification_id: 1, item_id: 1 }, { unique: true });

// 12. VerificationReading
const verificationReadingSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  verification_id: { type: String, required: true, index: true },
  test_point: { type: String, required: true },
  reference_value: { type: Number },
  observed_value: { type: Number },
  unit: { type: String },
  reading_result: { type: String },
  updated_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 13. VerificationEvidence
const verificationEvidenceSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  verification_id: { type: String, required: true, index: true },
  file_name: { type: String, required: true },
  file_path: { type: String, required: true },
  file_type: { type: String },
  category: { type: String },
  caption: { type: String },
  created_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 14. Certificate
const certificateSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  certificate_no: { type: String, required: true, unique: true, index: true },
  verification_id: { type: String, required: true, index: true },
  instrument_id: { type: String, required: true, index: true },
  public_token: { type: String, required: true, unique: true, index: true },
  issue_date: { type: String, required: true },
  valid_until: { type: String, required: true },
  status: { type: String, default: 'VALID', index: true },
  issuing_officer: { type: String },
  issuing_authority: { type: String },
  created_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

// 15. AuditLog
const auditLogSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  entity_name: { type: String, required: true, index: true },
  entity_id: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  actor_id: { type: String },
  actor_role: { type: String },
  details: { type: Schema.Types.Mixed, default: {} },
  created_at: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false, timestamps: false });

export const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');
export const UserSession = mongoose.models.UserSession || mongoose.model('UserSession', userSessionSchema, 'user_sessions');
export const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema, 'organizations');
export const InstrumentCategory = mongoose.models.InstrumentCategory || mongoose.model('InstrumentCategory', instrumentCategorySchema, 'instrument_categories');
export const RuleSet = mongoose.models.RuleSet || mongoose.model('RuleSet', ruleSetSchema, 'rule_sets');
export const Instrument = mongoose.models.Instrument || mongoose.model('Instrument', instrumentSchema, 'instruments');
export const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema, 'applications');
export const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema, 'assignments');
export const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema, 'appointments');
export const Verification = mongoose.models.Verification || mongoose.model('Verification', verificationSchema, 'verifications');
export const VerificationChecklistResponse = mongoose.models.VerificationChecklistResponse || mongoose.model('VerificationChecklistResponse', verificationChecklistResponseSchema, 'verification_checklist_responses');
export const VerificationReading = mongoose.models.VerificationReading || mongoose.model('VerificationReading', verificationReadingSchema, 'verification_readings');
export const VerificationEvidence = mongoose.models.VerificationEvidence || mongoose.model('VerificationEvidence', verificationEvidenceSchema, 'verification_evidence');
export const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema, 'certificates');
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema, 'audit_logs');
