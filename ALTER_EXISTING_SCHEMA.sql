-- Olympics PWA Database Schema - ALTER EXISTING TABLES
-- Adds missing columns to existing tables instead of recreating them

-- Add missing columns to existing player_stats table
ALTER TABLE player_stats 
ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS gameboard_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gameboard_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS quest_xp JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS special_achievements JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS last_dice_roll TIMESTAMPTZ;

-- Add missing columns to existing xp_entries table
ALTER TABLE xp_entries
ADD COLUMN IF NOT EXISTS assignment_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS awarded_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add missing columns to existing gameboard_stations table
ALTER TABLE gameboard_stations
ADD COLUMN IF NOT EXISTS skill_required VARCHAR(100) DEFAULT 'strength',
ADD COLUMN IF NOT EXISTS gold_reward INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS energy_cost INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS unlock_condition TEXT,
ADD COLUMN IF NOT EXISTS station_type VARCHAR(50) DEFAULT 'skill',
ADD COLUMN IF NOT EXISTS completion_reward_xp INTEGER DEFAULT 10;

-- Create missing tables that don't exist yet

-- Lectures table
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

-- Lecture Resources table
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

-- Player Skills table
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

-- Player Inventory table
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

-- Quest Progress table
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

-- Gameboard Moves Log table
CREATE TABLE IF NOT EXISTS gameboard_moves_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES gameboard_stations(id) ON DELETE SET NULL,
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

-- Skill Increases Log table
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

-- Battleboard Encounters table
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

-- Now update the existing gameboard_stations with proper data
-- First clear any existing data to avoid conflicts
DELETE FROM gameboard_stations;

-- Insert gameboard stations with all required columns
INSERT INTO gameboard_stations (id, name, description, skill_required, min_level, xp_reward, gold_reward, energy_cost, station_type, order_index, completion_reward_xp) VALUES
    (1, 'Training Camp', 'Build your fundamental skills', 'strength', 1, 10, 5, 10, 'skill', 1, 10),
    (2, 'Endurance Challenge', 'Test your stamina and persistence', 'endurance', 1, 15, 8, 15, 'challenge', 2, 15),
    (3, 'Strategy Room', 'Plan your Olympic approach', 'tactics', 1, 20, 10, 12, 'skill', 3, 20),
    (4, 'Cooking Academy', 'Master culinary arts', 'cooking', 2, 25, 12, 18, 'skill', 4, 25),
    (5, 'Leadership Summit', 'Develop team leadership skills', 'leadership', 2, 30, 15, 20, 'skill', 5, 30),
    (6, 'Negotiation Table', 'Practice diplomatic solutions', 'negotiation', 3, 35, 18, 22, 'skill', 6, 35),
    (7, 'Athletic Arena', 'Push your physical limits', 'athletics', 3, 40, 20, 25, 'challenge', 7, 40),
    (8, 'Knowledge Library', 'Expand your understanding', 'knowledge', 2, 28, 14, 16, 'skill', 8, 28),
    (9, 'Creative Workshop', 'Unleash innovative thinking', 'creativity', 3, 45, 25, 24, 'skill', 9, 45),
    (10, 'Problem Solving Lab', 'Tackle complex challenges', 'problem_solving', 4, 50, 30, 28, 'challenge', 10, 50),
    (11, 'Boss Battle Arena', 'Face the ultimate challenge', 'tactics', 5, 100, 75, 50, 'boss', 11, 100),
    (12, 'Treasure Vault', 'Discover special rewards', 'luck', 1, 15, 50, 5, 'special', 12, 15);

-- Reset sequence for gameboard_stations
SELECT setval('gameboard_stations_id_seq', 12, true);

-- Enable Row Level Security for new tables
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameboard_moves_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_increases_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE battleboard_encounters ENABLE ROW LEVEL SECURITY;

-- Initialize player skills for existing users  
INSERT INTO player_skills (user_id, strength, endurance, tactics, cooking, leadership, strategy, negotiation, athletics, knowledge, creativity, problem_solving)
SELECT id, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 
FROM users 
WHERE id NOT IN (SELECT user_id FROM player_skills WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;