-- FIX XP_ENTRIES TABLE SCHEMA
-- Add missing created_at column and ensure table structure is correct

-- ========================================
-- 1. CHECK CURRENT XP_ENTRIES TABLE
-- ========================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'xp_entries' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 2. ADD MISSING CREATED_AT COLUMN IF NOT EXISTS
-- ========================================
DO $$
BEGIN
    -- Check if created_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'xp_entries' 
        AND column_name = 'created_at' 
        AND table_schema = 'public'
    ) THEN
        -- Add the missing column
        ALTER TABLE public.xp_entries 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Update existing records to have created_at
        UPDATE public.xp_entries 
        SET created_at = NOW() 
        WHERE created_at IS NULL;
    END IF;
END $$;

-- ========================================
-- 3. ENSURE COMPLETE XP_ENTRIES SCHEMA
-- ========================================
-- Create the table if it doesn't exist with full schema
CREATE TABLE IF NOT EXISTS public.xp_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity VARCHAR(255) NOT NULL,
    xp_gained INTEGER NOT NULL CHECK (xp_gained >= 0),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 4. VERIFY TABLE STRUCTURE
-- ========================================
SELECT 
    'XP Entries table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'xp_entries' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT 'XP Entries table fixed successfully!' as message;