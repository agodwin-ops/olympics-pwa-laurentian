-- CORRECTED DATABASE CLEANUP - MATCHES ACTUAL SCHEMA
-- This version uses the correct column names based on your actual database schema

-- ========================================
-- 1. CHECK WHAT TABLES EXIST
-- ========================================
SELECT 
    'Available tables:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ========================================
-- 2. CHECK CURRENT USERS
-- ========================================
SELECT 
    'Current users in database:' as info,
    email,
    username, 
    user_program,
    is_admin,
    created_at
FROM public.users 
ORDER BY created_at DESC;

-- ========================================
-- 3. SAFE DELETE - ONLY DELETE NON-ADMIN USERS
-- ========================================
-- Delete from xp_entries (this table exists)
DELETE FROM public.xp_entries 
WHERE user_id IN (
    SELECT id FROM public.users WHERE is_admin = false
);

-- Delete from player_stats if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_stats' AND table_schema = 'public') THEN
        DELETE FROM public.player_stats 
        WHERE user_id IN (SELECT id FROM public.users WHERE is_admin = false);
    END IF;
END $$;

-- Delete from player_skills (this table exists based on your schema)
DELETE FROM public.player_skills 
WHERE user_id IN (
    SELECT id FROM public.users WHERE is_admin = false
);

-- Delete the non-admin users (fake students)
DELETE FROM public.users WHERE is_admin = false;

-- ========================================
-- 4. CONVERT MANICUZA TO TEST STUDENT
-- ========================================
UPDATE public.users 
SET 
    is_admin = false,
    user_program = 'BPHE Kinesiology',
    username = 'TestStudent_MasterGTA',
    updated_at = NOW()
WHERE email = 'manicuza@laurentian.ca';

-- ========================================
-- 5. CREATE BASIC PLAYER STATS (IF TABLE EXISTS)
-- ========================================
-- Only create if player_stats table exists - using minimal columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_stats' AND table_schema = 'public') THEN
        -- First check what columns exist in player_stats
        INSERT INTO public.player_stats (
            user_id,
            created_at,
            updated_at
        ) 
        SELECT 
            id as user_id,
            NOW() as created_at,
            NOW() as updated_at
        FROM public.users 
        WHERE email = 'manicuza@laurentian.ca' AND is_admin = false;
    END IF;
END $$;

-- ========================================
-- 6. CREATE PLAYER SKILLS FOR TEST STUDENT
-- ========================================
-- Create basic skills using actual column names from your schema
INSERT INTO public.player_skills (
    user_id,
    strength,
    endurance,
    tactics,
    climbing,
    speed,
    created_at,
    updated_at
)
SELECT 
    id as user_id,
    1 as strength,
    1 as endurance,
    1 as tactics,
    1 as climbing,
    1 as speed,
    NOW() as created_at,
    NOW() as updated_at
FROM public.users 
WHERE email = 'manicuza@laurentian.ca' AND is_admin = false;

-- ========================================
-- 7. VERIFY FINAL STATE
-- ========================================
SELECT 
    'Final users:' as info,
    email,
    username,
    user_program,
    is_admin,
    CASE WHEN is_admin THEN 'ADMIN' ELSE 'STUDENT' END as account_type
FROM public.users 
ORDER BY is_admin DESC, email;

-- ========================================
-- 8. VERIFY PLAYER SKILLS CREATED
-- ========================================
SELECT 
    'Player skills for test student:' as info,
    ps.strength,
    ps.endurance,
    ps.tactics,
    ps.climbing,
    ps.speed,
    u.email
FROM public.player_skills ps
JOIN public.users u ON ps.user_id = u.id
WHERE u.email = 'manicuza@laurentian.ca';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT 
    'Database cleanup completed successfully!' as message,
    'Test student login: manicuza@laurentian.ca / PurpleMud30!' as credentials;