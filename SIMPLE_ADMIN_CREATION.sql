-- SIMPLE ADMIN CREATION - No Dependencies
-- This creates admin users with simple password storage for testing
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 2. DELETE ANY EXISTING ADMIN ACCOUNTS
-- ========================================
DELETE FROM public.users WHERE email IN ('agodwin@laurentian.ca', 'manicuza@laurentian.ca');

-- ========================================
-- 3. CREATE ADMIN USERS WITH BCRYPT HASHING
-- ========================================
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
-- ADMIN USER 1
(
    uuid_generate_v4(),
    'agodwin@laurentian.ca',
    'ProfAAG',
    'Primary Instructor',
    true,
    crypt('HotPotato45%', gen_salt('bf', 12)),
    NOW(),
    NOW()
),
-- ADMIN USER 2
(
    uuid_generate_v4(),
    'manicuza@laurentian.ca',
    'MasterGTA',
    'Primary Instructor',
    true,
    crypt('PurpleMud30!', gen_salt('bf', 12)),
    NOW(),
    NOW()
);

-- ========================================
-- 4. VERIFY CREATION
-- ========================================
SELECT 
    'Admin accounts created successfully!' as message,
    email,
    username,
    user_program,
    is_admin,
    length(password_hash) as password_hash_length,
    created_at
FROM public.users 
WHERE is_admin = true
ORDER BY created_at DESC;

-- ========================================
-- LOGIN CREDENTIALS
-- ========================================
/*
ADMIN LOGIN CREDENTIALS:

User 1:
Email: agodwin@laurentian.ca  
Password: HotPotato45%

User 2:
Email: manicuza@laurentian.ca
Password: PurpleMud30!

If this script completes successfully, you should be able to login
with these credentials on your frontend.
*/