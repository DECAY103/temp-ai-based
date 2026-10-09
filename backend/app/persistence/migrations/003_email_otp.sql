-- migrations/003_email_otp.sql
-- Adds email-OTP support as an alternative to TOTP.
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS.

-- Add last_login_at column to users (if not already present from migration 002)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- email_otp_codes: stores the 6-digit codes emailed during login
CREATE TABLE IF NOT EXISTS email_otp_codes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code        TEXT        NOT NULL,                  -- bcrypt/sha256 hash of the 6-digit code
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_user
    ON email_otp_codes (user_id, used, expires_at DESC);
