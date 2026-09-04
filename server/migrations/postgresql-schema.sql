-- =============================================================================
-- CertifyMetric — PostgreSQL Production Schema Migration
-- =============================================================================
-- Matches exact CertifyMetric data model across all operational tables.
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    jurisdiction VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    organization_id VARCHAR(64) REFERENCES organizations(id),
    phone VARCHAR(32),
    avatar TEXT,
    password_hash TEXT,
    is_demo SMALLINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS instrument_categories (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rule_sets (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) REFERENCES instrument_categories(id),
    name VARCHAR(255) NOT NULL,
    validity_period_months INTEGER DEFAULT 12,
    mpe_rules_json JSONB,
    checklist_schema_json JSONB
);

CREATE TABLE IF NOT EXISTS instruments (
    id VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) REFERENCES users(id),
    category_id VARCHAR(64) REFERENCES instrument_categories(id),
    manufacturer VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    serial_number VARCHAR(128) UNIQUE NOT NULL,
    max_capacity VARCHAR(64) NOT NULL,
    min_capacity VARCHAR(64) NOT NULL,
    verification_scale_interval_e VARCHAR(64) NOT NULL,
    location TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'REGISTERED',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    application_no VARCHAR(64) UNIQUE NOT NULL,
    instrument_id VARCHAR(64) REFERENCES instruments(id),
    trader_id VARCHAR(64) REFERENCES users(id),
    request_type VARCHAR(64) DEFAULT 'INITIAL_VERIFICATION',
    status VARCHAR(32) DEFAULT 'SUBMITTED',
    documents_json JSONB,
    fee_status VARCHAR(32) DEFAULT 'PAID',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    assigned_type VARCHAR(32) NOT NULL,
    assigned_id VARCHAR(64) REFERENCES users(id),
    recommended_id VARCHAR(64) REFERENCES users(id),
    is_override SMALLINT DEFAULT 0,
    override_reason TEXT,
    assigned_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    assignment_id VARCHAR(64) UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
    scheduled_date VARCHAR(64),
    time_slot VARCHAR(64),
    arrangement_type VARCHAR(64),
    status VARCHAR(32) DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verifications (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) UNIQUE REFERENCES applications(id),
    appointment_id VARCHAR(64) REFERENCES appointments(id),
    verifier_id VARCHAR(64) REFERENCES users(id),
    status VARCHAR(32) DEFAULT 'IN_PROGRESS',
    result VARCHAR(32),
    remarks TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_checklist_responses (
    id VARCHAR(64) PRIMARY KEY,
    verification_id VARCHAR(64) REFERENCES verifications(id) ON DELETE CASCADE,
    item_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_verif_checklist UNIQUE (verification_id, item_id)
);

CREATE TABLE IF NOT EXISTS verification_readings (
    id VARCHAR(64) PRIMARY KEY,
    verification_id VARCHAR(64) REFERENCES verifications(id) ON DELETE CASCADE,
    test_point VARCHAR(64) NOT NULL,
    reference_value NUMERIC(12, 4),
    observed_value NUMERIC(12, 4),
    unit VARCHAR(16),
    reading_result VARCHAR(32),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_evidence (
    id VARCHAR(64) PRIMARY KEY,
    verification_id VARCHAR(64) REFERENCES verifications(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(64),
    category VARCHAR(64),
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(64) PRIMARY KEY,
    certificate_no VARCHAR(64) UNIQUE NOT NULL,
    verification_id VARCHAR(64) REFERENCES verifications(id),
    instrument_id VARCHAR(64) REFERENCES instruments(id),
    public_token VARCHAR(128) UNIQUE NOT NULL,
    issue_date VARCHAR(64) NOT NULL,
    valid_until VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'VALID',
    issuing_officer VARCHAR(255),
    issuing_authority VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    entity_name VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64),
    actor_role VARCHAR(32),
    details_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_instruments_owner ON instruments(owner_id);
CREATE INDEX IF NOT EXISTS idx_applications_instrument ON applications(instrument_id);
CREATE INDEX IF NOT EXISTS idx_applications_trader ON applications(trader_id);
CREATE INDEX IF NOT EXISTS idx_verifications_app ON verifications(application_id);
CREATE INDEX IF NOT EXISTS idx_verifications_verifier ON verifications(verifier_id);
CREATE INDEX IF NOT EXISTS idx_certificates_public_token ON certificates(public_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
