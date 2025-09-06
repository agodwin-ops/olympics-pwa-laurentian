-- UPDATE TEST STUDENT EMAIL FROM MANICUZA TO MCUZA
-- This changes the test student email as requested

-- ========================================
-- 1. CHECK CURRENT STATE
-- ========================================
SELECT 
    'Current test student account:' as info,
    email,
    username,
    user_program,
    is_admin
FROM public.users 
WHERE email = 'manicuza@laurentian.ca';

-- ========================================
-- 2. UPDATE EMAIL ADDRESS
-- ========================================
UPDATE public.users 
SET 
    email = 'mcuza@laurentian.ca',
    updated_at = NOW()
WHERE email = 'manicuza@laurentian.ca' AND is_admin = false;

-- ========================================
-- 3. VERIFY THE CHANGE
-- ========================================
SELECT 
    'Updated test student account:' as info,
    email,
    username,
    user_program,
    is_admin,
    CASE WHEN is_admin THEN 'ADMIN' ELSE 'STUDENT' END as account_type
FROM public.users 
WHERE email = 'mcuza@laurentian.ca';

-- ========================================
-- 4. SHOW ALL FINAL USERS
-- ========================================
SELECT 
    'All users in database:' as info,
    email,
    username,
    user_program,
    is_admin,
    CASE WHEN is_admin THEN 'ADMIN' ELSE 'STUDENT' END as account_type
FROM public.users 
ORDER BY is_admin DESC, email;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT 
    'Email updated successfully!' as message,
    'New test student login: mcuza@laurentian.ca / PurpleMud30!' as credentials;