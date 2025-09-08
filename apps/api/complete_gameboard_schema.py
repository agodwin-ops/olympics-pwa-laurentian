#!/usr/bin/env python3
"""
Complete Gameboard/Battleboard Schema for Olympics PWA
Adds all missing tables for Quest XP, Game XP, Gold, Stations, Moves, Skills, Special Items
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def generate_complete_gameboard_sql():
    """Generate SQL for ALL missing gameboard/battleboard tables"""
    
    print("🎮 COMPLETE GAMEBOARD/BATTLEBOARD SCHEMA")
    print("=" * 60)
    print("Adding all missing tables for full workflow monitoring:")
    print("• Quest XP tracking")
    print("• Game XP progression") 
    print("• Gold management")
    print("• Gameboard stations")
    print("• Move tracking")
    print("• Skill progression")
    print("• Special items inventory")
    print()
    
    complete_schema = """
-- ===== GAMEBOARD STATIONS TABLE =====
-- Currently hardcoded in students_supabase.py - needs proper table
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
    station_type VARCHAR(50) DEFAULT 'skill', -- skill, challenge, boss, special
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== PLAYER SKILLS TABLE =====
-- API expects individual skills tracking for stations
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

-- ===== SPECIAL ITEMS INVENTORY =====
-- For battleboard rewards and special achievements
CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    item_type VARCHAR(100) NOT NULL, -- weapon, armor, consumable, special, quest_item
    quantity INTEGER DEFAULT 1,
    description TEXT,
    rarity VARCHAR(50) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
    properties JSONB, -- Additional item properties like damage, defense, effects
    acquired_from VARCHAR(200), -- station, quest, admin_award, dice_roll
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    is_equipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== QUEST PROGRESS TRACKING =====
-- For unit/quest XP monitoring separate from general XP
CREATE TABLE IF NOT EXISTS quest_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    quest_xp INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress', -- not_started, in_progress, completed
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, unit_id)
);

-- ===== GAMEBOARD MOVES LOG =====
-- Track every move made on gameboard with rewards
CREATE TABLE IF NOT EXISTS gameboard_moves_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id UUID REFERENCES gameboard_stations(id) ON DELETE SET NULL,
    move_type VARCHAR(50) NOT NULL, -- dice_roll, admin_award, quest_complete
    dice_result INTEGER, -- If from dice roll
    success_chance INTEGER, -- Success probability used
    was_successful BOOLEAN DEFAULT FALSE,
    xp_gained INTEGER DEFAULT 0,
    gold_gained INTEGER DEFAULT 0,
    items_gained JSONB, -- Array of items received
    skill_increases JSONB, -- Skills that increased: {skill: amount}
    move_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== SKILL INCREASE LOG =====
-- Track all skill progression for monitoring
CREATE TABLE IF NOT EXISTS skill_increases_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    old_level INTEGER NOT NULL,
    new_level INTEGER NOT NULL,
    increase_amount INTEGER NOT NULL,
    source VARCHAR(100) NOT NULL, -- dice_roll, quest_complete, admin_award, training
    source_details TEXT, -- Additional context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== ENHANCED PLAYER STATS =====
-- Add missing columns to existing player_stats table
ALTER TABLE player_stats 
ADD COLUMN IF NOT EXISTS gameboard_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS quest_xp JSONB DEFAULT '{}', -- Per-quest XP tracking
ADD COLUMN IF NOT EXISTS special_achievements JSONB DEFAULT '[]', -- Array of achievements
ADD COLUMN IF NOT EXISTS last_dice_roll TIMESTAMPTZ;

-- ===== BATTLEBOARD ENCOUNTERS =====  
-- Track special battleboard events and outcomes
CREATE TABLE IF NOT EXISTS battleboard_encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encounter_type VARCHAR(100) NOT NULL, -- boss, treasure, event, challenge
    encounter_name VARCHAR(200) NOT NULL,
    difficulty_level INTEGER DEFAULT 1,
    rewards_earned JSONB, -- XP, gold, items received
    outcome VARCHAR(50) NOT NULL, -- victory, defeat, escaped, negotiated
    encounter_data JSONB, -- Full encounter details
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INSERT PROPER GAMEBOARD STATIONS =====
-- Replace hardcoded stations with database entries
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
ON CONFLICT (name) DO NOTHING;

