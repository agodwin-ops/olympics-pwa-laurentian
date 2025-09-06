-- CHECK PLAYER_STATS TABLE SCHEMA
-- This will show us exactly what columns exist in the player_stats table

-- ========================================
-- 1. CHECK PLAYER_STATS TABLE STRUCTURE
-- ========================================
SELECT 
    'Player Stats table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'player_stats' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 2. CHECK ALL TABLE STRUCTURES FOR REFERENCE
-- ========================================
SELECT 
    'All tables in database:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ========================================
-- 3. CHECK XP_ENTRIES TABLE STRUCTURE TOO
-- ========================================
SELECT 
    'XP Entries table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'xp_entries' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 4. CHECK PLAYER_SKILLS TABLE STRUCTURE
-- ========================================
SELECT 
    'Player Skills table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'player_skills' 
AND table_schema = 'public'
ORDER BY ordinal_position;