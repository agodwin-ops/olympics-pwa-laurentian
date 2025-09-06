-- SAFE DATABASE CLEANUP - CHECKS TABLE NAMES FIRST
-- This version checks what tables exist to avoid errors

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
-- Delete from tables that might exist (safe approach)

-- Try to delete from xp_entries (this table exists based on earlier error)
DELETE FROM public.xp_entries 
WHERE user_id IN (
    SELECT id FROM public.users WHERE is_admin = false
);

-- Try to delete from player_stats if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_stats' AND table_schema = 'public') THEN
        DELETE FROM public.player_stats 
        WHERE user_id IN (SELECT id FROM public.users WHERE is_admin = false);
    END IF;
END $$;

-- Try to delete from player_skills if it exists  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_skills' AND table_schema = 'public') THEN
        DELETE FROM public.player_skills 
        WHERE user_id IN (SELECT id FROM public.users WHERE is_admin = false);
    END IF;
END $$;

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
-- 5. CREATE BASIC PLAYER STATS (SAFE VERSION)
-- ========================================
-- Only create if player_stats table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_stats' AND table_schema = 'public') THEN
        INSERT INTO public.player_stats (
            id,
            user_id,
            level,
            experience_points,
            gold,
            health,
            max_health,
            energy,
            max_energy,
            strength,
            agility,
            intelligence,
            charisma,
            created_at,
            updated_at
        ) 
        SELECT 
            uuid_generate_v4(),
            id as user_id,
            1, 0, 100, 100, 100, 100, 100, 10, 10, 10, 10,
            NOW(), NOW()
        FROM public.users 
        WHERE email = 'manicuza@laurentian.ca' AND is_admin = false;
    END IF;
END $$;

-- ========================================
-- 6. VERIFY FINAL STATE
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
-- SUCCESS MESSAGE
-- ========================================
SELECT 
    'Database cleanup completed successfully!' as message,
    'Test student login: manicuza@laurentian.ca / PurpleMud30!' as credentials;