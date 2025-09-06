-- CREATE ADDITIONAL TEST STUDENT: aa_jeffkins@laurentian.ca
-- This adds a second test student to the existing database

-- ========================================
-- 1. CHECK CURRENT DATABASE STATE
-- ========================================
SELECT 
    'Current users before adding new student:' as info,
    email,
    username, 
    user_program,
    is_admin,
    created_at
FROM public.users 
ORDER BY created_at DESC;

-- ========================================
-- 2. CREATE NEW TEST STUDENT
-- ========================================
-- Insert new test student user
INSERT INTO public.users (
    id,
    email,
    username,
    password_hash,
    user_program,
    is_admin,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'aa_jeffkins@laurentian.ca',
    'TestStudent_Jeffkins',
    crypt('Skiing123*', gen_salt('bf')),  -- Bcrypt hash for password
    'BPHE Kinesiology',
    false,
    NOW(),
    NOW()
);

-- ========================================
-- 3. CREATE PLAYER STATS FOR NEW STUDENT
-- ========================================
-- Create initial player stats for the new test student
INSERT INTO public.player_stats (
    id,
    user_id,
    current_xp,
    total_xp,
    current_level,
    current_rank,
    gameboard_xp,
    gameboard_position,
    gameboard_moves,
    gold,
    unit_xp,
    created_at,
    updated_at
) 
SELECT 
    uuid_generate_v4(),
    id as user_id,
    0 as current_xp,
    0 as total_xp,
    1 as current_level,
    0 as current_rank,
    0 as gameboard_xp,
    1 as gameboard_position,
    3 as gameboard_moves,
    3 as gold,
    '{}' as unit_xp,
    NOW() as created_at,
    NOW() as updated_at
FROM public.users 
WHERE email = 'aa_jeffkins@laurentian.ca';

-- ========================================
-- 4. CREATE PLAYER SKILLS FOR NEW STUDENT
-- ========================================
-- Create initial skills for the new test student
INSERT INTO public.player_skills (
    id,
    user_id,
    strength,
    agility,
    intelligence,
    charisma,
    luck,
    created_at,
    updated_at
)
SELECT 
    uuid_generate_v4(),
    id as user_id,
    1 as strength,
    1 as agility,
    1 as intelligence,
    1 as charisma,
    1 as luck,
    NOW() as created_at,
    NOW() as updated_at
FROM public.users 
WHERE email = 'aa_jeffkins@laurentian.ca';

-- ========================================
-- 5. VERIFY THE NEW STUDENT CREATION
-- ========================================
SELECT 
    'Updated database state:' as info,
    email,
    username,
    user_program, 
    is_admin,
    CASE 
        WHEN is_admin = true THEN 'Admin'
        ELSE 'Student'
    END as account_type,
    created_at
FROM public.users 
ORDER BY is_admin DESC, created_at DESC;

-- ========================================
-- 6. VERIFY STUDENT STATS AND SKILLS
-- ========================================
SELECT 
    'Player stats for new student:' as info,
    u.email,
    ps.current_level,
    ps.current_xp,
    ps.total_xp,
    ps.gold,
    ps.gameboard_position,
    ps.gameboard_moves
FROM public.users u
JOIN public.player_stats ps ON u.id = ps.user_id
WHERE u.email = 'aa_jeffkins@laurentian.ca';

SELECT 
    'Player skills for new student:' as info,
    u.email,
    sk.strength,
    sk.agility,
    sk.intelligence,
    sk.charisma,
    sk.luck
FROM public.users u
JOIN public.player_skills sk ON u.id = sk.user_id
WHERE u.email = 'aa_jeffkins@laurentian.ca';

-- ========================================
-- 7. NEW TEST STUDENT LOGIN CREDENTIALS
-- ========================================
/*
NEW TEST STUDENT LOGIN:
Email: aa_jeffkins@laurentian.ca
Password: Skiing123*
Program: BPHE Kinesiology
Type: Student Account

EXISTING ACCOUNTS REMAIN UNCHANGED:
- Admin: agodwin@laurentian.ca (Password: HotPotato45%)
- Student: manicuza@laurentian.ca (Password: PurpleMud30!)

Database now has 1 admin and 2 test students!
*/