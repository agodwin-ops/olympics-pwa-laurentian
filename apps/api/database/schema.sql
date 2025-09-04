-- 1992 Olympics Chef de Mission RPG Database Schema
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
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
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Assignments table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    max_xp INTEGER NOT NULL DEFAULT 100,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player stats table
CREATE TABLE player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_rank INTEGER DEFAULT 0,
    gameboard_xp INTEGER DEFAULT 0,
    gameboard_position INTEGER DEFAULT 1,
    gameboard_moves INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 0,
    unit_xp JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player skills table
CREATE TABLE player_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    strength INTEGER DEFAULT 1 CHECK (strength >= 1 AND strength <= 5),
    endurance INTEGER DEFAULT 1 CHECK (endurance >= 1 AND endurance <= 5),
    tactics INTEGER DEFAULT 1 CHECK (tactics >= 1 AND tactics <= 5),
    climbing INTEGER DEFAULT 1 CHECK (climbing >= 1 AND climbing <= 5),
    jumping INTEGER DEFAULT 1 CHECK (jumping >= 1 AND jumping <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player inventory table (special items)
CREATE TABLE player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    water INTEGER DEFAULT 0,
    gatorade INTEGER DEFAULT 0,
    first_aid_kit INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- XP entries table (for tracking all XP awards)
CREATE TABLE xp_entries (
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
CREATE TABLE medals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('gold', 'silver', 'bronze')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('assignment', 'gameboard', 'special')),
    description TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gameboard stations table
CREATE TABLE gameboard_stations (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    narrative TEXT,
    required_skill VARCHAR(50) NOT NULL CHECK (required_skill IN ('Strength', 'Endurance', 'Tactics', 'Climbing', 'Jumping')),
    completion_reward_xp INTEGER DEFAULT 0,
    completion_reward_items JSONB DEFAULT '{}',
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL
);

-- Dice rolls table (for tracking gameboard attempts)
CREATE TABLE dice_rolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES gameboard_stations(id),
    skill_level INTEGER NOT NULL,
    success_chance INTEGER NOT NULL,
    roll_result INTEGER NOT NULL,
    was_successful BOOLEAN NOT NULL,
    rolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource files table
CREATE TABLE resource_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255),
    size_bytes BIGINT,
    file_path TEXT NOT NULL,
    folder_id UUID REFERENCES resource_folders(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES users(id),
    download_count INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource folders table
CREATE TABLE resource_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES resource_folders(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin activity log
CREATE TABLE admin_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    target_user_id UUID REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default gameboard stations
INSERT INTO gameboard_stations (id, name, description, narrative, required_skill, completion_reward_xp, position_x, position_y) VALUES
(1, 'Base Camp Setup', 'Establish your team base camp in the Olympic village', 'Your team has arrived at Albertville. Time to set up base camp and prepare for the challenges ahead.', 'Strength', 20, 100, 500),
(2, 'Equipment Check', 'Inspect and prepare all Olympic equipment', 'The quartermaster needs help organizing equipment. Your attention to detail is crucial.', 'Tactics', 25, 200, 450),
(3, 'Training Facility', 'Complete initial training assessments', 'Show your team what Canadian athletes are made of in the training facility.', 'Endurance', 30, 300, 400),
(4, 'Media Center', 'Handle press conferences and interviews', 'The world is watching. Represent Canada with pride and strategic communication.', 'Tactics', 35, 400, 350),
(5, 'Alpine Challenge', 'Navigate the mountain training course', 'The Alps await. Guide your team through challenging mountain terrain.', 'Climbing', 40, 500, 300),
(6, 'Ski Jump Platform', 'Oversee ski jumping practice sessions', 'Heights don''t scare true Champions. Lead by example on the ski jump.', 'Jumping', 45, 600, 250),
(7, 'Ice Hockey Rink', 'Coordinate team strategy for hockey events', 'The rink is where legends are made. Develop winning strategies for your hockey team.', 'Tactics', 50, 700, 200),
(8, 'Figure Skating Arena', 'Manage artistic performance preparations', 'Grace under pressure. Help your figure skaters perfect their Olympic routines.', 'Jumping', 55, 800, 150),
(9, 'Bobsled Track', 'Supervise high-speed racing preparations', 'Speed and precision. Guide your bobsled team through track reconnaissance.', 'Strength', 60, 900, 100),
(10, 'Closing Ceremony', 'Lead the Canadian delegation in the closing ceremony', 'You''ve guided Canada through the Olympics. Time to celebrate your team''s achievements.', 'Endurance', 100, 1000, 50);

-- Insert default units
INSERT INTO units (name, description, order_index, created_by) VALUES
('Olympic History & Values', 'Foundation knowledge of the Olympic movement and Canadian winter sports heritage', 1, NULL),
('Leadership & Team Management', 'Essential skills for leading Olympic teams and managing athletes', 2, NULL),
('Strategic Planning & Tactics', 'Advanced Olympic campaign planning and competitive strategy', 3, NULL);

-- Insert default assignments
INSERT INTO assignments (name, description, unit_id, max_xp) VALUES
('Introduction to Olympic Games', 'Learn about the history and values of the Olympics', (SELECT id FROM units WHERE name = 'Olympic History & Values'), 100),
('Canadian Olympic Heritage', 'Research Canada''s Winter Olympic history and achievements', (SELECT id FROM units WHERE name = 'Olympic History & Values'), 150),
('Winter Sports Overview', 'Study all Winter Olympic sports and their requirements', (SELECT id FROM units WHERE name = 'Olympic History & Values'), 125),
('Team Leadership Principles', 'Understand the fundamentals of leading Olympic teams', (SELECT id FROM units WHERE name = 'Leadership & Team Management'), 175),
('Athlete Psychology', 'Learn about managing athlete mental health and motivation', (SELECT id FROM units WHERE name = 'Leadership & Team Management'), 200),
('Crisis Management', 'Handle challenging situations during Olympic competition', (SELECT id FROM units WHERE name = 'Leadership & Team Management'), 225),
('Olympic Campaign Planning', 'Develop comprehensive strategies for Olympic success', (SELECT id FROM units WHERE name = 'Strategic Planning & Tactics'), 250),
('Performance Analysis', 'Analyze competitor strategies and team performance metrics', (SELECT id FROM units WHERE name = 'Strategic Planning & Tactics'), 275),
('Resource Optimization', 'Maximize team resources and support systems', (SELECT id FROM units WHERE name = 'Strategic Planning & Tactics'), 300);

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
$$ LANGUAGE plpgsql;

-- Create trigger for automatic ranking updates
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
$$ LANGUAGE plpgsql;

-- Create trigger for automatic level updates
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
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_player_skills_updated_at BEFORE UPDATE ON player_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_player_inventory_updated_at BEFORE UPDATE ON player_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) Policies

-- Users can read their own data and admins can read all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Admins can read all users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Player stats - users can read own, admins can read all
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own stats" ON player_stats FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can read all stats" ON player_stats FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
);
CREATE POLICY "Admins can update all stats" ON player_stats FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
);

