-- Olympics PWA Database Schema - PROPER UPDATE
-- Works with existing Calgary 1988 Olympic venues and real table structure

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

-- Add any missing columns to gameboard_stations (respecting existing structure)
-- Note: existing columns are id, name, description, narrative, required_skill, 
-- completion_reward_xp, completion_reward_items, position_x, position_y
ALTER TABLE gameboard_stations
ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS gold_reward INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create missing tables for complete workflow monitoring

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

-- Player Inventory table for special items from stations
CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    item_type VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1,
    description TEXT,
    rarity VARCHAR(50) DEFAULT 'common',
    properties JSONB,
    acquired_from VARCHAR(200), -- Which station/event gave this item
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    is_equipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quest Progress table for tracking quest vs gameboard XP separately
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

-- Gameboard Moves Log table - tracks every move with station visits
CREATE TABLE IF NOT EXISTS gameboard_moves_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES gameboard_stations(id) ON DELETE SET NULL,
    move_type VARCHAR(50) NOT NULL, -- dice_roll, admin_award, quest_complete
    dice_result INTEGER,
    success_chance INTEGER,
    was_successful BOOLEAN DEFAULT FALSE,
    xp_gained INTEGER DEFAULT 0,
    gold_gained INTEGER DEFAULT 0,
    items_gained JSONB, -- Items from station completion_reward_items
    skill_increases JSONB, -- Skills improved: {skill: amount}
    move_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill Increases Log table - tracks all skill progression
CREATE TABLE IF NOT EXISTS skill_increases_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    old_level INTEGER NOT NULL,
    new_level INTEGER NOT NULL,
    increase_amount INTEGER NOT NULL,
    source VARCHAR(100) NOT NULL, -- station_visit, dice_roll, quest_complete, admin_award
    source_details TEXT, -- Which station, assignment, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battleboard Encounters table - special events and boss battles
CREATE TABLE IF NOT EXISTS battleboard_encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encounter_type VARCHAR(100) NOT NULL, -- boss, treasure, event, challenge
    encounter_name VARCHAR(200) NOT NULL,
    station_id INTEGER REFERENCES gameboard_stations(id) ON DELETE SET NULL,
    difficulty_level INTEGER DEFAULT 1,
    rewards_earned JSONB, -- XP, gold, items received
    outcome VARCHAR(50) NOT NULL, -- victory, defeat, escaped, negotiated
    encounter_data JSONB, -- Full encounter details
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
SELECT u.id, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 
FROM users u
WHERE u.id NOT IN (SELECT COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid) FROM player_skills)
ON CONFLICT (user_id) DO NOTHING;