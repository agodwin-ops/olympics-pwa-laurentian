-- SAFE SECURITY-HARDENED Olympics RPG Database Schema
-- This version ONLY ADDS security without dropping existing objects
-- Safe to run on existing databases

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security globally (safe to repeat)
ALTER DATABASE postgres SET row_security = on;

-- ===========================================
-- CREATE TABLES (IF NOT EXISTS - SAFE)
-- ===========================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    profile_picture_url TEXT,
    user_program VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player stats table
CREATE TABLE IF NOT EXISTS player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_rank INTEGER DEFAULT 0,
    gameboard_xp INTEGER DEFAULT 0,
    gameboard_position INTEGER DEFAULT 1,
    gameboard_moves INTEGER DEFAULT 3,
    gold INTEGER DEFAULT 3,
    unit_xp JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player skills table
CREATE TABLE IF NOT EXISTS player_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    strength INTEGER DEFAULT 1 CHECK (strength >= 1 AND strength <= 5),
    endurance INTEGER DEFAULT 1 CHECK (endurance >= 1 AND endurance <= 5),
    tactics INTEGER DEFAULT 1 CHECK (tactics >= 1 AND tactics <= 5),
    climbing INTEGER DEFAULT 1 CHECK (climbing >= 1 AND climbing <= 5),
    speed INTEGER DEFAULT 1 CHECK (speed >= 1 AND speed <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player inventory table
CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    water INTEGER DEFAULT 0,
    gatorade INTEGER DEFAULT 0,
    first_aid_kit INTEGER DEFAULT 0,
    skis INTEGER DEFAULT 0,
    toques INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- XP entries table
CREATE TABLE IF NOT EXISTS xp_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('assignment', 'bonus', 'gameboard', 'special')),
    assignment_id UUID,
    assignment_name VARCHAR(255),
    unit_id UUID,
    awarded_by UUID REFERENCES users(id),
    description TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medals table
CREATE TABLE IF NOT EXISTS medals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('gold', 'silver', 'bronze')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('assignment', 'gameboard', 'special')),
    description TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gameboard stations table
CREATE TABLE IF NOT EXISTS gameboard_stations (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    narrative TEXT,
    required_skill VARCHAR(50) NOT NULL CHECK (required_skill IN ('Strength', 'Endurance', 'Tactics', 'Climbing', 'Speed')),
    completion_reward_xp INTEGER DEFAULT 0,
    completion_reward_items JSONB DEFAULT '{}',
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL
);

-- Dice rolls table
CREATE TABLE IF NOT EXISTS dice_rolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES gameboard_stations(id),
    skill_level INTEGER NOT NULL,
    success_chance INTEGER NOT NULL,
    roll_result INTEGER NOT NULL,
    was_successful BOOLEAN NOT NULL,
    rolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin activity log
CREATE TABLE IF NOT EXISTS admin_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    target_user_id UUID REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units table
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    max_xp INTEGER NOT NULL DEFAULT 100,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ENABLE ROW LEVEL SECURITY (SAFE)
-- ===========================================

-- Enable RLS on all tables (safe to repeat)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE medals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dice_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameboard_stations ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SECURITY POLICIES (ONLY CREATE NEW ONES)
-- ===========================================

-- Users table policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'users_read_own_profile' 
        AND tablename = 'users'
    ) THEN
        CREATE POLICY "users_read_own_profile" ON users 
            FOR SELECT USING (auth.uid()::text = id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'users_admins_read_all' 
        AND tablename = 'users'
    ) THEN
        CREATE POLICY "users_admins_read_all" ON users 
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
            );
    END IF;
END $$;

-- Player stats policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'player_stats_read_own' 
        AND tablename = 'player_stats'
    ) THEN
        CREATE POLICY "player_stats_read_own" ON player_stats 
            FOR SELECT USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'player_stats_admins_all' 
        AND tablename = 'player_stats'
    ) THEN
        CREATE POLICY "player_stats_admins_all" ON player_stats 
            FOR ALL USING (
                EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
            );
    END IF;
END $$;

-- Player skills policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'player_skills_read_own' 
        AND tablename = 'player_skills'
    ) THEN
        CREATE POLICY "player_skills_read_own" ON player_skills 
            FOR SELECT USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'player_skills_admins_all' 
        AND tablename = 'player_skills'
    ) THEN
        CREATE POLICY "player_skills_admins_all" ON player_skills 
            FOR ALL USING (
                EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
            );
    END IF;
END $$;

-- Player inventory policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'player_inventory_read_own' 
        AND tablename = 'player_inventory'
    ) THEN
        CREATE POLICY "player_inventory_read_own" ON player_inventory 
            FOR SELECT USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'player_inventory_admins_all' 
        AND tablename = 'player_inventory'
    ) THEN
        CREATE POLICY "player_inventory_admins_all" ON player_inventory 
            FOR ALL USING (
                EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
            );
    END IF;
END $$;

-- XP entries policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'xp_entries_read_own' 
        AND tablename = 'xp_entries'
    ) THEN
        CREATE POLICY "xp_entries_read_own" ON xp_entries 
            FOR SELECT USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'xp_entries_admins_all' 
        AND tablename = 'xp_entries'
    ) THEN
        CREATE POLICY "xp_entries_admins_all" ON xp_entries 
            FOR ALL USING (
                EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
            );
    END IF;
END $$;

