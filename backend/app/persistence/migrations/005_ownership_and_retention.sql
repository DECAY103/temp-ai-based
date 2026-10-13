-- migrations/005_ownership_and_retention.sql
-- Implements explicit batch ownership, token revocation, and retention tracking.

-- 1. Explicit ownership for batch_jobs and candidate_evaluations
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE candidate_evaluations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_eval_user_id ON candidate_evaluations(user_id);

-- 2. Token revocation tracking on users (for mass invalidation on logout / password reset / account deletion)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_revoked_before TIMESTAMPTZ;

-- 3. Revoked tokens table (for individual token blacklisting on logout)
CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash      TEXT        PRIMARY KEY,
    user_id         UUID        REFERENCES users(id) ON DELETE CASCADE,
    revoked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires
    ON revoked_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user
    ON revoked_tokens (user_id);
