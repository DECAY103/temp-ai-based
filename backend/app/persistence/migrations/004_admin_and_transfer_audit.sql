-- migrations/004_admin_and_transfer_audit.sql
-- Adds transfer audit logs and pre-seeded default administrator.

-- ─── transfer_audit_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfer_audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
    email           TEXT,
    transfer_type   TEXT        NOT NULL, -- "batch_upload", "candidate_resume_upload", "resume_download", "forensic_report_export"
    filename        TEXT,
    filesize_bytes  BIGINT,
    item_count      INT         DEFAULT 1,
    status          TEXT        NOT NULL DEFAULT 'success', -- 'success', 'failed', 'rejected'
    detail          TEXT,
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_audit_user
    ON transfer_audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfer_audit_type
    ON transfer_audit_logs (transfer_type, created_at DESC);

-- ─── Default Administrator ──────────────────────────────────────────────────
-- Seeds admin@resumescreening.local (Password: Admin@12345) if no admin exists
INSERT INTO users (email, password_hash, role, totp_secret)
SELECT 'admin@resumescreening.local',
       -- Standard pbkdf2-sha256 hash for "Admin@12345"
       '$pbkdf2-sha256$29000$eu/du1dKKeX8f28NIYRQig$rUW7BJYyMSpQhRc/UFwaCvGFDz2FV0hp8Ipqa7V/26U',
       'admin',
       'JBSWY3DPEHPK3PXP'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE role = 'admin'
);
