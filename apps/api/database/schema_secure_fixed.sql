-- SECURITY-HARDENED 1992 Olympics Chef de Mission RPG Database Schema
-- This version fixes critical RLS vulnerabilities found in the original schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security globally
ALTER DATABASE postgres SET row_security = on;

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

-- Units table (learning modules)
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

-- Player inventory table (special items)
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

-- XP entries table (for tracking all XP awards)
CREATE TABLE IF NOT EXISTS xp_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('assignment', 'bonus', 'gameboard', 'special')),
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    assignment_name VARCHAR(255),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
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

-- Dice rolls table (for tracking gameboard attempts)
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

-- Lectures table for organizing course content
CREATE TABLE IF NOT EXISTS lectures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Resources/Files table for lecture materials
CREATE TABLE IF NOT EXISTS lecture_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- File access logs for tracking downloads
CREATE TABLE IF NOT EXISTS file_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID REFERENCES lecture_resources(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_type VARCHAR(50) DEFAULT 'download',
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===========================================
-- SECURITY-HARDENED ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Users table - STRICT access control
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read only their own profile" ON users;
CREATE POLICY "Users can read only their own profile" ON users 
    FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Admins can read all users" ON users;
CREATE POLICY "Admins can read all users" ON users 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

DROP POLICY IF EXISTS "Users can update only their own profile" ON users;
CREATE POLICY "Users can update only their own profile" ON users 
    FOR UPDATE USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Only admins can insert users" ON users;
CREATE POLICY "Only admins can insert users" ON users 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

-- Player stats - Users can ONLY see their own data
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read only their own stats" ON player_stats;
CREATE POLICY "Users can read only their own stats" ON player_stats 
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can read all stats" ON player_stats;
CREATE POLICY "Admins can read all stats" ON player_stats 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admins can update all stats" ON player_stats;
CREATE POLICY "Admins can update all stats" ON player_stats 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

-- Player skills - Users can ONLY see their own data
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read only their own skills" ON player_skills;
CREATE POLICY "Users can read only their own skills" ON player_skills 
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can manage all skills" ON player_skills;
CREATE POLICY "Admins can manage all skills" ON player_skills 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

-- Player inventory - Users can ONLY see their own data
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read only their own inventory" ON player_inventory;
CREATE POLICY "Users can read only their own inventory" ON player_inventory 
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can manage all inventory" ON player_inventory;
CREATE POLICY "Admins can manage all inventory" ON player_inventory 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

-- XP entries - Users can ONLY see their own data
ALTER TABLE xp_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read only their own xp entries" ON xp_entries;
CREATE POLICY "Users can read only their own xp entries" ON xp_entries 
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can read all xp entries" ON xp_entries;
CREATE POLICY "Admins can read all xp entries" ON xp_entries 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

DROP POLICY IF EXISTS "Only admins can create xp entries" ON xp_entries;
CREATE POLICY "Only admins can create xp entries" ON xp_entries 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

-- Medals - Users can ONLY see their own medals
ALTER TABLE medals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read only their own medals" ON medals;
CREATE POLICY "Users can read only their own medals" ON medals 
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can manage all medals" ON medals;
CREATE POLICY "Admins can manage all medals" ON medals 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

-- Dice rolls - Users can ONLY see their own rolls
ALTER TABLE dice_rolls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read only their own dice rolls" ON dice_rolls;
CREATE POLICY "Users can read only their own dice rolls" ON dice_rolls 
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can create their own dice rolls" ON dice_rolls;
CREATE POLICY "Users can create their own dice rolls" ON dice_rolls 
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can read all dice rolls" ON dice_rolls;
CREATE POLICY "Admins can read all dice rolls" ON dice_rolls 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

-- Admin activity - ONLY admins can access
ALTER TABLE admin_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can access admin activity" ON admin_activity;
CREATE POLICY "Only admins can access admin activity" ON admin_activity 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
    );

-- Educational content - Secure public access
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Units are readable by authenticated users" ON units;
CREATE POLICY "Units are readable by authenticated users" ON units 
    FOR SELECT TO authenticated USING (is_active = true);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assignments are readable by authenticated users" ON assignments;
CREATE POLICY "Assignments are readable by authenticated users" ON assignments 
    FOR SELECT TO authenticated USING (true);

ALTER TABLE gameboard_stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stations are readable by authenticated users" ON gameboard_stations;
CREATE POLICY "Stations are readable by authenticated users" ON gameboard_stations 
    FOR SELECT TO authenticated USING (true);

-- Lectures and resources
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all lectures" ON lectures;
CREATE POLICY "Admins can manage all lectures" ON lectures
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

DROP POLICY IF EXISTS "Students can view only published lectures" ON lectures;
CREATE POLICY "Students can view only published lectures" ON lectures
    FOR SELECT USING (is_published = true);

ALTER TABLE lecture_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all resources" ON lecture_resources;
CREATE POLICY "Admins can manage all resources" ON lecture_resources
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

DROP POLICY IF EXISTS "Students can view only public resources" ON lecture_resources;
CREATE POLICY "Students can view only public resources" ON lecture_resources
    FOR SELECT USING (is_public = true);

ALTER TABLE file_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all access logs" ON file_access_logs;
CREATE POLICY "Admins can view all access logs" ON file_access_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

DROP POLICY IF EXISTS "Users can create their own access logs" ON file_access_logs;
CREATE POLICY "Users can create their own access logs" ON file_access_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- SECURE DATABASE PERMISSIONS (NO MORE "GRANT ALL")
-- ===========================================

