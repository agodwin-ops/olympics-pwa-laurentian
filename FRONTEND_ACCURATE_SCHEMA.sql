-- Olympics PWA Database Schema - FRONTEND ACCURATE VERSION
-- Based on actual frontend types and existing database structure

-- Add missing columns to existing player_stats table (matching PlayerStats interface)
ALTER TABLE player_stats 
ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_rank INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS gameboard_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gameboard_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_xp JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quest_progress JSONB DEFAULT '{"quest1": 0, "quest2": 0, "quest3": 0, "currentQuest": 1}',
ADD COLUMN IF NOT EXISTS assignment_awards JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS medals JSONB DEFAULT '[]';

-- Add missing columns to existing xp_entries table (matching XPEntry interface)
ALTER TABLE xp_entries
ADD COLUMN IF NOT EXISTS assignment_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS awarded_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'assignment',
ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ DEFAULT NOW();

-- Only add minimal columns to existing gameboard_stations (respects existing Calgary venues)
-- Frontend expects: id, name, description, narrative, requiredSkill, completionReward, position
ALTER TABLE gameboard_stations
ADD COLUMN IF NOT EXISTS required_skill VARCHAR(50) DEFAULT 'Strength',
ADD COLUMN IF NOT EXISTS completion_reward_items JSONB DEFAULT '[]';

-- Create tables for frontend features that may not exist yet

-- Lectures table (for resource management)
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

-- Player Inventory table (matching PlayerInventory interface exactly)
CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    water INTEGER DEFAULT 0,
    gatorade INTEGER DEFAULT 0,
    first_aid_kit INTEGER DEFAULT 0,
    skis INTEGER DEFAULT 0,
    toques INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Dice Rolls table (matching DiceRoll interface)
CREATE TABLE IF NOT EXISTS dice_rolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES gameboard_stations(id) ON DELETE CASCADE,
    result INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    skill_level INTEGER NOT NULL,
    success_chance INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Activity Log (matching AdminActivityLog interface)
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_username VARCHAR(100) NOT NULL,
    admin_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    target_name VARCHAR(200),
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- XP Backup Snapshots (matching AssignmentXPSnapshot interface)
CREATE TABLE IF NOT EXISTS assignment_xp_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    user_program VARCHAR(100) NOT NULL,
    current_xp INTEGER NOT NULL,
    total_xp INTEGER NOT NULL,
    current_level INTEGER NOT NULL,
    current_rank INTEGER NOT NULL,
    quest_progress JSONB NOT NULL,
    assignment_awards JSONB NOT NULL,
    medals JSONB NOT NULL,
    snapshot_date TIMESTAMPTZ DEFAULT NOW(),
    academic_period VARCHAR(50) NOT NULL
);

-- XP Backup Log (matching XPBackupLog interface)
CREATE TABLE IF NOT EXISTS xp_backup_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_date TIMESTAMPTZ DEFAULT NOW(),
    student_count INTEGER NOT NULL,
    total_xp_recorded INTEGER NOT NULL,
    academic_period VARCHAR(50) NOT NULL,
    triggered_by VARCHAR(20) DEFAULT 'automatic',
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_username VARCHAR(100),
    checksum_hash VARCHAR(255) NOT NULL
);

-- Enable Row Level Security for new tables
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE dice_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_xp_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_backup_log ENABLE ROW LEVEL SECURITY;

-- Initialize player inventory for existing users (matching 5 items from frontend)
INSERT INTO player_inventory (user_id, water, gatorade, first_aid_kit, skis, toques)
SELECT u.id, 0, 0, 0, 0, 0
FROM users u
WHERE u.id NOT IN (SELECT COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid) FROM player_inventory)
ON CONFLICT (user_id) DO NOTHING;