-- ===== ROW LEVEL SECURITY =====
-- Enable RLS for all new tables
ALTER TABLE gameboard_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameboard_moves_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_increases_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE battleboard_encounters ENABLE ROW LEVEL SECURITY;

-- ===== SERVICE ROLE POLICIES =====
-- Allow API to access all tables
CREATE POLICY "Service role can do anything on gameboard_stations" ON gameboard_stations FOR ALL USING (true);
CREATE POLICY "Service role can do anything on player_skills" ON player_skills FOR ALL USING (true);
CREATE POLICY "Service role can do anything on player_inventory" ON player_inventory FOR ALL USING (true);
CREATE POLICY "Service role can do anything on quest_progress" ON quest_progress FOR ALL USING (true);
CREATE POLICY "Service role can do anything on gameboard_moves_log" ON gameboard_moves_log FOR ALL USING (true);
CREATE POLICY "Service role can do anything on skill_increases_log" ON skill_increases_log FOR ALL USING (true);
CREATE POLICY "Service role can do anything on battleboard_encounters" ON battleboard_encounters FOR ALL USING (true);

-- ===== INITIALIZE DEFAULT PLAYER SKILLS =====
-- Create initial skills for existing users
INSERT INTO player_skills (user_id, strength, endurance, tactics, cooking, leadership, strategy, negotiation, athletics, knowledge, creativity, problem_solving)
SELECT id, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 
FROM users 
WHERE id NOT IN (SELECT user_id FROM player_skills)
ON CONFLICT (user_id) DO NOTHING;
"""

    print("📋 COPY THIS COMPLETE SQL INTO SUPABASE:")
    print("=" * 60)
    print(complete_schema)
    print("=" * 60)
    print()
    print("🎯 THIS ADDS ALL MISSING GAMEBOARD/BATTLEBOARD TABLES:")
    print("✅ gameboard_stations - Real database stations (not hardcoded)")
    print("✅ player_skills - Individual skill tracking")
    print("✅ player_inventory - Special items from rewards")
    print("✅ quest_progress - Quest XP separate from general XP")
    print("✅ gameboard_moves_log - Every move with rewards")
    print("✅ skill_increases_log - All skill progression")
    print("✅ battleboard_encounters - Special events and boss battles")
    print("✅ Enhanced player_stats - Position, quest XP, achievements")
    print()
    print("💎 WORKFLOW MONITORING NOW POSSIBLE:")
    print("• Track Quest XP vs Game XP separately")
    print("• Monitor Gold earned from different sources") 
    print("• Log Station visits and rewards")
    print("• Track Moves used and dice results")
    print("• Record Skill increases from all sources")
    print("• Manage Special items inventory")
    print("• Full Battleboard encounter history")

def show_current_gaps():
    """Show what's currently missing"""
    print("\n🚨 CURRENT WORKFLOW GAPS:")
    print("=" * 50)
    gaps = [
        "❌ gameboard_stations - Currently hardcoded in API",
        "❌ player_skills - No individual skill tracking", 
        "❌ player_inventory - No special items storage",
        "❌ quest_progress - Quest XP mixed with general XP",
        "❌ gameboard_moves_log - No move history tracking",
        "❌ skill_increases_log - No skill progression monitoring", 
        "❌ battleboard_encounters - No special event tracking"
    ]
    
    for gap in gaps:
        print(f"  {gap}")
    
    print(f"\n💡 RESULT: Admin can't properly monitor:")
    print("  • Which students are progressing in quests")
    print("  • How much gold students earn from different activities")
    print("  • What stations students visit most")
    print("  • Which skills are being developed")
    print("  • Special items earned from battleboard")
    print("  • Individual move tracking and success rates")

def main():
    """Generate complete gameboard schema"""
    print("🎮 OLYMPICS PWA - COMPLETE GAMEBOARD/BATTLEBOARD SCHEMA")
    print()
    
    show_current_gaps()
    generate_complete_gameboard_sql()
    
    print(f"\n{'='*60}")
    print("🎯 AFTER RUNNING THIS SQL:")
    print("✅ All Quest XP will be tracked separately")
    print("✅ Game XP, Gold, Station visits monitored")
    print("✅ Move history and dice results logged")
    print("✅ Skill increases tracked from all sources")
    print("✅ Special items inventory managed")
    print("✅ Complete battleboard workflow monitoring")
    print("✅ All tables will have proper editor access")

if __name__ == "__main__":
    main()