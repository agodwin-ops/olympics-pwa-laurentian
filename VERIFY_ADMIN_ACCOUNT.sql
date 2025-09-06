-- VERIFY ADMIN ACCOUNT STATUS
-- Check if admin account exists and has proper settings

-- ========================================
-- 1. CHECK ALL USERS IN DATABASE
-- ========================================
SELECT 
    'All users in database:' as info,
    email,
    username,
    user_program,
    is_admin,
    created_at,
    CASE WHEN is_admin THEN 'ADMIN' ELSE 'STUDENT' END as account_type
FROM public.users 
ORDER BY is_admin DESC, email;

-- ========================================
-- 2. CHECK SPECIFIC ADMIN ACCOUNT
-- ========================================
SELECT 
    'Admin account details:' as info,
    email,
    username,
    user_program,
    is_admin,
    password_hash,
    created_at,
    updated_at
FROM public.users 
WHERE email = 'agodwin@laurentian.ca';

-- ========================================
-- 3. TEST PASSWORD VERIFICATION FUNCTION
-- ========================================
-- This will test if the password verification function works
SELECT 
    'Password verification test:' as info,
    verify_password_crypt('HotPotato45%', password_hash) as password_matches
FROM public.users 
WHERE email = 'agodwin@laurentian.ca';

-- ========================================
-- 4. CHECK IF PASSWORD FUNCTION EXISTS
-- ========================================
SELECT 
    'Password function exists:' as info,
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'verify_password_crypt';

-- ========================================
-- RESULTS SUMMARY
-- ========================================
SELECT 
    'Summary:' as info,
    'If admin account shows up above with is_admin=true and password test returns true, credentials should work' as message;