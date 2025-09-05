-- CREATE PASSWORD VERIFICATION FUNCTION
-- This allows the backend to verify PostgreSQL crypt passwords

-- ========================================
-- CREATE VERIFICATION FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION verify_password_crypt(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Use PostgreSQL's crypt function to verify password
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TEST THE FUNCTION
-- ========================================
-- Test with admin passwords
SELECT 
    email,
    'Testing function...' as test,
    verify_password_crypt('HotPotato45%', password_hash) as password_correct
FROM public.users 
WHERE email = 'agodwin@laurentian.ca'

UNION ALL

SELECT 
    email,
    'Testing function...' as test,
    verify_password_crypt('PurpleMud30!', password_hash) as password_correct
FROM public.users 
WHERE email = 'manicuza@laurentian.ca';

-- ========================================
-- EXPECTED RESULTS
-- ========================================
/*
You should see:
agodwin@laurentian.ca | Testing function... | true
manicuza@laurentian.ca | Testing function... | true

If you see 'true' for both, the function works and admin login should work!
*/