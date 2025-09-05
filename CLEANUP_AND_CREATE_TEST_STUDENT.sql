-- CLEANUP DATABASE AND CREATE TEST STUDENT
-- This removes fake students and converts one admin to test student

-- ========================================
-- 1. FIRST - CHECK WHAT'S IN THE DATABASE
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
-- 2. DELETE ALL NON-ADMIN USERS (FAKE STUDENTS)
-- ========================================
-- First delete related data
DELETE FROM public.experience_entries 
WHERE user_id IN (
    SELECT id FROM public.users WHERE is_admin = false
);

DELETE FROM public.player_stats 
WHERE user_id IN (
    SELECT id FROM public.users WHERE is_admin = false
);

DELETE FROM public.player_skills 
WHERE user_id IN (
    SELECT id FROM public.users WHERE is_admin = false
);

-- Delete the fake student users
DELETE FROM public.users WHERE is_admin = false;

-- ========================================
-- 3. CONVERT MANICUZA TO TEST STUDENT
-- ========================================
-- Update the second admin account to be a test student
UPDATE public.users 
SET 
    is_admin = false,
    user_program = 'BPHE Kinesiology',  -- Change to a student program
    username = 'TestStudent_MasterGTA',  -- Keep recognizable username
    updated_at = NOW()
WHERE email = 'manicuza@laurentian.ca';

-- ========================================
-- 4. CREATE PLAYER STATS FOR TEST STUDENT
-- ========================================
-- Create initial player stats for the test student
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
    1 as level,
    0 as experience_points,
    100 as gold,
    100 as health,
    100 as max_health,
    100 as energy,
    100 as max_energy,
    10 as strength,
    10 as agility,
    10 as intelligence,
    10 as charisma,
    NOW() as created_at,
    NOW() as updated_at
FROM public.users 
WHERE email = 'manicuza@laurentian.ca' AND is_admin = false;

-- ========================================
-- 5. CREATE PLAYER SKILLS FOR TEST STUDENT
-- ========================================
-- Create initial skills for the test student
INSERT INTO public.player_skills (
    id,
    user_id,
    skill_name,
    skill_level,
    experience_points,
    created_at,
    updated_at
)
SELECT 
    uuid_generate_v4(),
    u.id as user_id,
    skill_data.skill_name,
    1 as skill_level,
    0 as experience_points,
    NOW() as created_at,
    NOW() as updated_at
FROM public.users u,
(VALUES 
    ('Alpine Skiing'),
    ('Cross-Country Skiing'), 
    ('Ice Hockey'),
    ('Figure Skating'),
    ('Curling'),
    ('Bobsledding')
) AS skill_data(skill_name)
WHERE u.email = 'manicuza@laurentian.ca' AND u.is_admin = false;

-- ========================================
-- 6. VERIFY THE CLEANUP AND SETUP
-- ========================================
SELECT 
    'Final database state:' as info,
    email,
    username,
    user_program, 
    is_admin,
    'Admin' as account_type
FROM public.users WHERE is_admin = true

UNION ALL

SELECT 
    'Final database state:' as info,
    email,
    username,
    user_program,
    is_admin,
    'Student' as account_type  
FROM public.users WHERE is_admin = false;

-- ========================================
-- 7. TEST STUDENT LOGIN CREDENTIALS
-- ========================================
/*
TEST STUDENT LOGIN:
Email: manicuza@laurentian.ca
Password: PurpleMud30!
Program: BPHE Kinesiology
Type: Student Account

ADMIN ACCOUNT REMAINS:
Email: agodwin@laurentian.ca  
Password: HotPotato45%
Program: Primary Instructor
Type: Admin Account

The database is now clean with just 1 admin and 1 test student!
*/