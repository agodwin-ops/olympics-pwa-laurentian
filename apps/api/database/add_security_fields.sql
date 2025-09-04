-- Add security fields to users table for authentication
-- This migration adds password and email verification functionality

-- Add new security columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Create indexes for security tokens (for performance)
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Update RLS policies to consider email verification
-- Only allow login for verified users (this will be enforced in application logic)

-- Add constraint to ensure password_hash is not null for new users
-- Note: We can't add NOT NULL constraint directly because existing users won't have passwords
-- This will be enforced at the application level for new registrations

COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for user authentication';
COMMENT ON COLUMN users.email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN users.email_verification_token IS 'Token used for email verification (cleared after verification)';
COMMENT ON COLUMN users.password_reset_token IS 'Token used for password reset (expires after 1 hour)';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration timestamp for password reset token';