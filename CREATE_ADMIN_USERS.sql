-- CREATE PRIMARY INSTRUCTOR ADMIN USERS
-- Run this script in Supabase SQL Editor: https://app.supabase.com/project/your-project/sql
-- This creates two admin users with Primary Instructor access

-- First, ensure password hashing function exists
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Simple bcrypt-style hash for manual creation
  -- In production, this would use proper bcrypt
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INSERT PRIMARY INSTRUCTOR ADMIN USERS
-- ========================================

-- Replace these email addresses with your actual instructor emails
-- Replace passwords with secure passwords of your choice

INSERT INTO public.users (
    id,
    email,
    username,
    user_program,
    is_admin,
    password_hash,
    created_at,
    updated_at
) VALUES 
-- ADMIN USER 1 - Replace email and username
(
    uuid_generate_v4(),
    'agodwin@laurentian.ca',               -- PRIMARY INSTRUCTOR 1 EMAIL
    'ProfAAG',                              -- PRIMARY INSTRUCTOR 1 USERNAME  
    'Primary Instructor',
    true,
    hash_password('HotPotato45%'),          -- PRIMARY INSTRUCTOR 1 PASSWORD
    NOW(),
    NOW()
),
-- ADMIN USER 2 - Replace email and username  
(
    uuid_generate_v4(),
    'manicuza@laurentian.ca',              -- PRIMARY INSTRUCTOR 2 EMAIL
    'MasterGTA',                            -- PRIMARY INSTRUCTOR 2 USERNAME
    'Primary Instructor', 
    true,
    hash_password('PurpleMud30!'),          -- PRIMARY INSTRUCTOR 2 PASSWORD
    NOW(),
    NOW()
);

-- ========================================
-- VERIFY ADMIN USERS WERE CREATED
-- ========================================
SELECT 
    id,
    email,
    username,
    user_program,
    is_admin,
    created_at
FROM public.users 
WHERE is_admin = true;

-- ========================================
-- LOGIN CREDENTIALS (SAVE THESE!)
-- ========================================
/*
ADMIN USER 1:
Email: agodwin@laurentian.ca
Username: ProfAAG
Password: HotPotato45%

ADMIN USER 2:  
Email: manicuza@laurentian.ca
Username: MasterGTA
Password: PurpleMud30!

READY TO RUN - Credentials have been updated!
*/