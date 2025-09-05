-- DEBUG ADMIN LOGIN ISSUES
-- Run this in Supabase SQL Editor to diagnose login problems

-- ========================================
-- 1. CHECK IF ADMIN USERS EXIST
-- ========================================
SELECT 
    id,
    email,
    username,
    user_program,
    is_admin,
    created_at,
    password_hash IS NOT NULL as has_password
FROM public.users 
WHERE is_admin = true
ORDER BY created_at DESC;

-- ========================================
-- 2. CHECK FOR SPECIFIC ADMIN EMAILS
-- ========================================
SELECT 
    'agodwin@laurentian.ca account status:' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'NOT FOUND - Account does not exist'
        WHEN COUNT(*) = 1 THEN 'FOUND - Account exists'
        ELSE 'DUPLICATE - Multiple accounts found'
    END as status
FROM public.users 
WHERE email = 'agodwin@laurentian.ca'

UNION ALL

SELECT 
    'manicuza@laurentian.ca account status:' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'NOT FOUND - Account does not exist'
        WHEN COUNT(*) = 1 THEN 'FOUND - Account exists'
        ELSE 'DUPLICATE - Multiple accounts found'
    END as status
FROM public.users 
WHERE email = 'manicuza@laurentian.ca';

-- ========================================
-- 3. CHECK TOTAL USER COUNT
-- ========================================
SELECT 
    'Total users in database:' as info,
    COUNT(*) as count
FROM public.users

UNION ALL

SELECT 
    'Admin users in database:' as info,
    COUNT(*) as count
FROM public.users 
WHERE is_admin = true

UNION ALL

SELECT 
    'Student users in database:' as info,
    COUNT(*) as count
FROM public.users 
WHERE is_admin = false;

-- ========================================
-- 4. CHECK IF CRYPT FUNCTION EXISTS
-- ========================================
SELECT 
    'Crypt function available:' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'crypt'
        ) THEN 'YES - Password hashing available'
        ELSE 'NO - Password hashing not available'
    END as status;

-- ========================================
-- INTERPRETATION GUIDE
-- ========================================
/*
EXPECTED RESULTS:

1. If admin users exist, you should see 2 rows with:
   - email: agodwin@laurentian.ca and manicuza@laurentian.ca
   - is_admin: true
   - has_password: true

2. If users don't exist, the script failed to run properly

3. If crypt function is not available, password hashing failed

COMMON ISSUES:
- Script didn't run completely
- Crypt extension not enabled
- Database permissions issue
- Password hashing failed

SOLUTIONS:
- Re-run CREATE_ADMIN_USERS.sql
- Enable pgcrypto extension
- Use manual password creation
*/