-- Olympics PWA Database Schema for Supabase
-- Run this script in the Supabase SQL Editor: https://app.supabase.com/project/gcxryuuggxnnitesxzpq/sql
-- This creates all necessary tables with Row Level Security (RLS)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. USERS TABLE (Public profiles, not auth.users)
-- ========================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    user_program VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    profile_picture_url VARCHAR(500),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view public user info" ON public.users
    FOR SELECT USING (true);

-- ========================================
-- 2. PLAYER STATS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    experience_points INTEGER DEFAULT 0 CHECK (experience_points >= 0),
    gold INTEGER DEFAULT 100 CHECK (gold >= 0),
    health INTEGER DEFAULT 100 CHECK (health >= 0 AND health <= max_health),
    max_health INTEGER DEFAULT 100 CHECK (max_health >= 1),
    energy INTEGER DEFAULT 100 CHECK (energy >= 0 AND energy <= max_energy),
    max_energy INTEGER DEFAULT 100 CHECK (max_energy >= 1),
    strength INTEGER DEFAULT 10 CHECK (strength >= 1),
    agility INTEGER DEFAULT 10 CHECK (agility >= 1),
    intelligence INTEGER DEFAULT 10 CHECK (intelligence >= 1),
    luck INTEGER DEFAULT 10 CHECK (luck >= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on player_stats table
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_stats
CREATE POLICY "Users can view their own stats" ON public.player_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON public.player_stats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all stats" ON public.player_stats
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- 3. PLAYER SKILLS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.player_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    cooking INTEGER DEFAULT 1 CHECK (cooking >= 1 AND cooking <= 100),
    leadership INTEGER DEFAULT 1 CHECK (leadership >= 1 AND leadership <= 100),
    strategy INTEGER DEFAULT 1 CHECK (strategy >= 1 AND strategy <= 100),
    negotiation INTEGER DEFAULT 1 CHECK (negotiation >= 1 AND negotiation <= 100),
    athletics INTEGER DEFAULT 1 CHECK (athletics >= 1 AND athletics <= 100),
    knowledge INTEGER DEFAULT 1 CHECK (knowledge >= 1 AND knowledge <= 100),
    creativity INTEGER DEFAULT 1 CHECK (creativity >= 1 AND creativity <= 100),
    problem_solving INTEGER DEFAULT 1 CHECK (problem_solving >= 1 AND problem_solving <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on player_skills table
ALTER TABLE public.player_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_skills
CREATE POLICY "Users can view their own skills" ON public.player_skills
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills" ON public.player_skills
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all skills" ON public.player_skills
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- 4. PLAYER INVENTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('tool', 'badge', 'ingredient', 'equipment', 'consumable')),
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
    description TEXT,
    properties JSONB DEFAULT '{}',
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on player_inventory table
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_inventory
CREATE POLICY "Users can view their own inventory" ON public.player_inventory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own inventory" ON public.player_inventory
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all inventory" ON public.player_inventory
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- 5. EXPERIENCE ENTRIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.experience_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity VARCHAR(100) NOT NULL,
    xp_gained INTEGER NOT NULL CHECK (xp_gained > 0),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on experience_entries table
ALTER TABLE public.experience_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for experience_entries
CREATE POLICY "Users can view their own experience" ON public.experience_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage experience entries" ON public.experience_entries
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- 6. GAME EVENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('challenge', 'opportunity', 'crisis', 'social', 'skill_check')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    choices JSONB DEFAULT '[]',
    outcome JSONB DEFAULT '{}',
    completed BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on game_events table
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_events
CREATE POLICY "Users can view their own events" ON public.game_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON public.game_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all events" ON public.game_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- 7. INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON public.player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_skills_user_id ON public.player_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_user_id ON public.player_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_experience_entries_user_id ON public.experience_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_experience_entries_created_at ON public.experience_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_events_user_id ON public.game_events(user_id);
CREATE INDEX IF NOT EXISTS idx_game_events_completed ON public.game_events(completed, expires_at);

-- ========================================
-- 8. FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at 
    BEFORE UPDATE ON public.player_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_skills_updated_at 
    BEFORE UPDATE ON public.player_skills 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_inventory_updated_at 
    BEFORE UPDATE ON public.player_inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_events_updated_at 
    BEFORE UPDATE ON public.game_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 9. SAMPLE DATA (Optional)
-- ========================================

-- Insert sample admin user (uncomment to use)
/*
INSERT INTO public.users (id, email, username, user_program, is_admin) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@olympics.com', 
    'admin', 
    'Administration', 
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample player data for admin
INSERT INTO public.player_stats (user_id) 
VALUES ('550e8400-e29b-41d4-a716-446655440000') 
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.player_skills (user_id) 
VALUES ('550e8400-e29b-41d4-a716-446655440000') 
ON CONFLICT (user_id) DO NOTHING;
*/

-- ========================================
-- SCHEMA COMPLETE
-- ========================================

-- Display success message
SELECT 'Olympics PWA Database Schema Created Successfully!' as message,
       'Tables: users, player_stats, player_skills, player_inventory, experience_entries, game_events' as tables_created,
       'Row Level Security (RLS) enabled on all tables' as security_status;