-- Similar policies for other tables
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own skills" ON player_skills FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all skills" ON player_skills FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
);

ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own inventory" ON player_inventory FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can manage all inventory" ON player_inventory FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
);

-- XP entries - readable by user and admins, only admins can create
ALTER TABLE xp_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own xp entries" ON xp_entries FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can read all xp entries" ON xp_entries FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
);
CREATE POLICY "Admins can create xp entries" ON xp_entries FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND is_admin = true)
);

-- Public read access for static data
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Units are readable by all authenticated users" ON units FOR SELECT TO authenticated USING (true);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assignments are readable by all authenticated users" ON assignments FOR SELECT TO authenticated USING (true);

ALTER TABLE gameboard_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stations are readable by all authenticated users" ON gameboard_stations FOR SELECT TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX idx_player_stats_total_xp ON player_stats(total_xp DESC);
CREATE INDEX idx_player_stats_current_rank ON player_stats(current_rank);
CREATE INDEX idx_player_skills_user_id ON player_skills(user_id);
CREATE INDEX idx_xp_entries_user_id ON xp_entries(user_id);
CREATE INDEX idx_xp_entries_awarded_at ON xp_entries(awarded_at DESC);
CREATE INDEX idx_xp_entries_type ON xp_entries(type);
CREATE INDEX idx_assignments_unit_id ON assignments(unit_id);
CREATE INDEX idx_dice_rolls_user_id ON dice_rolls(user_id);
CREATE INDEX idx_dice_rolls_station_id ON dice_rolls(station_id);

-- =============================================
-- LECTURES AND RESOURCES TABLES
-- =============================================

-- Lectures table for organizing course content
CREATE TABLE IF NOT EXISTS lectures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- File access logs for tracking downloads
CREATE TABLE IF NOT EXISTS file_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID REFERENCES lecture_resources(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_type VARCHAR(50) DEFAULT 'download', -- download, view, etc.
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Additional indexes for lectures and resources
CREATE INDEX IF NOT EXISTS idx_lectures_unit_id ON lectures(unit_id);
CREATE INDEX IF NOT EXISTS idx_lectures_published ON lectures(is_published);
CREATE INDEX IF NOT EXISTS idx_lecture_resources_lecture_id ON lecture_resources(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_resources_file_type ON lecture_resources(file_type);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_resource_id ON file_access_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_id ON file_access_logs(user_id);

-- Enable RLS on new tables
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_access_logs ENABLE ROW LEVEL SECURITY;

-- Lectures policies
CREATE POLICY "Admins can manage all lectures" ON lectures
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "Students can view published lectures" ON lectures
    FOR SELECT USING (is_published = true);

-- Lecture resources policies
CREATE POLICY "Admins can manage all resources" ON lecture_resources
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "Students can view public resources" ON lecture_resources
    FOR SELECT USING (is_public = true);

-- File access logs policies
CREATE POLICY "Admins can view all access logs" ON file_access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "Users can create their own access logs" ON file_access_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create view for leaderboard
CREATE VIEW leaderboard AS
SELECT 
    u.id,
    u.username,
    u.user_program,
    u.profile_picture_url,
    ps.total_xp,
    ps.current_level,
    ps.current_rank,
    ps.gameboard_xp,
    ps.gameboard_position,
    ps.gold,
    CASE 
        WHEN ps.current_rank <= (SELECT COUNT(*) FROM player_stats WHERE total_xp > 0) / 3 THEN 'gold'
        WHEN ps.current_rank <= (SELECT COUNT(*) FROM player_stats WHERE total_xp > 0) * 2 / 3 THEN 'silver'
        ELSE 'bronze'
    END as medal_tier
FROM users u
JOIN player_stats ps ON u.id = ps.user_id
WHERE ps.total_xp > 0
ORDER BY ps.current_rank;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;