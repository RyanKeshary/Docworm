-- Migration 0012: Security Hardening: 2FA, OTP, and Account Lockout
-- Adds columns and tables for institutional two-factor authentication (TOTP/Email OTP/Backup Codes) and account lockout.

-- 1. Add 2FA and Security Lockout columns to public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT NULL,
  ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ NULL;

-- 2. Create table for Active OTP Verification Codes
CREATE TABLE IF NOT EXISTS public.auth_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('email', 'totp', 'backup_code')),
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_user_id ON public.auth_otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_otp_expires_at ON public.auth_otp_codes(expires_at);
