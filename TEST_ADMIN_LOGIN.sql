-- TEST ADMIN LOGIN ISSUE
-- This tests the password verification problem

-- ========================================
-- 1. CHECK PASSWORD HASH FORMAT
-- ========================================
SELECT 
    email,
    username,
    LEFT(password_hash, 10) as hash_start,
    LENGTH(password_hash) as hash_length,
    CASE 
        WHEN password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' OR password_hash LIKE '$2y$%' THEN 'BCRYPT FORMAT'
        WHEN password_hash LIKE '$1$%' THEN 'MD5 CRYPT FORMAT'  
        WHEN password_hash LIKE '$2$%' THEN 'BLOWFISH CRYPT FORMAT'
        ELSE 'UNKNOWN FORMAT'
    END as hash_type
FROM public.users 
WHERE is_admin = true;

-- ========================================
-- 2. TEST PASSWORD VERIFICATION
-- ========================================
-- Test if PostgreSQL can verify the passwords we set
SELECT 
    email,
    'Testing password verification...' as test,
    CASE 
        WHEN email = 'agodwin@laurentian.ca' AND password_hash = crypt('HotPotato45%', password_hash) THEN 'PASSWORD MATCH'
        WHEN email = 'manicuza@laurentian.ca' AND password_hash = crypt('PurpleMud30!', password_hash) THEN 'PASSWORD MATCH'
        ELSE 'PASSWORD MISMATCH'
    END as verification_result
FROM public.users 
WHERE is_admin = true;

-- ========================================
-- DIAGNOSIS
-- ========================================
/*
EXPECTED RESULTS:

1. Hash format should show "BCRYPT FORMAT" for compatibility with backend
2. Password verification should show "PASSWORD MATCH" for both users

PROBLEM DIAGNOSIS:
- If hash_type is not "BCRYPT FORMAT", that's the issue
- Backend expects bcrypt, but PostgreSQL crypt() creates different format
- Need to update passwords to proper bcrypt format

SOLUTION:
- Update password hashes to bcrypt format
- Or modify backend to use PostgreSQL crypt verification
*/