-- Grant minimal necessary permissions instead of "GRANT ALL"
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant SELECT permissions only where needed
GRANT SELECT ON users, units, assignments, gameboard_stations TO authenticated;
GRANT SELECT ON lectures, lecture_resources TO authenticated;
GRANT SELECT, INSERT ON player_stats, player_skills, player_inventory TO authenticated;
GRANT SELECT, INSERT ON xp_entries, medals, dice_rolls, file_access_logs TO authenticated;

-- Only service role gets full permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ===========================================
-- FUNCTIONS AND TRIGGERS
-- ===========================================

-- Create functions for automatic ranking updates
CREATE OR REPLACE FUNCTION update_player_rankings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update rankings based on total XP
    WITH ranked_players AS (
        SELECT 
            user_id,
            ROW_NUMBER() OVER (ORDER BY total_xp DESC, current_level DESC, current_xp DESC) as new_rank
        FROM player_stats
        WHERE total_xp > 0
    )
    UPDATE player_stats 
    SET current_rank = ranked_players.new_rank
    FROM ranked_players 
    WHERE player_stats.user_id = ranked_players.user_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic ranking updates
DROP TRIGGER IF EXISTS trigger_update_rankings ON player_stats;
CREATE TRIGGER trigger_update_rankings
    AFTER INSERT OR UPDATE OF total_xp ON player_stats
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_player_rankings();

-- Create function to update player level based on XP
CREATE OR REPLACE FUNCTION update_player_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Update level based on total XP (200 XP per level)
    NEW.current_level = GREATEST(1, FLOOR(NEW.total_xp / 200) + 1);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic level updates
DROP TRIGGER IF EXISTS trigger_update_level ON player_stats;
CREATE TRIGGER trigger_update_level
    BEFORE UPDATE OF total_xp ON player_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_player_level();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_player_skills_updated_at ON player_skills;
CREATE TRIGGER trigger_player_skills_updated_at BEFORE UPDATE ON player_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_player_inventory_updated_at ON player_inventory;
CREATE TRIGGER trigger_player_inventory_updated_at BEFORE UPDATE ON player_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_total_xp ON player_stats(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_current_rank ON player_stats(current_rank);
CREATE INDEX IF NOT EXISTS idx_player_skills_user_id ON player_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_entries_user_id ON xp_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_entries_awarded_at ON xp_entries(awarded_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_entries_type ON xp_entries(type);
CREATE INDEX IF NOT EXISTS idx_assignments_unit_id ON assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_user_id ON dice_rolls(user_id);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_station_id ON dice_rolls(station_id);
CREATE INDEX IF NOT EXISTS idx_lectures_unit_id ON lectures(unit_id);
CREATE INDEX IF NOT EXISTS idx_lectures_published ON lectures(is_published);
CREATE INDEX IF NOT EXISTS idx_lecture_resources_lecture_id ON lecture_resources(lecture_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_id ON file_access_logs(user_id);

-- ===========================================
-- INITIAL DATA
-- ===========================================

-- Insert default gameboard stations
INSERT INTO gameboard_stations (id, name, description, narrative, required_skill, completion_reward_xp, position_x, position_y) VALUES
(1, 'Saddledome Challenge', 'Navigate the iconic Calgary Saddledome venue', 'Your first major test as Chef de Mission begins at the Saddledome, Calgary''s premier venue.', 'Tactics', 750, 100, 500),
(2, 'Equipment Check', 'Inspect and prepare all Olympic equipment', 'The quartermaster needs help organizing equipment. Your attention to detail is crucial.', 'Tactics', 25, 200, 450),
(3, 'Training Facility', 'Complete initial training assessments', 'Show your team what Canadian athletes are made of in the training facility.', 'Endurance', 30, 300, 400),
(4, 'Media Center', 'Handle press conferences and interviews', 'The world is watching. Represent Canada with pride and strategic communication.', 'Tactics', 35, 400, 350),
(5, 'Alpine Challenge', 'Navigate the mountain training course', 'The Rocky Mountains await. Guide your team through challenging terrain.', 'Climbing', 40, 500, 300),
(6, 'Ski Jump Platform', 'Oversee ski jumping practice sessions', 'Heights don''t scare true Champions. Lead by example on the ski jump.', 'Speed', 45, 600, 250),
(7, 'Ice Hockey Rink', 'Coordinate team strategy for hockey events', 'The rink is where legends are made. Develop winning strategies for your hockey team.', 'Tactics', 50, 700, 200),
(8, 'Figure Skating Arena', 'Manage artistic performance preparations', 'Grace under pressure. Help your figure skaters perfect your Olympic routines.', 'Speed', 55, 800, 150),
(9, 'Bobsled Track', 'Supervise high-speed racing preparations', 'Speed and precision. Guide your bobsled team through track reconnaissance.', 'Strength', 60, 900, 100),
(10, 'Speed Skating Oval', 'Coordinate speed skating preparations', 'The Olympic Oval awaits your leadership in speed skating preparations.', 'Endurance', 65, 950, 75),
(11, 'Closing Ceremony', 'Lead the Canadian delegation in the closing ceremony', 'You''ve guided Canada through the Olympics. Time to celebrate your team''s achievements.', 'Endurance', 100, 1000, 50)
ON CONFLICT (id) DO NOTHING;

-- Insert default units
INSERT INTO units (name, description, order_index, created_by) VALUES
('Olympic History & Values', 'Foundation knowledge of the Olympic movement and Canadian winter sports heritage', 1, NULL),
('Leadership & Team Management', 'Essential skills for leading Olympic teams and managing athletes', 2, NULL),
('Strategic Planning & Tactics', 'Advanced Olympic campaign planning and competitive strategy', 3, NULL)
ON CONFLICT DO NOTHING;