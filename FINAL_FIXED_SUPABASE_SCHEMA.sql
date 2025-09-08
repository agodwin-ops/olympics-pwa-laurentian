-- Olympics PWA Database Schema - Final Fixed Version
-- Run this in Supabase SQL Editor

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_program VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    profile_complete BOOLEAN DEFAULT TRUE,
    profile_picture_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Units table
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_xp INTEGER DEFAULT 100,
    due_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Player Stats table with missing columns
CREATE TABLE IF NOT EXISTS player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 100,
    gameboard_moves INTEGER DEFAULT 3,
    gameboard_position INTEGER DEFAULT 1,
    health INTEGER DEFAULT 100,
    max_health INTEGER DEFAULT 100,
    energy INTEGER DEFAULT 100,
    max_energy INTEGER DEFAULT 100,
    strength INTEGER DEFAULT 10,
    agility INTEGER DEFAULT 10,
    intelligence INTEGER DEFAULT 10,
    luck INTEGER DEFAULT 10,
    quest_xp JSONB DEFAULT '{}',
    special_achievements JSONB DEFAULT '[]',
    last_dice_roll TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 5. XP Entries table
CREATE TABLE IF NOT EXISTS xp_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    xp_amount INTEGER NOT NULL,
    description TEXT,
    activity_type VARCHAR(100) DEFAULT 'assignment',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Lectures table
CREATE TABLE IF NOT EXISTS lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Lecture Resources table
CREATE TABLE IF NOT EXISTS lecture_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Gameboard Stations table
CREATE TABLE IF NOT EXISTS gameboard_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    skill_required VARCHAR(100) NOT NULL,
    min_level INTEGER DEFAULT 1,
    xp_reward INTEGER DEFAULT 10,
    gold_reward INTEGER DEFAULT 0,
    energy_cost INTEGER DEFAULT 10,
    unlock_condition TEXT,
    station_type VARCHAR(50) DEFAULT 'skill',
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Player Skills table
CREATE TABLE IF NOT EXISTS player_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strength INTEGER DEFAULT 1,
    endurance INTEGER DEFAULT 1, 
    tactics INTEGER DEFAULT 1,
    cooking INTEGER DEFAULT 1,
    leadership INTEGER DEFAULT 1,
    strategy INTEGER DEFAULT 1,
    negotiation INTEGER DEFAULT 1,
    athletics INTEGER DEFAULT 1,
    knowledge INTEGER DEFAULT 1,
    creativity INTEGER DEFAULT 1,
    problem_solving INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 10. Player Inventory table
CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    item_type VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1,
    description TEXT,
    rarity VARCHAR(50) DEFAULT 'common',
    properties JSONB,
    acquired_from VARCHAR(200),
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    is_equipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Quest Progress table
CREATE TABLE IF NOT EXISTS quest_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    quest_xp INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, unit_id)
);

-- 12. Gameboard Moves Log table
CREATE TABLE IF NOT EXISTS gameboard_moves_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id UUID REFERENCES gameboard_stations(id) ON DELETE SET NULL,
    move_type VARCHAR(50) NOT NULL,
    dice_result INTEGER,
    success_chance INTEGER,
    was_successful BOOLEAN DEFAULT FALSE,
    xp_gained INTEGER DEFAULT 0,
    gold_gained INTEGER DEFAULT 0,
    items_gained JSONB,
    skill_increases JSONB,
    move_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Skill Increases Log table
CREATE TABLE IF NOT EXISTS skill_increases_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    old_level INTEGER NOT NULL,
    new_level INTEGER NOT NULL,
    increase_amount INTEGER NOT NULL,
    source VARCHAR(100) NOT NULL,
    source_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Battleboard Encounters table
CREATE TABLE IF NOT EXISTS battleboard_encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encounter_type VARCHAR(100) NOT NULL,
    encounter_name VARCHAR(200) NOT NULL,
    difficulty_level INTEGER DEFAULT 1,
    rewards_earned JSONB,
    outcome VARCHAR(50) NOT NULL,
    encounter_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default units
INSERT INTO units (name, description, order_index) 
VALUES 
    ('Getting Started', 'Introduction to the Olympics PWA system', 1),
    ('Basic Skills', 'Fundamental skills and knowledge development', 2), 
    ('Advanced Challenges', 'Complex assignments and projects', 3),
    ('Final Projects', 'Culminating assignments and comprehensive assessments', 4)
ON CONFLICT DO NOTHING;

-- Insert gameboard stations
INSERT INTO gameboard_stations (name, description, skill_required, min_level, xp_reward, gold_reward, energy_cost, station_type, order_index) VALUES
    ('Training Camp', 'Build your fundamental skills', 'strength', 1, 10, 5, 10, 'skill', 1),
    ('Endurance Challenge', 'Test your stamina and persistence', 'endurance', 1, 15, 8, 15, 'challenge', 2),
    ('Strategy Room', 'Plan your Olympic approach', 'tactics', 1, 20, 10, 12, 'skill', 3),
    ('Cooking Academy', 'Master culinary arts', 'cooking', 2, 25, 12, 18, 'skill', 4),
    ('Leadership Summit', 'Develop team leadership skills', 'leadership', 2, 30, 15, 20, 'skill', 5),
    ('Negotiation Table', 'Practice diplomatic solutions', 'negotiation', 3, 35, 18, 22, 'skill', 6),
    ('Athletic Arena', 'Push your physical limits', 'athletics', 3, 40, 20, 25, 'challenge', 7),
    ('Knowledge Library', 'Expand your understanding', 'knowledge', 2, 28, 14, 16, 'skill', 8),
    ('Creative Workshop', 'Unleash innovative thinking', 'creativity', 3, 45, 25, 24, 'skill', 9),
    ('Problem Solving Lab', 'Tackle complex challenges', 'problem_solving', 4, 50, 30, 28, 'challenge', 10),
    ('Boss Battle Arena', 'Face the ultimate challenge', 'tactics', 5, 100, 75, 50, 'boss', 11),
    ('Treasure Vault', 'Discover special rewards', 'luck', 1, 15, 50, 5, 'special', 12)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameboard_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameboard_moves_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_increases_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE battleboard_encounters ENABLE ROW LEVEL SECURITY;