-- Medals policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'medals_read_own' 
        AND tablename = 'medals'
    ) THEN
        CREATE POLICY "medals_read_own" ON medals 
            FOR SELECT USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'medals_admins_all' 
        AND tablename = 'medals'
    ) THEN
        CREATE POLICY "medals_admins_all" ON medals 
            FOR ALL USING (
                EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
            );
    END IF;
END $$;

-- Dice rolls policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'dice_rolls_read_own' 
        AND tablename = 'dice_rolls'
    ) THEN
        CREATE POLICY "dice_rolls_read_own" ON dice_rolls 
            FOR SELECT USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'dice_rolls_create_own' 
        AND tablename = 'dice_rolls'
    ) THEN
        CREATE POLICY "dice_rolls_create_own" ON dice_rolls 
            FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
    END IF;
END $$;

-- Admin activity policies - ONLY admins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'admin_activity_admins_only' 
        AND tablename = 'admin_activity'
    ) THEN
        CREATE POLICY "admin_activity_admins_only" ON admin_activity 
            FOR ALL USING (
                EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
            );
    END IF;
END $$;

-- Educational content - Public read access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'units_read_active' 
        AND tablename = 'units'
    ) THEN
        CREATE POLICY "units_read_active" ON units 
            FOR SELECT TO authenticated USING (is_active = true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'assignments_read_all' 
        AND tablename = 'assignments'
    ) THEN
        CREATE POLICY "assignments_read_all" ON assignments 
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'stations_read_all' 
        AND tablename = 'gameboard_stations'
    ) THEN
        CREATE POLICY "stations_read_all" ON gameboard_stations 
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- ===========================================
-- SECURE PERMISSIONS (ADDITIVE ONLY)
-- ===========================================

-- Grant minimal permissions (safe to repeat)
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON users, units, assignments, gameboard_stations TO authenticated;
GRANT SELECT, INSERT ON player_stats, player_skills, player_inventory TO authenticated;
GRANT SELECT, INSERT ON xp_entries, medals, dice_rolls TO authenticated;

-- ===========================================
-- PERFORMANCE INDEXES (SAFE)
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_total_xp ON player_stats(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_player_skills_user_id ON player_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_entries_user_id ON xp_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_user_id ON dice_rolls(user_id);

-- ===========================================
-- SAFE INITIAL DATA
-- ===========================================

-- Insert default gameboard stations (safe with conflict handling)
INSERT INTO gameboard_stations (id, name, description, narrative, required_skill, completion_reward_xp, position_x, position_y) VALUES
(1, 'Saddledome Challenge', 'Navigate the iconic Calgary Saddledome venue', 'Your first major test as Chef de Mission begins at the Saddledome, Calgary''s premier venue.', 'Tactics', 750, 100, 500),
(2, 'Equipment Check', 'Inspect and prepare all Olympic equipment', 'The quartermaster needs help organizing equipment. Your attention to detail is crucial.', 'Tactics', 25, 200, 450),
(3, 'Training Facility', 'Complete initial training assessments', 'Show your team what Canadian athletes are made of in the training facility.', 'Endurance', 30, 300, 400),
(4, 'Media Center', 'Handle press conferences and interviews', 'The world is watching. Represent Canada with pride and strategic communication.', 'Tactics', 35, 400, 350),
(5, 'Alpine Challenge', 'Navigate the mountain training course', 'The Rocky Mountains await. Guide your team through challenging terrain.', 'Climbing', 40, 500, 300),
(6, 'Ski Jump Platform', 'Oversee ski jumping practice sessions', 'Heights don''t scare true Champions. Lead by example on the ski jump.', 'Speed', 45, 600, 250),
(7, 'Ice Hockey Rink', 'Coordinate team strategy for hockey events', 'The rink is where legends are made. Develop winning strategies for your hockey team.', 'Tactics', 50, 700, 200),
(8, 'Figure Skating Arena', 'Manage artistic performance preparations', 'Grace under pressure. Help your figure skaters perfect their Olympic routines.', 'Speed', 55, 800, 150),
(9, 'Bobsled Track', 'Supervise high-speed racing preparations', 'Speed and precision. Guide your bobsled team through track reconnaissance.', 'Strength', 60, 900, 100),
(10, 'Speed Skating Oval', 'Coordinate speed skating preparations', 'The Olympic Oval awaits your leadership in speed skating preparations.', 'Endurance', 65, 950, 75),
(11, 'Closing Ceremony', 'Lead the Canadian delegation in the closing ceremony', 'You''ve guided Canada through the Olympics. Time to celebrate your team''s achievements.', 'Endurance', 100, 1000, 50)
ON CONFLICT (id) DO NOTHING;

-- Insert default units (safe with conflict handling)
INSERT INTO units (name, description, order_index, created_by) 
SELECT 'Olympic History & Values', 'Foundation knowledge of the Olympic movement and Canadian winter sports heritage', 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM units WHERE name = 'Olympic History & Values');

INSERT INTO units (name, description, order_index, created_by) 
SELECT 'Leadership & Team Management', 'Essential skills for leading Olympic teams and managing athletes', 2, NULL
WHERE NOT EXISTS (SELECT 1 FROM units WHERE name = 'Leadership & Team Management');

INSERT INTO units (name, description, order_index, created_by) 
SELECT 'Strategic Planning & Tactics', 'Advanced Olympic campaign planning and competitive strategy', 3, NULL
WHERE NOT EXISTS (SELECT 1 FROM units WHERE name = 'Strategic Planning & Tactics');