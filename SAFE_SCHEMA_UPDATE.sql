-- Olympics PWA Database Schema - SAFE UPDATE
-- Only adds missing columns and uses existing column structure

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

-- Add ALL possible missing columns to gameboard_stations table
ALTER TABLE gameboard_stations
ADD COLUMN IF NOT EXISTS skill_required VARCHAR(100) DEFAULT 'strength',
ADD COLUMN IF NOT EXISTS min_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS gold_reward INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS energy_cost INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS unlock_condition TEXT,
ADD COLUMN IF NOT EXISTS station_type VARCHAR(50) DEFAULT 'skill',
ADD COLUMN IF NOT EXISTS completion_reward_xp INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create missing tables

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

-- Now safely update gameboard_stations with only basic data
-- Using UPDATE instead of INSERT to work with existing records
UPDATE gameboard_stations SET 
    name = CASE id
        WHEN 1 THEN 'Training Camp'
        WHEN 2 THEN 'Endurance Challenge'
        WHEN 3 THEN 'Strategy Room'
        ELSE name
    END,
    description = CASE id
        WHEN 1 THEN 'Build your fundamental skills'
        WHEN 2 THEN 'Test your stamina and persistence'
        WHEN 3 THEN 'Plan your Olympic approach'
        ELSE description
    END
WHERE id IN (1, 2, 3);

-- If no existing stations, insert basic ones
INSERT INTO gameboard_stations (id, name, description) 
SELECT 1, 'Training Camp', 'Build your fundamental skills'
WHERE NOT EXISTS (SELECT 1 FROM gameboard_stations WHERE id = 1)
UNION ALL
SELECT 2, 'Endurance Challenge', 'Test your stamina and persistence'
WHERE NOT EXISTS (SELECT 1 FROM gameboard_stations WHERE id = 2)
UNION ALL  
SELECT 3, 'Strategy Room', 'Plan your Olympic approach'
WHERE NOT EXISTS (SELECT 1 FROM gameboard_stations WHERE id = 3);

-- Enable Row Level Security for new tables
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameboard_moves_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_increases_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE battleboard_encounters ENABLE ROW LEVEL SECURITY;

-- Initialize player skills for existing users safely
INSERT INTO player_skills (user_id, strength, endurance, tactics, cooking, leadership, strategy, negotiation, athletics, knowledge, creativity, problem_solving)
SELECT u.id, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 
FROM users u
WHERE u.id NOT IN (SELECT COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid) FROM player_skills)
ON CONFLICT (user_id) DO NOTHING;