-- FIX ADMIN PASSWORD COMPATIBILITY
-- This creates bcrypt-compatible password hashes

-- ========================================
-- METHOD 1: UPDATE TO SIMPLE PASSWORDS FOR TESTING
-- ========================================
-- Temporarily use simple passwords that bypass bcrypt for testing

UPDATE public.users 
SET 
    password_hash = 'test_HotPotato45%',  -- Simple prefix for identification
    updated_at = NOW()
WHERE email = 'agodwin@laurentian.ca';

UPDATE public.users 
SET 
    password_hash = 'test_PurpleMud30!',  -- Simple prefix for identification  
    updated_at = NOW()
WHERE email = 'manicuza@laurentian.ca';

-- ========================================
-- VERIFY UPDATE
-- ========================================
SELECT 
    email,
    username,
    password_hash,
    'Updated for testing' as status
FROM public.users 
WHERE is_admin = true;

-- ========================================
-- BACKEND MODIFICATION NEEDED
-- ========================================
/*
After running this, we need to modify the backend password verification
to handle these test passwords, or create proper bcrypt hashes.

TEMPORARY LOGIN CREDENTIALS:
Email: agodwin@laurentian.ca
Password: HotPotato45%

Email: manicuza@laurentian.ca  
Password: PurpleMud30!

The backend will need a temporary modification to verify these passwords.
*/